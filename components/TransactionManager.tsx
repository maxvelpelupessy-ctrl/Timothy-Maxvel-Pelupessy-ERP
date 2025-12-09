import React, { useState, useRef } from 'react';
import { Transaction } from '../types';
import { Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, Save, X, Upload, Info } from 'lucide-react';

interface TransactionManagerProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Transaction) => void;
  onAddBatchTransactions: (txs: Transaction[]) => void;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({ transactions, onAddTransaction, onAddBatchTransactions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    category: 'Revenue',
    amount: 0,
    description: '',
    reference: '',
    contraAccount: '1002' // Default Bank
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: Transaction = {
      id: `TX-${Date.now()}`, // Simple ID gen
      date: formData.date || '',
      description: formData.description || '',
      category: formData.category as any,
      amount: formData.category === 'Expense' || formData.category === 'Asset' ? -(Math.abs(formData.amount || 0)) : Math.abs(formData.amount || 0),
      reference: formData.reference || `REF-${Math.floor(Math.random() * 1000)}`,
      contraAccount: formData.contraAccount
    };

    onAddTransaction(newTx);
    setIsModalOpen(false);
    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: 'Revenue',
      amount: 0,
      description: '',
      reference: '',
      contraAccount: '1002'
    });
  };

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

  // Robust Currency Parser for IDR and Standard formats
  const parseCurrency = (str: string): number => {
    if (!str) return 0;
    let clean = str.trim();

    // 1. Handle Parentheses for Negative (e.g., "(50.000)")
    const isParentheses = clean.startsWith('(') && clean.endsWith(')');
    if (isParentheses) {
        clean = clean.slice(1, -1);
    }
    
    // 2. Remove Currency Symbols and whitespace
    // Handles "Rp.", "Rp ", "IDR"
    clean = clean.replace(/^(Rp\.?|IDR|USD)\s?/i, '');
    clean = clean.replace(/\s/g, '');

    // 3. Handle Explicit Negative Sign
    let isNegative = isParentheses; 
    if (clean.startsWith('-')) {
        isNegative = true;
        clean = clean.substring(1);
    }

    // 4. Handle Indonesian vs US Format
    // Strategy: If dot exists but no comma, assume IDR (remove dot).
    // If comma exists at end (like ,00), assume IDR decimal.
    
    if (clean.indexOf(',') > -1 && clean.indexOf('.') > -1) {
        // Both exist.
        // If last separator is comma (10.000,00) -> IDR
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
             clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
             // (10,000.00) -> US
             clean = clean.replace(/,/g, '');
        }
    } else if (clean.indexOf(',') > -1) {
         // Only comma. Ambiguous. "10,000" (US 10k) or "50,5" (IDR 50.5).
         // Given "Profesor Akuntansi" context, usually comma is decimal in Indonesia, 
         // BUT in simple CSV exports "10,000" often means 10k. 
         // Let's check if it has 3 digits after comma. If yes, likely thousand separator.
         const parts = clean.split(',');
         if (parts.length > 1 && parts[parts.length-1].length === 3) {
             clean = clean.replace(/,/g, ''); // Treat as thousand separator
         } else {
             clean = clean.replace(',', '.'); // Treat as decimal
         }
    } else if (clean.indexOf('.') > -1) {
         // Only dot. "10.000". Assume IDR Thousand separator.
         clean = clean.replace(/\./g, '');
    }

    // Remove any trailing non-numeric chars (like "-")
    clean = clean.replace(/[^0-9.]/g, '');

    const val = parseFloat(clean);
    if (isNaN(val)) return 0;
    
    return isNegative ? -val : val;
  };

  const detectDelimiter = (text: string) => {
    const lines = text.split('\n');
    if (lines.length < 2) return ',';
    const line = lines[0]; // Check header
    const tabs = (line.match(/\t/g) || []).length;
    const semicolons = (line.match(/;/g) || []).length;
    const commas = (line.match(/,/g) || []).length;
    
    if (tabs > commas && tabs > semicolons) return '\t';
    if (semicolons > commas) return ';';
    return ',';
  };

  // Robust CSV Line Splitter (Handles quotes and empty fields correctly)
  const splitCSVLine = (line: string, delimiter: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
              // Handle escaped quotes ("") inside quotes
              if (inQuotes && line[i+1] === '"') {
                  current += '"';
                  i++; 
              } else {
                  inQuotes = !inQuotes;
              }
          } else if (char === delimiter && !inQuotes) {
              result.push(current.trim());
              current = '';
          } else {
              current += char;
          }
      }
      result.push(current.trim());
      return result;
  };

  const parseCSV = (csvText: string) => {
    try {
        const lines = csvText.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) return;

        const delimiter = detectDelimiter(csvText);
        const headers = splitCSVLine(lines[0], delimiter).map(h => h.toLowerCase());
        
        // Dynamic Column Mapping
        const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

        const idxDate = getIdx(['date', 'tanggal', 'tgl']);
        const idxRef = getIdx(['ref', 'nomor', 'no.', 'code']);
        const idxDesc = getIdx(['description', 'deskripsi', 'keterangan', 'account', 'akun']);
        const idxDebit = getIdx(['debit', 'masuk']);
        const idxCredit = getIdx(['credit', 'kredit', 'keluar']);
        const idxAmount = getIdx(['amount', 'jumlah', 'nilai', 'total']);

        const newTransactions: Transaction[] = [];
        let parsedCount = 0;
        let revCount = 0;
        let expCount = 0;

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const cols = splitCSVLine(lines[i], delimiter);
            
            // Helper to safely get value
            const val = (idx: number) => idx >= 0 && idx < cols.length ? cols[idx] : '';

            // 1. Get Date
            let date = val(idxDate);
            if (!date && cols.length > 0) date = cols[0]; // Fallback to col 0
            
            // 2. Get Ref
            let ref = val(idxRef);
            if (!ref && cols.length > 1) ref = cols[1]; // Fallback to col 1

            // 3. Get Description
            let desc = val(idxDesc);
            if (!desc && cols.length > 2) desc = cols[2]; // Fallback to col 2

            // 4. Calculate Amount
            let finalAmount = 0;
            let category: 'Revenue' | 'Expense' | 'Asset' = 'Revenue';

            if (idxDebit >= 0 && idxCredit >= 0) {
                // Have explicit Debit/Credit columns
                const debit = parseCurrency(val(idxDebit));
                const credit = parseCurrency(val(idxCredit));
                
                if (credit > 0) {
                    finalAmount = credit;
                    category = 'Revenue';
                } else if (debit > 0) {
                    finalAmount = -debit;
                    category = 'Expense';
                }
            } else if (idxAmount >= 0) {
                // Single Amount Column
                finalAmount = parseCurrency(val(idxAmount));
            } else {
                // Fallback Layout: Date, Ref, Desc, Debit, Credit (Standard 5 cols)
                if (cols.length >= 5) {
                    const debit = parseCurrency(cols[3]);
                    const credit = parseCurrency(cols[4]);
                    if (credit > 0) {
                        finalAmount = credit;
                        category = 'Revenue';
                    } else if (debit > 0) {
                        finalAmount = -debit;
                        category = 'Expense';
                    }
                } else if (cols.length === 4) {
                    // Fallback Layout: Date, Ref, Desc, Amount
                    finalAmount = parseCurrency(cols[3]);
                }
            }

            // Determine Category from Description if Amount is negative
            if (finalAmount < 0) {
                category = 'Expense';
                const lowerDesc = desc.toLowerCase();
                if (lowerDesc.includes('asset') || lowerDesc.includes('aset') || lowerDesc.includes('motor') || lowerDesc.includes('unit')) {
                    category = 'Asset';
                }
            } else if (finalAmount > 0) {
                category = 'Revenue';
            }

            // Only add if meaningful
            if (finalAmount !== 0 || desc !== '') {
                newTransactions.push({
                    id: `TX-CSV-${Date.now()}-${i}`,
                    date: date || new Date().toISOString().split('T')[0],
                    reference: ref || `CSV-${i}`,
                    description: desc || 'Imported Transaction',
                    category: category,
                    amount: finalAmount,
                    contraAccount: '1002'
                });
                parsedCount++;
                if (finalAmount > 0) revCount++;
                else expCount++;
            }
        }

        if (newTransactions.length > 0) {
            onAddBatchTransactions(newTransactions);
            alert(`Import Successful!\n\nDetected Delimiter: "${delimiter === '\t' ? 'TAB' : delimiter}"\nTotal Transactions: ${parsedCount}\nRevenue items: ${revCount}\nExpense items: ${expCount}`);
        } else {
            alert("No valid data found.\nPlease ensure your CSV has headers like 'Debit', 'Credit', or 'Amount'.");
        }

    } catch (err) {
        console.error(err);
        alert("Failed to parse CSV. Please check the file format.");
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reference.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transaction Data Master</h2>
          <p className="text-slate-500">The single source of truth. Changes here automatically update the Financial Core.</p>
        </div>
        <div className="flex space-x-3">
          <input 
              type="file" 
              accept=".csv,.txt" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
          />
          <button 
             onClick={() => fileInputRef.current?.click()}
             className="bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition flex items-center space-x-2"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Import CSV</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Transaction</span>
          </button>
        </div>
      </div>

      {/* Helper Box for CSV Format */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">CSV/Excel Import Guide:</p>
            <p className="mb-1">Ensure your file has a <span className="font-bold">Header Row</span> (e.g., Date, Description, Debit, Credit).</p>
            <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
                <li>System automatically detects <span className="font-mono">Comma (,)</span>, <span className="font-mono">Semicolon (;)</span> or <span className="font-mono">Tab</span>.</li>
                <li>Supports <span className="font-mono">Debit/Credit</span> columns (recommended) or single <span className="font-mono">Amount</span> column.</li>
                <li>Handles Indonesian currency formats (e.g. <span className="font-mono">1.500.000,00</span> or <span className="font-mono">Rp 50.000,-</span>).</li>
            </ul>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
                type="text" 
                placeholder="Search by description or reference ID..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Ref</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (IDR)</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider pl-10">Accounting Impact</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{tx.date}</div>
                    <div className="text-xs text-slate-500 font-mono">{tx.reference}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{tx.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${tx.category === 'Revenue' ? 'bg-green-100 text-green-800' : 
                          tx.category === 'Expense' ? 'bg-red-100 text-red-800' : 
                          'bg-blue-100 text-blue-800'}`}>
                        {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-bold font-mono ${tx.amount === 0 ? 'text-slate-400' : tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''} {tx.amount.toLocaleString('id-ID')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap pl-10">
                    <div className="text-xs text-slate-500 flex flex-col space-y-1">
                        {tx.category === 'Revenue' ? (
                            <>
                                <span className="flex items-center"><ArrowUpRight className="w-3 h-3 text-green-500 mr-1"/> Debit: Bank (Asset)</span>
                                <span className="flex items-center"><ArrowDownLeft className="w-3 h-3 text-green-500 mr-1"/> Credit: Revenue</span>
                            </>
                        ) : tx.category === 'Expense' ? (
                            <>
                                <span className="flex items-center"><ArrowUpRight className="w-3 h-3 text-red-500 mr-1"/> Debit: Expense</span>
                                <span className="flex items-center"><ArrowDownLeft className="w-3 h-3 text-red-500 mr-1"/> Credit: {tx.contraAccount === '2000' ? 'Accounts Payable' : 'Bank'}</span>
                            </>
                        ) : (
                             <>
                                <span className="flex items-center"><ArrowUpRight className="w-3 h-3 text-blue-500 mr-1"/> Debit: Asset</span>
                                <span className="flex items-center"><ArrowDownLeft className="w-3 h-3 text-blue-500 mr-1"/> Credit: Bank</span>
                            </>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center">
                        <Plus className="w-5 h-5 mr-2" />
                        Record New Transaction
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="hover:text-slate-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input 
                                type="date" 
                                required
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
                            <input 
                                type="text" 
                                placeholder="Auto-generated if empty"
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={formData.reference}
                                onChange={e => setFormData({...formData, reference: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <input 
                            type="text" 
                            required
                            placeholder="e.g. Service Unit B001"
                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value as any})}
                            >
                                <option value="Revenue">Revenue (Income)</option>
                                <option value="Expense">Expense (Cost)</option>
                                <option value="Asset">Asset Purchase</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (IDR)</label>
                            <input 
                                type="number" 
                                required
                                min="0"
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method / Contra Account</label>
                        <select 
                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                            value={formData.contraAccount}
                            onChange={e => setFormData({...formData, contraAccount: e.target.value})}
                        >
                            <option value="1002">Bank Transfer (BCA)</option>
                            <option value="1001">Cash on Hand</option>
                            <option value="2000">Credit / Pay Later (Accounts Payable)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">This determines which account is credited/debited against the category.</p>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Transaction
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;