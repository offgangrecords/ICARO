import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { configApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings, Key, Webhook, List, Users, Plus, Trash2,
  Eye, EyeOff, Save, Loader2, User, ShieldCheck, CheckCircle
} from 'lucide-react';

const STATUS_BADGE = {
  gerente: 'bg-warning/15 text-warning',
  admin: 'bg-danger/15 text-danger',
  vendedor: 'bg-primary-500/15 text-primary-400',
};

export default function Configuracoes() {
  const { usuario } = useAuth();
  const [aba, setAba] = useState('api');

  // API / Webhook config
  const [configs, setConfigs] = useState({
    google_places_api_key: '',
  });
  const [mostrarKey, setMostrarKey] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Tipos de estabelecimento
  const [tipos, setTipos] = useState([]);
  const [novoTipo, setNovoTipo] = useState({ nome: '', query_google: '' });

  // Usuários
  const [usuarios, setUsuarios] = useState([]);
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', senha: '', perfil: 'vendedor' });
  const [criandoUsuario, setCriandoUsuario] = useState(false);
  const [mostrarFormUsuario, setMostrarFormUsuario] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [resConfigs, resTipos, resUsuarios] = await Promise.all([
        configApi.listar(),
        configApi.listarTipos(),
        configApi.listarUsuarios(),
      ]);

      const configMap = {};
      resConfigs.data.forEach(c => { configMap[c.chave] = c.valor || ''; });
      setConfigs(prev => ({ ...prev, ...configMap }));
      setTipos(resTipos.data);
      setUsuarios(resUsuarios.data);
    } catch (err) {
      toast.error('Erro ao carregar configurações');
    }
  };

  const salvarConfig = async () => {
    setSalvandoConfig(true);
    try {
      await configApi.atualizar([
        { chave: 'google_places_api_key', valor: configs.google_places_api_key },
      ]);
      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvandoConfig(false);
    }
  };

  const adicionarTipo = async () => {
    if (!novoTipo.nome || !novoTipo.query_google) {
      toast.error('Preencha nome e query do Google');
      return;
    }
    try {
      const { data } = await configApi.adicionarTipo(novoTipo);
      setTipos(prev => [...prev, data]);
      setNovoTipo({ nome: '', query_google: '' });
      toast.success('Tipo adicionado!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao adicionar tipo');
    }
  };

  const removerTipo = async (id) => {
    if (!confirm('Remover este tipo?')) return;
    try {
      await configApi.removerTipo(id);
      setTipos(prev => prev.filter(t => t.id !== id));
      toast.success('Tipo removido!');
    } catch {
      toast.error('Erro ao remover tipo');
    }
  };

  const criarUsuario = async (e) => {
    e.preventDefault();
    if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.senha) {
      toast.error('Preencha todos os campos');
      return;
    }
    setCriandoUsuario(true);
    try {
      const { data } = await configApi.criarUsuario(novoUsuario);
      setUsuarios(prev => [data, ...prev]);
      setNovoUsuario({ nome: '', email: '', senha: '', perfil: 'vendedor' });
      setMostrarFormUsuario(false);
      toast.success(`Usuário ${data.nome} criado com sucesso!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setCriandoUsuario(false);
    }
  };

  const toggleAtivo = async (id, ativo) => {
    try {
      await configApi.atualizarUsuario(id, { ativo: !ativo });
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo: !ativo } : u));
      toast.success(`Usuário ${!ativo ? 'ativado' : 'desativado'}!`);
    } catch {
      toast.error('Erro ao atualizar usuário');
    }
  };

  const abas = [
    { id: 'api', icon: Key, label: 'Chave de API' },
    { id: 'tipos', icon: List, label: 'Tipos' },
    { id: 'usuarios', icon: Users, label: 'Usuários' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 animate-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary-400" />
          Configurações
        </h1>
        <p className="text-muted text-sm mt-1">Gerencie API keys, tipos de estabelecimento e usuários</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-navy-800 p-1 rounded-xl border border-card-border mb-6 w-fit">
        {abas.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              aba === id
                ? 'bg-primary-600 text-white shadow-glow-sm'
                : 'text-muted hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Aba: API & Webhook */}
      {aba === 'api' && (
        <div className="card p-6 space-y-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-primary-400" />
              <h2 className="text-base font-semibold text-gray-100">Google Places API Key</h2>
            </div>
            <div className="relative">
              <input
                type={mostrarKey ? 'text' : 'password'}
                className="input pr-11"
                placeholder="AIzaSy..."
                value={configs.google_places_api_key}
                onChange={e => setConfigs(c => ({ ...c, google_places_api_key: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-300 transition-colors"
                onClick={() => setMostrarKey(v => !v)}
              >
                {mostrarKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              Obtenha em:{' '}
              <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer"
                className="text-primary-400 hover:underline">
                console.cloud.google.com
              </a>
              {' '}→ APIs & Services → Credenciais → Habilitar Places API
            </p>
          </div>


          <button
            id="btn-salvar-config"
            onClick={salvarConfig}
            disabled={salvandoConfig}
            className="btn-primary"
          >
            {salvandoConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Configurações
          </button>
        </div>
      )}

      {/* Aba: Tipos de Estabelecimento */}
      {aba === 'tipos' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-primary-400" /> Adicionar Tipo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Nome exibido</label>
                <input
                  className="input"
                  placeholder="Ex: Clínica odontológica"
                  value={novoTipo.nome}
                  onChange={e => setNovoTipo(t => ({ ...t, nome: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Query no Google</label>
                <input
                  className="input"
                  placeholder="Ex: clínica odontológica"
                  value={novoTipo.query_google}
                  onChange={e => setNovoTipo(t => ({ ...t, query_google: e.target.value }))}
                />
              </div>
            </div>
            <button onClick={adicionarTipo} className="btn-primary mt-3 btn-sm">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-card-border">
              <h2 className="text-sm font-semibold text-gray-200">
                Tipos cadastrados ({tipos.length})
              </h2>
            </div>
            <div className="divide-y divide-card-border/50">
              {tipos.map(tipo => (
                <div key={tipo.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface/50 transition-colors">
                  <div>
                    <p className="text-sm text-gray-200 font-medium">{tipo.nome}</p>
                    <p className="text-xs text-muted">Query: "{tipo.query_google}"</p>
                  </div>
                  <button
                    onClick={() => removerTipo(tipo.id)}
                    className="btn-ghost btn-sm text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {tipos.length === 0 && (
                <p className="text-center text-muted text-sm py-8">Nenhum tipo cadastrado</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aba: Usuários */}
      {aba === 'usuarios' && (
        <div className="space-y-4 animate-fade-in">
          {/* Botão novo usuário */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setMostrarFormUsuario(v => !v)}
              className="btn-primary btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Vendedor
            </button>
          </div>

          {/* Formulário novo usuário */}
          {mostrarFormUsuario && (
            <div className="card p-5 border-primary-500/30 animate-slide-up">
              <h3 className="text-sm font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-primary-400" /> Criar novo usuário
              </h3>
              <form onSubmit={criarUsuario} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Nome completo</label>
                  <input className="input" placeholder="João Silva" value={novoUsuario.nome}
                    onChange={e => setNovoUsuario(u => ({ ...u, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">E-mail</label>
                  <input className="input" type="email" placeholder="joao@empresa.com" value={novoUsuario.email}
                    onChange={e => setNovoUsuario(u => ({ ...u, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Senha (mín. 6 caracteres)</label>
                  <input className="input" type="password" placeholder="••••••" value={novoUsuario.senha}
                    onChange={e => setNovoUsuario(u => ({ ...u, senha: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Perfil</label>
                  <select className="select" value={novoUsuario.perfil}
                    onChange={e => setNovoUsuario(u => ({ ...u, perfil: e.target.value }))}>
                    <option value="vendedor">Vendedor</option>
                    <option value="gerente">Gerente</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" disabled={criandoUsuario} className="btn-primary btn-sm">
                    {criandoUsuario ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Criar Usuário
                  </button>
                  <button type="button" onClick={() => setMostrarFormUsuario(false)} className="btn-ghost btn-sm">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de usuários */}
          <div className="card overflow-hidden">
            <div className="divide-y divide-card-border/50">
              {usuarios.map(u => (
                <div key={u.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      u.perfil === 'gerente' || u.perfil === 'admin'
                        ? 'bg-warning/15 border border-warning/30'
                        : 'bg-primary-500/15 border border-primary-500/30'
                    }`}>
                      {u.perfil === 'gerente' || u.perfil === 'admin'
                        ? <ShieldCheck className="w-4 h-4 text-warning" />
                        : <User className="w-4 h-4 text-primary-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-200">{u.nome}</p>
                        {u.id === usuario?.id && (
                          <span className="text-xs text-muted">(você)</span>
                        )}
                      </div>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[u.perfil] || 'bg-surface text-muted'}`}>
                      {u.perfil}
                    </span>
                    {u.id !== usuario?.id && (
                      <button
                        onClick={() => toggleAtivo(u.id, u.ativo)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          u.ativo
                            ? 'border-danger/30 text-danger hover:bg-danger/10'
                            : 'border-success/30 text-success hover:bg-success/10'
                        }`}
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                    {!u.ativo && (
                      <span className="text-xs text-muted italic">desativado</span>
                    )}
                  </div>
                </div>
              ))}
              {usuarios.length === 0 && (
                <p className="text-center text-muted text-sm py-8">Nenhum usuário cadastrado</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
