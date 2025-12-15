
import React, { useState, useMemo, useRef } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { LogisticsTransaction } from '../types';
import { useLogistics } from '../LogisticsContext';

type FilterType = 'day' | 'week' | 'month' | 'year';

const LogisticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, addLogisticsTransaction } = useLogistics(); // Usando Contexto Global
  
  // --- Estado de Filtro ---
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]); // Data de referência para os filtros

  // --- Estado do Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'uber' | 'shipping'>('uber');
  const [newDate, setNewDate] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleCurrencyChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, '');
      if (!rawValue) { setter(''); return; }
      const val = parseFloat(rawValue) / 100;
      setter(val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const parseCurrency = (val: string) => parseFloat(val.replace(/\./g, '').replace(',', '.').trim()) || 0;

  // --- Lógica de Filtragem de Dados ---
  const { filteredTransactions, dateRangeLabel } = useMemo(() => {
      const ref = new Date(referenceDate + 'T00:00:00');
      let start: Date, end: Date;
      let label = '';

      if (filterType === 'day') {
          start = new Date(ref);
          end = new Date(ref);
          end.setHours(23, 59, 59, 999);
          label = start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      } else if (filterType === 'week') {
          const dayOfWeek = ref.getDay(); // 0 (Dom) a 6 (Sab)
          start = new Date(ref);
          start.setDate(ref.getDate() - dayOfWeek); // Vai para o Domingo anterior
          start.setHours(0,0,0,0);
          
          end = new Date(start);
          end.setDate(start.getDate() + 6); // Sábado
          end.setHours(23,59,59,999);
          label = `${start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })} a ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric' })}`;
      } else if (filterType === 'month') {
          start = new Date(ref.getFullYear(), ref.getMonth(), 1);
          end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
          label = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      } else { // year
          start = new Date(ref.getFullYear(), 0, 1);
          end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
          label = `Ano de ${ref.getFullYear()}`;
      }

      const filtered = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= start && tDate <= end;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { filteredTransactions: filtered, dateRangeLabel: label };
  }, [transactions, filterType, referenceDate]);

  // --- Estatísticas Locais (Baseadas no Filtro) ---
  const localStats = useMemo(() => {
      const total = filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0);
      const uberTotal = filteredTransactions.filter(t => t.type === 'uber').reduce((acc, curr) => acc + curr.amount, 0);
      const shippingTotal = filteredTransactions.filter(t => t.type === 'shipping').reduce((acc, curr) => acc + curr.amount, 0);
      const uberCount = filteredTransactions.filter(t => t.type === 'uber').length;
      const shippingCount = filteredTransactions.filter(t => t.type === 'shipping').length;
      
      const totalCount = uberTotal + shippingTotal || 1;
      const uberPct = Math.round((uberTotal / totalCount) * 100);
      const shippingPct = Math.round((shippingTotal / totalCount) * 100);

      // Média diária (simples, divide pelo número de dias no range ou 1)
      let daysDivisor = 1;
      if (filterType === 'week') daysDivisor = 7;
      if (filterType === 'month') daysDivisor = new Date(new Date(referenceDate).getFullYear(), new Date(referenceDate).getMonth() + 1, 0).getDate();
      if (filterType === 'year') daysDivisor = 365;

      return { total, uberTotal, shippingTotal, uberCount, shippingCount, uberPct, shippingPct, daysDivisor };
  }, [filteredTransactions, filterType, referenceDate]);

  // --- Dados do Gráfico (Dinâmico por Filtro) ---
  const chartData = useMemo(() => {
      const dataMap = new Map<string, { label: string; uber: number; shipping: number; sortKey: number }>();

      filteredTransactions.forEach(t => {
          const d = new Date(t.date);
          let key = '';
          let label = '';
          let sortKey = 0;

          if (filterType === 'day') {
              // Agrupar por Hora
              const hour = d.getHours();
              key = `${hour}`;
              label = `${hour}h`;
              sortKey = hour;
          } else if (filterType === 'week') {
              // Agrupar por Dia da Semana
              const day = d.getDay();
              const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
              key = `${day}`;
              label = days[day];
              sortKey = day;
          } else if (filterType === 'month') {
              // Agrupar por Dia do Mês
              const day = d.getDate();
              key = `${day}`;
              label = `${day}`;
              sortKey = day;
          } else {
              // Agrupar por Mês
              const month = d.getMonth();
              const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              key = `${month}`;
              label = months[month];
              sortKey = month;
          }

          if (!dataMap.has(key)) {
              dataMap.set(key, { label, uber: 0, shipping: 0, sortKey });
          }
          const entry = dataMap.get(key)!;
          if (t.type === 'uber') entry.uber += t.amount;
          else entry.shipping += t.amount;
      });

      // Preencher lacunas para o gráfico ficar bonito
      if (filterType === 'day') {
          for (let i = 0; i < 24; i += 3) { // A cada 3h para não poluir
              if (!dataMap.has(`${i}`)) dataMap.set(`${i}`, { label: `${i}h`, uber: 0, shipping: 0, sortKey: i });
          }
      } else if (filterType === 'week') {
          for (let i = 0; i < 7; i++) {
              if (!dataMap.has(`${i}`)) {
                  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                  dataMap.set(`${i}`, { label: days[i], uber: 0, shipping: 0, sortKey: i });
              }
          }
      } else if (filterType === 'year') {
          for (let i = 0; i < 12; i++) {
              if (!dataMap.has(`${i}`)) {
                  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  dataMap.set(`${i}`, { label: months[i], uber: 0, shipping: 0, sortKey: i });
              }
          }
      }
      // Para mês, deixamos dinâmico apenas com os dias que tem movimento ou gaps simples se quiser, mas vamos deixar ordenado.

      return Array.from(dataMap.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredTransactions, filterType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFileName(e.target.files[0].name);
  };

  const handleSave = () => {
    if (!newTitle || !newAmount || !newDate) { alert("Preencha todos os campos."); return; }
    const amountValue = parseCurrency(newAmount);
    if (isNaN(amountValue)) { alert("Valor inválido."); return; }

    const newTransaction: LogisticsTransaction = {
      id: Date.now(),
      title: newTitle,
      amount: amountValue,
      type: newType,
      date: newDate.replace('T', ' '),
      status: 'completed',
      attachment: fileName || undefined
    };

    addLogisticsTransaction(newTransaction);
    setNewTitle(''); setNewAmount(''); setNewDate(''); setFileName(null); setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-10 relative">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full bg-surface-light/50 border border-white/10 text-white hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white font-display flex items-center gap-2">Logística & Transporte</h1>
            <p className="text-text-muted mt-1">Gerencie custos com Uber, táxi e serviços de entrega.</p>
          </div>
        </div>

        {/* Toolbar de Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 bg-surface-light/50 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-lg">
            <div className="flex bg-surface-light/50 p-1 rounded-lg border border-white/5">
                {(['day', 'week', 'month', 'year'] as const).map((t) => (
                    <button 
                        key={t} 
                        onClick={() => setFilterType(t)} 
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all uppercase ${filterType === t ? 'bg-primary/20 text-primary shadow-neon-sm' : 'text-text-muted hover:text-white'}`}
                    >
                        {t === 'day' ? 'Dia' : t === 'week' ? 'Semana' : t === 'month' ? 'Mês' : 'Ano'}
                    </button>
                ))}
            </div>
            
            <div className="flex items-center px-2 border-l border-white/10 gap-2">
                {filterType === 'day' && (
                    <input type="date" value={referenceDate} onChange={e => setReferenceDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 p-0 cursor-pointer [color-scheme:dark]" />
                )}
                {filterType === 'week' && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted font-bold uppercase">Ref:</span>
                        <input type="date" value={referenceDate} onChange={e => setReferenceDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 p-0 cursor-pointer [color-scheme:dark]" />
                    </div>
                )}
                {filterType === 'month' && (
                    <input type="month" value={referenceDate.slice(0, 7)} onChange={e => setReferenceDate(e.target.value + '-01')} className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 p-0 cursor-pointer [color-scheme:dark]" />
                )}
                {filterType === 'year' && (
                    <select 
                        value={new Date(referenceDate).getFullYear()} 
                        onChange={e => setReferenceDate(`${e.target.value}-01-01`)} 
                        className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 p-0 cursor-pointer [&>option]:bg-black"
                    >
                        {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                )}
            </div>

            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2 bg-primary text-black rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors shadow-neon active:scale-95 ml-2 uppercase tracking-wide">
                <span className="material-symbols-outlined text-[18px]">add</span> Novo
            </button>
        </div>
      </div>

      {/* Stats Cards Dinâmicos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
            { label: 'Gasto no Período', value: localStats.total, icon: 'payments', color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Uber', value: localStats.uberTotal, icon: 'local_taxi', color: 'text-primary', border: 'border-primary/20', sub: `${localStats.uberCount} Corridas` },
            { label: 'Entregas', value: localStats.shippingTotal, icon: 'local_shipping', color: 'text-secondary', border: 'border-secondary/20', sub: `${localStats.shippingCount} Envios` },
            { label: 'Média/Dia (Período)', value: localStats.total / (filterType === 'day' ? 1 : localStats.daysDivisor), icon: 'trending_up', color: 'text-white', border: 'border-white/10' }
        ].map((card, i) => (
            <div key={i} className={`glass-panel p-6 rounded-[24px] border ${card.border} shadow-sm flex flex-col justify-between group`}>
                <div className="flex justify-between items-start">
                    <div className={`p-3 bg-surface-light/50 rounded-xl ${card.color} border border-white/5`}>
                        <span className="material-symbols-outlined">{card.icon}</span>
                    </div>
                </div>
                <div className="mt-6">
                    <p className="text-text-muted text-xs font-bold uppercase tracking-wider">{card.label}</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(card.value)}</h3>
                    {card.sub && <p className="text-xs text-slate-400 mt-1">{card.sub}</p>}
                </div>
            </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-[30px] border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="text-lg font-bold text-white font-display">Evolução de Gastos</h3>
                <p className="text-xs text-text-muted uppercase tracking-wider font-bold mt-1 text-primary">{dateRangeLabel}</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorShipping" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0e1015', border: '1px solid #ffffff10', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="uber" name="Uber" stroke="#00f0ff" strokeWidth={3} fillOpacity={1} fill="url(#colorUber)" />
                <Area type="monotone" dataKey="shipping" name="Logística" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorShipping)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-[30px] border border-white/5">
           <h3 className="text-lg font-bold text-white mb-6 font-display">Distribuição</h3>
           <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Gastos', Uber: localStats.uberTotal, Logística: localStats.shippingTotal }]}>
                    <XAxis dataKey="name" hide />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0e1015', border: '1px solid #ffffff10', borderRadius: '12px', color: '#fff' }} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="Uber" fill="#00f0ff" radius={[4, 4, 0, 0]} barSize={60} />
                    <Bar dataKey="Logística" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={60} />
                </BarChart>
            </ResponsiveContainer>
           </div>
           <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2"><span className="size-3 rounded-full bg-primary shadow-[0_0_5px_theme('colors.primary')]"></span><span className="text-sm text-slate-300 font-bold">Uber ({isNaN(localStats.uberPct) ? 0 : localStats.uberPct}%)</span></div>
                <div className="flex items-center gap-2"><span className="size-3 rounded-full bg-secondary shadow-[0_0_5px_theme('colors.secondary')]"></span><span className="text-sm text-slate-300 font-bold">Logística ({isNaN(localStats.shippingPct) ? 0 : localStats.shippingPct}%)</span></div>
           </div>
        </div>
      </div>

      <div className="glass-panel rounded-[30px] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <div>
                <h3 className="text-lg font-bold text-white font-display">Histórico do Período</h3>
                <p className="text-xs text-text-muted mt-1">{filteredTransactions.length} registros encontrados</p>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-text-muted text-xs uppercase tracking-wider font-display bg-white/[0.02]">
                        <th className="px-6 py-4 font-bold">Serviço</th>
                        <th className="px-6 py-4 font-bold">Descrição</th>
                        <th className="px-6 py-4 font-bold">Data/Hora</th>
                        <th className="px-6 py-4 font-bold text-right">Valor</th>
                        <th className="px-6 py-4 font-bold text-center">PDF</th>
                        <th className="px-6 py-4 font-bold text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredTransactions.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-text-muted">Nenhum registro para o período selecionado.</td></tr>
                    )}
                    {filteredTransactions.map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                                <div className={`flex items-center gap-2 w-fit px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${item.type === 'uber' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary/10 text-secondary border-secondary/20'}`}>
                                    <span className="material-symbols-outlined text-[14px]">{item.type === 'uber' ? 'local_taxi' : 'local_shipping'}</span>
                                    {item.type === 'uber' ? 'Uber' : 'Logística'}
                                </div>
                            </td>
                            <td className="px-6 py-4"><span className="text-sm font-medium text-white">{item.title}</span></td>
                            <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                                {new Date(item.date).toLocaleDateString('pt-BR')} 
                                {item.date.includes('T') || item.date.includes(' ') ? <span className="opacity-50 ml-1 text-xs">{new Date(item.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span> : ''}
                            </td>
                            <td className="px-6 py-4 text-right"><span className="text-sm font-bold text-white">{formatCurrency(item.amount)}</span></td>
                            <td className="px-6 py-4 text-center">
                                {item.attachment ? <button className="text-primary hover:text-white transition-colors"><span className="material-symbols-outlined">attach_file</span></button> : <span className="text-slate-600">-</span>}
                            </td>
                            <td className="px-6 py-4 text-center"><span className={`inline-block size-2 rounded-full ${item.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-orange-400'}`}></span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-[30px] border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-surface-light/50 to-transparent">
              <h3 className="text-xl font-bold text-white font-display">Nova Corrida / Envio</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Tipo de Serviço</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setNewType('uber')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-bold text-sm ${newType === 'uber' ? 'bg-primary/20 border-primary text-primary shadow-neon-sm' : 'border-white/10 bg-surface-light/50 text-slate-400 hover:text-white'}`}><span className="material-symbols-outlined">local_taxi</span>Uber</button>
                  <button onClick={() => setNewType('shipping')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-bold text-sm ${newType === 'shipping' ? 'bg-secondary/20 border-secondary text-secondary shadow-[0_0_15px_theme("colors.secondary")]' : 'border-white/10 bg-surface-light/50 text-slate-400 hover:text-white'}`}><span className="material-symbols-outlined">local_shipping</span>Logística</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Descrição</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Entrega de Contrato" className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Valor (R$)</label>
                  <input value={newAmount} onChange={handleCurrencyChange(setNewAmount)} placeholder="0,00" className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Data</label>
                  <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm [color-scheme:dark]" />
                </div>
              </div>
              <div 
                  className="border-2 border-dashed border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  {fileName ? <div className="flex items-center gap-2 text-primary font-bold"><span className="material-symbols-outlined">description</span><span className="truncate max-w-[200px]">{fileName}</span></div> : <><span className="material-symbols-outlined text-slate-500 group-hover:text-primary text-3xl mb-2 transition-colors">cloud_upload</span><p className="text-xs text-text-muted font-bold uppercase">Anexar Comprovante</p></>}
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex gap-3 bg-surface-light/30">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3.5 rounded-xl border border-white/10 text-gray-300 font-bold uppercase text-xs tracking-wider hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold uppercase text-xs tracking-wider shadow-neon hover:shadow-[0_0_20px_theme('colors.primary')] transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsDashboard;
