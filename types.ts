export enum BikeStatus {
  AVAILABLE = 'Available',
  RENTED = 'Rented',
  MAINTENANCE = 'Maintenance',
  OVERDUE = 'Overdue'
}

export interface Bike {
  id: string;
  model: string;
  plateNumber: string;
  status: BikeStatus;
  mileage: number;
  lastServiceDate: string;
  dailyRate: number;
  nextServiceDue: number; // mileage threshold
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: 'Revenue' | 'Expense' | 'Asset' | 'Liability' | 'Equity';
  amount: number;
  reference: string;
  // For double-entry simulation
  contraAccount?: string; 
}

export interface Account {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  category: string;
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalLine[];
}

export interface MonthlyStat {
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export type ViewState = 'dashboard' | 'fleet' | 'rentals' | 'accounting' | 'procurement' | 'transactions';

export interface AIAnalysisResult {
  text: string;
  loading: boolean;
  error?: string;
}