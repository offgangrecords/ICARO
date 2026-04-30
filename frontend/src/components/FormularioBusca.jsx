import { useState, useEffect, useMemo } from 'react';
import { configApi } from '../services/api';
import { Search, Loader2, MapPin, Building2, SlidersHorizontal, Globe, Map } from 'lucide-react';
import axios from 'axios';

const TIPOS_PADRAO = [
  { id: 'default-1', nome: 'Clínica odontológica', query_google: 'clínica odontológica' },
  { id: 'default-2', nome: 'Laboratório de análises clínicas', query_google: 'laboratório análises clínicas' },
  { id: 'default-3', nome: 'Hospital', query_google: 'hospital' },
  { id: 'default-4', nome: 'UBS / Unidade Básica de Saúde', query_google: 'unidade básica de saúde' },
  { id: 'default-5', nome: 'Clínica médica', query_google: 'clínica médica' },
  { id: 'default-6', nome: 'Clínica veterinária', query_google: 'clínica veterinária' },
  { id: 'default-7', nome: 'Farmácia de manipulação', query_google: 'farmácia manipulação' },
  { id: 'default-8', nome: 'Farmácia', query_google: 'farmácia' },
];

const REGIOES = [
  { id: 'Norte', nome: 'Norte' },
  { id: 'Nordeste', nome: 'Nordeste' },
  { id: 'Centro-Oeste', nome: 'Centro-Oeste' },
  { id: 'Sudeste', nome: 'Sudeste' },
  { id: 'Sul', nome: 'Sul' },
];

const ESTADOS_POR_REGIAO = {
  'Norte': ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
  'Sul': ['PR', 'RS', 'SC'],
};

export default function FormularioBusca({ onBuscar, buscando, onFocusChange }) {
  const [tipos, setTipos] = useState(TIPOS_PADRAO);
  const [form, setForm] = useState({
    regiao: '',
    estado: '',
    cidade: '',
    tipoId: TIPOS_PADRAO[0].id,
    tipoCustom: '',
    raioKm: 10,
    maxResultados: 50,
  });

  // Estados locais para dados da IBGE
  const [cidades, setCidades] = useState([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const [filtroCidade, setFiltroCidade] = useState('');
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  useEffect(() => {
    configApi.listarTipos()
      .then(({ data }) => { if (data.length > 0) setTipos(data); })
      .catch(() => {});
  }, []);

  // Carregar cidades quando o estado mudar
  useEffect(() => {
    if (form.estado) {
      setCarregandoCidades(true);
      axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios`)
        .then(({ data }) => {
          setCidades(data.map(c => c.nome).sort((a, b) => a.localeCompare(b)));
        })
        .finally(() => setCarregandoCidades(false));
    } else {
      setCidades([]);
    }
    setForm(f => ({ ...f, cidade: '' }));
    setFiltroCidade('');
  }, [form.estado]);

  const estadosDisponiveis = form.regiao ? ESTADOS_POR_REGIAO[form.regiao] : [];

  const cidadesFiltradas = useMemo(() => {
    if (!filtroCidade || !mostrarSugestoes) return [];
    return cidades
      .filter(c => c.toLowerCase().includes(filtroCidade.toLowerCase()))
      .slice(0, 10);
  }, [filtroCidade, cidades, mostrarSugestoes]);

  const tipoSelecionado = form.tipoId === 'outro'
    ? null
    : tipos.find(t => t.id === form.tipoId);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cidadeFinal = form.cidade || filtroCidade;
    if (!cidadeFinal || !form.estado) return;

    const tipo = form.tipoId === 'outro' ? form.tipoCustom : tipoSelecionado?.nome;
    const queryGoogle = form.tipoId === 'outro' ? form.tipoCustom : tipoSelecionado?.query_google;

    if (!tipo) return;

    onBuscar({
      cidade: `${cidadeFinal}, ${form.estado}`,
      tipo,
      queryGoogle,
      raioKm: form.raioKm,
      maxResultados: form.maxResultados,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Região */}
        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <Globe className="inline w-3.5 h-3.5 mr-1 text-primary-400" />
            Região
          </label>
          <select
            className="select"
            value={form.regiao}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, regiao: val, estado: '' }));
              if (onFocusChange) onFocusChange({ tipo: 'regiao', valor: val });
            }}
            disabled={buscando}
          >
            <option value="">Selecione...</option>
            {REGIOES.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>

        {/* Estado */}
        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <Map className="inline w-3.5 h-3.5 mr-1 text-primary-400" />
            Estado
          </label>
          <select
            className="select"
            value={form.estado}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({ ...f, estado: val }));
              if (onFocusChange) onFocusChange({ tipo: 'estado', valor: val });
            }}
            disabled={buscando || !form.regiao}
          >
            <option value="">Selecione...</option>
            {estadosDisponiveis.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        {/* Cidade (Autocomplete) */}
        <div className="relative min-w-0">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <MapPin className="inline w-3.5 h-3.5 mr-1 text-primary-400" />
            Cidade
          </label>
          <div className="relative">
            <input
              type="text"
              className="input pr-10"
              placeholder={carregandoCidades ? 'Carregando cidades...' : 'Digite o nome...'}
              value={filtroCidade}
              onChange={e => {
                setFiltroCidade(e.target.value);
                setMostrarSugestoes(true);
                setForm(f => ({ ...f, cidade: '' }));
              }}
              onFocus={() => setMostrarSugestoes(true)}
              disabled={buscando || !form.estado}
              autoComplete="off"
            />
            {carregandoCidades && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-muted animate-spin" />
              </div>
            )}
          </div>

          {/* Sugestões Autocomplete */}
          {mostrarSugestoes && cidadesFiltradas.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-navy-800 border border-card-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {cidadesFiltradas.map(c => (
                <button
                  key={c}
                  type="button"
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-surface transition-colors border-b border-card-border/50 last:border-0"
                  onClick={() => {
                    const cidadeCompleta = `${c}, ${form.estado}`;
                    setFiltroCidade(c);
                    setForm(f => ({ ...f, cidade: c }));
                    setMostrarSugestoes(false);
                    if (onFocusChange) onFocusChange({ tipo: 'cidade', valor: cidadeCompleta });
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <Building2 className="inline w-3.5 h-3.5 mr-1 text-primary-400" />
            Tipo de estabelecimento
          </label>
          <select
            id="select-tipo"
            className="select"
            value={form.tipoId}
            onChange={e => setForm(f => ({ ...f, tipoId: e.target.value, tipoCustom: '' }))}
            disabled={buscando}
          >
            {tipos.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
            <option value="outro">Outro (campo livre)</option>
          </select>
        </div>

        {/* Campo livre quando "Outro" */}
        {form.tipoId === 'outro' && (
          <div className="animate-slide-up">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Tipo personalizado
            </label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Centro de reabilitação"
              value={form.tipoCustom}
              onChange={e => setForm(f => ({ ...f, tipoCustom: e.target.value }))}
              disabled={buscando}
              required
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-4 pt-1">
        <div className="w-full">
          <button
            type="submit"
            disabled={buscando || (!form.cidade && !filtroCidade) || !form.estado}
            className="btn-primary btn-lg w-full"
          >
            {buscando ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Buscando...</>
            ) : (
              <><Search className="w-5 h-5" /> Buscar Leads</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
