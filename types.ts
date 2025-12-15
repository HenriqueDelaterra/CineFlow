
export interface NavItem {
  icon: string;
  label: string;
  path: string;
}

export interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendDirection: 'up' | 'down';
  icon: string;
  colorClass: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  endTime?: string; // Previsão de término
  date: string;
  type: string;
  value?: string;
  paymentTime?: string;
  paymentDate?: string; // Data específica para o pagamento
  receiptReminder?: boolean; // Ativar lembrete
  status: 'confirmed' | 'pending' | 'completed';
  description?: string;
  meetLink?: string;
  location?: string;
  participants?: string;
  day: number;
  scope?: 'business' | 'personal'; // Escopo
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'income' | 'expense';
  importId?: string; // Identificador único do lote de importação
  scope?: 'business' | 'personal'; // Escopo
}

export interface LogisticsTransaction {
  id: number | string;
  type: 'uber' | 'shipping';
  title: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending';
  attachment?: string; // Nome do arquivo PDF
  importId?: string; // Identificador do lote de importação para desfazer
  // Logística geralmente é apenas business, mas deixamos opcional
}

export interface Cost {
  id: string;
  description: string;
  category: string;
  amount: number;
  dayOfMonth: number; // Dia do vencimento recorrente (1-31)
  startDate: string;  // Data de início da vigência
  endDate?: string;   // Data final (opcional/indeterminado)
  active: boolean;    // Se a cobrança está ativa no mês atual
  status: 'paid' | 'pending'; // Status do pagamento no mês atual
  scope?: 'business' | 'personal'; // Escopo
}

export interface JobExpense {
  id: number;
  description: string;
  category: 'Freelancer' | 'Transporte' | 'Alimentação' | 'Equipamento' | 'Outros';
  amount: number; // Valor Total (Unitário * Quantidade)
  quantity?: number;
  unitPrice?: number;
}

export interface SavedJob {
  id: string;
  projectName: string;
  jobDate: string; // Data do evento/job
  createdAt: string;
  expenses: JobExpense[];
  profitMargin: number;
  taxRate: number;
  totalCost: number;
  profitValue: number;
  taxValue: number;
  finalPrice: number;
}

export interface ContactEntity {
  id: string;
  type: 'Cliente' | 'Fornecedor';
  name: string; // Razão Social / Nome
  avatar?: string; // Foto do Perfil (Base64)
  taxId: string; // CPF / CNPJ
  rg?: string; // Registro Geral (Novo Campo)
  stateId?: string; // Inscrição Estadual
  email: string;
  phone: string;
  createdAt: string;
  portfolio?: string; // Novo campo
  instagram?: string; // Novo campo
  pixKey?: string; // Chave Pix
  bankDetails?: string; // Dados Bancários (Legacy / Obs)
  
  // Novos campos bancários separados
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankHolder?: string;

  // Arquivos
  cnpjCard?: string; // Base64 do arquivo
  cnpjCardFileName?: string; // Nome do arquivo

  dailyRate?: number; // Valor da Diária Padrão
  role?: string; // Categoria de Trabalho (Videomaker, Editor, etc.)
}

export interface ReceivableRecord {
  id: string;
  clientName: string;
  projectTitle: string;
  totalValue: number;      // Valor total do trabalho
  amountReceived: number;  // Quanto já entrou no caixa
  serviceDate: string;     // Data que o serviço foi realizado
  dueDate: string;         // Previsão de recebimento final
  status: 'pending' | 'partial' | 'paid';
  createdAt: string;
  scope?: 'business' | 'personal'; // Escopo
}

// --- Novas Interfaces para Gestão de Eventos AV ---

export interface CrewMember {
  id: string;
  name: string;
  role: string; // ex: Câmera, Editor, Diretor
  dailyRate: number; // Valor do Cachê
  daysWorked: number; // Qtd dias
  totalValue: number; // dailyRate * daysWorked
  workDate: string; // Dia trabalhado
  paymentDate: string; // Dia a receber
  status: 'pending' | 'paid';
  callTime?: string; // Horário de chegada na ordem do dia
}

export interface VariableCost {
  id: string;
  category: 'Alimentação' | 'Transporte' | 'Hospedagem' | 'Locação' | 'Emergencial' | 'Outros';
  description: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending';
}

export interface AVEvent {
  id: string;
  eventName: string;
  clientName: string;
  eventDate: string;
  eventDuration?: number; // Qtd dias de evento
  totalRevenue: number; // Valor fechado com o cliente
  status: 'scheduled' | 'completed' | 'canceled';
  active?: boolean; // Se o evento está ativo nos cálculos globais
  crew: CrewMember[];
  variableCosts?: VariableCost[]; // Custos extras (Alimentação, Uber, etc)
}

// --- Interfaces para Ordem do Dia (Call Sheet) ---

export interface ScheduleItem {
  id: string;
  time: string;
  activity: string;
  description?: string;
}

export interface WeatherData {
  minTemp?: number;
  maxTemp?: number;
  temp?: number; // Mantido para compatibilidade
  weatherCode: number;
  description: string;
}

export interface CallSheet {
  id: string;
  productionTitle: string;
  date: string;
  locationName: string;
  locationAddress: string;
  nearestHospital: string;
  city: string; // Para API de clima
  
  generalCallTime: string; // Horário geral
  lunchTime: string; // Horário almoço
  wrapTimeEstimate: string; // Previsão de término
  
  director: string;
  producer: string;
  
  weather?: WeatherData; // Dados cacheados do clima
  
  schedule: ScheduleItem[];
  crew: CrewMember[]; // Reutiliza CrewMember, mas foca em nome/cargo/callTime
  notes: string;
}
