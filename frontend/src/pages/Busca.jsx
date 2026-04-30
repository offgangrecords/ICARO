import { useState, useCallback, useRef, Suspense, lazy } from 'react';
import { toast } from 'react-hot-toast';
import { buscaApi, leadsApi } from '../services/api';
import axios from 'axios';
import FormularioBusca from '../components/FormularioBusca';
import TabelaLeads from '../components/TabelaLeads';
import BarraAcoes from '../components/BarraAcoes';
import { Search, Zap, TrendingUp, Clock, MapPin, Target } from 'lucide-react';

const MapaLeads = lazy(() => import('../components/MapaLeads'));

export default function Busca() {
  const [leads, setLeads] = useState([]);
  const [leadsExistentes, setLeadsExistentes] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [buscando, setBuscando] = useState(false);
  const [buscaInfo, setBuscaInfo] = useState(null); 
  const [filtroAvaliacao, setFiltroAvaliacao] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [mapFocus, setMapFocus] = useState(null); 
  const [mapPreview, setMapPreview] = useState({ centro: null });
  const resultadosRef = useRef(null);

  const handleFocusChange = async (focus) => {
    setMapFocus(focus);
    
    if (focus.tipo === 'cidade') {
      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(focus.valor)}&format=json&limit=1`);
        if (res.data?.[0]) {
          setMapPreview({ 
            centro: { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) } 
          });
        }

        // Busca leads já existentes nesta cidade para mostrar no mapa
        const nomeCidade = focus.valor.split(',')[0].trim();
        const { data: resLeads } = await leadsApi.listar({ cidade: nomeCidade, limit: 100 });
        setLeadsExistentes(resLeads.leads || []);
      } catch (e) {}
    }
  };

  const handleBuscar = useCallback(async (params) => {
    setBuscando(true);
    setProgresso(10);
    setSelecionados(new Set());
    setLeads([]);
    
    // Foca na cidade antes de buscar
    setMapFocus({ tipo: 'cidade', valor: params.cidade });

    // Simulação de barra de progresso
    const interval = setInterval(() => {
      setProgresso(prev => (prev < 90 ? prev + 5 : prev));
    }, 1500);

    try {
      const { data } = await buscaApi.buscar(params);
      setProgresso(100);
      setLeads(data.leads || []);
      setBuscaInfo({
        cidade: params.cidade,
        tipo: params.tipo,
        busca_id: data.busca_id,
        centro: data.leads?.find(l => l.latitude)?.latitude 
          ? { lat: data.leads.find(l => l.latitude).latitude, lng: data.leads.find(l => l.latitude).longitude }
          : null
      });
      
      if (data.leads.length === 0) {
        toast('Nenhum resultado encontrado. Tente outro termo.', { icon: '🔍' });
      } else {
        toast.success(`${data.leads.length} leads encontrados!`);
        setTimeout(() => resultadosRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao realizar busca');
    } finally {
      clearInterval(interval);
      setBuscando(false);
    }
  }, []);

  const leadsFiltrados = leads.filter(l =>
    filtroAvaliacao === 0 ? true : (l.avaliacao || 0) >= filtroAvaliacao
  );

  const handleSalvar = async () => {
    if (selecionados.size === 0) return;
    const leadsParaSalvar = leadsFiltrados.filter(l => selecionados.has(l.place_id));
    try {
      const { data } = await leadsApi.salvar(leadsParaSalvar, buscaInfo?.busca_id);
      toast.success(data.mensagem);
      setSelecionados(new Set());
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar leads');
    }
  };

  const handleExportarCSV = async () => {
    const leadsParaExportar = selecionados.size > 0
      ? leadsFiltrados.filter(l => selecionados.has(l.place_id))
      : leadsFiltrados;
    await leadsApi.exportarCSV(leadsParaExportar);
  };

  const handleExportarExcel = async () => {
    const leadsParaExportar = selecionados.size > 0
      ? leadsFiltrados.filter(l => selecionados.has(l.place_id))
      : leadsFiltrados;
    await leadsApi.exportarExcel(leadsParaExportar);
  };

  const leadsSelecionados = leadsFiltrados.filter(l => selecionados.has(l.place_id));

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Search className="w-6 h-6 text-primary-400" />
            Extração de Leads
          </h1>
          <p className="text-muted text-sm mt-1">
            Pesquise estabelecimentos em qualquer cidade do Brasil sem custos de API
          </p>
        </div>

        {leads.length > 0 && (
          <div className="flex items-center gap-2 bg-surface border border-card-border rounded-lg px-3 py-2">
            <span className="text-xs text-muted">Avaliação mín.</span>
            <select
              className="bg-transparent text-sm text-gray-200 outline-none cursor-pointer"
              value={filtroAvaliacao}
              onChange={e => setFiltroAvaliacao(parseFloat(e.target.value))}
            >
              <option value={0}>Todas</option>
              <option value={4}>≥ 4.0 ⭐</option>
              <option value={4.5}>≥ 4.5 ⭐</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário Coluna Esquerda */}
        <div className="lg:col-span-5 space-y-6">
          <FormularioBusca 
            onBuscar={handleBuscar} 
            buscando={buscando} 
            onFocusChange={handleFocusChange}
          />
          
          {buscando && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Progresso da Extração</span>
                <span className="text-sm font-bold text-primary-400">{progresso}%</span>
              </div>
              <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 transition-all duration-500 ease-out"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <p className="text-xs text-muted italic">
                O robô está navegando no mapa e coletando dados de contato...
              </p>
            </div>
          )}
        </div>

        {/* Mapa Coluna Direita */}
        <div className="lg:col-span-7">
          <div className="card overflow-hidden" style={{ height: '500px' }}>
            <Suspense fallback={<div className="h-full flex items-center justify-center text-muted">Carregando mapa...</div>}>
              <MapaLeads 
                leads={[...leadsExistentes, ...leadsFiltrados]} 
                centroBusca={buscaInfo?.centro || mapPreview.centro} 
                focus={mapFocus}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Resultados Tabela */}
      {leads.length > 0 && (
        <div ref={resultadosRef} className="space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-400" />
              Resultados da Busca
            </h2>
          </div>

          <BarraAcoes
            selecionados={leadsSelecionados}
            total={leadsFiltrados.length}
            onSalvar={handleSalvar}
            onCSV={handleExportarCSV}
            onExcel={handleExportarExcel}
          />

          <TabelaLeads
            leads={leadsFiltrados}
            selecionados={selecionados}
            onSelecionar={setSelecionados}
            modo="busca"
          />
        </div>
      )}

      {/* Estado Vazio */}
      {!buscando && leads.length === 0 && (
        <div className="card p-12 text-center">
          <Zap className="w-12 h-12 text-primary-400/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-200 mb-2">Inicie uma nova prospecção</h3>
          <p className="text-muted text-sm max-w-md mx-auto">
            Escolha uma região, cidade e o tipo de estabelecimento para começar a extrair leads gratuitamente.
          </p>
        </div>
      )}
    </div>
  );
}
