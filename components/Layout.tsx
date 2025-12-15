
import React, { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAgenda } from '../AgendaContext';
import { useFinance } from '../FinanceContext';
import { useLogistics } from '../LogisticsContext';

const bottomNavItems = [
    { icon: 'dashboard', label: 'Dashboard', path: '/' },
    { icon: 'calendar_month', label: 'Agenda', path: '/agenda' },
    { icon: 'calculate', label: 'Jobs', path: '/calculadora' },
    { icon: 'house', label: 'Custos Fixos', path: '/custos' },
];

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[400px] animate-fade-in">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-white/5 border-t-primary animate-spin"></div>
        <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary/20 animate-ping opacity-20"></div>
      </div>
      <p className="text-text-muted text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Carregando...</p>
    </div>
  </div>
);

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  // --- CONTEXTOS PARA NOTIFICAÇÕES ---
  const { events, updateEvent } = useAgenda();
  const { addTransaction, costs, receivables } = useFinance();
  const { transactions: logisticsTransactions } = useLogistics();

  // Fecha notificações ao clicar fora
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
              setIsNotificationsOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HANDLERS DE APROVAÇÃO DE PAGAMENTO ---
  
  const handleApprovePayment = (event: any) => {
      const numericVal = parseFloat(event.value.replace(/[^\d,]/g, '').replace(',', '.'));

      if (!isNaN(numericVal) && numericVal > 0) {
          // 1. Adiciona o valor ao Saldo Disponível
          addTransaction({
              id: `auto-${event.id}-${Date.now()}`,
              description: `Recebimento Agenda: ${event.title}`,
              amount: numericVal,
              type: 'income',
              category: 'Serviço',
              date: new Date().toISOString().split('T')[0]
          });

          // 2. Atualiza o status do evento para 'completed'
          updateEvent({ 
              ...event, 
              status: 'completed' 
          });
          
          // alert(`Pagamento de ${event.title} aprovado com sucesso!`);
      }
  };

  const handleEditPaymentDate = (event: any) => {
      // Navega para a agenda e passa o ID do evento para abrir o modal
      navigate('/agenda', { state: { editEventId: event.id } });
      setIsNotificationsOpen(false);
  };

  // --- LÓGICA DE NOTIFICAÇÕES IMPORTANTES ---
  const notifications = useMemo(() => {
      const list: any[] = [];
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();

      // 1. PAGAMENTOS DA AGENDA (Aprovação Manual)
      events.forEach(event => {
          if (!event.value || event.status === 'completed' || !event.receiptReminder) return;

          const dateStr = event.paymentDate || event.date;
          let timeStr = event.paymentTime;
          if (!timeStr && event.time) timeStr = event.time.split(' - ')[0];
          if (!timeStr || timeStr.length < 5) timeStr = "09:00";

          const [year, month, day] = dateStr.split('-').map(Number);
          const [hour, minute] = timeStr.split(':').map(Number);
          const scheduleDate = new Date(year, month - 1, day, hour || 0, minute || 0, 0);

          // Se chegou a hora do pagamento
          if (now >= scheduleDate) {
              list.push({
                  id: `pay-${event.id}`,
                  type: 'payment_approval', // Tipo especial
                  icon: 'savings',
                  color: 'text-yellow-400',
                  bg: 'bg-yellow-500/10',
                  title: 'Recebimento Disponível',
                  desc: `Aprovar entrada de ${event.value}?`,
                  eventData: event,
                  action: () => {} // Ação padrão vazia, usa botões específicos
              });
          }
      });

      // 2. Agenda: Eventos de Hoje Pendentes (não pagos)
      const todayEvents = events.filter(e => e.date === todayStr && e.status !== 'completed' && !list.find(n => n.id === `pay-${e.id}`));
      if (todayEvents.length > 0) {
          list.push({
              id: 'agenda-today',
              type: 'info',
              icon: 'event',
              color: 'text-primary',
              bg: 'bg-primary/10',
              title: 'Agenda de Hoje',
              desc: `Você tem ${todayEvents.length} compromissos agendados para hoje.`,
              action: () => navigate('/agenda')
          });
      }

      // 3. Financeiro: Contas Fixas Pendentes (Ativas)
      const pendingCosts = costs.filter(c => c.active && c.status === 'pending');
      if (pendingCosts.length > 0) {
          const totalPending = pendingCosts.reduce((acc, c) => acc + c.amount, 0);
          list.push({
              id: 'costs-pending',
              type: 'info',
              icon: 'payments',
              color: 'text-red-400',
              bg: 'bg-red-500/10',
              title: 'Contas a Pagar',
              desc: `${pendingCosts.length} contas pendentes (Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)}).`,
              action: () => navigate('/custos')
          });
      }

      // 4. Logística: Pendências
      const pendingLogistics = logisticsTransactions.filter(t => t.status === 'pending');
      if (pendingLogistics.length > 0) {
          list.push({
              id: 'logistics-pending',
              type: 'info',
              icon: 'local_shipping',
              color: 'text-orange-400',
              bg: 'bg-orange-500/10',
              title: 'Logística',
              desc: `${pendingLogistics.length} envios/serviços aguardando conclusão.`,
              action: () => navigate('/logistica')
          });
      }

      return list;
  }, [events, costs, logisticsTransactions, receivables, navigate]);

  const renderBottomNavLink = (item: typeof bottomNavItems[0]) => {
    const isActive = location.pathname === item.path;
    return (
      <button 
        key={item.path}
        onClick={() => navigate(item.path)} 
        className="flex flex-col items-center justify-center flex-1 gap-1 py-2 transition-transform active:scale-95 focus:outline-none"
      >
          <div className="relative">
              <span className={`material-symbols-outlined transition-all duration-300 ${isActive ? 'text-primary' : 'text-slate-500'}`}>
                  {item.icon}
              </span>
              {isActive && <div className="absolute -top-1 -right-1 size-1.5 bg-primary rounded-full animate-ping"></div>}
          </div>
          <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-primary' : 'text-slate-500'}`}>
              {item.label}
          </span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden p-2 lg:p-4 gap-4 relative">
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-secondary/5 rounded-full blur-[120px]"></div>
        <div className="curve-bg w-[150vh] h-[150vh] -top-[50vh] -left-[20vh] border-primary/10"></div>
        <div className="curve-bg w-[120vh] h-[120vh] -bottom-[40vh] -right-[10vh] border-secondary/10"></div>
        <div className="curve-bg w-[80vh] h-[80vh] top-[10vh] left-[40vh] border-white/5 opacity-50"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
      </div>

      {/* Sidebar for Desktop - Now Floating */}
      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 glass-panel rounded-[30px] lg:rounded-[40px] shadow-glass shadow-2xl transition-all duration-300">
        {/* Top Navbar */}
        <header className="h-20 lg:h-24 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-20 bg-gradient-to-b from-surface/80 to-transparent backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4 lg:gap-6">
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-full hover:bg-white/5 text-text-muted hover:text-primary transition-colors lg:hidden"
            >
                <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden sm:block">
                <h2 className="text-xl lg:text-2xl font-bold font-display tracking-tight text-white">
                    {location.pathname === '/' ? 'Dashboard' : 
                     location.pathname.includes('agenda') ? 'Agenda' :
                     location.pathname.includes('custos') ? 'Custos Fixos Mensais' :
                     location.pathname.includes('calculadora') ? 'Calculadora de Evento' :
                     location.pathname.includes('financas') ? 'Finanças' : 'CineFlow'}
                </h2>
                <p className="text-[10px] lg:text-[11px] text-primary uppercase tracking-widest font-bold opacity-80">
                    {location.pathname === '/' ? 'Visão Geral' : 'Sistema'}
                </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Search Bar - Stylized */}
            <div className="relative hidden md:block group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-text-muted group-focus-within:text-primary transition-colors text-[22px]">search</span>
                </div>
                <input 
                    className="w-64 lg:w-96 h-12 pl-12 pr-6 rounded-full bg-surface-light/40 border border-white/5 text-sm focus:ring-1 focus:ring-primary focus:bg-surface-light/60 focus:border-primary text-white placeholder-text-muted transition-all shadow-inner" 
                    placeholder="O que você procura hoje?" 
                    type="text" 
                />
            </div>
            
            <div className="flex items-center gap-3" ref={notifRef}>
              <div className="relative">
                  <button 
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className={`relative w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-full transition-all border ${isNotificationsOpen ? 'bg-white/10 text-white border-white/10' : 'text-text-muted hover:text-white hover:bg-white/5 border-transparent hover:border-white/5 hover:scale-105'}`}
                  >
                    <span className="material-symbols-outlined">notifications</span>
                    {notifications.length > 0 && (
                        <span className="absolute top-2.5 right-3 w-2.5 h-2.5 bg-accent rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse border border-background"></span>
                    )}
                  </button>

                  {/* Dropdown de Notificações */}
                  {isNotificationsOpen && (
                      <div className="absolute right-0 top-full mt-4 w-80 md:w-96 glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-fade-in origin-top-right z-50">
                          <div className="p-4 border-b border-white/5 bg-surface-light/50 flex justify-between items-center">
                              <h3 className="font-bold text-white text-sm">Notificações</h3>
                              <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-text-muted">{notifications.length} Novas</span>
                          </div>
                          <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-surface/50">
                              {notifications.length === 0 ? (
                                  <div className="p-8 text-center text-text-muted">
                                      <span className="material-symbols-outlined text-4xl opacity-30 mb-2">notifications_off</span>
                                      <p className="text-xs">Nenhuma notificação importante no momento.</p>
                                  </div>
                              ) : (
                                  <div className="divide-y divide-white/5">
                                      {notifications.map((notif) => (
                                          <div 
                                            key={notif.id} 
                                            className="p-4 hover:bg-white/5 transition-colors group flex gap-4 items-start relative"
                                          >
                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.bg} ${notif.color}`}>
                                                  <span className="material-symbols-outlined text-[20px]">{notif.icon}</span>
                                              </div>
                                              <div className="flex-1">
                                                  <h4 className={`text-sm font-bold mb-1 group-hover:text-white transition-colors ${notif.color}`}>{notif.title}</h4>
                                                  <p className="text-xs text-slate-400 leading-relaxed mb-2">{notif.desc}</p>
                                                  
                                                  {/* Botões de Ação para Aprovação de Pagamento */}
                                                  {notif.type === 'payment_approval' ? (
                                                      <div className="flex gap-2 mt-2">
                                                          <button 
                                                              onClick={() => handleApprovePayment(notif.eventData)}
                                                              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/50 rounded-lg text-[10px] font-bold uppercase transition-all flex-1"
                                                          >
                                                              Aprovar
                                                          </button>
                                                          <button 
                                                              onClick={() => handleEditPaymentDate(notif.eventData)}
                                                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] font-bold uppercase transition-all flex-1"
                                                          >
                                                              Editar
                                                          </button>
                                                      </div>
                                                  ) : (
                                                      <div onClick={() => { notif.action(); setIsNotificationsOpen(false); }} className="absolute inset-0 cursor-pointer"></div>
                                                  )}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                          {notifications.length > 0 && (
                              <div className="p-2 border-t border-white/5 bg-surface-light/30 text-center">
                                  <p className="text-[10px] text-text-muted">Sistema de Alertas Inteligente</p>
                              </div>
                          )}
                      </div>
                  )}
              </div>

              <button 
                onClick={() => window.location.reload()} 
                className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 hover:rotate-180 rounded-full transition-all duration-500 border border-transparent hover:border-primary/20"
                title="Recarregar Sistema"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-10 md:py-6 scroll-smooth pb-20 lg:pb-8 custom-scrollbar relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-primary/5 to-transparent rounded-bl-[100%] pointer-events-none -z-10 blur-3xl"></div>
            <Suspense fallback={<LoadingScreen />}>
              <Outlet />
            </Suspense>
        </div>

        {/* Bottom Nav for Mobile */}
        <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl flex items-stretch justify-around z-30 shadow-neon-sm py-2">
            {bottomNavItems.map(renderBottomNavLink)}
        </nav>
      </main>
    </div>
  );
};

export default Layout;
