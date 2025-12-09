import React, { useState, useMemo, useRef } from 'react';
import { Transaction, JournalEntry } from '../types';
import { CHART_OF_ACCOUNTS } from '../constants';
import { FileText, BookOpen, PieChart, Table, Download, Upload, Plus, ChevronDown, ChevronUp, List, Link } from 'lucide-react';

interface AccountingViewProps {
  transactions: Transaction[];
}

const AccountingView: React.FC<AccountingViewProps> = ({ transactions }) => {
  const [activeTab, setActiveTab] = useState<'journal' | 'reports'>('journal');
  const [uploadedEntries, setUploadedEntries] = useState<JournalEntry[]>([]);
  const [isCOAOpen, setIsCOAOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Double Entry Logic Engine (System Data) ---
  // Transforms flat transactions into Accounting Journal Entries (Debit/Credit)
  const systemJournalEntries: JournalEntry[] = useMemo(() => {
    return transactions.map(tx => {
      const lines: { accountId: string; accountName: string; debit: number; credit: number }[] = [];
      const absAmount = Math.abs(tx.amount);

      if (tx.category === 'Revenue') {
        // Debit: Cash/Bank (Asset Increase)
        lines.push({ accountId: '1002', accountName: 'Bank BCA', debit: absAmount, credit: 0 });
        // Credit: Revenue (Income Increase)
        lines.push({ accountId: '4000', accountName: 'Rental Revenue', debit: 0, credit: absAmount });
      } else if (tx.category === 'Expense') {
        // Debit: Expense (Expense Increase)
        const expenseAccount = tx.description.toLowerCase().includes('maintenance') || tx.description.toLowerCase().includes('parts') 
          ? { id: '5001', name: 'Maintenance Expense' }
          : { id: '5002', name: 'Rent Expense (Garage)' };
        
        lines.push({ accountId: expenseAccount.id, accountName: expenseAccount.name, debit: absAmount, credit: 0 });
        
        // Credit: Cash or AP
        if (tx.contraAccount === '2000') {
           lines.push({ accountId: '2000', accountName: 'Accounts Payable', debit: 0, credit: absAmount });
        } else {
           lines.push({ accountId: '1002', accountName: 'Bank BCA', debit: 0, credit: absAmount });
        }
      } else if (tx.category === 'Asset') {
        // Debit: Fixed Asset
        lines.push({ accountId: '1200', accountName: 'Motorcycle Fleet Inventory', debit: absAmount, credit: 0 });
        // Credit: Bank
        lines.push({ accountId: '1002', accountName: 'Bank BCA', debit: 0, credit: absAmount });
      }

      return {
        id: tx.id,
        date: tx.date,
        reference: tx.reference,
        description: tx.description,
        lines
      };
    });
  }, [transactions]);

  // Combine System Entries + CSV Uploaded Entries
  const allJournalEntries = useMemo(() => {
    return [...uploadedEntries, ...systemJournalEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [uploadedEntries, systemJournalEntries]);

  // --- CSV Processing Logic ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseCSV = (csvText: string) => {
    try {
        const lines = csvText.split('\n');
        // Simple map to group lines by Reference ID (assuming CSV is flat lines)
        // CSV Format expected: Date, Ref, Account/Description, Debit, Credit
        
        const tempGroups: Record<string, JournalEntry> = {};

        // Skip header (index 0)
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].trim();
            if (!row) continue;

            // Handle commas inside quotes or simple split
            const cols = row.split(',').map(c => c.trim());
            // Safe guard for empty rows
            if (cols.length < 5) continue;

            const [date, ref, descRaw, debitStr, creditStr] = cols;
            
            // Clean currency strings (remove "Rp", ".", etc)
            const cleanNumber = (str: string) => parseFloat(str.replace(/[^0-9.-]+/g,"")) || 0;
            const debit = cleanNumber(debitStr);
            const credit = cleanNumber(creditStr);

            // Smart Account Mapping (Simple Heuristic for Demo)
            let accountId = '9999'; // Misc
            const desc = descRaw.replace(/"/g, ''); // remove quotes

            if (desc.toLowerCase().includes('revenue') || desc.toLowerCase().includes('sales')) accountId = '4000';
            else if (desc.toLowerCase().includes('bank') || desc.toLowerCase().includes('bca')) accountId = '1002';
            else if (desc.toLowerCase().includes('cash')) accountId = '1001';
            else if (desc.toLowerCase().includes('maintenance') || desc.toLowerCase().includes('service')) accountId = '5001';
            else if (desc.toLowerCase().includes('rent') && desc.toLowerCase().includes('expense')) accountId = '5002';

            if (!tempGroups[ref]) {
                tempGroups[ref] = {
                    id: `CSV-${ref}-${Math.random().toString(36).substr(2, 5)}`,
                    date: date,
                    reference: ref,
                    description: "Imported Transaction",
                    lines: []
                };
            }

            tempGroups[ref].lines.push({
                accountId,
                accountName: desc,
                debit,
                credit
            });
        }

        const newEntries = Object.values(tempGroups);
        setUploadedEntries(prev => [...prev, ...newEntries]);
        alert(`Successfully imported ${newEntries.length} journal entries.`);

    } catch (err) {
        console.error(err);
        alert("Failed to parse CSV. Please ensure format: Date, Ref, Description, Debit, Credit");
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // --- Financial Report Calculation ---
  const incomeStatement = useMemo(() => {
    let revenue = 0;
    let cogs = 0;
    let opex = 0;

    allJournalEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountId === '4000') revenue += line.credit; // Revenue is Credit
        if (line.accountId === '5001') cogs += line.debit; // Expense is Debit
        if (line.accountId === '5002') opex += line.debit;
      });
    });

    return { revenue, cogs, opex, netIncome: revenue - cogs - opex };
  }, [allJournalEntries]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financial Core</h2>
          <p className="text-slate-500 flex items-center">
            Double-entry bookkeeping. Synced with <strong className="mx-1 text-indigo-600 flex items-center"><Link className="w-3 h-3 mr-0.5" /> Transaction Data</strong>.
          </p>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={() => setActiveTab('journal')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${activeTab === 'journal' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
            >
                <BookOpen className="w-4 h-4" />
                <span>General Journal</span>
            </button>
            <button 
                onClick={() => setActiveTab('reports')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${activeTab === 'reports' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
            >
                <FileText className="w-4 h-4" />
                <span>Financial Reports</span>
            </button>
        </div>
      </div>

      {activeTab === 'journal' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700 flex items-center">
                    General Journal (Jurnal Umum)
                    <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">{allJournalEntries.length} Entries</span>
                </h3>
                <div className="flex space-x-3">
                    <input 
                        type="file" 
                        accept=".csv" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                    />
                    <button 
                        onClick={triggerFileUpload}
                        className="text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium flex items-center px-3 py-1.5 rounded-lg transition"
                    >
                        <Upload className="w-4 h-4 mr-2 text-indigo-600"/> Import CSV
                    </button>
                    <button className="text-sm text-indigo-600 font-medium flex items-center hover:text-indigo-800 transition">
                        <Download className="w-4 h-4 mr-1"/> Export Template
                    </button>
                </div>
            </div>
            
            {/* Scrollable Table Area */}
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="min-w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-32 bg-slate-50">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-32 bg-slate-50">Ref</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Account / Description</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-32 bg-slate-50">Debit (IDR)</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-32 bg-slate-50">Credit (IDR)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {allJournalEntries.map((entry) => (
                            <React.Fragment key={entry.id}>
                                {entry.lines.map((line, idx) => (
                                    <tr key={`${entry.id}-${idx}`} className={`hover:bg-slate-50 ${idx === 0 ? 'border-t border-slate-200' : ''}`}>
                                        <td className="px-6 py-2 text-sm text-slate-500 whitespace-nowrap align-top">
                                            {idx === 0 ? entry.date : ''}
                                        </td>
                                        <td className="px-6 py-2 text-sm text-slate-400 font-mono whitespace-nowrap align-top">
                                            {idx === 0 ? entry.reference : ''}
                                        </td>
                                        <td className="px-6 py-2 text-sm text-slate-900">
                                            <div className={line.credit > 0 ? "pl-8" : ""}>
                                                <span className="font-medium text-slate-700">
                                                    {line.accountId !== '9999' ? line.accountId + ' - ' : ''}{line.accountName}
                                                </span>
                                                {idx === entry.lines.length - 1 && entry.description !== 'Imported Transaction' && (
                                                    <p className="text-xs text-slate-400 mt-1 italic">{entry.description}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-2 text-sm text-right text-slate-600 font-mono">
                                            {line.debit > 0 ? line.debit.toLocaleString('id-ID') : '-'}
                                        </td>
                                        <td className="px-6 py-2 text-sm text-right text-slate-600 font-mono">
                                            {line.credit > 0 ? line.credit.toLocaleString('id-ID') : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {uploadedEntries.length > 0 && (
                <div className="bg-yellow-50 px-4 py-2 border-t border-yellow-200">
                    <p className="text-xs text-yellow-800 flex items-center">
                        <Plus className="w-3 h-3 mr-1"/>
                        Viewing combined data: {systemJournalEntries.length} system entries + {uploadedEntries.length} imported entries.
                    </p>
                </div>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            {/* Income Statement */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4"></div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 border-b pb-4 flex items-center">
                    <PieChart className="w-5 h-5 mr-2 text-slate-500"/>
                    Income Statement (Laba Rugi)
                </h3>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-slate-600">
                        <span>Revenue (Rental Income)</span>
                        <span className="font-mono text-slate-900">Rp {incomeStatement.revenue.toLocaleString('id-ID')}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cost of Goods Sold (COGS)</p>
                        <div className="flex justify-between items-center text-slate-600 pl-4 border-l-2 border-red-100">
                            <span>Maintenance & Parts</span>
                            <span className="font-mono text-red-600">(Rp {incomeStatement.cogs.toLocaleString('id-ID')})</span>
                        </div>
                    </div>

                    <div className="pt-4">
                         <div className="flex justify-between items-center font-semibold text-slate-700 bg-slate-50 p-2 rounded">
                            <span>Gross Profit</span>
                            <span className="font-mono">Rp {(incomeStatement.revenue - incomeStatement.cogs).toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Operating Expenses</p>
                        <div className="flex justify-between items-center text-slate-600 pl-4 border-l-2 border-slate-200">
                            <span>Garage Rent & Utilities</span>
                            <span className="font-mono text-red-600">(Rp {incomeStatement.opex.toLocaleString('id-ID')})</span>
                        </div>
                    </div>

                    <div className="pt-6 border-t-2 border-slate-900 mt-4">
                        <div className="flex justify-between items-center text-lg font-bold text-slate-900">
                            <span>Net Income (Laba Bersih)</span>
                            <span className="font-mono text-green-600">Rp {incomeStatement.netIncome.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simulated Balance Sheet */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4"></div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 border-b pb-4 flex items-center">
                    <Table className="w-5 h-5 mr-2 text-slate-500"/>
                    Balance Sheet (Neraca)
                </h3>
                
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-slate-700 mb-2">Assets</h4>
                        <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Current Assets (Cash & Bank)</span>
                                <span className="font-mono font-medium">Rp {(145000000 + incomeStatement.netIncome).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Accounts Receivable</span>
                                <span className="font-mono font-medium">Rp 12.500.000</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Fixed Assets (Motorcycle Fleet)</span>
                                <span className="font-mono font-medium">Rp 850.000.000</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100">
                                <span>Total Assets</span>
                                <span>Rp {(1007500000 + incomeStatement.netIncome).toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-700 mb-2">Liabilities & Equity</h4>
                        <div className="space-y-2 pl-4 border-l-2 border-red-200">
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Accounts Payable</span>
                                <span className="font-mono font-medium">Rp 5.000.000</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Owners Equity (Capital)</span>
                                <span className="font-mono font-medium">Rp 900.000.000</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Retained Earnings</span>
                                <span className="font-mono font-medium">Rp {(102500000 + incomeStatement.netIncome).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100">
                                <span>Total Liab. & Equity</span>
                                <span>Rp {(1007500000 + incomeStatement.netIncome).toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Chart of Accounts Reference Section */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsCOAOpen(!isCOAOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none"
        >
          <div className="flex items-center space-x-2 text-slate-700">
            <List className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-sm">Chart of Accounts Reference (Daftar Akun)</span>
          </div>
          {isCOAOpen ? (
             <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
             <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        
        {isCOAOpen && (
          <div className="p-0 animate-fade-in">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Code</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Account Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {CHART_OF_ACCOUNTS.map((account) => (
                    <tr key={account.code} className="hover:bg-slate-50">
                      <td className="px-6 py-2 whitespace-nowrap text-sm font-mono font-medium text-slate-900">
                        {account.code}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-slate-700">
                        {account.name}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-slate-500">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${account.type === 'Asset' ? 'bg-blue-100 text-blue-800' : 
                            account.type === 'Liability' ? 'bg-red-100 text-red-800' :
                            account.type === 'Equity' ? 'bg-purple-100 text-purple-800' :
                            account.type === 'Revenue' ? 'bg-green-100 text-green-800' :
                            'bg-orange-100 text-orange-800' // Expense
                          }`}>
                          {account.type}
                        </span>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-slate-500">
                        {account.category}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 italic text-center">
               These accounts are used for automated journal mapping and financial reporting.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountingView;