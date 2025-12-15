import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AVEvent } from './types';

interface EventsContextType {
  events: AVEvent[];
  addEvent: (event: AVEvent) => void;
  updateEvent: (event: AVEvent) => void;
  deleteEvent: (id: string) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

const initialEvents: AVEvent[] = [
    {
        id: '1',
        eventName: 'Gravação Clipe Sertanejo',
        clientName: 'Produtora X',
        eventDate: '2023-11-15',
        eventDuration: 2,
        totalRevenue: 15000,
        status: 'completed',
        active: true,
        crew: [
            { id: 'c1', name: 'João Silva', role: 'Câmera', dailyRate: 600, daysWorked: 2, totalValue: 1200, workDate: '2023-11-15', paymentDate: '2023-11-20', status: 'paid' }
        ],
        variableCosts: [
            { id: 'v1', category: 'Alimentação', description: 'Catering dia 1', amount: 450.00, date: '2023-11-15', status: 'paid' },
            { id: 'v2', category: 'Transporte', description: 'Uber Produção', amount: 120.00, date: '2023-11-15', status: 'paid' }
        ]
    }
];

export const EventsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<AVEvent[]>(() => {
    const saved = localStorage.getItem('finflow_av_events');
    if (saved) {
        try {
            const parsedEvents = JSON.parse(saved);
            return parsedEvents.map((ev: any) => ({
                ...ev,
                active: ev.active !== undefined ? ev.active : true,
                variableCosts: ev.variableCosts || []
            }));
        } catch (e) {
            console.error(e);
            return initialEvents;
        }
    }
    return initialEvents;
  });

  // Salvar no LocalStorage
  useEffect(() => {
    localStorage.setItem('finflow_av_events', JSON.stringify(events));
  }, [events]);

  const addEvent = (event: AVEvent) => {
    setEvents(prev => [event, ...prev]);
  };

  const updateEvent = (updatedEvent: AVEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <EventsContext.Provider value={{ events, addEvent, updateEvent, deleteEvent }}>
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};