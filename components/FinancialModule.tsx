
import React, { useState, useMemo, useRef } from 'react';
import { useFinance } from '../FinanceContext';
import { useLogistics } from '../LogisticsContext';
import { Transaction } from '../types';

interface FinancialModuleProps {
    scope?: 'business' | 'personal';
}

type TimeFilterType = 'all' | 'day' | 'week' | 'month' | 'year';

const FinancialModule: React.FC<FinancialModuleProps> = ({ scope = 'business' }) => {
  const { transactions, removeTransaction, addTransaction, addTransactions, clearImportedTransactions } = useFinance();
  const { addLogisticsTransaction, removeLogisticsTransactionsByImportId, clearAllImportedLogistics } = useLogistics(); 
  
  // --- Estados de Filtro ---
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Estados de Importação ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  // Helper to normalize descriptions (same as Dashboard)
  const normalizeDescription = (raw: string): string => {
      if (!raw) return "Transação";
      let text = raw.toUpperCase();
      text = text.replace(/\b[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\b/gi, '');
      text = text.replace(/[\/\\]\d{4}([-\s]?\d{2})?/g, ''); 
      text = text.replace(/\b(LTDA|S\.A\.?|S\/A|EIRELI|ME|EPP|MEI)\b/g, '');
      text = text.replace(/[-_.:*#]/g, ' '); 
      text = text.replace(/\s+/g, ' ').trim();
      if (text.length > 2) {
          return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
      return text || "Diversos";
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

  const filteredTransactions = useMemo(() => {
    const ref = new Date(referenceDate + 'T00:00:00');
    let start: Date | null = null; 
    let end: Date | null = null;

    if (timeFilter === 'day') {
        start = new Date(ref);
        end = new Date(ref);
        end.setHours(23, 59, 59, 999);
    } else if (timeFilter === 'week') {
        const dayOfWeek = ref.getDay();
        start = new Date(ref);
        start.setDate(ref.getDate() - dayOfWeek);
        start.setHours(0,0,0,0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23,59,59,999);
    } else if (timeFilter === 'month') {
        start = new Date(ref.getFullYear(), ref.getMonth(), 1);
        end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeFilter === 'year') {
        start = new Date(ref.getFullYear(), 0, 1);
        end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    return transactions
      .filter(t => {
        const matchesScope = (t.scope || 'business') === scope;
        const matchesType = filterType === 'all' ? true : t.type === filterType;
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.category.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesTime = true;
        if (timeFilter !== 'all' && start && end) {
            const tDate = new Date(t.date + 'T12:00:00'); 
            matchesTime = tDate >= start && tDate <= end;
        }

        return matchesScope && matchesType && matchesSearch && matchesTime;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, scope, filterType, searchTerm, timeFilter, referenceDate]);

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

  const handleDelete = (e: React.MouseEvent, id: string, amount: number, type: string) => {
      e.stopPropagation(); 
      const valorFormatado = formatCurrency(amount);
      const mensagem = `Tem certeza que deseja excluir este lançamento?\n\nDescrição: ${type === 'income' ? 'Entrada' : 'Saída'} de ${valorFormatado}`;
      if (window.confirm(mensagem)) {
          removeTransaction(id);
      }
  };

  const handleClearImports = () => {
      if (!window.confirm("Atenção: Você tem certeza que deseja limpar todos os dados importados do extrato?\n\nLançamentos manuais serão mantidos.")) {
          return;
      }
      const removedCount = clearImportedTransactions();
      clearAllImportedLogistics();
      alert(removedCount > 0 ? "Dados importados removidos." : "Não havia dados importados.");
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setImportFileName(e.target.files[0].name);
      }
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
                      importId: batchId,
                      scope: scope as 'business' | 'personal' 
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
              addTransactions(batchTransactions); 
              setTimeout(() => {
                  setIsProcessingImport(false);
                  setImportFileName(null);
                  setIsImportModalOpen(false);
                  let msg = `${batchTransactions.length} transações importadas.`;
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
    <div className="max-w-[1600px] mx-auto animate-fade-in pb-10 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">
            {scope === 'personal' ? 'Minhas Finanças' : 'Gestão Financeira'}
          </h1>
          <p className="text-text-muted mt-1">
              Visão detalhada de entradas e saídas.
          </p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl font-bold transition-all shadow-neon-sm active:scale-95 uppercase text-xs tracking-wide"
            >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Importar
            </button>
            <button 
                onClick={handleClearImports}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-xl font-bold transition-all active:scale-95 uppercase text-xs tracking-wide"
            >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                Limpar Importações
            </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="glass-panel p-4 rounded-[20px] border border-white/5 flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 w-full xl:w-auto">
             <div className="relative flex-1 xl:w-80 group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted material-symbols-outlined">search</span>
                <input 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar transação..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary/50"
                />
             </div>
             <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value as any)}
                className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary/50 [&>option]:bg-black"
             >
                 <option value="all">Todos os Tipos</option>
                 <option value="income">Entradas</option>
                 <option value="expense">Saídas</option>
             </select>
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto">
             <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                {(['all', 'day', 'week', 'month', 'year'] as TimeFilterType[]).map(t => (
                    <button 
                        key={t}
                        onClick={() => setTimeFilter(t)}
                        className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${timeFilter === t ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-white'}`}
                    >
                        {t === 'all' ? 'Tudo' : t === 'day' ? 'Dia' : t === 'week' ? 'Semana' : t === 'month' ? 'Mês' : 'Ano'}
                    </button>
                ))}
             </div>
             {timeFilter !== 'all' && (
                 <input 
                    type={timeFilter === 'month' ? 'month' : 'date'}
                    value={timeFilter === 'month' ? referenceDate.slice(0, 7) : referenceDate}
                    onChange={e => setReferenceDate(timeFilter === 'month' ? e.target.value + '-01' : e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-primary/50 [color-scheme:dark]"
                 />
             )}
          </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="glass-panel p-6 rounded-[24px] border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-symbols-outlined text-6xl text-emerald-500">trending_up</span></div>
             <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Total Receitas</p>
             <h3 className="text-3xl font-bold text-white mt-1">{formatCurrency(scopeStats.totalIncome)}</h3>
         </div>
         <div className="glass-panel p-6 rounded-[24px] border border-red-500/20 bg-red-500/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-symbols-outlined text-6xl text-red-500">trending_down</span></div>
             <p className="text-red-400 text-xs font-bold uppercase tracking-wider">Total Despesas</p>
             <h3 className="text-3xl font-bold text-white mt-1">{formatCurrency(scopeStats.totalExpense)}</h3>
         </div>
         <div className="glass-panel p-6 rounded-[24px] border border-primary/20 bg-primary/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-symbols-outlined text-6xl text-primary">account_balance</span></div>
             <p className="text-primary text-xs font-bold uppercase tracking-wider">Saldo do Período</p>
             <h3 className={`text-3xl font-bold mt-1 ${scopeStats.balance >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(scopeStats.balance)}</h3>
         </div>
      </div>

      {/* TABLE */}
      <div className="glass-panel rounded-[30px] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 text-text-muted text-xs uppercase tracking-wider font-display">
                    <tr>
                        <th className="px-6 py-4 font-bold">Data</th>
                        <th className="px-6 py-4 font-bold">Descrição</th>
                        <th className="px-6 py-4 font-bold">Categoria</th>
                        <th className="px-6 py-4 font-bold text-right">Valor</th>
                        <th className="px-6 py-4 font-bold text-center">Origem</th>
                        <th className="px-6 py-4 font-bold text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredTransactions.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-text-muted">Nenhuma transação encontrada.</td></tr>
                    )}
                    {filteredTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                                {new Date(t.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4">
                                <p className="text-sm font-bold text-white">{t.description}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10 uppercase">
                                    {t.category}
                                </span>
                            </td>
                            <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {t.importId ? (
                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded uppercase">Imp</span>
                                ) : (t as any).id.startsWith('auto-') || t.description.toLowerCase().includes('agenda') ? (
                                    <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded uppercase">Auto</span>
                                ) : (
                                    <span className="text-[10px] bg-white/5 text-gray-500 border border-white/10 px-2 py-0.5 rounded uppercase">Man</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={(e) => handleDelete(e, t.id, t.amount, t.type)}
                                    className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-[30px] border border-white/10 shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-surface-light/50 to-transparent">
               <h3 className="text-xl font-bold text-white font-display flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary">upload_file</span>
                   Importar Extrato ({scope === 'personal' ? 'Pessoal' : 'Empresarial'})
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
    </div>
  );
};

export default FinancialModule;
