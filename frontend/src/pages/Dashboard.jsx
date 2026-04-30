import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboardApi, leadsApi } from '../services/api';
import {
  Users, PhoneCall, Clock, TrendingUp, MapPin,
  BarChart3, RefreshCw, Target, CheckCircle2, XCircle, Building2, Globe,
  Search, ExternalLink, MessageCircle, ChevronRight, X
} from 'lucide-react';

const MapaLeads = lazy(() => import('../components/MapaLeads'));

const STATUS_CONFIG = {
  'Novo':              { label: 'Novos',            cor: 'bg-primary-500', hex: '#3B82F6' },
  'Contato realizado': { label: 'Contactados',      cor: 'bg-warning',     hex: '#F59E0B' },
  'Proposta enviada':  { label: 'Proposta Enviada', cor: 'bg-purple-500',  hex: '#8B5CF6' },
  'Venda Realizada':   { label: 'Vendas',           cor: 'bg-emerald-500', hex: '#10B981' },
  'Cliente':           { label: 'Clientes',         cor: 'bg-success',     hex: '#10B981' },
  'Sem interesse':     { label: 'Sem Interesse',    cor: 'bg-gray-500',    hex: '#6B7280' },
};

function CardMetrica({ icon: Icon, label, valor, sub, corIcon = 'text-primary-500', loading, onClick }) {
  return (
    <div 
      className={`card p-5 transition-all duration-200 ${onClick ? 'cursor-pointer hover:bg-white/[0.04] hover:border-primary-500/30' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-black text-white mt-1 tracking-tighter">{valor ?? '—'}</p>
          )}
          {sub && <p className="text-[10px] text-muted-foreground mt-1 font-medium">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${corIcon} border border-white/5 shadow-inner`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function BarraProgresso({ label, valor, total, cor }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] mb-1.5 font-bold">
        <span className="text-muted-foreground uppercase tracking-tighter">{label}</span>
        <span className="text-white">{pct}%</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${cor}`}
        />
      </div>
    </div>
  );
}

function ModalDetalhes({ aberto, onClose, titulo, filtro }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (aberto) {
      const carregar = async () => {
        setLeads([]);
        setLoading(true);
        try {
          if (filtro.cidade) {
            const cidadeLimpa = filtro.cidade.split(',')[0].trim();
            const { data } = await dashboardApi.obterDetalhes({ cidade: cidadeLimpa });
            setLeads(data.leads || []);
          } else if (filtro.total === true) {
            const { data } = await dashboardApi.obterDetalhes({ total: true });
            setLeads(data.leads || []);
          } else {
            const { data } = await dashboardApi.obterDetalhes(filtro);
            setLeads(data.leads || []);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      carregar();
    }
  }, [aberto, filtro]);

  const atualizarStatus = async (id, novoStatus) => {
    try {
      await leadsApi.atualizar(id, { status: novoStatus });
      setLeads(leads.map(l => l.id === id ? { ...l, status: novoStatus } : l));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-950/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-5xl max-h-[85vh] bg-navy-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3 text-glow">
                  <Target className="w-6 h-6 text-primary-500" />
                  {titulo}
                </h2>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
                  Gerenciamento Direto de Leads ({leads.length})
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <RefreshCw className="w-10 h-10 text-primary-500 animate-spin" />
                  <p className="text-muted-foreground font-bold uppercase tracking-tighter">Sincronizando Leads...</p>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-20">
                  <Search className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-muted-foreground font-bold">Nenhum lead salvo nesta região ainda.</p>
                </div>
              ) : (
                leads.map(lead => (
                  <div key={lead.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-white text-lg group-hover:text-primary-400 transition-colors">{lead.nome}</h3>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-medium">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.cidade}</span>
                          <span className="flex items-center gap-1 font-black text-[10px] bg-white/5 px-2 py-0.5 rounded uppercase tracking-tighter">
                            {lead.tipo_buscado}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select 
                          value={lead.status}
                          onChange={(e) => atualizarStatus(lead.id, e.target.value)}
                          className="bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary-500/50"
                        >
                          {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                        <a 
                          href={`https://wa.me/${lead.telefone?.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function Dashboard() {
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ aberto: false, titulo: '', filtro: {} });

  const carregarMetricas = async () => {
    setLoading(true);
    try {
      const { data } = await dashboardApi.obterMetricas();
      setMetricas(data);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarMetricas();
  }, []);

  const totalStatus = Object.values(metricas?.porStatus || {}).reduce((a, b) => a + b, 0);
  const taxaConversao = totalStatus > 0 
    ? Math.round(((metricas?.porStatus?.['Venda Realizada'] || 0) / totalStatus) * 100) 
    : 0;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary-500" />
            Visão Geral
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Acompanhe sua performance de prospecção em tempo real.</p>
        </div>
        <button 
          onClick={carregarMetricas} 
          disabled={loading}
          className="btn-secondary group"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          Sincronizar
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <CardMetrica
          icon={Building2}
          label="Total de Leads"
          valor={metricas?.totalPotential}
          sub="Base minerada total"
          loading={loading}
          onClick={() => setModal({ aberto: true, titulo: 'Todas as Minas de Leads', filtro: { total: true } })}
        />
        <CardMetrica
          icon={PhoneCall}
          label="Abordagens"
          valor={metricas?.contatosRealizados}
          sub={`${metricas?.totalLeads || 0} salvos na base`}
          corIcon="text-warning"
          loading={loading}
        />
        <CardMetrica
          icon={Clock}
          label="Pendentes"
          valor={metricas?.pendentes}
          sub="Aguardando contato"
          corIcon="text-muted-foreground"
          loading={loading}
        />
        <CardMetrica
          icon={TrendingUp}
          label="Conversão"
          valor={loading ? null : `${taxaConversao}%`}
          sub="Vendas / Total salvos"
          corIcon="text-emerald-400"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Metrificação Regional */}
        <div className="card p-6">
          <h2 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
            <Globe className="w-4 h-4 text-primary-500" />
            Performance Regional
          </h2>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-6">
              {metricas?.progressoRegioes.map((r, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ x: 4 }}
                  className="group cursor-pointer p-3 rounded-2xl region-card-hover transition-all"
                  onClick={() => setModal({ aberto: true, titulo: `Região ${r.nome}`, filtro: { regiao: r.nome } })}
                >
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2 group-hover:text-red-400 transition-colors">
                      {r.nome}
                      <ChevronRight className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </span>
                    <span className="text-sm font-black text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-glow-red">
                      {r.total} POTENCIAIS
                    </span>
                    <span className="text-sm font-black text-primary-400">{r.percentual}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${r.percentual}%` }}
                      className={`h-full ${r.percentual > 0 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-primary-500'} rounded-full`}
                    />
                  </div>
                  <div className="flex justify-between mt-3 text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    <span>{r.salvos} Leads Salvos</span>
                    <span className="group-hover:text-red-400 transition-colors">Ver detalhes</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Funil de Prospecção */}
        <div className="card p-6">
          <h2 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
            <Target className="w-4 h-4 text-primary-500" />
            Funil Comercial
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : metricas?.porStatus && totalStatus > 0 ? (
            <div className="space-y-4">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const count = metricas.porStatus[status] || 0;
                const pct = Math.round((count / totalStatus) * 100);
                return (
                  <div key={status} className="flex items-center gap-4">
                    <div className="w-32 text-[10px] font-black text-muted-foreground uppercase tracking-tighter truncate">{config.label}</div>
                    <div className="flex-1 h-8 bg-white/5 rounded-xl overflow-hidden flex items-center px-1 border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        className={`h-6 rounded-lg ${config.cor} flex items-center justify-end px-2 min-w-[30px]`}
                      >
                        <span className="text-[10px] font-black text-white">{count}</span>
                      </motion.div>
                    </div>
                    <div className="w-10 text-[10px] font-black text-white text-right">{pct}%</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <BarChart3 className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-tighter">Nenhum lead salvo para metrificação.</p>
            </div>
          )}
        </div>
      </div>

      {/* Progresso por Cidade */}
      <div className="card p-6">
        <h2 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
          <MapPin className="w-4 h-4 text-primary-500" />
          Domínio por Cidade
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {metricas.progressoCidades.map((c, idx) => (
              <motion.div 
                key={idx} 
                whileHover={{ y: -2 }}
                className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-red-500/30 transition-all cursor-pointer group"
                onClick={() => setModal({ aberto: true, titulo: c.cidade, filtro: { cidade: c.cidade } })}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white truncate tracking-tight flex items-center gap-2 group-hover:text-red-400 transition-colors">
                      {c.cidade}
                      <ExternalLink className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.categorias.map((cat, i) => (
                        <span key={i} className="text-[9px] bg-white/5 text-muted-foreground px-2 py-0.5 rounded-lg border border-white/10 font-black uppercase">
                          {cat.total} {cat.tipo}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                    c.percentual >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    c.percentual >= 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-primary-500/10 text-primary-500 border border-primary-500/20'
                  }`}>
                    {c.percentual}%
                  </span>
                </div>
                
                <BarraProgresso
                  label="Leads Consolidados"
                  valor={c.salvos}
                  total={c.total_encontrado}
                  cor={c.percentual > 0 ? 'bg-red-500' : 'bg-primary-500'}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Mapa de Calor */}
      <div className="card p-6 h-[500px] flex flex-col">
        <h2 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
          <Globe className="w-4 h-4 text-primary-500" />
          Distribuição Geográfica de Leads
        </h2>
        <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 bg-navy-950 relative">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          }>
            <MapaLeads leads={metricas?.leadsNoMapa || []} />
          </Suspense>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <ModalDetalhes 
        aberto={modal.aberto} 
        onClose={() => {
          setModal({ ...modal, aberto: false });
          carregarMetricas(); // Atualiza os cards assim que o modal fecha
        }}
        titulo={modal.titulo}
        filtro={modal.filtro}
      />
    </div>
  );
}
