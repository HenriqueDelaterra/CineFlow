
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '../ContactsContext';
import { useAgenda } from '../AgendaContext';
import { ContactEntity } from '../types';
import EventManagement from './EventManagement';

interface RegistrationProps {
  fixedType?: 'Cliente' | 'Fornecedor';
}

const SUPPLIER_ROLES = [
    'Videomaker', 'Editor', 'Drone', 'Produtor', 'Gafer', 
    'Assistente', 'Fotógrafo Still', 'Diretor', 'Arte', 'Outros'
];

const COMMON_BANKS = [
    "Nubank", "Banco do Brasil", "Bradesco", "Caixa Econômica Federal", "Itaú Unibanco", 
    "Santander", "Banco Inter", "C6 Bank", "BTG Pactual", "Banco Safra", 
    "Sicoob", "Sicredi", "Banco Pan", "Banco Original", "PagBank", "Neon", "Next"
];

const Registration: React.FC<RegistrationProps> = ({ fixedType }) => {
  const navigate = useNavigate();
  const { addContact, updateContact, contacts, removeContact } = useContacts();
  const { addEvent } = useAgenda();
  
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [entityType, setEntityType] = useState<'Cliente' | 'Fornecedor' | 'Evento'>(fixedType || 'Cliente');

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Atualiza o tipo se a prop fixedType mudar (navegação pelo menu)
  useEffect(() => {
    if (fixedType) {
      setEntityType(fixedType);
      handleResetForm();
      setActiveTab('form');
    }
  }, [fixedType]);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [taxId, setTaxId] = useState('');
  const [rg, setRg] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [portfolio, setPortfolio] = useState('');
  const [instagram, setInstagram] = useState('');

  const [cnpjCard, setCnpjCard] = useState('');
  const [cnpjFileName, setCnpjFileName] = useState('');

  const [pixKey, setPixKey] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAgency, setBankAgency] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  
  const [dailyRate, setDailyRate] = useState(''); 
  const [role, setRole] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterMinRate, setFilterMinRate] = useState('');
  const [filterMaxRate, setFilterMaxRate] = useState('');

  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Masks (same logic)
  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 14) value = value.slice(0, 14);
      if (value.length <= 11) {
          value = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else {
          value = value.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
      }
      setTaxId(value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      else if (value.length > 5) value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
      else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
      else if (value.length > 0) value = value.replace(/^(\d*)/, "($1");
      setPhone(value);
  };

  const handleRgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/[^0-9xX]/g, ''); 
      if (value.length > 9) value = value.slice(0, 9);
      if (value.length > 8) value = value.replace(/^(\d{2})(\d{3})(\d{3})([\dxX]{1})/, "$1.$2.$3-$4");
      else if (value.length > 5) value = value.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
      else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
      setRg(value);
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/[^0-9xX-]/g, '').toUpperCase();
      const clean = value.replace(/-/g, '');
      if (clean.length > 12) return; 
      if (value.includes('-')) { setBankAccount(value); return; }
      if (clean.length > 4) value = clean.slice(0, -1) + '-' + clean.slice(-1);
      else value = clean;
      setBankAccount(value);
  };

  const handleDailyRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, '');
      if (!rawValue) { setDailyRate(''); return; }
      const amount = parseFloat(rawValue) / 100;
      setDailyRate(amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const handlePixKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      if (rawValue.includes('@') || /[a-zA-Z]/.test(rawValue)) { setPixKey(rawValue); return; }
      let value = rawValue.replace(/\D/g, ''); 
      if (value.length > 14) value = value.slice(0, 14);
      setPixKey(value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { if (typeof reader.result === 'string') { setCnpjCard(reader.result); setCnpjFileName(file.name); } };
          reader.readAsDataURL(file);
      }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { if (typeof reader.result === 'string') { setAvatar(reader.result); } };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveFile = () => { setCnpjCard(''); setCnpjFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const handleEditClick = (contact: ContactEntity) => {
      setEditingId(contact.id);
      if (!fixedType) setEntityType(contact.type);
      setName(contact.name);
      setAvatar(contact.avatar || '');
      setTaxId(contact.taxId);
      setRg(contact.rg || '');
      setEmail(contact.email);
      setPhone(contact.phone);
      setPortfolio(contact.portfolio || '');
      setInstagram(contact.instagram || '');
      setPixKey(contact.pixKey || '');
      setBankName(contact.bankName || '');
      setBankAgency(contact.bankAgency || '');
      setBankAccount(contact.bankAccount || '');
      setBankHolder(contact.bankHolder || '');
      setCnpjCard(contact.cnpjCard || '');
      setCnpjFileName(contact.cnpjCardFileName || '');
      setDailyRate(contact.dailyRate ? contact.dailyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
      setRole(contact.role || '');
      setActiveTab('form');
  };

  const handleResetForm = () => {
    setName(''); setAvatar(''); setTaxId(''); setRg(''); setEmail(''); setPhone(''); setPortfolio(''); setInstagram(''); setPixKey('');
    setBankName(''); setBankAgency(''); setBankAccount(''); setBankHolder(''); setCnpjCard(''); setCnpjFileName('');
    setDailyRate(''); setRole(''); setScheduleFollowUp(false); setFollowUpDate(''); setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!name || !taxId || !email || !phone) { alert("Preencha campos obrigatórios."); return; }
    let parsedDailyRate = dailyRate ? parseFloat(dailyRate.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) : undefined;

    const contactData: ContactEntity = {
        id: editingId || Date.now().toString(),
        type: entityType as 'Cliente' | 'Fornecedor',
        name, avatar, taxId, rg, email, phone, portfolio, instagram,
        pixKey: entityType === 'Fornecedor' ? pixKey : undefined,
        bankName: entityType === 'Fornecedor' ? bankName : undefined,
        bankAgency: entityType === 'Fornecedor' ? bankAgency : undefined,
        bankAccount: entityType === 'Fornecedor' ? bankAccount : undefined,
        bankHolder: entityType === 'Fornecedor' ? bankHolder : undefined,
        cnpjCard: entityType === 'Cliente' ? cnpjCard : undefined,
        cnpjCardFileName: entityType === 'Cliente' ? cnpjFileName : undefined,
        dailyRate: entityType === 'Fornecedor' ? (isNaN(parsedDailyRate || 0) ? 0 : parsedDailyRate) : undefined,
        role: entityType === 'Fornecedor' ? role : undefined,
        createdAt: editingId ? (contacts.find(c => c.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (editingId) { updateContact(contactData); alert(`${entityType} atualizado!`); } else {
        addContact(contactData);
        if (scheduleFollowUp && followUpDate) {
            const dateStr = followUpDate.split('T')[0];
            const timeStr = followUpDate.split('T')[1] || '09:00';
            addEvent({
                id: Date.now().toString() + '_event',
                title: `Follow-up: ${name}`,
                date: dateStr, time: timeStr, type: 'meeting', status: 'pending',
                description: `Reunião automática. Contato: ${phone}`, day: new Date(followUpDate).getDate()
            });
            alert(`${entityType} salvo e reunião agendada!`);
        } else { alert(`${entityType} salvo!`); }
    }
    handleResetForm();
    setActiveTab('list');
  };

  const handleCancel = () => { handleResetForm(); if (editingId) setActiveTab('list'); else navigate('/'); };

  const filteredContacts = useMemo(() => {
      return contacts.filter(c => {
        const matchesType = c.type === entityType;
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase());
        if (entityType === 'Cliente') return matchesType && matchesSearch;
        const matchesRole = !filterRole || c.role === filterRole;
        const rate = c.dailyRate || 0;
        const min = filterMinRate ? parseFloat(filterMinRate) : 0;
        const max = filterMaxRate ? parseFloat(filterMaxRate) : Infinity;
        const matchesRate = rate >= min && rate <= max;
        return matchesType && matchesSearch && matchesRole && matchesRate;
      });
  }, [contacts, entityType, searchTerm, filterRole, filterMinRate, filterMaxRate]);

  const TypeSelector = () => (
      <div className="bg-surface-light/50 backdrop-blur-md p-1.5 rounded-full flex w-full border border-white/10 mb-8 max-w-2xl mx-auto">
          {(['Cliente', 'Fornecedor', 'Evento'] as const).map((type) => (
              <button
                  key={type}
                  onClick={() => setEntityType(type)}
                  className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                      entityType === type 
                          ? 'bg-primary/20 text-primary border border-primary/50 shadow-neon-sm' 
                          : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
              >
                  {type === 'Evento' ? 'Cadastro de Evento' : type}
              </button>
          ))}
      </div>
  );

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  if (entityType === 'Evento') {
      return (
          <div className="max-w-[1600px] mx-auto animate-fade-in pb-20">
              {!fixedType && <TypeSelector />}
              <div className="glass-panel rounded-[40px] border border-white/5 overflow-hidden p-4">
                 <EventManagement />
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in pb-24">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
              <h1 className="text-4xl font-black text-white tracking-tight font-display">
                  {activeTab === 'form' ? (editingId ? 'Editar Registro' : 'Novo Cadastro') : 'Base de Dados'}
              </h1>
              <p className="text-text-muted mt-2 font-medium">
                  {activeTab === 'form' ? 'Preencha as informações abaixo.' : 'Gerencie seus contatos cadastrados.'}
              </p>
          </div>

          <div className="flex bg-surface-light/50 backdrop-blur-md p-1 rounded-xl border border-white/10">
                <button 
                    onClick={() => { setActiveTab('form'); if(!editingId) handleResetForm(); }}
                    className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'form' ? 'bg-primary/20 text-primary shadow-neon-sm' : 'text-text-muted hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    {editingId ? 'Edição' : 'Novo'}
                </button>
                <button 
                    onClick={() => { setActiveTab('list'); handleResetForm(); }}
                    className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'list' ? 'bg-primary/20 text-primary shadow-neon-sm' : 'text-text-muted hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">view_module</span>
                    Base
                </button>
          </div>
      </div>

      {!fixedType && <TypeSelector />}

      {activeTab === 'form' && (
        <div className="glass-panel rounded-[40px] border border-white/5 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
            
            <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
                <div className="p-8 md:p-12 space-y-12">
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <span className="material-symbols-outlined">badge</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white font-display">Informações Gerais</h3>
                        </div>

                        <div className="flex flex-col md:flex-row gap-10">
                            <div className="flex flex-col items-center gap-4 shrink-0">
                                <div 
                                    className="relative group cursor-pointer w-40 h-40 rounded-full bg-surface-light border-2 border-dashed border-white/20 hover:border-primary transition-all flex items-center justify-center overflow-hidden"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    {avatar ? (
                                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-text-muted group-hover:text-primary transition-colors">
                                            <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                                            <span className="text-xs font-bold uppercase mt-2 tracking-widest">Foto</span>
                                        </div>
                                    )}
                                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
                                <div className="md:col-span-12 space-y-2 group">
                                    <label className="text-xs font-bold uppercase tracking-wide text-primary">Nome Completo / Razão Social</label>
                                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600" placeholder="Ex: João da Silva Produções" />
                                </div>

                                <div className="md:col-span-4 space-y-2 group">
                                    <label className="text-xs font-bold uppercase tracking-wide text-text-muted">CPF / CNPJ</label>
                                    <input value={taxId} onChange={handleTaxIdChange} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600" placeholder="000.000.000-00" />
                                </div>

                                <div className="md:col-span-4 space-y-2 group">
                                    <label className="text-xs font-bold uppercase tracking-wide text-text-muted">RG / Inscrição</label>
                                    <input value={rg} onChange={handleRgChange} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600" placeholder="00.000.000-0" />
                                </div>

                                <div className="md:col-span-4 space-y-2 group">
                                    <label className="text-xs font-bold uppercase tracking-wide text-text-muted">Email Corporativo</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600" placeholder="contato@empresa.com" />
                                </div>

                                <div className="md:col-span-4 space-y-2 group">
                                    <label className="text-xs font-bold uppercase tracking-wide text-text-muted">Telefone / WhatsApp</label>
                                    <input type="tel" value={phone} onChange={handlePhoneChange} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-gray-600" placeholder="(00) 90000-0000" />
                                </div>

                                {entityType === 'Cliente' && (
                                    <div className="md:col-span-8 bg-surface-light/30 border border-dashed border-white/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex flex-col gap-1 w-full">
                                            <label className="text-xs font-bold uppercase tracking-wide text-text-muted flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                                Cartão CNPJ / Documento
                                            </label>
                                            <p className="text-xs text-gray-500">PDF ou Imagem</p>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            {cnpjCard ? (
                                                <div className="flex items-center gap-2 bg-surface border border-white/10 px-3 py-2 rounded-lg w-full sm:w-auto overflow-hidden">
                                                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                                                    <span className="text-xs font-bold text-white truncate max-w-[150px]" title={cnpjFileName}>{cnpjFileName || 'Arquivo Anexado'}</span>
                                                    <button type="button" onClick={handleRemoveFile} className="ml-2 text-red-500 hover:text-red-400"><span className="material-symbols-outlined text-[18px]">close</span></button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-primary hover:text-primary px-4 py-2.5 rounded-lg text-sm font-bold text-text-muted transition-all w-full sm:w-auto">
                                                    <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                                                    <span>Anexar</span>
                                                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {entityType === 'Fornecedor' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white font-display">Dados Profissionais</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Categoria</label>
                                    <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer [&>option]:bg-[#0e1015]">
                                        <option value="">Selecione...</option>
                                        {SUPPLIER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-text-muted">Diária Padrão</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm text-emerald-500">R$</span>
                                        <input type="text" value={dailyRate} onChange={handleDailyRateChange} className="w-full bg-surface-light/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold" placeholder="0,00" />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-text-muted">Chave Pix</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 pointer-events-none">qr_code_2</span>
                                        <input type="text" value={pixKey} onChange={handlePixKeyChange} className="w-full bg-surface-light/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Chave Pix" />
                                    </div>
                                </div>
                            </div>
                            
                            <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2 mb-4">Dados Bancários</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Banco</label>
                                    <input list="bank-suggestions" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Selecione..." />
                                    <datalist id="bank-suggestions">{COMMON_BANKS.map(bank => <option key={bank} value={bank} />)}</datalist>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Titular</label>
                                    <input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Nome completo" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Agência</label>
                                    <input value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="0000" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Conta</label>
                                    <input value={bankAccount} onChange={handleAccountChange} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="00000-0" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-8">
                        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                <span className="material-symbols-outlined">hub</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white font-display">Presença Digital</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Instagram</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
                                    <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-gray-600" placeholder="usuario" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Portfólio / Site</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-[18px]">link</span>
                                    <input type="url" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-gray-600" placeholder="https://..." />
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-surface-light/20 p-4 rounded-xl border border-white/10 flex items-start gap-4">
                            <input id="google-sync" type="checkbox" checked={scheduleFollowUp} onChange={(e) => setScheduleFollowUp(e.target.checked)} className="w-5 h-5 text-primary rounded focus:ring-primary border-gray-600 bg-surface-light cursor-pointer mt-1" />
                            <div className="flex-1 space-y-2">
                                <label htmlFor="google-sync" className="block text-sm font-bold text-white cursor-pointer">Agendar Follow-up Automático</label>
                                <p className="text-xs text-gray-400">Cria um evento na agenda para lembrá-lo de entrar em contato.</p>
                                {scheduleFollowUp && (
                                    <input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="bg-surface-light border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-xs mt-2 [color-scheme:dark]" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light/30 px-12 py-8 border-t border-white/5 flex justify-end gap-4">
                    <button type="button" onClick={handleCancel} className="px-8 py-3.5 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors uppercase text-xs tracking-wider">Cancelar</button>
                    <button onClick={handleSave} type="button" className="px-10 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold shadow-neon hover:shadow-[0_0_20px_theme('colors.primary')] active:scale-95 transition-all uppercase text-xs tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">save</span>
                        {editingId ? 'Atualizar' : 'Salvar'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {activeTab === 'list' && (
            <div className="space-y-8">
                
                <div className="flex flex-col xl:flex-row gap-4 items-end xl:items-center">
                    <div className="relative flex-1 w-full group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors material-symbols-outlined">search</span>
                        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={`Buscar ${entityType.toLowerCase()}...`} className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface-light/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner" />
                    </div>

                    {entityType === 'Fornecedor' && (
                        <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="flex-1 xl:flex-none px-4 py-3.5 rounded-xl bg-surface-light/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[180px] cursor-pointer [&>option]:bg-[#0e1015]">
                                <option value="">Todas as Categorias</option>
                                {SUPPLIER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <div className="flex items-center gap-2 bg-surface-light/50 border border-white/10 rounded-xl px-4 py-1 h-[50px]">
                                <span className="text-xs text-text-muted font-bold uppercase">Diária</span>
                                <input type="number" placeholder="Min" value={filterMinRate} onChange={(e) => setFilterMinRate(e.target.value)} className="w-16 bg-transparent border-b border-gray-600 text-sm text-center focus:outline-none focus:border-primary py-1 text-white" />
                                <span className="text-gray-500">-</span>
                                <input type="number" placeholder="Max" value={filterMaxRate} onChange={(e) => setFilterMaxRate(e.target.value)} className="w-16 bg-transparent border-b border-gray-600 text-sm text-center focus:outline-none focus:border-primary py-1 text-white" />
                            </div>
                        </div>
                    )}

                    <div className="flex bg-surface-light/50 p-1 rounded-xl border border-white/10 h-[50px] shrink-0">
                        <button onClick={() => setViewMode('grid')} className={`px-4 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white/10 text-primary shadow-sm' : 'text-text-muted hover:text-white'}`}><span className="material-symbols-outlined">grid_view</span></button>
                        <button onClick={() => setViewMode('table')} className={`px-4 rounded-lg flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-white/10 text-primary shadow-sm' : 'text-text-muted hover:text-white'}`}><span className="material-symbols-outlined">view_list</span></button>
                    </div>
                </div>

                {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-text-muted bg-surface-light/20 rounded-[40px] border border-white/5 border-dashed">
                        <span className="material-symbols-outlined text-7xl opacity-20 mb-4">person_off</span>
                        <p className="text-lg font-medium">Nenhum registro encontrado.</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredContacts.map(contact => (
                                    <div key={contact.id} className="glass-panel p-8 rounded-[30px] border border-white/5 hover:border-primary/30 hover:shadow-neon-sm transition-all group relative overflow-hidden flex flex-col items-center text-center h-full min-h-[380px]">
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(contact); }} className="p-2 bg-white/10 text-white rounded-lg hover:bg-primary hover:text-black transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir?')) removeContact(contact.id); }} className="p-2 bg-white/10 text-white rounded-lg hover:bg-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                        </div>
                                        
                                        <div className="relative mt-2">
                                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-110"></div>
                                            <div className="w-28 h-28 rounded-full border-4 border-surface-light bg-surface shadow-2xl flex items-center justify-center overflow-hidden relative z-10">
                                                {contact.avatar ? <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-gray-500">{getInitials(contact.name)}</span>}
                                            </div>
                                        </div>

                                        <div className="mt-6 mb-2 w-full px-2">
                                            <h3 className="text-xl font-bold text-white truncate w-full font-display tracking-wide">{contact.name}</h3>
                                        </div>
                                        
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-8 ${contact.role ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white/5 text-text-muted border-white/10'}`}>
                                            {contact.role || entityType}
                                        </span>

                                        <div className="w-full space-y-3 mb-auto">
                                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 text-left hover:bg-white/10 transition-colors">
                                                <div className="p-2 bg-black/30 rounded-lg text-gray-400"><span className="material-symbols-outlined text-[16px]">call</span></div>
                                                <span className="font-medium text-slate-300 text-sm truncate w-full">{contact.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 text-left hover:bg-white/10 transition-colors">
                                                <div className="p-2 bg-black/30 rounded-lg text-gray-400"><span className="material-symbols-outlined text-[16px]">mail</span></div>
                                                <span className="font-medium text-slate-300 text-sm truncate w-full" title={contact.email}>{contact.email}</span>
                                            </div>
                                        </div>

                                        {entityType === 'Fornecedor' && (
                                            <div className="w-full mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Diária</span>
                                                <span className="font-bold text-white text-lg">{contact.dailyRate ? formatCurrency(contact.dailyRate) : '-'}</span>
                                            </div>
                                        )}
                                        {entityType === 'Cliente' && contact.cnpjCard && (
                                            <div className="w-full mt-4 pt-4 border-t border-white/10">
                                                <a href={contact.cnpjCard} download={contact.cnpjCardFileName || "doc.pdf"} className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-bold transition-colors border border-white/5">
                                                    <span className="material-symbols-outlined text-[16px]">download</span> Baixar Doc
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {viewMode === 'table' && (
                            <div className="glass-panel rounded-[30px] border border-white/5 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white/5">
                                        <tr className="text-text-muted text-xs uppercase tracking-wider font-display">
                                            <th className="px-6 py-5 font-bold w-20">Foto</th>
                                            <th className="px-6 py-5 font-bold">Nome</th>
                                            {entityType === 'Fornecedor' && <th className="px-6 py-5 font-bold">Função</th>}
                                            <th className="px-6 py-5 font-bold">Contato</th>
                                            {entityType === 'Fornecedor' && <th className="px-6 py-5 font-bold text-right">Diária</th>}
                                            <th className="px-6 py-5 font-bold text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredContacts.map(contact => (
                                            <tr key={contact.id} onClick={() => handleEditClick(contact)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                                                <td className="px-6 py-4">
                                                    <div className="size-10 rounded-full bg-surface-light border border-white/10 overflow-hidden flex items-center justify-center text-gray-500 font-bold text-xs">
                                                        {contact.avatar ? <img src={contact.avatar} className="w-full h-full object-cover" alt="" /> : getInitials(contact.name)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-white">{contact.name}</td>
                                                {entityType === 'Fornecedor' && (
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                                            {contact.role || '-'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-sm text-slate-400">
                                                    <div className="flex flex-col"><span>{contact.phone}</span><span className="text-xs opacity-60">{contact.email}</span></div>
                                                </td>
                                                {entityType === 'Fornecedor' && (
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                                                        {contact.dailyRate ? formatCurrency(contact.dailyRate) : '-'}
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir?')) removeContact(contact.id); }} className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}
    </div>
  );
};

export default Registration;
