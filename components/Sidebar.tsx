
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavItem } from '../types';
import { useUser } from '../UserContext';

// Itens que ficarão DENTRO de Gestão Empresarial
const managementSubItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/' },
  { icon: 'attach_money', label: 'Financeiro', path: '/financas' }, // Módulo Financeiro
  { icon: 'house', label: 'Custos Fixos Mensais', path: '/custos' },
  { icon: 'calendar_month', label: 'Agenda', path: '/agenda' },
  { icon: 'event_note', label: 'Gestão de Eventos', path: '/eventos' },
  { icon: 'calculate', label: 'Calculadora de Evento', path: '/calculadora' },
  { icon: 'group', label: 'Cadastros', path: '/cadastro' },
  { icon: 'local_shipping', label: 'Logística', path: '/logistica' },
];

// Itens que ficarão DENTRO de Gestão Pessoal
const personalSubItems: NavItem[] = [
  { icon: 'person', label: 'Visão Geral', path: '/pessoal' },
  { icon: 'savings', label: 'Minhas Finanças', path: '/pessoal/financas' },
  { icon: 'flag', label: 'Metas & Objetivos', path: '/pessoal/metas' },
];

// Itens que ficarão FORA (Nível Raiz)
const independentItems: NavItem[] = [
  // Atualmente vazio
];

const systemItems: NavItem[] = [
  { icon: 'settings', label: 'Configurações', path: '/settings' },
  { icon: 'help', label: 'Ajuda', path: '/help' },
];

interface SidebarProps {
    isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  
  // Estados para controlar se os menus estão abertos
  const [isManagementOpen, setIsManagementOpen] = useState(true);
  const [isPersonalOpen, setIsPersonalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isManagementActive = managementSubItems.some(item => item.path === location.pathname);
  const isPersonalActive = personalSubItems.some(item => item.path === location.pathname);

  // Abre automaticamente o menu se estiver na rota
  useEffect(() => {
      if (isPersonalActive) setIsPersonalOpen(true);
      // Management já inicia aberto por padrão, mas se quiser forçar:
      // if (isManagementActive) setIsManagementOpen(true);
  }, [location.pathname]);

  const renderNavItem = (item: NavItem, isSubItem: boolean = false) => (
    <button
      key={item.path}
      onClick={() => navigate(item.path)}
      className={`nav-item w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium rounded-full transition-all duration-300 group relative isolation-auto 
        ${isSubItem ? 'pl-10 text-xs' : ''} 
        ${isActive(item.path)
          ? 'text-primary bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10 shadow-[0_0_20px_rgba(0,240,255,0.05)]'
          : 'text-text-muted hover:text-white hover:bg-white/5'
      }`}
      title={!isOpen ? item.label : ''}
    >
      <span className={`material-symbols-outlined ${isSubItem ? 'text-[18px]' : 'text-[20px]'} ${isActive(item.path) ? '' : 'group-hover:text-primary transition-colors'}`}>
        {item.icon}
      </span>
      <span className={`font-display truncate transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden lg:block'}`}>
          {item.label}
      </span>
    </button>
  );

  return (
    <aside 
        className={`glass-panel rounded-[40px] z-10 flex-col transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] relative overflow-hidden shadow-glass hidden lg:flex shrink-0 ${isOpen ? 'w-[280px]' : 'w-[88px]'}`}
    >
      {/* Brand Header */}
      <div className="h-24 flex items-center px-8 relative shrink-0">
        <div className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary/20 blur-xl rounded-full"></div>
        <div className="flex items-center gap-3 relative z-10 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-black shadow-neon ring-2 ring-white/10 shrink-0">
                <span className="material-symbols-outlined text-[24px]">movie_filter</span>
            </div>
            <span className={`font-bold text-xl tracking-tight text-white font-display transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                CineFlow
            </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar">
        
        {/* --- MENU PAI: GESTÃO EMPRESARIAL --- */}
        <div className="mb-1">
            <button 
                onClick={() => setIsManagementOpen(!isManagementOpen)}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium rounded-full transition-all duration-300 group hover:bg-white/5 
                ${isManagementActive ? 'text-white' : 'text-text-muted'}`}
                title={!isOpen ? "Gestão Empresarial" : ''}
            >
                <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${isManagementActive ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                        domain
                    </span>
                    <span className={`font-display transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden lg:block'}`}>
                        Gestão Empresarial
                    </span>
                </div>
                {isOpen && (
                    <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isManagementOpen ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                )}
            </button>

            {/* SUBITENS (Dropdown) */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isManagementOpen ? 'max-h-[600px] opacity-100 mt-1 space-y-1' : 'max-h-0 opacity-0'}`}>
                {managementSubItems.map(item => renderNavItem(item, true))}
            </div>
        </div>

        {/* --- MENU PAI: GESTÃO PESSOAL --- */}
        <div className="mb-2">
            <button 
                onClick={() => setIsPersonalOpen(!isPersonalOpen)}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium rounded-full transition-all duration-300 group hover:bg-white/5 
                ${isPersonalActive ? 'text-white' : 'text-text-muted'}`}
                title={!isOpen ? "Gestão Pessoal" : ''}
            >
                <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${isPersonalActive ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                        face
                    </span>
                    <span className={`font-display transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden lg:block'}`}>
                        Gestão Pessoal
                    </span>
                </div>
                {isOpen && (
                    <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isPersonalOpen ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                )}
            </button>

            {/* SUBITENS (Dropdown) */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isPersonalOpen ? 'max-h-[300px] opacity-100 mt-1 space-y-1' : 'max-h-0 opacity-0'}`}>
                {personalSubItems.map(item => renderNavItem(item, true))}
            </div>
        </div>

        {independentItems.length > 0 && (
            <>
                <div className={`px-4 mt-6 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] opacity-70 transition-opacity ${isOpen ? 'opacity-70' : 'opacity-0 hidden'}`}>Ferramentas</div>
                {independentItems.map(item => renderNavItem(item))}
            </>
        )}

        <div className={`px-4 mt-6 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] opacity-70 transition-opacity ${isOpen ? 'opacity-70' : 'opacity-0 hidden'}`}>Sistema</div>
        {systemItems.map(item => renderNavItem(item))}
      </div>

      <div className="p-4 mt-auto shrink-0">
        <div className="p-1 rounded-full bg-gradient-to-r from-white/5 to-transparent border border-white/5">
            <div 
                onClick={() => navigate('/settings')}
                className="flex items-center gap-3 p-2 rounded-full hover:bg-white/5 cursor-pointer transition-colors group"
            >
                <div className="relative shrink-0">
                    <img alt="Avatar" className="w-10 h-10 rounded-full border border-white/10 group-hover:border-primary/50 transition-colors object-cover" src={user.avatar} />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                </div>
                <div className={`flex-1 min-w-0 pr-2 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                    <p className="text-sm font-bold text-white truncate font-display group-hover:text-primary transition-colors">{user.name}</p>
                    <p className="text-[10px] text-text-muted truncate">Admin</p>
                </div>
                <span className={`material-symbols-outlined text-text-muted text-sm mr-2 ${isOpen ? '' : 'hidden'}`}>more_vert</span>
            </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
