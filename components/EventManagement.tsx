
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AVEvent, CrewMember, VariableCost } from '../types';
import { useEvents } from '../EventsContext';

const EventManagement: React.FC = () => {
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedEventIds, setExpandedEventIds] = useState<string[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedEventForReport, setSelectedEventForReport] = useState<AVEvent | null>(null);
  const [reportOptions, setReportOptions] = useState({ includeCrew: true, includeVariable: true });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null; name: string }>({ isOpen: false, id: null, name: '' });

  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [clientName, setClientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDuration, setEventDuration] = useState(1);
  const [totalRevenue, setTotalRevenue] = useState('');

  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const [editingCrewId, setEditingCrewId] = useState<string | null>(null);
  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState('');
  const [crewRate, setCrewRate] = useState('');
  const [crewDays, setCrewDays] = useState(1);
  const [crewWorkDate, setCrewWorkDate] = useState('');
  const [crewPaymentDate, setCrewPaymentDate] = useState('');

  const [varCostList, setVarCostList] = useState<VariableCost[]>([]);
  const [varCostDesc, setVarCostDesc] = useState('');
  const [varCostCategory, setVarCostCategory] = useState<VariableCost['category']>('Alimentação');
  const [varCostAmount, setVarCostAmount] = useState('');
  const [varCostDate, setVarCostDate] = useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => { if(!dateStr) return '-'; const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`; };
  const applyCurrencyMask = (value: string) => { const rawValue = value.replace(/\D/g, ''); if (!rawValue) return ''; const amount = parseFloat(rawValue) / 100; return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }); };
  const parseCurrency = (value: string) => { if (!value) return 0; return parseFloat(value.replace(/\./g, '').replace(',', '.')); };

  const handleRevenueChange = (e: React.ChangeEvent<HTMLInputElement>) => setTotalRevenue(applyCurrencyMask(e.target.value));
  const handleCrewRateChange = (e: React.ChangeEvent<HTMLInputElement>) => setCrewRate(applyCurrencyMask(e.target.value));
  const handleVarCostAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setVarCostAmount(applyCurrencyMask(e.target.value));

  const toggleEventActive = (id: string) => { const event = events.find(e => e.id === id); if (event) updateEvent({ ...event, active: !event.active }); };
  const toggleDetails = (id: string) => setExpandedEventIds(prev => prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]);

  const handleAddCrewMember = () => {
    if (!crewName || !crewRole || !crewRate) { alert("Preencha Nome, Função e Diária."); return; }
    const rate = parseCurrency(crewRate);
    if (isNaN(rate)) { alert("Valor inválido"); return; }
    const days = crewDays > 0 ? crewDays : 1; const total = rate * days;
    const newMember: CrewMember = { id: editingCrewId || Date.now().toString(), name: crewName, role: crewRole, dailyRate: rate, daysWorked: days, totalValue: total, workDate: crewWorkDate || eventDate, paymentDate: crewPaymentDate || '', status: 'pending' };
    if (editingCrewId) { setCrewList(prev => prev.map(m => m.id === editingCrewId ? newMember : m)); setEditingCrewId(null); } else setCrewList(prev => [...prev, newMember]);
    setCrewName(''); setCrewRole(''); setCrewRate(''); setCrewDays(eventDuration); setCrewPaymentDate('');
  };

  const handleEditCrewMember = (member: CrewMember) => { setEditingCrewId(member.id); setCrewName(member.name); setCrewRole(member.role); setCrewRate(member.dailyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); setCrewDays(member.daysWorked); setCrewWorkDate(member.workDate); setCrewPaymentDate(member.paymentDate); };
  const handleCancelEditCrew = () => { setEditingCrewId(null); setCrewName(''); setCrewRole(''); setCrewRate(''); setCrewDays(eventDuration); setCrewPaymentDate(''); };
  const handleRemoveCrewMember = (id: string) => { if (editingCrewId === id) handleCancelEditCrew(); setCrewList(prev => prev.filter(c => c.id !== id)); };
  const toggleModalCrewStatus = (memberId: string) => setCrewList(prev => prev.map(c => c.id === memberId ? { ...c, status: c.status === 'paid' ? 'pending' : 'paid' } : c));
  const toggleCrewStatus = (eventId: string, memberId: string) => { const event = events.find(e => e.id === eventId); if (!event) return; const updatedCrew = event.crew.map(c => c.id === memberId ? { ...c, status: c.status === 'paid' ? 'pending' : 'paid' } : c); updateEvent({ ...event, crew: updatedCrew as any }); };

  const handleAddVariableCost = () => {
      if (!varCostDesc || !varCostAmount) { alert("Preencha descrição e valor."); return; }
      const amount = parseCurrency(varCostAmount); if (isNaN(amount)) { alert("Valor inválido"); return; }
      const newCost: VariableCost = { id: Date.now().toString(), category: varCostCategory, description: varCostDesc, amount: amount, date: varCostDate || eventDate, status: 'pending' };
      setVarCostList(prev => [...prev, newCost]); setVarCostDesc(''); setVarCostAmount(''); setVarCostCategory('Alimentação'); setVarCostDate('');
  };
  const handleRemoveVariableCost = (id: string) => setVarCostList(prev => prev.filter(v => v.id !== id));
  const toggleModalVarCostStatus = (costId: string) => setVarCostList(prev => prev.map(c => c.id === costId ? { ...c, status: c.status === 'paid' ? 'pending' : 'paid' } : c));
  const toggleVariableCostStatus = (eventId: string, costId: string) => { const event = events.find(e => e.id === eventId); if (!event) return; const updatedVars = (event.variableCosts || []).map(v => v.id === costId ? { ...v, status: v.status === 'paid' ? 'pending' : 'paid' } : v); updateEvent({ ...event, variableCosts: updatedVars as any }); };

  const openModal = (event?: AVEvent) => {
      handleCancelEditCrew();
      if (event) { setEventId(event.id); setEventName(event.eventName); setClientName(event.clientName); setEventDate(event.eventDate); setEventDuration(event.eventDuration || 1); setTotalRevenue(event.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); setCrewList(event.crew); setVarCostList(event.variableCosts || []); setCrewWorkDate(event.eventDate); setCrewDays(event.eventDuration || 1); } 
      else { setEventId(null); setEventName(''); setClientName(''); setEventDate(''); setEventDuration(1); setTotalRevenue(''); setCrewList([]); setVarCostList([]); setCrewWorkDate(''); setCrewDays(1); }
      setIsModalOpen(true);
  };

  const handleSaveEvent = () => {
      if (!eventName || !clientName || !eventDate) { alert("Preencha dados do evento."); return; }
      const revenue = parseCurrency(totalRevenue);
      const newEvent: AVEvent = { id: eventId || Date.now().toString(), eventName, clientName, eventDate, eventDuration: eventDuration > 0 ? eventDuration : 1, totalRevenue: isNaN(revenue) ? 0 : revenue, status: 'scheduled', active: true, crew: crewList, variableCosts: varCostList };
      if (eventId) { const oldEvent = events.find(e => e.id === eventId); updateEvent({ ...newEvent, active: oldEvent?.active ?? true }); } else addEvent(newEvent);
      setIsModalOpen(false);
  };

  const requestDelete = (id: string, name: string) => setDeleteConfirm({ isOpen: true, id, name });
  const confirmDelete = () => { if (deleteConfirm.id) deleteEvent(deleteConfirm.id); setDeleteConfirm({ isOpen: false, id: null, name: '' }); };
  const openReportModal = (event: AVEvent) => { setSelectedEventForReport(event); setReportModalOpen(true); };
  const handlePrintReport = () => { window.print(); setReportModalOpen(false); };

  const stats = useMemo(() => {
      const activeEvents = events.filter(e => e.active !== false); const totalEvents = activeEvents.length;
      const totalProjectedCost = activeEvents.reduce((acc, ev) => acc + ev.crew.reduce((s, c) => s + c.totalValue, 0) + (ev.variableCosts || []).reduce((s, v) => s + v.amount, 0), 0);
      const totalPaidCost = activeEvents.reduce((acc, ev) => acc + ev.crew.reduce((s, c) => c.status === 'paid' ? s + c.totalValue : s, 0) + (ev.variableCosts || []).reduce((s, v) => v.status === 'paid' ? s + v.amount : s, 0), 0);
      const totalRevenueAll = activeEvents.reduce((acc, ev) => acc + ev.totalRevenue, 0);
      const currentBalance = totalRevenueAll - totalPaidCost;
      return { totalEvents, totalProjectedCost, totalRevenueAll, currentBalance };
  }, [events]);

  const printStyles = `@media print { body * { visibility: hidden; } #printable-report, #printable-report * { visibility: visible; } #printable-report { position: absolute; left: 0; top: 0; width: 100%; min-height: 100vh; background: white; color: black; padding: 40px; z-index: 9999; } .no-print { display: none !important; } }`;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-10">
      <style>{printStyles}</style>
      <nav className="flex text-sm text-text-muted no-print"><ol className="flex items-center gap-2"><li><Link to="/" className="hover:text-primary transition-colors">Dashboard</Link></li><li className="text-slate-600">/</li><li className="font-medium text-white">Eventos & Equipe</li></ol></nav>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-white flex items-center gap-2 font-display">Gestão de Eventos</h1><p className="text-text-muted mt-1">Controle completo de cachês e custos variáveis.</p></div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-black rounded-xl font-bold shadow-neon transition-all active:scale-95 w-fit uppercase text-xs tracking-wider"><span className="material-symbols-outlined text-[20px]">add</span> Novo Evento</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-[30px] border border-white/5 relative overflow-hidden group"><div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span className="material-symbols-outlined text-8xl text-white">attach_money</span></div><p className="text-text-muted text-xs font-bold uppercase tracking-wider">Custo Projetado (Ativos)</p><h3 className="text-3xl font-bold text-white mt-1 font-display">{formatCurrency(stats.totalProjectedCost)}</h3></div>
          <div className="glass-panel p-6 rounded-[30px] border border-white/5 relative overflow-hidden group"><div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span className="material-symbols-outlined text-8xl text-emerald-400">account_balance_wallet</span></div><p className="text-text-muted text-xs font-bold uppercase tracking-wider">Saldo Atual (Líquido)</p><h3 className="text-3xl font-bold text-emerald-400 mt-1 font-display">{formatCurrency(stats.currentBalance)}</h3></div>
          <div className="glass-panel p-6 rounded-[30px] border border-white/5 relative overflow-hidden group"><div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span className="material-symbols-outlined text-8xl text-secondary">event</span></div><p className="text-text-muted text-xs font-bold uppercase tracking-wider">Eventos Ativos</p><h3 className="text-3xl font-bold text-white mt-1 font-display">{stats.totalEvents}</h3></div>
      </div>

      <div className="grid grid-cols-1 gap-6">
          {events.map(event => {
              const isActive = event.active !== false; const isExpanded = expandedEventIds.includes(event.id);
              const crewCost = event.crew.reduce((sum, c) => sum + c.totalValue, 0); const varCost = (event.variableCosts || []).reduce((sum, v) => sum + v.amount, 0); const currentEventBalance = event.totalRevenue - (event.crew.reduce((sum, c) => c.status === 'paid' ? sum + c.totalValue : sum, 0) + (event.variableCosts || []).reduce((sum, v) => v.status === 'paid' ? sum + v.amount : sum, 0));
              return (
                <div key={event.id} className={`glass-panel rounded-[30px] border border-white/5 overflow-hidden animate-fade-in-up transition-opacity duration-300 ${!isActive ? 'opacity-60 grayscale-[0.8]' : ''}`}>
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
                        <div>
                            <div className="flex items-center gap-3"><h3 className="text-xl font-bold text-white font-display">{event.eventName || 'Evento Sem Nome'}</h3><span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 uppercase tracking-wider">{event.clientName || 'Cliente Ñ Informado'}</span><button onClick={() => toggleEventActive(event.id)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-2 ${isActive ? 'bg-emerald-500' : 'bg-white/20'}`} title="Toggle"><span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} /></button></div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-text-muted font-medium"><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span>{formatDate(event.eventDate)}{event.eventDuration && event.eventDuration > 1 && ` (${event.eventDuration} dias)`}</span><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">groups</span>{event.crew.length} membros</span>{(event.variableCosts?.length || 0) > 0 && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">receipt_long</span>{event.variableCosts?.length} extras</span>}</div>
                        </div>
                        <div className="flex flex-col md:items-end gap-2">
                             <div className="flex gap-4 text-xs font-bold uppercase tracking-wider mb-1"><span className="text-text-muted">Equipe: <b className="text-white">{formatCurrency(crewCost)}</b></span><span className="text-text-muted">Extras: <b className="text-white">{formatCurrency(varCost)}</b></span></div>
                             <div className="flex items-center gap-4">
                                <div className="text-right"><p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Saldo Atual</p><p className="text-lg font-bold text-emerald-400 font-display">{formatCurrency(currentEventBalance)}</p></div>
                                <div className="h-8 w-px bg-white/10 mx-2 hidden md:block"></div>
                                <div className="flex gap-2 relative z-10">
                                    <button onClick={() => openReportModal(event)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"><span className="material-symbols-outlined">print</span></button>
                                    <button onClick={() => openModal(event)} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"><span className="material-symbols-outlined">edit</span></button>
                                    <button type="button" onClick={() => requestDelete(event.id, event.eventName)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"><span className="material-symbols-outlined">delete</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/[0.01] border-b border-white/5 px-6 py-2 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleDetails(event.id)}>
                        <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider"><span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>{isExpanded ? 'Ocultar Detalhes' : 'Ver Custos'}</div>
                    </div>
                    {isExpanded && (
                        <div className="p-6 bg-black/20 animate-fade-in">
                            <div className="overflow-x-auto border border-white/5 rounded-xl bg-surface-light/30">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white/5 text-text-muted font-bold uppercase text-xs"><tr><th className="px-6 py-3">Tipo</th><th className="px-6 py-3">Descrição</th><th className="px-6 py-3 text-right">Valor</th><th className="px-6 py-3 text-center">Status</th></tr></thead>
                                    <tbody className="divide-y divide-white/5">
                                        {event.crew.map(c => (<tr key={`crew-${c.id}`} className="hover:bg-white/5"><td className="px-6 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">Equipe ({c.role})</span></td><td className="px-6 py-3 font-medium text-white">{c.name}</td><td className="px-6 py-3 text-right text-white font-mono">{formatCurrency(c.totalValue)}</td><td className="px-6 py-3 text-center"><button onClick={() => toggleCrewStatus(event.id, c.id)} className={`text-[10px] px-3 py-1 rounded-full border font-bold uppercase transition-all hover:scale-105 active:scale-95 ${c.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'}`}>{c.status === 'paid' ? 'Pago' : 'Pendente'}</button></td></tr>))}
                                        {(event.variableCosts || []).map(v => (<tr key={`var-${v.id}`} className="hover:bg-white/5"><td className="px-6 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">{v.category}</span></td><td className="px-6 py-3 font-medium text-white">{v.description}</td><td className="px-6 py-3 text-right text-white font-mono">{formatCurrency(v.amount)}</td><td className="px-6 py-3 text-center"><button onClick={() => toggleVariableCostStatus(event.id, v.id)} className={`text-[10px] px-3 py-1 rounded-full border font-bold uppercase transition-all hover:scale-105 active:scale-95 ${v.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'}`}>{v.status === 'paid' ? 'Pago' : 'Pendente'}</button></td></tr>))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
              );
          })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-5xl rounded-[30px] border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-surface-light/50 to-transparent">
              <h3 className="text-xl font-bold text-white font-display">{eventId ? 'Editar Evento' : 'Novo Evento Audiovisual'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Simplified form content injection for brevity, preserving functionality */}
                <EventManagementFormContent {...{eventName, setEventName, clientName, setClientName, eventDate, setEventDate, setCrewWorkDate, eventDuration, setEventDuration, totalRevenue, handleRevenueChange, crewList, editingCrewId, crewName, setCrewName, crewRole, setCrewRole, crewRate, handleCrewRateChange, crewDays, setCrewDays, crewPaymentDate, setCrewPaymentDate, handleAddCrewMember, handleCancelEditCrew, handleEditCrewMember, handleRemoveCrewMember, toggleModalCrewStatus, varCostCategory, setVarCostCategory, varCostDesc, setVarCostDesc, varCostAmount, handleVarCostAmountChange, varCostDate, setVarCostDate, handleAddVariableCost, varCostList, toggleModalVarCostStatus, handleRemoveVariableCost, formatCurrency}} />
            </div>
            <div className="p-6 border-t border-white/10 flex gap-3 bg-surface-light/30">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-300 font-bold uppercase text-xs tracking-wider hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSaveEvent} className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold shadow-neon transition-all uppercase text-xs tracking-wider">Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div id="printable-report" className="hidden">{selectedEventForReport && <div className="max-w-3xl mx-auto font-sans p-10"><h1 className="text-3xl font-bold">{selectedEventForReport.eventName}</h1><p>Relatório de Custos</p></div>}</div>
    </div>
  );
};

const EventManagementFormContent = (props: any) => {
    return (
        <>
             <div className="space-y-4">
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-white/10 pb-2">1. Dados do Evento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-text-muted uppercase">Nome do Evento</label><input value={props.eventName} onChange={e => props.setEventName(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Ex: Show Banda X" /></div>
                        <div className="md:col-span-1 space-y-2"><label className="text-xs font-bold text-text-muted uppercase">Duração (Dias)</label><input type="number" min="1" value={props.eventDuration} onChange={e => props.setEventDuration(parseInt(e.target.value))} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-center font-bold" /></div>
                        <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-text-muted uppercase">Cliente</label><input value={props.clientName} onChange={e => props.setClientName(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Nome do Cliente" /></div>
                        <div className="md:col-span-3 space-y-2"><label className="text-xs font-bold text-text-muted uppercase">Data de Início</label><input type="date" value={props.eventDate} onChange={e => { props.setEventDate(e.target.value); if(!props.crewWorkDate) props.setCrewWorkDate(e.target.value); if(!props.varCostDate) props.setVarCostDate(e.target.value); }} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]" /></div>
                        <div className="md:col-span-2 space-y-2"><label className="text-xs font-bold text-text-muted uppercase">Receita Total</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">R$</span><input type="text" value={props.totalRevenue} onChange={props.handleRevenueChange} className="w-full bg-surface-light/50 border border-white/10 rounded-xl py-2 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold text-emerald-400" placeholder="0,00" /></div></div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-white/10 pb-2 flex justify-between items-center">2. Equipe Técnica & Cachês {props.editingCrewId && <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded animate-pulse">Editando...</span>}</h4>
                    <div className={`grid grid-cols-1 md:grid-cols-7 gap-3 p-4 rounded-xl border transition-colors ${props.editingCrewId ? 'bg-orange-500/10 border-orange-500/20' : 'bg-surface-light/30 border-white/10'}`}>
                        <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Nome</label><input value={props.crewName} onChange={e => props.setCrewName(e.target.value)} placeholder="Nome" className="w-full text-sm rounded-lg border-white/10 bg-black/30 text-white focus:ring-primary/50" /></div>
                        <div className="md:col-span-1 space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Função</label><select value={props.crewRole} onChange={e => props.setCrewRole(e.target.value)} className="w-full text-sm rounded-lg border-white/10 bg-black/30 text-white focus:ring-primary/50 [&>option]:bg-black"><option value="">Selecione</option><option value="Câmera">Câmera</option><option value="Editor">Editor</option><option value="Diretor">Diretor</option><option value="Outros">Outros</option></select></div>
                        <div className="md:col-span-1 space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Diária (R$)</label><input type="text" value={props.crewRate} onChange={props.handleCrewRateChange} placeholder="0,00" className="w-full text-sm rounded-lg border-white/10 bg-black/30 text-white font-medium" /></div>
                        <div className="md:col-span-1 space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Dias</label><input type="number" min="1" value={props.crewDays} onChange={e => props.setCrewDays(Number(e.target.value))} className="w-full text-sm rounded-lg border-white/10 bg-black/30 text-white text-center" /></div>
                        <div className="md:col-span-1 space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Pagamento</label><input type="date" value={props.crewPaymentDate} onChange={e => props.setCrewPaymentDate(e.target.value)} className="w-full text-sm rounded-lg border-white/10 bg-black/30 text-white [color-scheme:dark]" /></div>
                         <div className="md:col-span-1 flex items-end gap-1">{props.editingCrewId ? <><button onClick={props.handleAddCrewMember} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-lg">Ok</button><button onClick={props.handleCancelEditCrew} className="bg-white/10 hover:bg-white/20 text-white px-2 py-2 rounded-lg"><span className="material-symbols-outlined text-[16px]">close</span></button></> : <button onClick={props.handleAddCrewMember} className="w-full bg-primary hover:bg-primary-hover text-black text-sm font-bold py-2 rounded-lg shadow-neon">+ Add</button>}</div>
                    </div>
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                        <table className="w-full text-sm text-left"><thead className="bg-white/5 text-text-muted font-bold text-xs uppercase"><tr><th className="px-4 py-2">Nome</th><th className="px-4 py-2">Função</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2 text-center">Ações</th></tr></thead>
                            <tbody className="divide-y divide-white/5">{props.crewList.map((c: any) => (<tr key={c.id} className={props.editingCrewId === c.id ? 'bg-orange-500/10' : 'hover:bg-white/5'}><td className="px-4 py-2 font-medium text-white">{c.name}</td><td className="px-4 py-2 text-xs text-slate-400">{c.role}</td><td className="px-4 py-2 text-right font-bold text-white">{props.formatCurrency(c.totalValue)}</td><td className="px-4 py-2 text-center"><button onClick={() => props.toggleModalCrewStatus(c.id)} className={`text-[10px] px-2 py-0.5 rounded-full border ${c.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{c.status === 'paid' ? 'Pago' : 'Pendente'}</button></td><td className="px-4 py-2 text-center flex justify-center gap-2"><button onClick={() => props.handleEditCrewMember(c)} className="text-blue-400 hover:text-white"><span className="material-symbols-outlined text-[18px]">edit</span></button><button onClick={() => props.handleRemoveCrewMember(c.id)} className="text-red-400 hover:text-red-300"><span className="material-symbols-outlined text-[18px]">remove_circle</span></button></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-white/10 pb-2">3. Custos Variáveis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-xl border border-white/10 bg-surface-light/30">
                        <div className="md:col-span-1 space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Categoria</label><select value={props.varCostCategory} onChange={e => props.setVarCostCategory(e.target.value as any)} className="w-full text-sm rounded-lg border-white/10 bg-black/30 text-white focus:ring-primary/50 [&>option]:bg-black"><option value="Alimentação">Alimentação</option><option value="Transporte">Transporte</option><option value="Outros">Outros</option></select></div>
                        <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Descrição</label><input value={props.varCostDesc} onChange={e => props.setVarCostDesc(e.target.value)} placeholder="Ex: Almoço" className="w-full text-sm rounded-lg border-white/10 bg-black/30 text-white" /></div>
                        <div className="md:col-span-1 space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Valor (R$)</label><input type="text" value={props.varCostAmount} onChange={props.handleVarCostAmountChange} placeholder="0,00" className="w-full text-sm rounded-lg border-white/10 bg-black/30 text-white font-bold" /></div>
                        <div className="md:col-span-1 space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase">Data</label><input type="date" value={props.varCostDate} onChange={e => props.setVarCostDate(e.target.value)} className="w-full text-sm rounded-lg border-white/10 bg-black/30 text-white [color-scheme:dark]" /></div>
                        <div className="md:col-span-1 flex items-end"><button onClick={props.handleAddVariableCost} className="w-full bg-secondary hover:bg-secondary/80 text-white text-sm font-bold py-2 rounded-lg transition-colors">+ Add</button></div>
                    </div>
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                        <table className="w-full text-sm text-left"><thead className="bg-white/5 text-text-muted font-bold text-xs uppercase"><tr><th className="px-4 py-2">Categoria</th><th className="px-4 py-2">Descrição</th><th className="px-4 py-2 text-right">Valor</th><th className="px-4 py-2 text-center">Status</th><th className="px-4 py-2 text-center">Ações</th></tr></thead><tbody className="divide-y divide-white/5">{props.varCostList.map((v: any) => (<tr key={v.id} className="hover:bg-white/5"><td className="px-4 py-2 text-xs font-bold text-slate-400">{v.category}</td><td className="px-4 py-2 font-medium text-white">{v.description}</td><td className="px-4 py-2 text-right font-bold text-white">{props.formatCurrency(v.amount)}</td><td className="px-4 py-2 text-center"><button onClick={() => props.toggleModalVarCostStatus(v.id)} className={`text-[10px] px-2 py-0.5 rounded-full border ${v.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{v.status === 'paid' ? 'Pago' : 'Pendente'}</button></td><td className="px-4 py-2 text-center"><button onClick={() => props.handleRemoveVariableCost(v.id)} className="text-red-400 hover:text-red-300"><span className="material-symbols-outlined text-[18px]">remove_circle</span></button></td></tr>))}</tbody></table>
                    </div>
                </div>
        </>
    );
};

export default EventManagement;
