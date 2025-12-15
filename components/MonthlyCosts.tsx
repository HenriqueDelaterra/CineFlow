
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../FinanceContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface MonthlyCostsProps {
    scope?: 'business' | 'personal';
}

const COLORS = ['#00f0ff', '#7c3aed', '#f43f5e', '#34d399', '#fbbf24', '#f87171', '#60a5fa'];

type FilterType = 'week' | 'month' | 'year' | 'custom';

const MonthlyCosts: React.FC<MonthlyCostsProps> = ({ scope = 'business' }) => {
  const { costs, addCost, removeCost, toggleCostStatus, toggleCostActive } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [budgetLimit, setBudgetLimit] = useState(() => {
      const saved = localStorage.getItem(`finflow_budget_limit_${scope}`); // Separate budget by scope
      return saved ? parseFloat(saved) : (scope === 'personal' ? 5000 : 10000);
  });
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [tempBudget, setTempBudget] = useState('');

  useEffect(() => { localStorage.setItem(`finflow_budget_limit_${scope}`, budgetLimit.toString()); }, [budgetLimit, scope]);

  const [filterType, setFilterType] = useState<FilterType>('month'); // Default to month for better fixed costs view
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [weekDate, setWeekDate] = useState(new Date().toISOString().split('T')[0]);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(5);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isIndeterminate, setIsIndeterminate] = useState(true);
  const [endDate, setEndDate] = useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr?: string) => { if(!dateStr) return 'Indeterminado'; const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`; }

  const handleCurrencyChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, '');
      if (!rawValue) { setter(''); return; }
      const val = parseFloat(rawValue) / 100;
      setter(val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const parseCurrency = (val: string) => parseFloat(val.replace(/\./g, '').replace(',', '.').trim()) || 0;

  // Helper to parse "YYYY-MM-DD" to local Date object (00:00:00)
  const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return new Date();
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
  };

  // --- FILTER BY SCOPE ---
  const filteredCosts = useMemo(() => {
      return costs.filter(c => (c.scope || 'business') === scope);
  }, [costs, scope]);

  const { visibleCosts, projectedTotal, totalPaid, totalPending, periodLabel, recurrenceCount } = useMemo(() => {
      let start: Date, end: Date;
      let label = '';
      const today = new Date();
      
      if (filterType === 'month') {
          const [y, m] = selectedMonth.split('-').map(Number);
          start = new Date(y, m - 1, 1); end = new Date(y, m, 0); 
          label = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      } else if (filterType === 'year') {
          start = new Date(selectedYear, 0, 1); end = new Date(selectedYear, 11, 31);
          label = `Ano de ${selectedYear}`;
      } else if (filterType === 'week') {
          const refDate = weekDate ? new Date(weekDate) : new Date();
          const day = refDate.getDay(); 
          const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); 
          start = new Date(refDate.setDate(diff)); end = new Date(refDate); end.setDate(start.getDate() + 6);
          label = `Semana ${start.toLocaleDateString('pt-BR', {day:'numeric', month:'numeric'})} a ${end.toLocaleDateString('pt-BR', {day:'numeric', month:'numeric'})}`;
      } else { 
          start = customStart ? new Date(customStart) : new Date(today.getFullYear(), 0, 1);
          end = customEnd ? new Date(customEnd) : new Date(today.getFullYear(), 11, 31);
          label = `Período Personalizado`;
      }
      start.setHours(0,0,0,0); end.setHours(23,59,59,999);

      let total = 0; 
      let paid = 0;
      let countOccurrences = 0;

      // Filter based on Scope AND Date Range
      const costsInRange = filteredCosts.filter(cost => {
          const costStart = parseLocalDate(cost.startDate);
          const costEnd = cost.endDate ? parseLocalDate(cost.endDate) : new Date(9999, 11, 31);
          return costStart <= end && costEnd >= start;
      });

      costsInRange.forEach(cost => {
          if (!cost.active) return;
          
          if (filterType === 'month') {
              // Simple sum for monthly view to match "Registered Values" expectation
              // If it's in the list (active), we count it.
              total += cost.amount;
              if (cost.status === 'paid') paid += cost.amount;
              countOccurrences++;
          } else {
              // Recurrence logic for longer periods or specific weeks
              const costStart = parseLocalDate(cost.startDate);
              const costEnd = cost.endDate ? parseLocalDate(cost.endDate) : new Date(9999, 11, 31);
              let checkDate = new Date(start.getFullYear(), start.getMonth(), 1);
              
              while (checkDate <= end) {
                  const due = new Date(checkDate.getFullYear(), checkDate.getMonth(), cost.dayOfMonth);
                  if (due >= start && due <= end && due >= costStart && due <= costEnd) {
                      total += cost.amount;
                      if (cost.status === 'paid') paid += cost.amount;
                      countOccurrences++;
                  }
                  checkDate.setMonth(checkDate.getMonth() + 1);
              }
          }
      });
      
      const pending = total - paid;

      return { visibleCosts: costsInRange, projectedTotal: total, totalPaid: paid, totalPending: pending, periodLabel: label, recurrenceCount: countOccurrences };
  }, [filteredCosts, filterType, selectedMonth, selectedYear, weekDate, customStart, customEnd]);

  const monthlyEvolutionData = useMemo(() => {
      if (filterType !== 'year') return [];
      const data = [];
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      for (let i = 0; i < 12; i++) {
          let monthTotal = 0;
          const currentMonthStart = new Date(selectedYear, i, 1);
          const currentMonthEnd = new Date(selectedYear, i + 1, 0);
          filteredCosts.filter(c => c.active).forEach(cost => {
              const costStart = parseLocalDate(cost.startDate);
              const costEnd = cost.endDate ? parseLocalDate(cost.endDate) : new Date(9999, 11, 31);
              if (costStart <= currentMonthEnd && costEnd >= currentMonthStart) {
                   const dueDate = new Date(selectedYear, i, cost.dayOfMonth);
                   if (dueDate >= costStart && dueDate <= costEnd) monthTotal += cost.amount;
              }
          });
          data.push({ name: months[i], Total: monthTotal });
      }
      return data;
  }, [filteredCosts, filterType, selectedYear]);

  const categoryData = useMemo(() => {
      const grouped: Record<string, number> = {};
      
      // Use visibleCosts (already filtered by period) and check ACTIVE status
      visibleCosts.forEach(c => {
          if (!c.active) return; // Only sum active costs
          if (!grouped[c.category]) grouped[c.category] = 0;
          grouped[c.category] += c.amount;
      });
      
      return Object.keys(grouped).map(k => ({ name: k, value: grouped[k] })).sort((a, b) => b.value - a.value);
  }, [visibleCosts]);

  // Payment Progress (Paid / Total Projected)
  const paymentProgress = projectedTotal > 0 ? (totalPaid / projectedTotal) * 100 : 0;

  const handleSave = () => {
    if (!description || !amount || !startDate) { alert("Preencha descrição, valor e data."); return; }
    const value = parseCurrency(amount);
    if (isNaN(value)) { alert("Valor inválido"); return; }
    addCost({
      id: Date.now().toString(), description, category: category || 'Geral', amount: value,
      dayOfMonth: dayOfMonth, startDate: startDate, endDate: isIndeterminate ? undefined : endDate,
      active: true, status: 'pending',
      scope: scope // INJECT SCOPE
    });
    setIsModalOpen(false); setDescription(''); setCategory(''); setAmount(''); setDayOfMonth(5); setStartDate(new Date().toISOString().split('T')[0]); setIsIndeterminate(true); setEndDate('');
  };

  const handleSaveBudget = () => {
      const val = parseCurrency(tempBudget);
      if (!isNaN(val) && val > 0) setBudgetLimit(val);
      setIsBudgetModalOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({length: 6}, (_, i) => currentYear - 1 + i); 

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-10 relative">
      <style>{`@media print { body * { visibility: hidden; } #report-area, #report-area * { visibility: visible; } #report-area { position: absolute; left: 0; top: 0; width: 100%; min-height: 100vh; background: white !important; color: black !important; padding: 20px; z-index: 9999; } .no-print { display: none !important; } }`}</style>
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">
              {scope === 'personal' ? 'Metas & Objetivos Financeiros' : 'Custos Fixos Mensais'}
          </h1>
          <p className="text-text-muted mt-1">
              {scope === 'personal' ? 'Planejamento de despesas pessoais e sonhos.' : 'Gestão inteligente de assinaturas e despesas fixas.'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto bg-surface-light/50 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-lg">
            <div className="flex bg-surface-light/50 p-1 rounded-lg border border-white/5">
                {(['month', 'year', 'custom'] as FilterType[]).map((t) => (
                    <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-2 text-xs font-bold rounded-md transition-all uppercase ${filterType === t ? 'bg-primary/20 text-primary shadow-neon-sm' : 'text-text-muted hover:text-white'}`}>{t === 'month' ? 'Mês' : t === 'year' ? 'Ano' : 'Personalizado'}</button>
                ))}
            </div>
            <div className="flex items-center px-4 border-l border-white/10 ml-2">
                {filterType === 'month' && <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 p-0 cursor-pointer [color-scheme:dark]" />}
                {filterType === 'year' && <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 p-0 cursor-pointer [&>option]:bg-black">{yearsList.map(y => <option key={y} value={y}>{y}</option>)}</select>}
            </div>
            <button onClick={() => window.print()} className="ml-2 flex items-center justify-center size-9 rounded-lg text-text-muted hover:bg-white/10 hover:text-white transition-colors"><span className="material-symbols-outlined text-[20px]">print</span></button>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors shadow-neon active:scale-95 ml-2 uppercase tracking-wide"><span className="material-symbols-outlined text-[18px]">add</span> {scope === 'personal' ? 'Nova Meta' : 'Novo Custo'}</button>
        </div>
      </div>

      <div id="report-area" className="space-y-8">
        <div className="relative overflow-hidden rounded-[40px] bg-surface border border-white/10 p-8 group/card">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/3 translate-x-1/4"></div>
            <button onClick={() => { setTempBudget(budgetLimit.toLocaleString('pt-BR', {minimumFractionDigits: 2})); setIsBudgetModalOpen(true); }} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all backdrop-blur-md z-20 opacity-0 group-hover/card:opacity-100 translate-y-2 group-hover/card:translate-y-0 duration-300 border border-white/5"><span className="material-symbols-outlined">edit</span></button>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4 shadow-neon-sm"><span className="relative flex size-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full size-2 bg-primary"></span></span>Visão Geral</div>
                        <h2 className="text-3xl font-bold tracking-tight mb-1 text-white capitalize font-display">{periodLabel}</h2>
                        <p className="text-text-muted text-sm font-medium">Controle de pagamentos recorrentes.</p>
                    </div>
                    <div className="flex-1 flex flex-col justify-center p-8 rounded-[30px] bg-surface-light/40 border border-white/5 backdrop-blur-md shadow-inner">
                        <p className="text-text-muted text-xs uppercase tracking-wide font-bold mb-2">Total Previsto</p>
                        <div className="flex items-baseline gap-2 mb-4"><span className="text-5xl font-black text-white font-display drop-shadow-sm">{formatCurrency(projectedTotal)}</span></div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Pago</p>
                                <p className="text-lg font-bold text-white">{formatCurrency(totalPaid)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Pendente</p>
                                <p className="text-lg font-bold text-white">{formatCurrency(totalPending)}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-bold text-text-muted mb-1 uppercase tracking-wider"><span>Progresso de Pagamento</span><span>{paymentProgress.toFixed(0)}%</span></div>
                        <div className="w-full bg-surface-light h-1.5 rounded-full overflow-hidden mb-4 relative"><div className={`h-full bg-gradient-to-r from-primary via-secondary to-accent rounded-full shadow-[0_0_10px_rgba(0,240,255,0.5)] transition-all duration-1000 ease-out`} style={{ width: `${paymentProgress}%` }}></div></div>
                        <div className="text-right text-xs text-text-muted font-mono mb-4">Meta Limite: {formatCurrency(budgetLimit)}</div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-surface-light/20 border border-white/5 rounded-[30px] p-6 backdrop-blur-sm flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10"><h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-secondary">analytics</span>{filterType === 'year' ? 'Evolução Anual' : 'Distribuição por Categoria'}</h3></div>
                    <div className="flex-1 w-full min-h-[300px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            {filterType === 'year' ? (
                                <BarChart data={monthlyEvolutionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs><linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00f0ff" stopOpacity={1}/><stop offset="100%" stopColor="#7c3aed" stopOpacity={1}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} strokeOpacity={0.4} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#0e1015', border: '1px solid #ffffff10', borderRadius: '12px', color: '#fff' }} formatter={(value: number) => [formatCurrency(value), 'Total']} />
                                    <Bar dataKey="Total" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={24} />
                                </BarChart>
                            ) : (
                                <div className="flex flex-row items-center h-full gap-8">
                                    <div className="w-1/2 h-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={categoryData} innerRadius={80} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={4}>
                                                    {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#0e1015', border: '1px solid #ffffff10', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-xs text-text-muted font-medium uppercase">Total</span><span className="text-xl font-bold text-white">{formatCurrency(projectedTotal)}</span></div>
                                    </div>
                                    <div className="w-1/2 space-y-3 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                                        {categoryData.map((entry, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm group p-2 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                                                <div className="flex items-center gap-3"><span className="size-3 rounded-full shadow-[0_0_8px] shadow-current" style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }}></span><span className="text-slate-300 font-medium group-hover:text-white transition-colors">{entry.name}</span></div><span className="font-bold text-white">{formatCurrency(entry.value)}</span>
                                            </div>
                                        ))}
                                        {categoryData.length === 0 && <p className="text-text-muted text-xs italic">Sem dados para este período.</p>}
                                    </div>
                                </div>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>

        <div className="glass-panel rounded-[30px] border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white font-display">Detalhamento</h3>
                <span className="text-xs font-bold text-text-muted bg-white/5 px-3 py-1 rounded-full border border-white/5">{visibleCosts.length} Itens</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-text-muted text-xs uppercase tracking-wider font-display">
                            <th className="px-6 py-5 font-bold text-center w-20 no-print">Ativo</th>
                            <th className="px-6 py-5 font-bold">Descrição</th>
                            <th className="px-6 py-5 font-bold">Categoria</th>
                            <th className="px-6 py-5 font-bold">Vencimento</th>
                            <th className="px-6 py-5 font-bold text-right">Valor Mensal</th>
                            <th className="px-6 py-5 font-bold text-center no-print">Pagamento (Mês Atual)</th>
                            <th className="px-6 py-5 font-bold text-right no-print">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {visibleCosts.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-text-muted">Nenhum custo encontrado.</td></tr>}
                        {visibleCosts.map((cost) => (
                            <tr key={cost.id} className={`transition-colors group ${!cost.active ? 'opacity-50 grayscale' : 'hover:bg-white/5'}`}>
                                <td className="px-6 py-4 text-center no-print">
                                    <button onClick={() => toggleCostActive(cost.id)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cost.active ? 'bg-emerald-500' : 'bg-white/20'}`}><span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${cost.active ? 'translate-x-5' : 'translate-x-1'}`} /></button>
                                </td>
                                <td className="px-6 py-4"><span className={`font-bold ${!cost.active ? 'text-text-muted line-through' : 'text-white'}`}>{cost.description}</span><div className="text-xs text-text-muted mt-0.5">Início: {formatDate(cost.startDate)}</div></td>
                                <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/5 text-slate-300 border border-white/10">{cost.category}</span></td>
                                <td className="px-6 py-4 text-sm text-slate-400 font-mono">Dia {cost.dayOfMonth}</td>
                                <td className="px-6 py-4 text-right font-bold text-white">{formatCurrency(cost.amount)}</td>
                                <td className="px-6 py-4 text-center no-print">
                                    <button onClick={() => toggleCostStatus(cost.id)} disabled={!cost.active} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border transition-all ${!cost.active ? 'bg-white/5 text-gray-500 border-transparent cursor-not-allowed' : cost.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'}`}>{cost.status === 'paid' && <span className="material-symbols-outlined text-[14px]">check</span>}{cost.status === 'paid' ? 'Pago' : 'Pagar'}</button>
                                </td>
                                <td className="px-6 py-4 text-right no-print"><button onClick={() => removeCost(cost.id)} className="text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"><span className="material-symbols-outlined text-[20px]">delete</span></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* MODALS */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in no-print">
            <div className="glass-panel w-full max-w-sm rounded-[30px] border border-white/10 overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-surface-light/50 to-transparent">
                    <h3 className="text-lg font-bold text-white font-display">Configurar Meta ({scope})</h3>
                    <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div className="p-8">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Valor da Meta (R$)</label>
                    <input type="text" value={tempBudget} onChange={handleCurrencyChange(setTempBudget)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg" />
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => setIsBudgetModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors uppercase text-xs tracking-wider">Cancelar</button>
                        <button onClick={handleSaveBudget} className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold shadow-neon transition-all uppercase text-xs tracking-wider">Salvar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in no-print">
          <div className="glass-panel w-full max-w-lg rounded-[30px] border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-surface-light/50 to-transparent">
              <h3 className="text-xl font-bold text-white font-display">{scope === 'personal' ? 'Nova Meta/Gasto' : 'Nova Despesa Recorrente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-8 space-y-5 overflow-y-auto">
              <div className="space-y-2"><label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Descrição</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Netflix" className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div className="space-y-2"><label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Categoria</label><input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Software" className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Valor (R$)</label><input type="text" value={amount} onChange={handleCurrencyChange(setAmount)} placeholder="0,00" className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Dia Vencimento</label><select value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer [&>option]:bg-black">{Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Dia {d}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div className="space-y-2"><label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Início</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]" /></div>
                  <div className="space-y-2">
                       <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1 flex justify-between items-center">Fim <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsIndeterminate(!isIndeterminate)}><div className={`size-3.5 border rounded flex items-center justify-center transition-colors ${isIndeterminate ? 'bg-primary border-primary' : 'border-slate-400'}`}>{isIndeterminate && <span className="text-[10px] text-black material-symbols-outlined font-bold">check</span>}</div><span className="text-[10px] text-slate-400 font-normal normal-case">Indeterminado</span></div></label>
                       <input type="date" disabled={isIndeterminate} value={endDate} onChange={e => setEndDate(e.target.value)} className={`w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-opacity [color-scheme:dark] ${isIndeterminate ? 'opacity-30 cursor-not-allowed' : ''}`} />
                  </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex gap-3 bg-surface-light/30">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3.5 rounded-xl border border-white/10 text-slate-300 font-bold uppercase text-xs tracking-wider hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold shadow-neon transition-all uppercase text-xs tracking-wider">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyCosts;
