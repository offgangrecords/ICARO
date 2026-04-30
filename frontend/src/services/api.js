import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000,
});

// Interceptor: adiciona token automaticamente
api.interceptors.request.use(config => {
  const token = localStorage.getItem('icaro_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: trata erros e renova token
api.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('icaro_refresh_token');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem('icaro_access_token', data.access_token);
          localStorage.setItem('icaro_refresh_token', data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          // Refresh falhou — faz logout
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// =================== AUTH ===================
export const authApi = {
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// =================== BUSCA ===================
export const buscaApi = {
  buscar: (params) => api.post('/busca', params),
  historico: (limit = 20) => api.get('/busca/historico', { params: { limit } }),
};

// =================== LEADS ===================
export const leadsApi = {
  listar: (params) => api.get('/leads', { params }),
  salvar: (leads, busca_id) => api.post('/leads', { leads, busca_id }),
  atualizar: (id, dados) => api.patch(`/leads/${id}`, dados),
  excluir: (id) => api.delete(`/leads/${id}`),

  exportarCSV: async (leads) => {
    const response = await api.post('/leads/exportar/csv', { leads }, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_icaro_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportarExcel: async (leads) => {
    const response = await api.post('/leads/exportar/excel', { leads }, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_icaro_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// =================== CONFIGURAÇÕES ===================
export const configApi = {
  listar: () => api.get('/configuracoes'),
  atualizar: (configuracoes) => api.patch('/configuracoes', { configuracoes }),
  listarTipos: () => api.get('/configuracoes/tipos'),
  adicionarTipo: (tipo) => api.post('/configuracoes/tipos', tipo),
  removerTipo: (id) => api.delete(`/configuracoes/tipos/${id}`),
  listarUsuarios: () => api.get('/configuracoes/usuarios'),
  criarUsuario: (dados) => api.post('/configuracoes/usuarios', dados),
  atualizarUsuario: (id, dados) => api.patch(`/configuracoes/usuarios/${id}`, dados),
};

// =================== DASHBOARD ===================
export const dashboardApi = {
  obterMetricas: () => api.get('/dashboard'),
  obterDetalhes: (params) => api.get('/dashboard/detalhes', { params }),
};

export default api;
