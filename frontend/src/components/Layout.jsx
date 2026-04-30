import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  FlaskConical, Search, BookMarked, Settings, LogOut,
  ChevronDown, User, Microscope, BarChart3
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/busca', icon: Search, label: 'Buscar Leads' },
  { to: '/leads', icon: BookMarked, label: 'Meus Leads' },
];

export default function Layout() {
  const { usuario, logout, isGerente } = useAuth();
  const navigate = useNavigate();
  const [userMenuAberto, setUserMenuAberto] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Até logo!');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navbar */}
      <header className="h-16 glass sticky top-0 z-[100] px-4 md:px-8 flex items-center gap-8">
        {/* Logo */}
        <NavLink to="/busca" className="flex items-center gap-3 flex-shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-800 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300">
            <FlaskConical className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter text-white leading-none">ÍCARO</span>
            <span className="text-[10px] font-bold text-primary-500/80 uppercase tracking-widest mt-0.5">Prospect Pro</span>
          </div>
        </NavLink>

        {/* Nav links */}
        <nav className="flex items-center gap-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 border ${
                  isActive
                    ? 'bg-primary-500/10 text-primary-500 border-primary-500/20 shadow-lg shadow-primary-500/5'
                    : 'text-muted-foreground border-transparent hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                  <span className="hidden md:block">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          {isGerente && (
            <NavLink
              to="/configuracoes"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 border ${
                  isActive
                    ? 'bg-primary-500/10 text-primary-500 border-primary-500/20 shadow-lg shadow-primary-500/5'
                    : 'text-muted-foreground border-transparent hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Settings className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                  <span className="hidden md:block">Ajustes</span>
                </>
              )}
            </NavLink>
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User menu */}
        <div className="relative">
          <button
            id="btn-user-menu"
            onClick={() => setUserMenuAberto(v => !v)}
            className="flex items-center gap-3 px-4 py-2 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-300"
          >
            <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
              <User className="w-4 h-4 text-primary-500" />
            </div>
            <div className="hidden sm:flex flex-col items-start text-left">
              <span className="text-xs font-bold text-white max-w-[100px] truncate leading-tight">
                {usuario?.nome}
              </span>
              <span className="text-[9px] font-black uppercase text-primary-500 tracking-widest">
                {usuario?.perfil}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${userMenuAberto ? 'rotate-180' : ''}`} />
          </button>

          {userMenuAberto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuAberto(false)} />
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-3 w-64 card p-2 z-50 overflow-hidden"
              >
                <div className="px-4 py-3 bg-white/5 rounded-xl mb-1">
                  <p className="text-sm font-bold text-white truncate">{usuario?.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{usuario?.email}</p>
                </div>
                
                <button
                  id="btn-logout"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  Encerrar Sessão
                </button>
              </motion.div>
            </>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
