import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ContactEntity } from './types';

interface ContactsContextType {
  contacts: ContactEntity[];
  addContact: (contact: ContactEntity) => void;
  updateContact: (contact: ContactEntity) => void;
  removeContact: (id: string) => void;
  getContactsByType: (type: 'Cliente' | 'Fornecedor') => ContactEntity[];
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

// Dados iniciais
const initialContacts: ContactEntity[] = [
    {
        id: '1',
        type: 'Cliente',
        name: 'TechSolutions Ltda',
        taxId: '12.345.678/0001-90',
        email: 'contato@techsolutions.com',
        phone: '(11) 98765-4321',
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        type: 'Fornecedor',
        name: 'Papelaria Central',
        taxId: '98.765.432/0001-10',
        email: 'vendas@papelariacentral.com',
        phone: '(11) 3322-4455',
        createdAt: new Date().toISOString()
    }
];

export const ContactsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<ContactEntity[]>(() => {
    const savedContacts = localStorage.getItem('finflow_contacts');
    return savedContacts ? JSON.parse(savedContacts) : initialContacts;
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('finflow_contacts', JSON.stringify(contacts));
  }, [contacts]);

  const addContact = (contact: ContactEntity) => {
    setContacts(prev => [contact, ...prev]);
  };

  const updateContact = (updatedContact: ContactEntity) => {
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
  };

  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const getContactsByType = (type: 'Cliente' | 'Fornecedor') => {
    return contacts.filter(c => c.type === type);
  };

  return (
    <ContactsContext.Provider value={{ contacts, addContact, updateContact, removeContact, getContactsByType }}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
};