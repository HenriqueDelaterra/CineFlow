
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CalendarEvent } from './types';

interface AgendaContextType {
  events: CalendarEvent[];
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
}

const AgendaContext = createContext<AgendaContextType | undefined>(undefined);

// Eventos iniciais removidos para que o saldo comece zerado.
const initialEvents: CalendarEvent[] = [];

export const AgendaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const savedEvents = localStorage.getItem('finflow_events');
    return savedEvents ? JSON.parse(savedEvents) : initialEvents;
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('finflow_events', JSON.stringify(events));
  }, [events]);

  const addEvent = (event: CalendarEvent) => {
    setEvents(prev => [...prev, event]);
  };

  const updateEvent = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <AgendaContext.Provider value={{ events, addEvent, updateEvent, deleteEvent }}>
      {children}
    </AgendaContext.Provider>
  );
};

export const useAgenda = () => {
  const context = useContext(AgendaContext);
  if (!context) {
    throw new Error('useAgenda must be used within an AgendaProvider');
  }
  return context;
};
