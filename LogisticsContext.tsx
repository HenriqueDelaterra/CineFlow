
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LogisticsTransaction } from './types';

interface LogisticsContextType {
  transactions: LogisticsTransaction[];
  addLogisticsTransaction: (transaction: LogisticsTransaction) => void;
  removeLogisticsTransaction: (id: number | string) => void;
  removeLogisticsTransactionsByImportId: (importId: string) => void;
  clearAllImportedLogistics: () => void;
  stats: {
    total: number;
    uberTotal: number;
    shippingTotal: number;
    uberCount: number;
    shippingCount: number;
    uberPct: number;
    shippingPct: number;
  };
}

const LogisticsContext = createContext<LogisticsContextType | undefined>(undefined);

const initialTransactions: LogisticsTransaction[] = [
  { id: 1, type: 'uber', title: 'Viagem para Cliente X', date: '2023-10-24 14:30', amount: 42.50, status: 'completed' },
  { id: 2, type: 'shipping', title: 'Entrega Doc. Contrato', date: '2023-10-24 10:15', amount: 25.00, status: 'completed' },
  { id: 3, type: 'uber', title: 'Retorno do Escritório', date: '2023-10-23 18:45', amount: 38.90, status: 'completed', attachment: 'recibo_uber_23.pdf' },
  { id: 4, type: 'shipping', title: 'Envio Material Promocional', date: '2023-10-23 09:20', amount: 150.00, status: 'pending' },
  { id: 5, type: 'uber', title: 'Reunião Externa', date: '2023-10-22 15:00', amount: 28.00, status: 'completed' },
];

export const LogisticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<LogisticsTransaction[]>(() => {
    const saved = localStorage.getItem('finflow_logistics');
    if (saved) {
        try { return JSON.parse(saved); } catch(e) { return initialTransactions; }
    }
    return initialTransactions;
  });

  useEffect(() => {
    localStorage.setItem('finflow_logistics', JSON.stringify(transactions));
  }, [transactions]);

  const addLogisticsTransaction = (transaction: LogisticsTransaction) => {
    setTransactions(prev => [transaction, ...prev]);
  };

  const removeLogisticsTransaction = (id: number | string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const removeLogisticsTransactionsByImportId = (importId: string) => {
    setTransactions(prev => prev.filter(t => t.importId !== importId));
  };

  const clearAllImportedLogistics = () => {
    setTransactions(prev => prev.filter(t => !t.importId));
  };

  const stats = React.useMemo(() => {
    const total = transactions.reduce((acc, curr) => acc + curr.amount, 0);
    const uberTotal = transactions.filter(t => t.type === 'uber').reduce((acc, curr) => acc + curr.amount, 0);
    const shippingTotal = transactions.filter(t => t.type === 'shipping').reduce((acc, curr) => acc + curr.amount, 0);
    const uberCount = transactions.filter(t => t.type === 'uber').length;
    const shippingCount = transactions.filter(t => t.type === 'shipping').length;
    
    const totalCount = uberTotal + shippingTotal || 1;
    const uberPct = Math.round((uberTotal / totalCount) * 100);
    const shippingPct = Math.round((shippingTotal / totalCount) * 100);

    return { total, uberTotal, shippingTotal, uberCount, shippingCount, uberPct, shippingPct };
  }, [transactions]);

  return (
    <LogisticsContext.Provider value={{ transactions, addLogisticsTransaction, removeLogisticsTransaction, removeLogisticsTransactionsByImportId, clearAllImportedLogistics, stats }}>
      {children}
    </LogisticsContext.Provider>
  );
};

export const useLogistics = () => {
  const context = useContext(LogisticsContext);
  if (!context) {
    throw new Error('useLogistics must be used within a LogisticsProvider');
  }
  return context;
};
