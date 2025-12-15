
import React, { lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Lazy loading components for performance optimization (Code Splitting)
const Dashboard = lazy(() => import('./components/Dashboard'));
const Registration = lazy(() => import('./components/Registration'));
const Agenda = lazy(() => import('./components/Agenda'));
const LogisticsDashboard = lazy(() => import('./components/LogisticsDashboard'));
const MonthlyCosts = lazy(() => import('./components/MonthlyCosts'));
const JobCalculator = lazy(() => import('./components/JobCalculator'));
const EventManagement = lazy(() => import('./components/EventManagement'));
const CallSheetBuilder = lazy(() => import('./components/CallSheetBuilder'));
const Settings = lazy(() => import('./components/Settings'));
const FinancialModule = lazy(() => import('./components/FinancialModule'));

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* --- GESTÃO EMPRESARIAL (Padrão) --- */}
          <Route index element={<Dashboard scope="business" />} />
          <Route path="agenda" element={<Agenda scope="business" />} />
          <Route path="custos" element={<MonthlyCosts scope="business" />} />
          <Route path="financas" element={<FinancialModule scope="business" />} />
          
          {/* Rotas Isoladas de Cadastro */}
          <Route path="clientes" element={<Registration fixedType="Cliente" />} />
          <Route path="fornecedores" element={<Registration fixedType="Fornecedor" />} />
          <Route path="cadastro" element={<Registration />} />
          
          <Route path="logistica" element={<LogisticsDashboard />} />
          <Route path="calculadora" element={<JobCalculator />} />
          <Route path="eventos" element={<EventManagement />} />
          <Route path="callsheet" element={<CallSheetBuilder />} />
          
          <Route path="settings" element={<Settings />} />
          
          {/* --- GESTÃO PESSOAL (Novo Escopo) --- */}
          <Route path="pessoal" element={<Dashboard scope="personal" />} />
          <Route path="pessoal/financas" element={<FinancialModule scope="personal" />} />
          <Route path="pessoal/metas" element={<MonthlyCosts scope="personal" />} /> {/* Reutiliza MonthlyCosts para Metas/Custos Pessoais */}
          
          <Route path="help" element={<div className="flex items-center justify-center h-full text-slate-500">Central de Ajuda</div>} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
