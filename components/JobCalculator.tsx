
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AVEvent, JobExpense, SavedJob } from '../types';
import { useEvents } from '../EventsContext';
import { useUser } from '../UserContext';
import CallSheetBuilder from './CallSheetBuilder';

const COLORS = ['#2b6cee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

type TabView = 'calculator' | 'history' | 'proposal' | 'callsheet';

const JobCalculator: React.FC = () => {
  const { user } = useUser();
  const { addEvent } = useEvents(); 
  const [activeTab, setActiveTab] = useState<TabView>('calculator');
  
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(() => {
    const saved = localStorage.getItem('finflow_saved_jobs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('finflow_saved_jobs', JSON.stringify(savedJobs)); }, [savedJobs]);

  const [projectName, setProjectName] = useState(() => localStorage.getItem('calc_draft_projectName') || '');
  const [jobDate, setJobDate] = useState(() => localStorage.getItem('calc_draft_jobDate') || ''); 
  const [profitMargin, setProfitMargin] = useState(() => Number(localStorage.getItem('calc_draft_profitMargin')) || 20);
  const [taxRate, setTaxRate] = useState(() => Number(localStorage.getItem('calc_draft_taxRate')) || 6);
  
  const [expenses, setExpenses] = useState<JobExpense[]>(() => {
      const savedExpenses = localStorage.getItem('calc_draft_expenses');
      return savedExpenses ? JSON.parse(savedExpenses) : [
        { id: 1, description: 'Editor de Vídeo (Freelancer)', category: 'Freelancer', amount: 500, quantity: 1, unitPrice: 500 },
        { id: 2, description: 'Uber Ida/Volta', category: 'Transporte', amount: 80, quantity: 1, unitPrice: 80 },
      ];
  });

  // Proposal States (omitted detailed text for brevity, reusing from prev)
  const [propTitle, setPropTitle] = useState('Proposta: Cobertura Realtime Fun');
  const [propSubtitle, setPropSubtitle] = useState('Capturando a energia do seu evento em tempo real para criar conexões autênticas.');
  const [propAbout, setPropAbout] = useState('Nosso objetivo é capturar a essência vibrante do seu evento e transformá-la em conteúdo digital instantâneo.');
  const [propStrat1Title, setPropStrat1Title] = useState('8 Stories Dinâmicos');
  const [propStrat1Desc, setPropStrat1Desc] = useState('Cobertura ágil com os melhores momentos.');
  const [propStrat2Title, setPropStrat2Title] = useState('1 Vídeo Reel de Impacto');
  const [propStrat2Desc, setPropStrat2Desc] = useState('Um vídeo vertical cinematográfico.');
  const [propDeliv1Title, setPropDeliv1Title] = useState('8 Instagram Stories');
  const [propDeliv1Desc, setPropDeliv1Desc] = useState('Vídeos curtos e fotos editadas profissionalmente.');
  const [propDeliv2Title, setPropDeliv2Title] = useState('1 Instagram Reel de Destaques');
  const [propDeliv2Desc, setPropDeliv2Desc] = useState('Um vídeo de até 60 segundos com os melhores momentos.');
  const [propSchedPre, setPropSchedPre] = useState('Alinhamento estratégico.');
  const [propSchedDuring, setPropSchedDuring] = useState('Captura e publicação em tempo real.');
  const [propSchedPost, setPropSchedPost] = useState('Edição e entrega em 48h.');
  const [propBgImage, setPropBgImage] = useState('https://lh3.googleusercontent.com/aida-public/AB6AXuBt72cNEVnLdCv60Klgecn9YlW4i5FCzu39FKkVtNL4aOuYQX4AOqlg47DO4GvIXtkBfSIrV_TN_pudN2TfEHSHT231SZGAM5vN8V9Y19G6hWLFzQ67OyQQXyTMQUEaO6r4uT0VLdYa1sED-0WSIe30O3MpgvHFoGQ9e1a2G1jj12hGDvo9n91P-ClSuLgEQQyedvdETCD5BpxLAJ-3Ztad6bUmqqGMkcqNxdKVR69IZUoCfbNKBtBX_nS7lfoEQ7LsOo6QuLWWWHnV');

  useEffect(() => { localStorage.setItem('calc_draft_projectName', projectName); }, [projectName]);
  useEffect(() => { localStorage.setItem('calc_draft_jobDate', jobDate); }, [jobDate]);
  useEffect(() => { localStorage.setItem('calc_draft_profitMargin', profitMargin.toString()); }, [profitMargin]);
  useEffect(() => { localStorage.setItem('calc_draft_taxRate', taxRate.toString()); }, [taxRate]);
  useEffect(() => { localStorage.setItem('calc_draft_expenses', JSON.stringify(expenses)); }, [expenses]);

  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newCategory, setNewCategory] = useState<JobExpense['category']>('Freelancer');
  
  const descRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const { totalCost, profitValue, finalPrice, taxValue } = useMemo(() => {
    const cost = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const profit = cost * (profitMargin / 100);
    const sub = cost + profit;
    const final = taxRate < 100 ? sub / (1 - (taxRate / 100)) : 0;
    const tax = final - sub;
    return { totalCost: cost, profitValue: profit, finalPrice: final, taxValue: tax };
  }, [expenses, profitMargin, taxRate]);

  const teamFromExpenses = useMemo(() => {
      const freelancers = expenses.filter(e => e.category === 'Freelancer');
      if (freelancers.length > 0) return freelancers;
      return [{ id: 101, description: 'Videomaker Principal', category: 'Freelancer' }, { id: 102, description: 'Editor', category: 'Freelancer' }];
  }, [expenses]);

  const chartData = [{ name: 'Custo Operacional', value: totalCost }, { name: 'Lucro Previsto', value: profitValue }, { name: 'Impostos (Nota)', value: taxValue }];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const handleCurrencyChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, '');
      if (!rawValue) { setter(''); return; }
      const val = parseFloat(rawValue) / 100;
      setter(val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };
  const parseCurrency = (val: string) => parseFloat(val.replace(/\./g, '').replace(',', '.').trim()) || 0;

  const handleAddExpense = () => {
    if (!newDesc || !newAmount) { alert("Preencha descrição e valor."); return; }
    const unitValue = parseCurrency(newAmount);
    if (isNaN(unitValue)) { alert("Valor inválido"); return; }
    const qty = newQty > 0 ? newQty : 1;
    setExpenses(prev => [...prev, { id: Date.now(), description: newDesc, category: newCategory, amount: unitValue * qty, quantity: qty, unitPrice: unitValue }]);
    setNewDesc(''); setNewAmount(''); setNewQty(1); setTimeout(() => descRef.current?.focus(), 100);
  };

  const handleRemoveExpense = (id: number) => setExpenses(prev => prev.filter(e => e.id !== id));
  const handleKeyDown = (e: React.KeyboardEvent, field: 'desc' | 'qty' | 'amount') => {
    if (e.key === 'Enter') { e.preventDefault(); if (field === 'desc') qtyRef.current?.focus(); if (field === 'qty') amountRef.current?.focus(); if (field === 'amount') handleAddExpense(); }
  };

  const handleSaveJob = () => {
      if (!projectName || !jobDate) { alert('Nome e Data são obrigatórios.'); return; }
      const newJob: SavedJob = { id: Date.now().toString(), projectName, jobDate, createdAt: new Date().toISOString(), expenses, profitMargin, taxRate, totalCost, profitValue, taxValue, finalPrice };
      setSavedJobs(prev => [...prev, newJob]); alert('Projeto salvo!');
  };

  const handleSaveAndCreateEvent = () => {
      if (!projectName || !jobDate) { alert('Preencha Nome e Data.'); return; }
      const crewMembers: any[] = []; const variableCosts: any[] = [];
      expenses.forEach(exp => {
          if (exp.category === 'Freelancer') crewMembers.push({ id: Math.random().toString(36).substr(2, 9), name: exp.description, role: 'Técnico', dailyRate: exp.unitPrice || exp.amount, daysWorked: exp.quantity || 1, totalValue: exp.amount, workDate: jobDate, paymentDate: '', status: 'pending' });
          else variableCosts.push({ id: Math.random().toString(36).substr(2, 9), category: exp.category, description: exp.description, amount: exp.amount, date: jobDate, status: 'pending' });
      });
      const newEvent: AVEvent = { id: Date.now().toString(), eventName: projectName, clientName: 'Cliente (Calculadora)', eventDate: jobDate, eventDuration: 1, totalRevenue: finalPrice, status: 'scheduled', active: true, crew: crewMembers, variableCosts: variableCosts };
      addEvent(newEvent); handleSaveJob(); alert('Evento criado na aba "Eventos"!');
  };

  const handleLoadJob = (job: SavedJob) => {
      if (window.confirm('Substituir dados atuais?')) { setProjectName(job.projectName); setJobDate(job.jobDate || ''); setExpenses(job.expenses); setProfitMargin(job.profitMargin); setTaxRate(job.taxRate); setActiveTab('calculator'); }
  };
  const handleDeleteJob = (id: string) => { if (window.confirm('Excluir?')) setSavedJobs(prev => prev.filter(j => j.id !== id)); };
  
  const handlePrintProposal = () => {
      const element = document.getElementById('proposal-preview-container');
      if (!element) return;
      const opt = { margin: 0, filename: `${projectName || 'proposta'}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      // @ts-ignore
      if (window.html2pdf) window.html2pdf().from(element).set(opt).save(); else window.print();
  };

  if (activeTab === 'proposal') {
      return (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col animate-fade-in overflow-hidden">
            <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-surface-light shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveTab('calculator')} className="flex items-center gap-2 text-text-muted hover:text-white transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span><span className="font-bold text-sm">Voltar</span>
                    </button>
                    <div className="h-6 w-px bg-white/10"></div>
                    <h2 className="text-lg font-bold text-white font-display">Gerador de Proposta</h2>
                </div>
                <button onClick={handlePrintProposal} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-black rounded-lg font-bold shadow-neon transition-all active:scale-95"><span className="material-symbols-outlined text-[20px]">download</span> Salvar PDF</button>
            </header>
            <div className="flex-1 flex overflow-hidden">
                <div className="w-[400px] bg-surface border-r border-white/5 flex flex-col h-full z-10 shrink-0">
                    <div className="p-5 border-b border-white/5 bg-surface-light/50"><h3 className="font-bold text-white flex items-center gap-2"><span className="material-symbols-outlined text-primary">tune</span>Editor</h3></div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-white">
                       <div className="space-y-3"><h4 className="text-xs font-bold text-primary uppercase">1. Cabeçalho</h4><input value={propTitle} onChange={e => setPropTitle(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm" /></div>
                       <div className="space-y-3"><h4 className="text-xs font-bold text-primary uppercase">2. Sobre</h4><textarea rows={4} value={propAbout} onChange={e => setPropAbout(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm resize-none" /></div>
                       {/* Simplified Editor for Brevity */}
                    </div>
                </div>
                <div className="flex-1 bg-[#050b14] overflow-y-auto h-full p-4 md:p-12 flex justify-center custom-scrollbar">
                    <div id="proposal-preview-container" className="w-full max-w-[900px] h-fit bg-[#09090b] shadow-2xl rounded-none md:rounded-lg overflow-hidden font-sans text-white border border-slate-800 shrink-0 origin-top">
                        <div className="flex flex-col min-h-screen">
                            <div className="flex flex-1 justify-center py-5 px-4 sm:px-8 md:px-16 lg:px-20">
                                <div className="flex flex-col w-full flex-1">
                                    <div className="p-4"><div className="flex min-h-[480px] flex-col gap-6 bg-cover bg-center rounded-xl justify-end px-4 pb-10 shadow-2xl relative overflow-hidden" style={{ backgroundImage: `linear-gradient(rgba(9, 9, 11, 0.1) 0%, rgba(9, 9, 11, 0.95) 100%), url("${propBgImage}")` }}><div className="flex flex-col gap-3 text-left relative z-10"><h1 className="text-white text-5xl font-black">{propTitle}</h1><h2 className="text-slate-200 text-lg font-normal">{propSubtitle}</h2></div></div></div>
                                    <h2 className="text-white text-2xl font-bold px-4 pb-4 pt-12">Sobre</h2><p className="text-slate-300 text-lg px-4">{propAbout}</p>
                                    <h2 className="text-white text-2xl font-bold px-4 pb-4 pt-12">Investimento</h2>
                                    <div className="p-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-8"><h3 className="text-emerald-100 text-xl font-bold">{projectName}</h3><p className="text-4xl font-black text-emerald-400 mt-2">{formatCurrency(finalPrice)}</p></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-10 relative">
      <div className="flex flex-col gap-6 no-print shrink-0">
        <div><h1 className="text-3xl font-bold text-white font-display">Calculadora de Evento</h1><p className="text-text-muted mt-1">Planejamento financeiro e precificação.</p></div>
        <div className="flex flex-wrap items-center p-1.5 bg-surface-light/50 backdrop-blur-md rounded-xl w-fit border border-white/10">
            {[
                {id: 'calculator', icon: 'calculate', label: 'Calculadora'},
                {id: 'proposal', icon: 'description', label: 'Proposta'},
                {id: 'history', icon: 'history', label: 'Histórico'},
                {id: 'callsheet', icon: 'assignment', label: 'Ordem do Dia'}
            ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white/10 text-primary shadow-sm border border-white/5' : 'text-text-muted hover:text-white'}`}><span className="material-symbols-outlined text-[18px]">{tab.icon}</span>{tab.label}</button>
            ))}
        </div>
      </div>

      {activeTab === 'callsheet' && <div className="animate-fade-in"><CallSheetBuilder /></div>}

      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
                <div className="glass-panel p-6 rounded-[30px] border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-3">Dados do Projeto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-sm font-semibold text-slate-300">Nome do Job</label><input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Ex: Cobertura Evento" className="w-full bg-surface-light/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                        <div className="space-y-2"><label className="text-sm font-semibold text-slate-300">Data do Job</label><input type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]" /></div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-[30px] border border-white/5">
                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3"><h3 className="text-lg font-bold text-white">Custos & Despesas</h3><span className="text-xs bg-white/10 px-2 py-1 rounded text-white font-bold">{expenses.length} Itens</span></div>
                    <div className="flex flex-col md:flex-row gap-3 mb-6 bg-surface-light/30 p-4 rounded-xl border border-white/10">
                        <input ref={descRef} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'desc')} placeholder="Descrição" className="flex-[2] bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as any)} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [&>option]:bg-black"><option value="Freelancer">Freelancer</option><option value="Transporte">Transporte</option><option value="Alimentação">Alimentação</option><option value="Equipamento">Equipamento</option><option value="Outros">Outros</option></select>
                        <input ref={qtyRef} type="number" min="1" value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value))} onKeyDown={(e) => handleKeyDown(e, 'qty')} placeholder="Qtd" className="w-16 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <input ref={amountRef} value={newAmount} onChange={handleCurrencyChange(setNewAmount)} onKeyDown={(e) => handleKeyDown(e, 'amount')} placeholder="R$ Unit." className="w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        <button onClick={handleAddExpense} className="bg-primary hover:bg-primary-hover text-black rounded-lg px-4 py-2 font-bold shadow-neon active:scale-95"><span className="material-symbols-outlined text-[20px]">add</span></button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-white/5">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 text-text-muted font-semibold"><tr><th className="px-4 py-3">Descrição</th><th className="px-4 py-3 text-center">Qtd</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-center w-10"></th></tr></thead>
                            <tbody className="divide-y divide-white/5">{expenses.map((item) => (<tr key={item.id} className="hover:bg-white/5 transition-colors group"><td className="px-4 py-3"><p className="font-bold text-white">{item.description}</p><span className="text-xs text-text-muted bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{item.category}</span></td><td className="px-4 py-3 text-center text-slate-400">{item.quantity || 1}</td><td className="px-4 py-3 text-right font-bold text-white">{formatCurrency(item.amount)}</td><td className="px-4 py-3 text-center"><button onClick={() => handleRemoveExpense(item.id)} className="text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined text-[18px]">delete</span></button></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <div className="glass-panel p-6 rounded-[30px] border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-3">Margens & Impostos</h3>
                    <div className="space-y-4">
                        <div className="space-y-2"><div className="flex justify-between text-sm"><span className="font-semibold text-slate-300">Margem de Lucro</span><span className="font-bold text-primary">{profitMargin}%</span></div><input type="range" min="0" max="100" value={profitMargin} onChange={(e) => setProfitMargin(parseInt(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" /></div>
                        <div className="space-y-2"><div className="flex justify-between text-sm"><span className="font-semibold text-slate-300">Imposto</span><span className="font-bold text-orange-500">{taxRate}%</span></div><input type="range" min="0" max="30" value={taxRate} onChange={(e) => setTaxRate(parseInt(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500" /></div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-surface-light via-[#151921] to-black text-white p-6 rounded-[30px] shadow-2xl relative overflow-hidden border border-white/10">
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-center text-slate-300 text-sm"><span>Custo Total</span><span>{formatCurrency(totalCost)}</span></div>
                        <div className="flex justify-between items-center text-slate-300 text-sm"><span>Lucro ({profitMargin}%)</span><span className="text-emerald-400 font-bold">+ {formatCurrency(profitValue)}</span></div>
                        <div className="flex justify-between items-center text-slate-300 text-sm border-b border-white/10 pb-2"><span>Impostos ({taxRate}%)</span><span className="text-orange-400 font-bold">+ {formatCurrency(taxValue)}</span></div>
                        <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Preço Final Sugerido</p><h2 className="text-4xl font-black tracking-tight text-white">{formatCurrency(finalPrice)}</h2></div>
                        <div className="pt-2 flex flex-col gap-2">
                            <button onClick={handleSaveJob} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"><span className="material-symbols-outlined">save</span> Salvar Rascunho</button>
                            <button onClick={handleSaveAndCreateEvent} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"><span className="material-symbols-outlined">event_available</span> Criar Evento</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in glass-panel rounded-[30px] border border-white/5 p-6">
              <h3 className="text-lg font-bold text-white mb-6">Histórico de Orçamentos</h3>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-white/5 text-text-muted font-semibold"><tr><th className="px-4 py-3">Projeto</th><th className="px-4 py-3">Data Ref.</th><th className="px-4 py-3 text-right">Custo</th><th className="px-4 py-3 text-right">Lucro</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-center">Ações</th></tr></thead>
                      <tbody className="divide-y divide-white/5">{savedJobs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhum projeto salvo.</td></tr>}{savedJobs.map((job) => (<tr key={job.id} className="hover:bg-white/5 transition-colors"><td className="px-4 py-3 font-bold text-white">{job.projectName}</td><td className="px-4 py-3 text-slate-400">{job.jobDate ? new Date(job.jobDate).toLocaleDateString('pt-BR') : '-'}</td><td className="px-4 py-3 text-right text-slate-400">{formatCurrency(job.totalCost)}</td><td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatCurrency(job.profitValue)}</td><td className="px-4 py-3 text-right font-bold text-white">{formatCurrency(job.finalPrice)}</td><td className="px-4 py-3 text-center flex justify-center gap-2"><button onClick={() => handleLoadJob(job)} className="text-blue-400 hover:text-blue-300 font-bold text-xs border border-blue-500/30 px-2 py-1 rounded bg-blue-500/10">Carregar</button><button onClick={() => handleDeleteJob(job.id)} className="text-red-500 hover:text-red-400"><span className="material-symbols-outlined text-[18px]">delete</span></button></td></tr>))}</tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default JobCalculator;
