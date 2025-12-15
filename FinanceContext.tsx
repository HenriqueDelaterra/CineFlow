
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cost, Transaction, ReceivableRecord } from './types';

// Interface para os dados do Extrato Isolado (Análise Financeira)
export interface StatementData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactions: Transaction[];
}

interface FinanceContextType {
  costs: Cost[];
  addCost: (cost: Cost) => void;
  updateCost: (cost: Cost) => void;
  removeCost: (id: string) => void;
  toggleCostStatus: (id: string) => void;
  toggleCostActive: (id: string) => void;
  totalPendingCosts: number;
  totalPaidCosts: number;

  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  addTransactions: (transactions: Transaction[]) => void;
  clearImportedTransactions: () => number; 
  clearAllTransactions: () => void;
  undoLastImport: () => string | null; 
  removeTransaction: (id: string) => void;
  financialStats: {
    balance: number;
    totalIncome: number;
    totalExpense: number;
  };

  receivables: ReceivableRecord[];
  addReceivable: (rec: ReceivableRecord) => void;
  removeReceivable: (id: string) => void;
  updateReceivablePayment: (id: string, amountToAdd: number) => void;

  // Novos métodos para o Extrato Persistente
  importedStatement: StatementData;
  setImportedStatement: (data: StatementData) => void;
  clearImportedStatement: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const initialCosts: Cost[] = [];
const initialTransactions: Transaction[] = [];
const initialReceivables: ReceivableRecord[] = [];

// Função auxiliar para criar estado vazio limpo
const getEmptyStatement = (): StatementData => ({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    transactions: []
});

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- Costs ---
  const [costs, setCosts] = useState<Cost[]>(() => {
    const saved = localStorage.getItem('finflow_costs');
    return saved ? JSON.parse(saved) : initialCosts;
  });

  useEffect(() => {
    localStorage.setItem('finflow_costs', JSON.stringify(costs));
  }, [costs]);

  // --- Transactions (Global Ledger) ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('finflow_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  useEffect(() => {
    localStorage.setItem('finflow_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // --- Imported Statement (Análise Financeira - Persistente) ---
  const [importedStatement, setImportedStatementState] = useState<StatementData>(() => {
      const saved = localStorage.getItem('finflow_imported_statement');
      return saved ? JSON.parse(saved) : getEmptyStatement();
  });

  useEffect(() => {
      localStorage.setItem('finflow_imported_statement', JSON.stringify(importedStatement));
  }, [importedStatement]);

  const setImportedStatement = (data: StatementData) => {
      setImportedStatementState(data);
  };

  const clearImportedStatement = () => {
      // Cria um novo objeto explicitamente para garantir re-render e limpeza
      const empty = getEmptyStatement();
      setImportedStatementState(empty);
      localStorage.setItem('finflow_imported_statement', JSON.stringify(empty));
  };

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  };

