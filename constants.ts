import { Bike, BikeStatus, MonthlyStat, Transaction, Account } from './types';

export const MOCK_BIKES: Bike[] = [
  { id: 'B001', model: 'Honda Vario 160', plateNumber: 'B 1234 XYZ', status: BikeStatus.AVAILABLE, mileage: 12500, lastServiceDate: '2023-12-01', dailyRate: 150000, nextServiceDue: 13000 },
  { id: 'B002', model: 'Yamaha NMAX 155', plateNumber: 'B 5678 ABC', status: BikeStatus.RENTED, mileage: 8200, lastServiceDate: '2024-01-15', dailyRate: 200000, nextServiceDue: 10000 },
  { id: 'B003', model: 'Honda PCX 160', plateNumber: 'B 9101 DEF', status: BikeStatus.MAINTENANCE, mileage: 15100, lastServiceDate: '2023-11-20', dailyRate: 220000, nextServiceDue: 15000 },
  { id: 'B004', model: 'Vespa Sprint', plateNumber: 'B 2222 GHI', status: BikeStatus.AVAILABLE, mileage: 4500, lastServiceDate: '2024-02-01', dailyRate: 350000, nextServiceDue: 6000 },
  { id: 'B005', model: 'Honda Beat', plateNumber: 'B 3333 JKL', status: BikeStatus.OVERDUE, mileage: 22000, lastServiceDate: '2023-10-10', dailyRate: 100000, nextServiceDue: 20000 },
  { id: 'B006', model: 'Yamaha Aerox', plateNumber: 'B 4444 MNO', status: BikeStatus.RENTED, mileage: 9800, lastServiceDate: '2024-01-20', dailyRate: 180000, nextServiceDue: 10000 },
];

export const MOCK_FINANCIALS: MonthlyStat[] = [
  { name: 'Jan', revenue: 45000000, expenses: 12000000, profit: 33000000 },
  { name: 'Feb', revenue: 52000000, expenses: 15000000, profit: 37000000 },
  { name: 'Mar', revenue: 48000000, expenses: 11000000, profit: 37000000 },
  { name: 'Apr', revenue: 61000000, expenses: 18000000, profit: 43000000 },
  { name: 'May', revenue: 55000000, expenses: 14000000, profit: 41000000 },
  { name: 'Jun', revenue: 67000000, expenses: 20000000, profit: 47000000 },
];

export const CHART_OF_ACCOUNTS: Account[] = [
  // Assets
  { code: '1001', name: 'Cash on Hand', type: 'Asset', category: 'Current Asset' },
  { code: '1002', name: 'Bank BCA', type: 'Asset', category: 'Current Asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset', category: 'Current Asset' },
  { code: '1200', name: 'Motorcycle Fleet Inventory', type: 'Asset', category: 'Fixed Asset' },
  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: 'Liability', category: 'Current Liability' },
  // Equity
  { code: '3000', name: 'Owner Capital', type: 'Equity', category: 'Equity' },
  // Revenue
  { code: '4000', name: 'Rental Revenue', type: 'Revenue', category: 'Operating Revenue' },
  // Expenses
  { code: '5001', name: 'Maintenance Expense', type: 'Expense', category: 'COGS' },
  { code: '5002', name: 'Rent Expense (Garage)', type: 'Expense', category: 'Operating Expense' },
];

// Enhanced transactions to support logic mapping
export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'TX001', date: '2024-06-01', description: 'Rental Income - Inv #1001', category: 'Revenue', amount: 450000, reference: 'INV-1001' },
  { id: 'TX002', date: '2024-06-02', description: 'Purchase Parts (Tires) - Mitra Motor', category: 'Expense', amount: -2500000, reference: 'PO-502', contraAccount: '2000' }, // Credit AP
  { id: 'TX003', date: '2024-06-03', description: 'Rental Income - Inv #1002', category: 'Revenue', amount: 1200000, reference: 'INV-1002' },
  { id: 'TX004', date: '2024-06-04', description: 'Monthly Garage Rent', category: 'Expense', amount: -5000000, reference: 'AP-201' },
  { id: 'TX005', date: '2024-06-05', description: 'New Unit Purchase (Down Payment)', category: 'Asset', amount: -7000000, reference: 'CAPEX-01' },
];