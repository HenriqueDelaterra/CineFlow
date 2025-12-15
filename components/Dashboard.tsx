
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../FinanceContext';
import { useContacts } from '../ContactsContext';
import { useAgenda } from '../AgendaContext';
import { useUser } from '../UserContext';
import { useLogistics } from '../LogisticsContext';
import { Transaction } from '../types';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
    scope?: 'business' | 'personal';
}

// New StatCard component matching reference design
const StatCard = ({ title, value, subValue, trendColor, icon, statusLabel, accentColorClass, customSvg, onClick }: any) => {
  // Helper to generate dynamic classes with opacity
  const getBgClass = (cls: string) => cls.replace('text-', 'bg-').replace('500', '500/10').replace('400', '400/10').replace('primary', 'primary/10');
  const getBorderClass = (cls: string) => cls.replace('text-', 'border-').replace('500', '500/20').replace('400', '400/20').replace('primary', 'primary/20');
  const getTextClass = (cls: string) => cls.replace('text-', 'text-').replace('500', '300').replace('400', '300');

  return (
    <div 
        onClick={onClick}
        className={`glass-panel p-8 rounded-[40px] relative overflow-hidden group transition-all duration-500 hover:shadow-neon-sm hover:-translate-y-2 bg-card-sheen animate-sheen ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Dynamic Background Glow */}
      <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-2xl transition-all opacity-10 group-hover:opacity-20 ${accentColorClass.replace('text-', 'bg-')}`}></div>
      
      {/* SVG Graph Background */}
      <svg className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 200 100">
          {customSvg}
      </svg>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className={`w-14 h-14 rounded-full border flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-transform duration-300 ${getBgClass(accentColorClass)} ${getBorderClass(accentColorClass)} ${accentColorClass}`}>
            <span className="material-symbols-outlined text-3xl">{icon}</span>
          </div>
          <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-md ${getBgClass(accentColorClass)} ${getBorderClass(accentColorClass)} ${getTextClass(accentColorClass)}`}>
              {statusLabel}
          </span>
        </div>
        
        <p className="text-sm font-medium text-text-muted uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-4xl font-bold text-white mb-6 font-display tracking-tight">{value}</h3>
        
        {/* Progress Bar Mockup */}
        <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden mb-4 p-[2px]">
          <div className={`h-full rounded-full w-0 group-hover:w-[40%] transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${accentColorClass.replace('text-', 'bg-')}`}></div>
        </div>

        <div className="flex justify-between items-center text-xs text-text-muted font-medium">
          <span>{subValue}</span>
          <span className={`${trendColor} flex items-center gap-1 ${getBgClass(accentColorClass).replace('/10', '/5')} px-2 py-0.5 rounded-full`}>
              Status <span className="material-symbols-outlined text-[14px]">trending_flat</span>
          </span>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ scope = 'business' }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { 
    costs,
    transactions, 
    addTransaction,
    importedStatement,      
    setImportedStatement,   
    clearImportedStatement, 
    receivables, 
  } = useFinance();
  const { events, deleteEvent } = useAgenda();
  const { addLogisticsTransaction, removeLogisticsTransactionsByImportId } = useLogistics(); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // --- FILTERED DATA BASED ON SCOPE ---
  const filteredTransactions = useMemo(() => {
      return transactions.filter(t => (t.scope || 'business') === scope);
  }, [transactions, scope]);

  const filteredCosts = useMemo(() => {
      return costs.filter(c => (c.scope || 'business') === scope);
  }, [costs, scope]);

  const filteredEvents = useMemo(() => {
      return events.filter(e => (e.scope || 'business') === scope);
  }, [events, scope]);

  const filteredReceivables = useMemo(() => {
      return receivables.filter(r => (r.scope || 'business') === scope);
  }, [receivables, scope]);

  // --- STATS CALCULATION (LOCAL TO SCOPE) ---
  const scopeStats = useMemo(() => {
      return filteredTransactions.reduce((acc, curr) => {
          if (curr.type === 'income') {
              acc.totalIncome += curr.amount;
              acc.balance += curr.amount;
          } else {
              acc.totalExpense += curr.amount;
              acc.balance -= curr.amount;
          }
          return acc;
      }, { balance: 0, totalIncome: 0, totalExpense: 0 });
  }, [filteredTransactions]);

  // --- CALCULA CUSTOS FIXOS DO MÊS ATUAL ---
  const { totalFixedProjected, totalFixedPaid, totalFixedPending } = useMemo(() => {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      let projected = 0;
      let paid = 0;

      filteredCosts.forEach(cost => {
          if (!cost.active) return;
          const costStart = new Date(cost.startDate);
          const costEnd = cost.endDate ? new Date(cost.endDate) : new Date(9999, 11, 31);
          
          // Verifica se o custo vigora no mês atual
          if (costStart <= currentMonthEnd && costEnd >= currentMonthStart) {
              projected += cost.amount;
              if (cost.status === 'paid') {
                  paid += cost.amount;
              }
          }
      });

      return { 
          totalFixedProjected: projected, 
          totalFixedPaid: paid, 
          totalFixedPending: projected - paid 
      };
  }, [filteredCosts]);

  // --- NOVOS ESTADOS PARA MODAL DE DETALHES ---
  const [viewDetailsType, setViewDetailsType] = useState<'none' | 'global' | 'imported'>('none');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalTimeFilter, setModalTimeFilter] = useState<'all' | 'day' | 'week' | 'month' | 'year'>('all');
  const [modalReferenceDate, setModalReferenceDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [transDesc, setTransDesc] = useState('');
  const [transAmount, setTransAmount] = useState('');
  const [transType, setTransType] = useState<'income' | 'expense'>('income');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);

  // Import State
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const handleCurrencyChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, '');
      if (!rawValue) {
          setter('');
          return;
      }
      const val = parseFloat(rawValue) / 100;
      const formatted = val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      setter(formatted);
  };

  const parseCurrency = (val: string) => parseFloat(val.replace(/\./g, '').replace(',', '.').trim()) || 0;

  const getCategoryStyle = (category: string) => {
      const lower = category.toLowerCase();
      if (lower.includes('transporte') || lower.includes('uber') || lower.includes('logística')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      if (lower.includes('aliment') || lower.includes('delivery')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      if (lower.includes('assinatura') || lower.includes('serviço')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      if (lower.includes('entrada') || lower.includes('receita') || lower.includes('salário')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      if (lower.includes('taxa') || lower.includes('juros')) return 'bg-red-500/10 text-red-400 border-red-500/20';
      return 'bg-white/5 text-slate-400 border-white/10';
  };

  // --- LÓGICA DE DADOS (USANDO FILTRADOS) ---
  const unifiedReceivables = useMemo(() => {
      const manualItems = filteredReceivables.map(r => ({ ...r, isAgenda: false }));
      const agendaItems = filteredEvents
        .filter(e => e.value)
        .map(e => {
            const cleanStr = (e.value || '').replace(/[^\d,]/g, '').replace(',', '.');
            const numericVal = parseFloat(cleanStr) || 0;
            const isPaid = e.status === 'completed';
            return {
                id: e.id,
                clientName: e.title,
                projectTitle: 'Via Agenda',
                totalValue: numericVal,
                amountReceived: isPaid ? numericVal : 0,
                serviceDate: e.date,
                dueDate: e.paymentDate || e.date,
                status: isPaid ? 'paid' : 'pending',
                isAgenda: true,
                createdAt: new Date().toISOString()
            };
        });
      return [...manualItems, ...agendaItems].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  }, [filteredReceivables, filteredEvents]);

  const { totalReceivablesValue, totalReceivablesReceived, totalReceivablesPending } = useMemo(() => {
      return unifiedReceivables.reduce((acc, curr) => {
          acc.totalReceivablesValue += (curr.totalValue as number);
          acc.totalReceivablesReceived += (curr.amountReceived as number);
          acc.totalReceivablesPending += ((curr.totalValue as number) - (curr.amountReceived as number));
          return acc;
      }, { totalReceivablesValue: 0, totalReceivablesReceived: 0, totalReceivablesPending: 0 });
  }, [unifiedReceivables]);

  const realBalance = scopeStats.balance;

  const recentTransactions = useMemo(() => {
      return [...filteredTransactions]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
  }, [filteredTransactions]);

  // --- TRANSAÇÕES FILTRADAS PARA O MODAL ---
  const modalTransactions = useMemo(() => {
      let source = [];
      if (viewDetailsType === 'global') {
          source = filteredTransactions; // USA TRANSAÇÕES DO ESCOPO
      } else if (viewDetailsType === 'imported') {
          source = importedStatement.transactions; // Importado geralmente não tem scope salvo no moment, mas é visualização temporária
      }

      const ref = new Date(modalReferenceDate + 'T00:00:00');
      let start: Date | null = null; 
      let end: Date | null = null;

      if (modalTimeFilter === 'day') {
          start = new Date(ref);
          end = new Date(ref);
          end.setHours(23, 59, 59, 999);
      } else if (modalTimeFilter === 'week') {
          const dayOfWeek = ref.getDay();
          start = new Date(ref);
          start.setDate(ref.getDate() - dayOfWeek);
          start.setHours(0,0,0,0);
          end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23,59,59,999);
      } else if (modalTimeFilter === 'month') {
          start = new Date(ref.getFullYear(), ref.getMonth(), 1);
          end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (modalTimeFilter === 'year') {
          start = new Date(ref.getFullYear(), 0, 1);
          end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
      }

      return source.filter(t => {
          const matchesSearch = t.description.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                                t.category.toLowerCase().includes(modalSearchTerm.toLowerCase());
          let matchesTime = true;
          if (modalTimeFilter !== 'all' && start && end) {
              const tDate = new Date(t.date + 'T12:00:00');
              matchesTime = tDate >= start && tDate <= end;
          }
          return matchesSearch && matchesTime;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewDetailsType, filteredTransactions, importedStatement, modalSearchTerm, modalTimeFilter, modalReferenceDate]);

  // --- LÓGICA DE ANÁLISE FINANCEIRA (KPIs) ---
  const financialAnalysis = useMemo(() => {
      const { totalIncome, totalExpense, balance: finalBalance, transactions: localTrans } = importedStatement;
      const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
      const dates = localTrans.filter(t => t.type === 'expense').map(t => new Date(t.date).getTime());
      let avgDailyExpense = 0;
      if (dates.length > 0) {
          const minDate = Math.min(...dates);
          const maxDate = Math.max(...dates);
          const diffTime = Math.abs(maxDate - minDate);
          const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          avgDailyExpense = totalExpense / diffDays;
      }
      const expenseCategories: Record<string, number> = {};
      localTrans.filter(t => t.type === 'expense').forEach(t => {
          const cat = t.category || 'Outros';
          if (!expenseCategories[cat]) expenseCategories[cat] = 0;
          expenseCategories[cat] += t.amount;
      });
      const pieData = Object.keys(expenseCategories).map(key => ({ name: key, value: expenseCategories[key] }));
      const barData = [
          { name: 'Financeiro', Entradas: totalIncome, Saídas: totalExpense }
      ];
      return { totalIncome, totalExpense, finalBalance, expenseRatio, avgDailyExpense, pieData, barData };
  }, [importedStatement]);

  const COLORS = ['#00f0ff', '#f43f5e', '#7c3aed', '#fbbf24', '#34d399'];

  const handleSaveTransaction = () => {
      if (!transDesc || !transAmount) { alert('Preencha descrição e valor.'); return; }
      const val = parseCurrency(transAmount);
      if (isNaN(val)) { alert('Valor inválido'); return; }

      addTransaction({
          id: Date.now().toString(),
          description: transDesc,
          amount: val,
          type: transType,
          date: transDate,
          category: 'Geral',
          scope: scope // INJECT CURRENT SCOPE
      });
      setTransDesc(''); setTransAmount(''); setTransType('income'); setIsModalOpen(false);
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setImportFileName(e.target.files[0].name);
      }
  };

  const desfazerImportacao = async () => {
    if (!confirm("Atenção: Você tem certeza que deseja limpar a análise financeira atual e remover os lançamentos automáticos de logística associados?")) {
        return; 
    }
    const sampleTransaction = importedStatement.transactions[0];
    if (sampleTransaction && sampleTransaction.importId) {
        removeLogisticsTransactionsByImportId(sampleTransaction.importId);
    }
    clearImportedStatement();
    setImportFileName(null);
    if (importFileRef.current) {
        importFileRef.current.value = '';
    }
    alert("Dados do último extrato removidos com sucesso.");
  };

  const parseBankingValue = (valStr: string): number | null => {
      if (!valStr) return null;
      let clean = valStr.trim().replace(/[R$\s]/g, '');
      let isNegative = false;
      if (clean.endsWith('-') || clean.startsWith('-') || (clean.startsWith('(') && clean.endsWith(')'))) {
          isNegative = true;
          clean = clean.replace(/[-()]/g, '');
      }
      if (clean.includes(',') && clean.includes('.')) {
          const lastDot = clean.lastIndexOf('.');
          const lastComma = clean.lastIndexOf(',');
          if (lastComma > lastDot) {
              clean = clean.replace(/\./g, '').replace(',', '.');
          } else {
              clean = clean.replace(/,/g, '');
          }
      } else if (clean.includes(',')) {
          clean = clean.replace(',', '.');
      }
      const value = parseFloat(clean);
      if (isNaN(value)) return null;
      return isNegative ? -Math.abs(value) : value;
  };

  const detectCategory = (description: string, type: 'income' | 'expense'): string => {
      const text = description.toUpperCase();
      if (type === 'income') {
          if (text.includes('PIX')) return 'Transferência Pix';
          if (text.includes('SALARIO') || text.includes('PAGAMENTO')) return 'Salário/Receita';
          return 'Entrada';
      }
      if (text.includes('UBER') && !text.includes('EATS')) return 'Transporte';
      if (text.includes('99') || text.includes('TAXI')) return 'Transporte';
      if (text.includes('IFOOD') || text.includes('RAPPI')) return 'Delivery';
      if (text.includes('MCDONALDS') || text.includes('BURGER')) return 'Alimentação';
      if (text.includes('SUPERMERCADO') || text.includes('ASSAI') || text.includes('CARREFOUR')) return 'Mercado';
      if (text.includes('NETFLIX') || text.includes('SPOTIFY')) return 'Assinatura';
      return 'Despesa Geral';
  };

  const normalizeDescription = (raw: string): string => {
      if (!raw) return "Transação";
      let text = raw.toUpperCase();
      text = text.replace(/[\/\\]\d{4}([-\s]?\d{2})?/g, ''); 
      text = text.replace(/\b(LTDA|S\.A\.?|S\/A|EIRELI|ME|EPP|MEI)\b/g, '');
      text = text.replace(/\b(IP\s?S\.?A\.?|IP)\b/g, '');
      text = text.replace(/[-_.:*#]/g, ' '); 
      text = text.replace(/\s+/g, ' ').trim();
      if (text.length > 2) {
          return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
      return text || "Diversos";
  };

  const processImportFile = () => {
      if (!importFileRef.current?.files?.length) {
          alert("Selecione um arquivo primeiro.");
          return;
      }

      const file = importFileRef.current.files[0];
      const reader = new FileReader();
      setIsProcessingImport(true);

      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (!text) {
              alert("Erro ao ler arquivo.");
              setIsProcessingImport(false);
              return;
          }

          const lines = text.split(/\r?\n/);
          const batchTransactions: Transaction[] = []; 
          const batchId = `batch-${Date.now()}`;
          let uberCount = 0;

          lines.forEach(line => {
              if (!line.trim()) return;
              const cleanLine = line.replace(/"/g, '');
              const separator = cleanLine.includes(';') ? ';' : ',';
              const columns = cleanLine.split(separator).map(c => c.trim());

              if (columns.some(c => /data|valor|descri/i.test(c)) && !/\d/.test(columns.join(''))) return;

              let dateStr = '';
              let amount = 0;
              let descriptionRaw = '';
              let foundDate = false;
              let foundAmount = false;

              for (const col of columns) {
                  if (!foundDate) {
                      const dateMatch = col.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                      if (dateMatch) {
                          dateStr = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
                          foundDate = true;
                          continue;
                      }
                      const dateMatchISO = col.match(/^(\d{4})-(\d{2})-(\d{2})/);
                      if (dateMatchISO) {
                          dateStr = col;
                          foundDate = true;
                          continue;
                      }
                  }

                  if (!foundAmount) {
                      if (/^-?(?:R\$ ?)?(?:\d{1,3}(?:[.,]\d{3})*|[0-9]+)(?:[.,]\d{1,2})?-?$/.test(col)) {
                          const parsed = parseBankingValue(col);
                          if (parsed !== null && Math.abs(parsed) > 0.001) {
                              amount = parsed;
                              foundAmount = true;
                              continue;
                          }
                      }
                  }

                  if (col.length > 2 && !/^\d+$/.test(col)) {
                      descriptionRaw = descriptionRaw ? `${descriptionRaw} ${col}` : col;
                  }
              }

              if (foundDate && foundAmount) {
                  const type = amount < 0 ? 'expense' : 'income';
                  const cleanName = normalizeDescription(descriptionRaw);
                  const autoCategory = detectCategory(descriptionRaw, type);

                  batchTransactions.push({
                      id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      description: cleanName,
                      amount: Math.abs(amount),
                      type: type,
                      category: autoCategory, 
                      date: dateStr,
                      importId: batchId 
                  });

                  if (cleanName.includes('Uber') && !cleanName.includes('Eats') && type === 'expense' && scope === 'business') {
                      addLogisticsTransaction({
                          id: Date.now() + Math.random(), 
                          title: `Uber Importado: ${dateStr}`,
                          amount: Math.abs(amount),
                          type: 'uber',
                          date: dateStr,
                          status: 'completed',
                          importId: batchId 
                      });
                      uberCount++;
                  }
              }
          });

          if (batchTransactions.length > 0) {
              const totalIncome = batchTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
              const totalExpense = batchTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
              
              setImportedStatement({
                  totalIncome,
                  totalExpense,
                  balance: totalIncome - totalExpense,
                  transactions: batchTransactions
              });

              setTimeout(() => {
                  setIsProcessingImport(false);
                  setImportFileName(null);
                  setIsImportModalOpen(false);
                  let msg = `${batchTransactions.length} transações importadas para visualização.`;
                  if (uberCount > 0) msg += `\n\n🚕 ${uberCount} lançamentos de Uber identificados.`;
                  alert(msg);
              }, 500);
          } else {
              setIsProcessingImport(false);
              alert("Não foi possível identificar transações válidas.");
          }
      };
      if (file.name.endsWith('.pdf') || file.name.endsWith('.xlsx')) {
          setTimeout(() => { setIsProcessingImport(false); alert("Use CSV ou Texto."); }, 1000);
      } else {
          reader.readAsText(file);
      }
  };

  return (
    <div className="max-w-[1600px] mx-auto animate-fade-in relative pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 relative z-10">
        <div>
          <h1 className="text-5xl font-bold text-white mb-2 glow-text tracking-tight font-display">
            Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-text-muted text-lg font-light max-w-xl">
              {scope === 'personal' ? 'Painel de Gestão Pessoal' : 'Resumo financeiro das suas operações empresariais.'}
          </p>
        </div>
        <div className={`flex items-center gap-3 bg-surface-light/30 backdrop-blur-md pl-4 pr-6 py-3 rounded-full border border-white/5 shadow-lg group hover:border-white/10 transition-colors cursor-default ${scope === 'personal' ? 'border-purple-500/20' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
            <span className={`material-symbols-outlined text-[18px] ${scope === 'personal' ? 'text-purple-400' : 'text-primary'}`}>{scope === 'personal' ? 'person' : 'domain'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{scope === 'personal' ? 'Pessoal' : 'Empresarial'}</span>
            <span className="text-sm font-mono text-white uppercase">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid - Filtered by Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        <StatCard 
          title={scope === 'personal' ? "Minhas Receitas" : "A Receber"}
          value={formatCurrency(totalReceivablesPending)} // Needs filtered logic
          statusLabel="PENDENTE"
          subValue={`Projetado: ${formatCurrency(totalReceivablesValue)}`}
          icon={scope === 'personal' ? 'savings' : 'check_circle'}
          accentColorClass="text-orange-500"
          trendColor="text-orange-400"
          customSvg={<path className="text-orange-500" d="M0,100 C50,20 150,20 200,100" fill="none" stroke="currentColor" strokeWidth="2"></path>}
        />

        <StatCard 
          title="Saldo Disponível" 
          value={formatCurrency(realBalance)}
          statusLabel="EM CAIXA"
          subValue="Líquido"
          icon="account_balance_wallet"
          accentColorClass={scope === 'personal' ? "text-purple-500" : "text-emerald-500"}
          trendColor={scope === 'personal' ? "text-purple-400" : "text-emerald-400"}
          customSvg={<path className={scope === 'personal' ? "text-purple-500" : "text-emerald-500"} d="M0,80 C80,80 120,0 200,0" fill="none" stroke="currentColor" strokeWidth="2"></path>}
        />

        <StatCard 
          title="Custos Fixos Mensais" 
          value={formatCurrency(totalFixedProjected)}
          statusLabel="CUSTOS FIXOS"
          subValue={`Pago: ${formatCurrency(totalFixedPaid)} | Aberto: ${formatCurrency(totalFixedPending)}`}
          icon="house"
          accentColorClass="text-primary"
          trendColor="text-primary"
          onClick={() => navigate('/custos')}
          customSvg={<path className="text-primary" d="M0,50 Q100,0 200,50" fill="none" stroke="currentColor" strokeWidth="2"></path>}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        
        {/* Movimentações / Table Widget (Filtered) */}
        <div className="lg:col-span-2 glass-panel rounded-[40px] overflow-hidden flex flex-col h-full min-h-[450px] relative border border-white/5">
            <div className="p-8 border-b border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary/20 to-blue-600/20 rounded-2xl text-primary border border-primary/20 shadow-inner">
                        <span className="material-symbols-outlined text-[24px]">history_edu</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-2xl text-white font-display">Movimentações</h3>
                        <p className="text-xs text-text-muted uppercase tracking-widest mt-1">Histórico Recente ({scope === 'personal' ? 'Pessoal' : 'Empresarial'})</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setViewDetailsType('global'); setModalSearchTerm(''); setModalTimeFilter('all'); }}
                    className="text-xs font-bold text-primary hover:text-white px-6 py-3 rounded-full bg-primary/10 hover:bg-primary/20 hover:shadow-neon transition-all border border-primary/20"
                >
                    VER COMPLETO
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {recentTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-10 text-center relative overflow-hidden group min-h-[300px]">
                        <p className="text-white font-medium z-10 font-display text-xl mb-2">Sem dados recentes</p>
                        <p className="text-sm text-text-muted max-w-sm z-10 leading-relaxed">Nenhuma transação {scope === 'personal' ? 'pessoal' : 'empresarial'} encontrada.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {recentTransactions.map((t) => (
                            <div key={t.id} className="grid grid-cols-12 px-8 py-4 items-center hover:bg-white/5 transition-colors group">
                                <div className="col-span-1 flex items-center justify-center">
                                     <span className={`material-symbols-outlined text-[24px] ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {t.type === 'income' ? 'add_circle' : 'remove_circle'}
                                    </span>
                                </div>
                                <div className="col-span-7 flex flex-col justify-center pl-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold text-white truncate">{normalizeDescription(t.description)}</p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide whitespace-nowrap border ${getCategoryStyle(t.category)}`}>
                                            {t.category}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-text-muted font-mono">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className={`col-span-4 text-right font-mono font-bold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Central de Comando / Actions */}
        <div className="flex flex-col gap-8">
            <div className="glass-panel rounded-[40px] p-8 flex flex-col flex-1">
                <h3 className="font-bold text-2xl text-white mb-8 font-display border-b border-white/5 pb-4 flex items-center gap-3">
                    <span className="w-2 h-8 bg-primary rounded-full shadow-[0_0_10px_#00f0ff]"></span>
                    Central de Comando
                </h3>
                <div className="space-y-4 flex-1">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="w-full group bg-gradient-to-r from-primary/10 to-blue-600/10 hover:from-primary/20 hover:to-blue-600/20 text-white p-1 rounded-[2rem] transition-all border border-primary/20 hover:border-primary/50 hover:shadow-neon-sm active:scale-95"
                    >
                        <div className="flex items-center justify-between p-4 px-6">
                            <span className="font-medium">Nova Transação ({scope === 'personal' ? 'Pessoal' : 'Emp'})</span>
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all duration-300">
                                <span className="material-symbols-outlined text-sm">add</span>
                            </div>
                        </div>
                    </button>

                    <button onClick={() => navigate(scope === 'personal' ? '/pessoal/financas' : '/financas')} className="w-full group bg-surface-light/30 hover:bg-surface-light hover:translate-x-1 text-gray-300 hover:text-white p-5 rounded-[2rem] flex items-center justify-between transition-all border border-white/5 hover:border-white/20 active:scale-95">
                        <span className="font-medium">Relatórios Completos</span>
                        <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors">bar_chart</span>
                    </button>
                    
                    {scope === 'business' && (
                        <>
                            <button onClick={() => navigate('/cadastro')} className="w-full group bg-surface-light/30 hover:bg-surface-light hover:translate-x-1 text-gray-300 hover:text-white p-5 rounded-[2rem] flex items-center justify-between transition-all border border-white/5 hover:border-white/20 active:scale-95">
                                <span className="font-medium">Novo Cadastro</span>
                                <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors">person_add</span>
                            </button>
                            <button onClick={() => navigate('/logistica')} className="w-full group bg-surface-light/30 hover:bg-surface-light hover:translate-x-1 text-gray-300 hover:text-white p-5 rounded-[2rem] flex items-center justify-between transition-all border border-white/5 hover:border-white/20 active:scale-95">
                                <span className="font-medium">Logística / Uber</span>
                                <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors">local_taxi</span>
                            </button>
                        </>
                    )}
                    {scope === 'personal' && (
                        <button onClick={() => navigate('/pessoal/metas')} className="w-full group bg-surface-light/30 hover:bg-surface-light hover:translate-x-1 text-gray-300 hover:text-white p-5 rounded-[2rem] flex items-center justify-between transition-all border border-white/5 hover:border-white/20 active:scale-95">
                            <span className="font-medium">Metas & Objetivos</span>
                            <span className="material-symbols-outlined text-gray-500 group-hover:text-purple-400 transition-colors">flag</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* --- NOVA SEÇÃO: ANÁLISE FINANCEIRA AUTOMÁTICA --- */}
      <div className="mt-12 glass-panel rounded-[40px] border border-white/5 p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-transparent opacity-50"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-primary">
                      <span className="material-symbols-outlined text-2xl">analytics</span>
                  </div>
                  <div>
                      <h3 className="text-2xl font-bold text-white font-display">Análise Financeira</h3>
                      <p className="text-sm text-text-muted">Resumo automático do extrato importado.</p>
                  </div>
              </div>
              <div className="flex gap-2">
                  <button 
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/50 text-primary hover:text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                  >
                      <span className="material-symbols-outlined">upload_file</span>
                      Importar Extrato
                  </button>
                  <button 
                      onClick={desfazerImportacao}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 text-red-500 hover:text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                      title="Remove todos os dados do extrato exibido"
                  >
                      <span className="material-symbols-outlined">history</span>
                      Desfazer última importação
                  </button>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-surface-light/30 border border-white/5 rounded-2xl p-5 hover:bg-surface-light/50 transition-colors">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Total Entradas</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(financialAnalysis.totalIncome)}</p>
              </div>
              <div className="bg-surface-light/30 border border-white/5 rounded-2xl p-5 hover:bg-surface-light/50 transition-colors">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Total Saídas</p>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(financialAnalysis.totalExpense)}</p>
              </div>
              <div className="bg-surface-light/30 border border-white/5 rounded-2xl p-5 hover:bg-surface-light/50 transition-colors">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Saldo Final</p>
                  <p className={`text-2xl font-bold ${financialAnalysis.finalBalance >= 0 ? 'text-white' : 'text-red-500'}`}>{formatCurrency(financialAnalysis.finalBalance)}</p>
              </div>
              <div className="bg-surface-light/30 border border-white/5 rounded-2xl p-5 hover:bg-surface-light/50 transition-colors">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">KPIs de Gasto</p>
                  <div className="flex justify-between items-end">
                      <div>
                          <p className="text-sm font-bold text-white">{financialAnalysis.expenseRatio.toFixed(1)}%</p>
                          <p className="text-[9px] text-gray-500">Comprometimento</p>
                      </div>
                      <div className="text-right">
                          <p className="text-sm font-bold text-white">{formatCurrency(financialAnalysis.avgDailyExpense)}</p>
                          <p className="text-[9px] text-gray-500">Média Diária</p>
                      </div>
                  </div>
              </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/5">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-white/5 text-text-muted text-xs uppercase tracking-wider font-display">
                      <tr>
                          <th className="px-6 py-4 font-bold">Data</th>
                          <th className="px-6 py-4 font-bold">Descrição</th>
                          <th className="px-6 py-4 font-bold text-center">Tipo</th>
                          <th className="px-6 py-4 font-bold text-right">Valor</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-surface-light/10">
                      {importedStatement.transactions.slice(0, 8).map((t) => (
                          <tr key={t.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-3 text-sm font-mono text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                              <td className="px-6 py-3 text-sm text-white font-medium">{t.description}</td>
                              <td className="px-6 py-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                      {t.type === 'income' ? 'Entrada' : 'Saída'}
                                  </span>
                              </td>
                              <td className={`px-6 py-3 text-right font-mono font-bold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                              </td>
                          </tr>
                      ))}
                      {importedStatement.transactions.length === 0 && (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-text-muted">Nenhum dado importado para análise.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Modal Importação de Fatura */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-[30px] border border-white/10 shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col">
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-surface-light/50 to-transparent">
               <h3 className="text-xl font-bold text-white font-display flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary">upload_file</span>
                   Importar Extrato
               </h3>
               <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>
            
            <div className="p-8 space-y-6">
                <p className="text-sm text-text-muted leading-relaxed">
                    Importe o extrato ou fatura do banco para contabilizar seus gastos automaticamente. 
                    <br/><span className="text-xs opacity-70">Formatos aceitos: CSV, XLSX, PDF.</span>
                </p>

                <div 
                    onClick={() => importFileRef.current?.click()}
                    className={`border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-surface-light/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group ${isProcessingImport ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <input type="file" ref={importFileRef} className="hidden" accept=".csv, .xlsx, .pdf" onChange={handleImportFileSelect} />
                    {isProcessingImport ? (
                        <div className="flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
                            <p className="text-sm font-bold text-white animate-pulse">Processando arquivo...</p>
                        </div>
                    ) : importFileName ? (
                        <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl text-emerald-400">description</span>
                            <p className="text-sm font-bold text-white">{importFileName}</p>
                            <span className="text-xs text-primary font-bold uppercase tracking-wide">Arquivo Selecionado</span>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-surface-light/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary transition-colors">cloud_upload</span>
                            </div>
                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Clique para selecionar</p>
                            <p className="text-xs text-gray-500 mt-1">ou arraste o arquivo aqui</p>
                        </>
                    )}
                </div>

                <div className="flex gap-4 pt-2">
                    <button 
                        onClick={() => setIsImportModalOpen(false)}
                        disabled={isProcessingImport}
                        className="flex-1 px-6 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors font-bold tracking-wide uppercase text-xs disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={processImportFile}
                        disabled={!importFileName || isProcessingImport}
                        className="flex-[2] px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-black shadow-neon hover:shadow-[0_0_25px_theme('colors.primary')] transition-all font-bold tracking-wide uppercase text-xs disabled:opacity-50 disabled:shadow-none"
                    >
                        Processar Importação
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Transação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-[30px] border border-white/10 shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-surface-light/50 to-transparent">
               <h3 className="text-xl font-bold text-white font-display">Nova Transação ({scope === 'personal' ? 'Pessoal' : 'Emp'})</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>
            
            <div className="overflow-y-auto p-8 space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-1 bg-surface-light/50 rounded-2xl border border-white/5">
                        <button 
                            type="button"
                            onClick={() => setTransType('income')}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all font-bold text-sm ${transType === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">trending_up</span>
                            Entrada
                        </button>
                        <button 
                            type="button"
                            onClick={() => setTransType('expense')}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all font-bold text-sm ${transType === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">trending_down</span>
                            Saída
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Descrição</label>
                        <input 
                            value={transDesc}
                            onChange={(e) => setTransDesc(e.target.value)}
                            placeholder="Ex: Pagamento Projeto Alpha" 
                            className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Valor</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">R$</span>
                                <input 
                                    value={transAmount}
                                    onChange={handleCurrencyChange(setTransAmount)}
                                    placeholder="0,00" 
                                    type="text"
                                    className="w-full bg-surface-light/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white font-mono text-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Data</label>
                            <input 
                                type="date"
                                value={transDate}
                                onChange={(e) => setTransDate(e.target.value)}
                                className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex gap-4">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-6 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors font-bold tracking-wide uppercase text-xs"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSaveTransaction}
                            className="flex-[2] px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-black shadow-neon hover:shadow-[0_0_25px_theme('colors.primary')] transition-all font-bold tracking-wide uppercase text-xs"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE DETALHES GERAIS --- */}
      {viewDetailsType !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="glass-panel w-full max-w-6xl rounded-[30px] border border-white/10 shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col h-[90vh]">
                
                {/* CABEÇALHO DO MODAL */}
                <div className="p-6 border-b border-white/10 flex flex-col xl:flex-row items-center justify-between gap-4 relative shrink-0">
                    <div className="flex items-center gap-3 w-full xl:w-auto justify-start z-10 pointer-events-none">
                        <div className="p-2 rounded-xl shrink-0 pointer-events-auto transition-colors bg-white/5">
                            <span className={`material-symbols-outlined text-[24px] ${viewDetailsType === 'global' ? 'text-primary' : 'text-emerald-400'}`}>
                                {viewDetailsType === 'global' ? 'history_edu' : 'analytics'}
                            </span>
                        </div>
                        <div className="min-w-0 pointer-events-auto">
                            <h3 className="text-xl font-bold text-white font-display truncate">
                                {viewDetailsType === 'global' ? 'Histórico Completo' : 'Extrato Importado'}
                            </h3>
                            <p className="text-xs text-text-muted mt-0.5">
                                {modalTransactions.length} registros • Total: <b className="text-white">{formatCurrency(modalTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0))}</b>
                            </p>
                        </div>
                    </div>
                    
                    <div className="w-full xl:w-auto flex justify-center xl:absolute xl:left-1/2 xl:top-1/2 xl:-translate-x-1/2 xl:-translate-y-1/2 z-20">
                        <div className="flex items-center gap-2 bg-surface-light/50 p-1.5 rounded-xl border border-white/10 overflow-x-auto shadow-lg backdrop-blur-md">
                            <div className="flex">
                                {(['all', 'day', 'week', 'month', 'year'] as const).map((t) => (
                                    <button 
                                        key={t} 
                                        onClick={() => setModalTimeFilter(t)} 
                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase whitespace-nowrap ${modalTimeFilter === t ? 'bg-primary/20 text-primary shadow-neon-sm' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                                    >
                                        {t === 'all' ? 'Tudo' : t === 'day' ? 'Dia' : t === 'week' ? 'Semana' : t === 'month' ? 'Mês' : 'Ano'}
                                    </button>
                                ))}
                            </div>
                            
                            {modalTimeFilter !== 'all' && (
                                <div className="border-l border-white/10 pl-3 pr-1 flex items-center">
                                    {modalTimeFilter === 'day' && (
                                        <input type="date" value={modalReferenceDate} onChange={e => setModalReferenceDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 p-0 cursor-pointer w-24 [color-scheme:dark]" />
                                    )}
                                    {modalTimeFilter === 'week' && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-text-muted font-bold uppercase">Ref:</span>
                                            <input type="date" value={modalReferenceDate} onChange={e => setModalReferenceDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 p-0 cursor-pointer w-24 [color-scheme:dark]" />
                                        </div>
                                    )}
                                    {modalTimeFilter === 'month' && (
                                        <input type="month" value={modalReferenceDate.slice(0, 7)} onChange={e => setModalReferenceDate(e.target.value + '-01')} className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 p-0 cursor-pointer w-24 [color-scheme:dark]" />
                                    )}
                                    {modalTimeFilter === 'year' && (
                                        <select 
                                            value={new Date(modalReferenceDate).getFullYear()} 
                                            onChange={e => setModalReferenceDate(`${e.target.value}-01-01`)} 
                                            className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 p-0 cursor-pointer w-16 [&>option]:bg-black"
                                        >
                                            {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full xl:w-auto justify-end z-10">
                        <div className="relative flex-1 md:w-48 group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-white transition-colors material-symbols-outlined text-[16px]">search</span>
                            <input 
                                value={modalSearchTerm}
                                onChange={(e) => setModalSearchTerm(e.target.value)}
                                placeholder="Buscar..." 
                                className="w-full pl-9 pr-4 py-2 bg-surface-light/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 text-xs transition-all"
                            />
                        </div>
                        <button onClick={() => setViewDetailsType('none')} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full shrink-0">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/[0.02] text-text-muted text-xs uppercase tracking-wider border-b border-white/5 font-display sticky top-0 backdrop-blur-md z-10">
                            <tr>
                                <th className="px-8 py-5 font-bold w-16">Status</th>
                                <th className="px-8 py-5 font-bold">Descrição / Categoria</th>
                                <th className="px-8 py-5 font-bold">Data</th>
                                <th className="px-8 py-5 font-bold text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {modalTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-16 text-center text-text-muted">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-3xl opacity-50">search_off</span>
                                            </div>
                                            <p className="font-medium">Nenhum registro encontrado para este filtro.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                modalTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-white/[0.03] transition-colors group cursor-default">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center justify-center">
                                                <span className={`material-symbols-outlined text-[24px] ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {t.type === 'income' ? 'add_circle' : 'remove_circle'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <p className="font-bold text-white text-sm">{t.description}</p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${getCategoryStyle(t.category)}`}>
                                                    {t.category}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-sm text-text-muted font-mono">
                                            {new Date(t.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className={`font-mono font-bold text-base ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
