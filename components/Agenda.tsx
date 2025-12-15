
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarEvent } from '../types';
import { useAgenda } from '../AgendaContext';
import { useFinance } from '../FinanceContext';

interface AgendaProps {
    scope?: 'business' | 'personal';
}

type ViewMode = 'month' | 'week' | 'day' | 'year';

const Agenda: React.FC<AgendaProps> = ({ scope = 'business' }) => {
  const { events, addEvent, updateEvent, deleteEvent } = useAgenda();
  const { addTransaction } = useFinance();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- FILTERED EVENTS BY SCOPE ---
  const filteredEvents = useMemo(() => {
      return events.filter(e => (e.scope || 'business') === scope);
  }, [events, scope]);

  // --- DRAG AND DROP STATE ---
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<CalendarEvent>>({});

  // --- AUTO OPEN MODAL FROM NAVIGATION STATE (NOTIFICATION) ---
  useEffect(() => {
      if (location.state && location.state.editEventId) {
          const eventToEdit = events.find(e => e.id === location.state.editEventId);
          if (eventToEdit) {
              setModalData({...eventToEdit});
              setIsModalOpen(true);
              // Clear the navigation state to prevent modal from re-opening after updates
              navigate(location.pathname, { replace: true, state: {} });
          }
      }
  }, [location.state, events, navigate, location.pathname]);

  const selectedEvent = useMemo(() => filteredEvents.find(e => e.id === selectedEventId), [selectedEventId, filteredEvents]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Helper Functions
  const formatDateStr = (date: Date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };

  // Fix timezone issue by formatting string directly
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDateStr(date);
    return filteredEvents.filter(e => {
        const isEventDate = e.date === dateStr;
        const isPaymentReminderDate = e.receiptReminder && e.paymentDate === dateStr;
        return isEventDate || isPaymentReminderDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const handlePrev = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setViewDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setViewDate(newDate);
  };

  const handleToday = () => setViewDate(new Date());

  const handleDayDoubleClick = (date: Date) => {
    const dateString = formatDateStr(date);
    setModalData({
        date: dateString,
        time: '09:00',
        endTime: '',
        title: '',
        value: '',
        description: '',
        location: '',
        status: 'pending',
        type: 'meeting',
        paymentDate: dateString, 
        paymentTime: '09:00',
        receiptReminder: false
    });
    setIsModalOpen(true);
  };

  const handleEventDoubleClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setModalData({ ...event });
    setIsModalOpen(true);
  };

  const handleSaveEvent = () => {
      if (!modalData.title || !modalData.date) {
          alert('Título e Data são obrigatórios');
          return;
      }
      
      const newEvent: CalendarEvent = {
          id: modalData.id || Date.now().toString(),
          title: modalData.title,
          date: modalData.date,
          time: modalData.time || '09:00',
          endTime: modalData.endTime || '',
          type: modalData.type || 'meeting',
          status: modalData.status || 'pending',
          value: modalData.value,
          description: modalData.description,
          location: modalData.location,
          meetLink: modalData.meetLink,
          paymentDate: modalData.paymentDate || modalData.date, 
          paymentTime: modalData.paymentTime || '09:00', 
          receiptReminder: modalData.receiptReminder || false,
          day: new Date(modalData.date).getDate(),
          scope: (modalData.scope as 'business' | 'personal') || scope // Preserve scope if editing, else use current
      };

      if (modalData.id) {
          updateEvent(newEvent);
      } else {
          addEvent(newEvent);
      }

      setSelectedEventId(newEvent.id);
      setIsModalOpen(false);
  };

  const handleDeleteEvent = () => {
    if (!modalData.id) return;
    deleteEvent(modalData.id);
    if (selectedEventId === modalData.id) {
        setSelectedEventId(null);
    }
    setIsModalOpen(false);
  };

  const handleManualPayment = () => {
      const event = selectedEvent;
      if (!event) return;
      
      if (!event.value) {
          alert("Este evento não possui valor financeiro para dar baixa.");
          return;
      }

      if (window.confirm(`Confirmar recebimento de R$ ${event.value} referente a "${event.title}"?`)) {
          const numericVal = parseFloat(event.value.replace(/[^\d,]/g, '').replace(',', '.'));
          
          if (isNaN(numericVal)) {
              alert("Valor inválido.");
              return;
          }

          addTransaction({
              id: `manual-agenda-${event.id}-${Date.now()}`,
              description: `Recebimento Agenda (Manual): ${event.title}`,
              amount: numericVal,
              type: 'income',
              category: 'Serviço',
              date: new Date().toISOString().split('T')[0],
              scope: event.scope || scope 
          });

          updateEvent({ ...event, status: 'completed' });
          setSelectedEventId(null);
          alert("Pagamento registrado com sucesso!");
      }
  };

  // --- DRAG AND DROP HANDLERS ---

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnDate = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedEvent) return;

    const newDateStr = formatDateStr(targetDate);
    
    if (draggedEvent.date !== newDateStr) {
        const updatedEvent = { 
            ...draggedEvent, 
            date: newDateStr,
            day: targetDate.getDate()
        };

        if (draggedEvent.paymentDate === draggedEvent.date) {
            updatedEvent.paymentDate = newDateStr;
        }

        updateEvent(updatedEvent);
    }
    setDraggedEvent(null);
  };

  const handleDropOnTime = (e: React.DragEvent, targetDate: Date, hour: number) => {
      e.preventDefault();
      if (!draggedEvent) return;

      const newDateStr = formatDateStr(targetDate);
      const newTimeStr = `${hour.toString().padStart(2, '0')}:00`;

      if (draggedEvent.date !== newDateStr || draggedEvent.time !== newTimeStr) {
          const updatedEvent = {
              ...draggedEvent,
              date: newDateStr,
              day: targetDate.getDate(),
              time: newTimeStr
          };
          updateEvent(updatedEvent);
      }
      setDraggedEvent(null);
  }


  // --- RENDERERS ---

  const renderEventBadge = (ev: CalendarEvent, dateContext?: Date) => {
      const currentDateStr = dateContext ? formatDateStr(dateContext) : ev.date;
      
      const isPaymentReminder = ev.receiptReminder && ev.paymentDate === currentDateStr;
      
      const isDragging = draggedEvent?.id === ev.id;

      return (
        <div 
            key={ev.id}
            draggable
            onDragStart={(e) => handleDragStart(e, ev)}
            onClick={(e) => { e.stopPropagation(); setSelectedEventId(ev.id); }}
            onDoubleClick={(e) => handleEventDoubleClick(e, ev)}
            className={`text-xs p-2 rounded-lg border truncate cursor-grab active:cursor-grabbing transition-all shadow-sm flex items-center justify-between gap-2 mb-1.5 ${
                isDragging ? 'opacity-50 scale-95' : 'opacity-100'
            } ${
                ev.status === 'completed' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : isPaymentReminder 
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]' 
                  : selectedEventId === ev.id 
                    ? 'bg-primary/20 text-white border-primary shadow-neon-sm'
                    : 'bg-surface-light/50 text-slate-300 border-white/10 hover:border-primary/50 hover:text-white'
            }`}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : isPaymentReminder ? 'bg-yellow-400 shadow-[0_0_5px_#facc15]' : 'bg-primary shadow-[0_0_5px_#00f0ff]'}`}></div>
                <span className="truncate font-medium">
                    {ev.time} {ev.title}
                </span>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
                 {isPaymentReminder && (
                    <span className="material-symbols-outlined text-[14px] text-yellow-400" title="Lembrete de Recebimento">savings</span>
                 )}
                 {ev.value && !isPaymentReminder && <span className="font-mono opacity-80 text-[9px]">{ev.value}</span>}
            </div>
        </div>
      );
  };

  const renderMonthView = () => {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const startDay = startOfMonth.getDay(); 
    const totalDays = endOfMonth.getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[120px] border border-white/5 bg-surface-light/10"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const currentDayDate = new Date(year, month, d);
      const dateEvents = getEventsForDate(currentDayDate);
      const isTodayDate = isToday(currentDayDate);
      
      days.push(
        <div 
          key={d} 
          onDoubleClick={() => handleDayDoubleClick(currentDayDate)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnDate(e, currentDayDate)}
          className={`min-h-[120px] p-2 border border-white/5 transition-colors hover:bg-white/5 relative group cursor-pointer ${isTodayDate ? 'bg-primary/5' : 'bg-transparent'}`}
        >
           <div className="flex justify-between items-start mb-2">
              <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-primary text-black shadow-neon-sm' : 'text-text-muted group-hover:text-white'}`}>
                  {d}
              </span>
           </div>
           
           <div className="space-y-1">
               {dateEvents.map(ev => renderEventBadge(ev, currentDayDate))}
           </div>
        </div>
      );
    }
    return (
        <>
            <div className="grid grid-cols-7 border-b border-white/5 bg-surface-light/10">
                {weekDayNames.map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-text-muted uppercase tracking-widest">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days}
            </div>
        </>
    );
  };

  const renderWeekView = () => {
      const startOfWeek = new Date(viewDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day; // Adjust to Sunday
      startOfWeek.setDate(diff);

      const days = [];
      for(let i=0; i<7; i++) {
          const current = new Date(startOfWeek);
          current.setDate(startOfWeek.getDate() + i);
          const isTodayDate = isToday(current);
          const dateEvents = getEventsForDate(current);

          const dropDate = new Date(current);

          days.push(
              <div 
                key={i} 
                className="flex-1 min-h-[400px] border-r border-white/5 last:border-r-0 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnDate(e, dropDate)}
              >
                  <div className={`p-3 text-center border-b border-white/5 ${isTodayDate ? 'bg-primary/10' : 'bg-surface-light/5'}`}>
                      <div className="text-xs font-bold text-text-muted uppercase mb-1">{weekDayNames[i]}</div>
                      <div className={`text-lg font-bold ${isTodayDate ? 'text-primary' : 'text-white'}`}>{current.getDate()}</div>
                  </div>
                  <div 
                    className="flex-1 p-2 space-y-2 hover:bg-white/5 transition-colors"
                    onDoubleClick={() => handleDayDoubleClick(current)}
                  >
                      {dateEvents.map(ev => renderEventBadge(ev, current))}
                  </div>
              </div>
          )
      }

      return (
          <div className="flex h-full overflow-x-auto">
              {days}
          </div>
      )
  };

  const renderDayView = () => {
      const dateEvents = getEventsForDate(viewDate);
      const isTodayDate = isToday(viewDate);
      
      const hours = Array.from({length: 24}, (_, i) => i);

      return (
          <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
              <div className="p-4 border-b border-white/5 flex items-center justify-center bg-surface-light/10">
                  <span className={`text-xl font-bold ${isTodayDate ? 'text-primary' : 'text-white'}`}>
                      {weekDayNames[viewDate.getDay()]}, {viewDate.getDate()} de {monthNames[viewDate.getMonth()]}
                  </span>
              </div>
              <div className="flex-1 relative">
                  {hours.map(hour => {
                      const hourEvents = dateEvents.filter(e => {
                          const eventHour = parseInt(e.time.split(':')[0]);
                          return eventHour === hour;
                      });

                      return (
                          <div 
                            key={hour} 
                            className="flex border-b border-white/5 min-h-[80px] group"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnTime(e, viewDate, hour)}
                          >
                              <div className="w-16 py-2 text-right pr-4 text-xs font-bold text-text-muted border-r border-white/5 bg-surface-light/5">
                                  {hour.toString().padStart(2, '0')}:00
                              </div>
                              <div 
                                className="flex-1 p-2 relative hover:bg-white/5 transition-colors"
                                onDoubleClick={() => {
                                    setModalData({
                                        date: formatDateStr(viewDate),
                                        time: `${hour.toString().padStart(2,'0')}:00`,
                                        title: '',
                                        paymentTime: `${hour.toString().padStart(2,'0')}:00`,
                                    });
                                    setIsModalOpen(true);
                                }}
                              >
                                  {hourEvents.map(ev => renderEventBadge(ev, viewDate))}
                              </div>
                          </div>
                      )
                  })}
                  {isTodayDate && (
                      <div 
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                        style={{ top: `${(currentTime.getHours() * 80) + (currentTime.getMinutes() * (80/60))}px` }} 
                      >
                          <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                      </div>
                  )}
              </div>
          </div>
      )
  };

  const renderYearView = () => {
      const yearMonths = Array.from({length: 12}, (_, i) => i);
      
      return (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
              {yearMonths.map(m => {
                  const daysInMonth = new Date(year, m + 1, 0).getDate();
                  const hasEvents = filteredEvents.some(e => {
                      const eDate = new Date(e.date);
                      return eDate.getFullYear() === year && eDate.getMonth() === m;
                  });

                  return (
                      <div 
                        key={m} 
                        className="bg-surface-light/10 border border-white/5 rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer group"
                        onClick={() => {
                            setViewDate(new Date(year, m, 1));
                            setViewMode('month');
                        }}
                      >
                          <div className="flex justify-between items-center mb-2">
                              <h3 className="font-bold text-white group-hover:text-primary transition-colors">{monthNames[m]}</h3>
                              {hasEvents && <div className="w-2 h-2 bg-primary rounded-full shadow-neon-sm"></div>}
                          </div>
                          <div className="text-xs text-text-muted">{daysInMonth} dias</div>
                      </div>
                  )
              })}
          </div>
      )
  };

  const getHeaderTitle = () => {
      if (viewMode === 'year') return `${year}`;
      if (viewMode === 'month') return <>{monthNames[month]} <span className="text-primary">{year}</span></>;
      if (viewMode === 'week') {
          const start = new Date(viewDate);
          const day = start.getDay();
          start.setDate(start.getDate() - day);
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          return `${start.getDate()}/${start.getMonth()+1} - ${end.getDate()}/${end.getMonth()+1}/${end.getFullYear()}`;
      }
      if (viewMode === 'day') return `${viewDate.getDate()} de ${monthNames[month]} de ${year}`;
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-10 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Agenda {scope === 'personal' ? '(Pessoal)' : ''}</h1>
          <p className="text-text-muted mt-1">Gerencie seus compromissos e recebimentos.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center justify-center">
            
            {/* Nav Controls */}
            <div className="flex bg-surface-light/50 backdrop-blur-md p-1 rounded-full border border-white/10">
                <button onClick={handlePrev} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-text-muted hover:text-white">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button onClick={handleToday} className="px-6 text-sm font-bold text-white hover:bg-white/10 rounded-full transition-all uppercase tracking-wide">
                    Hoje
                </button>
                <button onClick={handleNext} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-text-muted hover:text-white">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          
          {/* Calendar Grid Area */}
          <div className="lg:col-span-3 glass-panel rounded-[30px] border border-white/5 overflow-hidden flex flex-col">
               {/* Calendar Header with CSS Grid for absolute centering of buttons */}
               <div className="p-6 border-b border-white/5 grid grid-cols-1 md:grid-cols-3 items-center gap-4 bg-gradient-to-r from-surface-light/20 to-transparent shrink-0">
                   {/* Left: Title */}
                   <div className="justify-self-center md:justify-self-start">
                       <h2 className="text-2xl font-bold text-white capitalize font-display whitespace-nowrap">
                           {getHeaderTitle()}
                       </h2>
                   </div>

                   {/* Center: View Switcher */}
                   <div className="justify-self-center flex bg-surface-light/50 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg">
                        {(['day', 'week', 'month', 'year'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                    viewMode === mode 
                                    ? 'bg-primary/20 text-primary shadow-neon-sm border border-primary/20' 
                                    : 'text-text-muted hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Ano'}
                            </button>
                        ))}
                    </div>

                   {/* Right: Extra Info */}
                   <div className="justify-self-center md:justify-self-end">
                       {viewMode === 'month' && (
                           <div className="hidden md:flex gap-2">
                               <span className="text-xs font-bold text-text-muted uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full">{getEventsForDate(new Date()).length} eventos hoje</span>
                           </div>
                       )}
                   </div>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
                   {viewMode === 'month' && renderMonthView()}
                   {viewMode === 'week' && renderWeekView()}
                   {viewMode === 'day' && renderDayView()}
                   {viewMode === 'year' && renderYearView()}
               </div>
          </div>

          {/* Sidebar / Details */}
          <div className="lg:col-span-1 flex flex-col h-full min-h-0">
               <div className="glass-panel rounded-[30px] border border-white/5 p-6 h-full flex flex-col overflow-hidden">
                   <h3 className="text-lg font-bold text-white mb-6 font-display border-b border-white/5 pb-2 shrink-0">Detalhes</h3>
                   <div className="flex-1 overflow-y-auto custom-scrollbar">
                       {selectedEvent ? (
                           <div className="space-y-6">
                               <div className="pb-4 border-b border-white/5">
                                   <p className="text-xs text-primary uppercase font-bold mb-2 tracking-wider">Evento</p>
                                   <p className="text-xl font-bold text-white leading-tight">{selectedEvent.title}</p>
                                   <div className="flex items-center gap-2 mt-2 text-sm text-text-muted">
                                       <span className="material-symbols-outlined text-[16px]">schedule</span>
                                       {formatDisplayDate(selectedEvent.date)}
                                       <span>•</span>
                                       {selectedEvent.time} {selectedEvent.endTime ? `- ${selectedEvent.endTime}` : ''}
                                   </div>
                                   {selectedEvent.location && (
                                       <div className="flex items-center gap-2 mt-2 text-sm text-text-muted">
                                           <span className="material-symbols-outlined text-[16px]">location_on</span>
                                           {selectedEvent.location}
                                       </div>
                                   )}
                               </div>
                               
                               {selectedEvent.value && (
                                   <div className="pb-4 border-b border-white/5">
                                       <p className="text-xs text-primary uppercase font-bold mb-2 tracking-wider">Valor & Recebimento</p>
                                       <div className="flex items-center justify-between mb-2">
                                           <p className="text-2xl font-black text-white">R$ {selectedEvent.value}</p>
                                           <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${selectedEvent.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                               {selectedEvent.status === 'completed' ? 'Pago' : 'Pendente'}
                                           </div>
                                       </div>
                                       {selectedEvent.paymentDate && (
                                            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                                <span className="material-symbols-outlined text-[16px]">event_available</span>
                                                <span>Recebimento: {formatDisplayDate(selectedEvent.paymentDate)} às {selectedEvent.paymentTime || '09:00'}</span>
                                            </div>
                                       )}
                                   </div>
                               )}

                               {selectedEvent.description && (
                                   <div className="pb-4 border-b border-white/5">
                                       <p className="text-xs text-primary uppercase font-bold mb-2 tracking-wider">Descrição</p>
                                       <p className="text-sm text-slate-300 leading-relaxed">{selectedEvent.description}</p>
                                   </div>
                               )}

                               <div className="flex flex-col gap-3 mt-4">
                                   {selectedEvent.status !== 'completed' && selectedEvent.value && (
                                       <button 
                                          onClick={handleManualPayment}
                                          className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                                       >
                                           <span className="material-symbols-outlined text-[20px]">payments</span>
                                           Dar Baixa
                                       </button>
                                   )}
                                   <button 
                                      onClick={() => { setModalData({...selectedEvent}); setIsModalOpen(true); }}
                                      className="w-full py-3 bg-surface-light hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                   >
                                       <span className="material-symbols-outlined text-[20px]">edit</span>
                                       Editar
                                   </button>
                               </div>
                           </div>
                       ) : (
                           <div className="text-center py-20 text-text-muted flex flex-col items-center justify-center h-full">
                               <div className="w-20 h-20 rounded-full bg-surface-light/50 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-4xl opacity-30">event_note</span>
                               </div>
                               <p className="text-sm">Selecione um evento para ver detalhes.</p>
                           </div>
                       )}
                   </div>
               </div>
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="glass-panel w-full max-w-lg rounded-[30px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-surface-light/50 to-transparent">
                      <h3 className="text-xl font-bold text-white font-display">{modalData.id ? 'Editar Evento' : 'Novo Compromisso'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  
                  <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                      
                      {/* --- BLOCO 1: DADOS DO EVENTO --- */}
                      <div className="p-6 rounded-2xl border border-primary/30 bg-surface-light/20 shadow-[0_0_15px_rgba(0,240,255,0.05)] backdrop-blur-sm transition-all duration-300 hover:bg-surface-light/30 hover:border-primary/60 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] group/event">
                           <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                               <span className="material-symbols-outlined text-primary group-hover/event:text-white transition-colors">event</span>
                               <h4 className="text-sm font-bold text-primary uppercase tracking-widest group-hover/event:text-white transition-colors">Dados do Evento ({scope === 'personal' ? 'Pessoal' : 'Emp'})</h4>
                           </div>
                           
                           <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Título do Evento</label>
                                    <input 
                                        value={modalData.title || ''} 
                                        onChange={e => setModalData({...modalData, title: e.target.value})} 
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all font-medium"
                                        placeholder="Ex: Reunião com Cliente"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Localização</label>
                                    <input 
                                        value={modalData.location || ''} 
                                        onChange={e => setModalData({...modalData, location: e.target.value})} 
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all"
                                        placeholder="Endereço ou Link"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Data</label>
                                        <input 
                                            type="date"
                                            value={modalData.date || ''} 
                                            onChange={e => setModalData({...modalData, date: e.target.value})} 
                                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Horário (Início - Fim)</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="time"
                                                value={modalData.time || ''} 
                                                onChange={e => setModalData({...modalData, time: e.target.value})} 
                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-2 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all [color-scheme:dark] text-center"
                                            />
                                            <input 
                                                type="time"
                                                value={modalData.endTime || ''} 
                                                onChange={e => setModalData({...modalData, endTime: e.target.value})} 
                                                className="w-full bg-black/30 border border-white/10 rounded-xl px-2 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all [color-scheme:dark] text-center"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Valor Financeiro (Opcional)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">R$</span>
                                        <input 
                                            value={modalData.value || ''} 
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\D/g, '');
                                                if (!rawValue) {
                                                    setModalData({...modalData, value: ''});
                                                    return;
                                                }
                                                const val = parseFloat(rawValue) / 100;
                                                const formatted = val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                setModalData({...modalData, value: formatted});
                                            }}
                                            className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white font-mono text-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all"
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>
                           </div>
                      </div>

                      {/* --- BLOCO 2: PREVISÃO DE RECEBIMENTO --- */}
                      <div className="p-6 rounded-2xl border border-emerald-500/30 bg-surface-light/20 shadow-[0_0_15px_rgba(16,185,129,0.05)] backdrop-blur-sm transition-all duration-300 hover:bg-surface-light/30 hover:border-emerald-500/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] group/payment">
                          <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                               <span className="material-symbols-outlined text-emerald-400 group-hover/payment:text-white transition-colors">paid</span>
                               <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest group-hover/payment:text-white transition-colors">Previsão de Recebimento</h4>
                          </div>

                          <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Data do Pagamento</label>
                                      <input 
                                          type="date"
                                          value={modalData.paymentDate || ''} 
                                          onChange={e => setModalData({...modalData, paymentDate: e.target.value})} 
                                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none transition-all [color-scheme:dark]"
                                      />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Hora</label>
                                      <input 
                                          type="time"
                                          value={modalData.paymentTime || ''} 
                                          onChange={e => setModalData({...modalData, paymentTime: e.target.value})} 
                                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none transition-all [color-scheme:dark] text-center"
                                      />
                                  </div>
                              </div>
                              
                              <label className="flex items-center gap-3 cursor-pointer group/check bg-black/30 p-3 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors">
                                  <div className="relative flex items-center">
                                      <input 
                                        type="checkbox" 
                                        checked={modalData.receiptReminder || false} 
                                        onChange={e => setModalData({...modalData, receiptReminder: e.target.checked})}
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-surface-light transition-all checked:border-emerald-500 checked:bg-emerald-500" 
                                      />
                                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 peer-checked:opacity-100 material-symbols-outlined text-black text-[14px] font-bold">check</span>
                                  </div>
                                  <span className="text-sm font-medium text-slate-300 group-hover/check:text-white transition-colors">Notificar recebimento na agenda</span>
                              </label>
                          </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/5">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Observações Gerais</label>
                          <textarea 
                              value={modalData.description || ''} 
                              onChange={e => setModalData({...modalData, description: e.target.value})} 
                              className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none resize-none transition-all"
                              rows={2}
                              placeholder="Detalhes adicionais..."
                          />
                      </div>
                  </div>

                  <div className="p-6 border-t border-white/10 flex gap-4 bg-surface-light/30">
                      {modalData.id && (
                          <button 
                              onClick={handleDeleteEvent}
                              className="px-6 py-3.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold uppercase text-xs tracking-wide transition-colors"
                          >
                              Excluir
                          </button>
                      )}
                      <div className="flex-1 flex gap-4 justify-end">
                          <button onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-bold uppercase text-xs tracking-wide transition-colors">Cancelar</button>
                          <button onClick={handleSaveEvent} className="px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold uppercase text-xs tracking-wide shadow-neon hover:shadow-[0_0_20px_theme('colors.primary')] transition-all">Salvar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Agenda;
