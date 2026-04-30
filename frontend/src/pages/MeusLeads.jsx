import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { leadsApi } from '../services/api';
import TabelaLeads from '../components/TabelaLeads';
import { BookMarked, Search, Filter, Download, RefreshCw, X } from 'lucide-react';

const STATUS_OPTS = ['', 'Novo', 'Contato realizado', 'Proposta enviada', 'Venda Realizada', 'Cliente', 'Descartado'];

export default function MeusLeads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());

  const [filtros, setFiltros] = useState({
    busca: '', status: '', cidade: '', tipo: '',
    data_inicio: '', data_fim: '',
    page: 1, limit: 50, ordem: 'data_prospeccao', direcao: 'desc',
  });

  const buscarLeads = useCallback(async (params = filtros) => {
    setCarregando(true);
    try {
      const query = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v !== null)
      );
      const { data } = await leadsApi.listar(query);
      setLeads(data.leads);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao carregar leads');
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => {
    buscarLeads(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.page, filtros.ordem, filtros.direcao]);

  const aplicarFiltros = (e) => {
    e?.preventDefault();
    const novosFiltros = { ...filtros, page: 1 };
    setFiltros(novosFiltros);
    buscarLeads(novosFiltros);
  };

  const limparFiltros = () => {
    const limpos = {
      busca: '', status: '', cidade: '', tipo: '',
      data_inicio: '', data_fim: '',
      page: 1, limit: 50, ordem: 'data_prospeccao', direcao: 'desc',
    };
    setFiltros(limpos);
    buscarLeads(limpos);
  };

  const handleStatusChange = async (id, novoStatus) => {
    try {
      await leadsApi.atualizar(id, { status: novoStatus });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: novoStatus } : l));
      toast.success('Status atualizado');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleExportar = async (tipo) => {
    const leadsParaExportar = selecionados.size > 0
      ? leads.filter(l => selecionados.has(l.id))
      : leads;
    if (leadsParaExportar.length === 0) {
      toast.error('Nenhum lead para exportar');
      return;
    }
    try {
      if (tipo === 'csv') await leadsApi.exportarCSV(leadsParaExportar);
      else await leadsApi.exportarExcel(leadsParaExportar);
      toast.success(`${tipo.toUpperCase()} exportado com sucesso!`);
    } catch {
      toast.error('Erro ao exportar');
    }
  };

  const temFiltros = filtros.busca || filtros.status || filtros.cidade || filtros.tipo
    || filtros.data_inicio || filtros.data_fim;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6 space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-primary-400" />
            Meus Leads
          </h1>
          <p className="text-muted text-sm mt-1">
            {total > 0 ? (
              <><span className="text-primary-400 font-semibold">{total}</span> lead{total !== 1 ? 's' : ''} na base</>
            ) : 'Base de prospecções salvas'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => buscarLeads(filtros)} className="btn-ghost btn-sm" id="btn-refresh-leads">
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button onClick={() => handleExportar('csv')} className="btn-secondary btn-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => handleExportar('excel')} className="btn-secondary btn-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <form onSubmit={aplicarFiltros} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="text"
                className="input pl-9"
                placeholder="Buscar por nome..."
                value={filtros.busca}
                onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))}
              />
            </div>

            <input
              type="text"
              className="input"
              placeholder="Cidade..."
              value={filtros.cidade}
              onChange={e => setFiltros(f => ({ ...f, cidade: e.target.value }))}
            />

            <select
              className="select"
              value={filtros.status}
              onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">Todos os status</option>
              {STATUS_OPTS.filter(Boolean).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <input
              type="date"
              className="input"
              title="Data início"
              value={filtros.data_inicio}
              onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))}
            />

            <input
              type="date"
              className="input"
              title="Data fim"
              value={filtros.data_fim}
              onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn-primary btn-sm">
              <Filter className="w-3.5 h-3.5" /> Filtrar
            </button>
            {temFiltros && (
              <button type="button" onClick={limparFiltros} className="btn-ghost btn-sm">
                <X className="w-3.5 h-3.5" /> Limpar filtros
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabela */}
      {carregando ? (
        <div className="card p-8 text-center">
          <div className="flex items-center justify-center gap-2 text-muted">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando leads...</span>
          </div>
        </div>
      ) : leads.length === 0 ? (
        <div className="card p-12 text-center">
          <BookMarked className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            {temFiltros ? 'Nenhum lead com esses filtros' : 'Nenhum lead salvo ainda'}
          </h3>
          <p className="text-muted text-sm">
            {temFiltros
              ? 'Tente ajustar os filtros acima'
              : 'Faça uma busca e salve os leads que interessarem'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <TabelaLeads
            leads={leads}
            selecionados={selecionados}
            onSelecionar={setSelecionados}
            onStatusChange={handleStatusChange}
            modo="base"
          />

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted">
                Página {filtros.page} de {totalPages} · {total} lead{total !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="btn-secondary btn-sm"
                  disabled={filtros.page <= 1}
                  onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))}
                >
                  ← Anterior
                </button>
                <button
                  className="btn-secondary btn-sm"
                  disabled={filtros.page >= totalPages}
                  onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))}
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
