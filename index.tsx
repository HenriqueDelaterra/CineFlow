
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FinanceProvider } from './FinanceContext';
import { ContactsProvider } from './ContactsContext';
import { AgendaProvider } from './AgendaContext';
import { UserProvider } from './UserContext';
import { EventsProvider } from './EventsContext';
import { LogisticsProvider } from './LogisticsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <UserProvider>
      <FinanceProvider>
        <ContactsProvider>
          <AgendaProvider>
            <EventsProvider>
              <LogisticsProvider>
                <App />
              </LogisticsProvider>
            </EventsProvider>
          </AgendaProvider>
        </ContactsProvider>
      </FinanceProvider>
    </UserProvider>
  </React.StrictMode>
);