  const addTransactions = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...newTransactions, ...prev]);
  };

  const clearImportedTransactions = (): number => {
    let count = 0;
    setTransactions(prev => {
        const filtered = prev.filter(t => !t.importId);
        count = prev.length - filtered.length;
        return filtered;
    });
    return count;
  };

  const clearAllTransactions = () => {
    setTransactions([]);
  };

  const undoLastImport = (): string | null => {
    const importedTransactions = transactions.filter(t => t.importId);
    
    if (importedTransactions.length === 0) {
        alert("Não há importações recentes para desfazer.");
        return null;
    }

    const importIds = importedTransactions.map(t => t.importId as string);
    const uniqueBatches = Array.from(new Set(importIds)).sort() as string[];
    
    const lastBatchId = uniqueBatches[uniqueBatches.length - 1];
    const itemsToRemove = transactions.filter(t => t.importId === lastBatchId).length;

    if (window.confirm(`Deseja desfazer a última importação?\n\nIsso removerá ${itemsToRemove} lançamentos do lote mais recente.`)) {
        setTransactions(prev => prev.filter(t => t.importId !== lastBatchId));
        return lastBatchId;
    }
    return null;
  };

  const removeTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addCost = (cost: Cost) => {
    setCosts(prev => [...prev, cost]);
  };

  const updateCost = (updatedCost: Cost) => {
    setCosts(prev => prev.map(c => c.id === updatedCost.id ? updatedCost : c));
  };

  const removeCost = (id: string) => {
    setCosts(prev => prev.filter(c => c.id !== id));
  };

  const toggleCostStatus = (id: string) => {
    const costToUpdate = costs.find(c => c.id === id);
    if (!costToUpdate) return;

    const isPaying = costToUpdate.status === 'pending';

    setCosts(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: isPaying ? 'paid' : 'pending' };
      }
      return c;
    }));

    if (isPaying) {
        const newTrans: Transaction = {
            id: `cost-pay-${id}-${Date.now()}`,
            description: `Pagamento Mensal: ${costToUpdate.description}`,
            amount: costToUpdate.amount,
            type: 'expense',
            category: costToUpdate.category,
            date: new Date().toISOString().split('T')[0]
        };
        addTransaction(newTrans);
    } else {
        const today = new Date().toISOString().split('T')[0];
        const descMatch = `Pagamento Mensal: ${costToUpdate.description}`;
        
        setTransactions(prev => {
            const idx = prev.findIndex(t => 
                t.description === descMatch && 
                t.amount === costToUpdate.amount && 
                t.date === today && 
                t.type === 'expense'
            );
            
            if (idx > -1) {
                const newArr = [...prev];
                newArr.splice(idx, 1);
                return newArr;
            }
            return prev;
        });
    }
  };

  const toggleCostActive = (id: string) => {
    setCosts(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, active: !c.active };
      }
      return c;
    }));
  };

  const totalPendingCosts = costs
    .filter(c => c.active && c.status === 'pending')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPaidCosts = costs
    .filter(c => c.active && c.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // --- Receivables ---
  const [receivables, setReceivables] = useState<ReceivableRecord[]>(() => {
    const saved = localStorage.getItem('finflow_receivables');
    return saved ? JSON.parse(saved) : initialReceivables;
  });

  useEffect(() => {
      localStorage.setItem('finflow_receivables', JSON.stringify(receivables));
  }, [receivables]);

  const addReceivable = (rec: ReceivableRecord) => {
      setReceivables(prev => [rec, ...prev]);
  };

  const removeReceivable = (id: string) => {
      setReceivables(prev => prev.filter(r => r.id !== id));
  };

  const updateReceivablePayment = (id: string, amountToAdd: number) => {
      setReceivables(prev => prev.map(rec => {
          if (rec.id === id) {
              const newReceived = rec.amountReceived + amountToAdd;
              const newStatus = newReceived >= rec.totalValue ? 'paid' : 'partial';
              
              addTransaction({
                  id: Date.now().toString(),
                  description: `Recebimento Parcial: ${rec.projectTitle} (${rec.clientName})`,
                  amount: amountToAdd,
                  type: 'income',
                  category: 'Serviço',
                  date: new Date().toISOString().split('T')[0]
              });

              return {
                  ...rec,
                  amountReceived: newReceived,
                  status: newStatus
              };
          }
          return rec;
      }));
  };

  const financialStats = transactions.reduce((acc, curr) => {
    if (curr.type === 'income') {
      acc.totalIncome += curr.amount;
      acc.balance += curr.amount;
    } else {
      acc.totalExpense += curr.amount;
      acc.balance -= curr.amount;
    }
    return acc;
  }, { balance: 0, totalIncome: 0, totalExpense: 0 });

  return (
    <FinanceContext.Provider value={{ 
      costs, addCost, updateCost, removeCost, toggleCostStatus, toggleCostActive, totalPendingCosts, totalPaidCosts,
      transactions, addTransaction, addTransactions, clearImportedTransactions, clearAllTransactions, undoLastImport, removeTransaction, financialStats,
      receivables, addReceivable, removeReceivable, updateReceivablePayment,
      importedStatement, setImportedStatement, clearImportedStatement
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
