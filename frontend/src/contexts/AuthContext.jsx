import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const salvarSessao = (dados) => {
    localStorage.setItem('icaro_access_token', dados.access_token);
    localStorage.setItem('icaro_refresh_token', dados.refresh_token);
    setUsuario(dados.usuario);
  };

  const limparSessao = useCallback(() => {
    localStorage.removeItem('icaro_access_token');
    localStorage.removeItem('icaro_refresh_token');
    setUsuario(null);
  }, []);

  // Verifica sessão ao iniciar
  useEffect(() => {
    const token = localStorage.getItem('icaro_access_token');
    if (!token) {
      setCarregando(false);
      return;
    }
    authApi.me()
      .then(({ data }) => setUsuario(data))
      .catch(() => limparSessao())
      .finally(() => setCarregando(false));
  }, [limparSessao]);

  const login = async (email, senha) => {
    const { data } = await authApi.login(email, senha);
    salvarSessao(data);
    return data;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignora */ }
    limparSessao();
  };

  const isGerente = usuario?.perfil === 'gerente' || usuario?.perfil === 'admin';

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, isGerente }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
