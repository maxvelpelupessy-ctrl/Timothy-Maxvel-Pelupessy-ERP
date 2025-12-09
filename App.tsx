import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Bike, 
  FileText, 
  CreditCard, 
  Settings, 
  Menu,
  Bell,
  User,
  LogOut,
  ListOrdered
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import FleetManager from './components/FleetManager';
import AccountingView from './components/AccountingView';
import VoiceAgent from './components/VoiceAgent';
import TransactionManager from './components/TransactionManager';
import { ViewState, Transaction } from './types';
import { MOCK_BIKES, MOCK_FINANCIALS, MOCK_TRANSACTIONS } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // CENTRAL STATE: This is the single source of truth for transactions.
  // Passed down to TransactionManager (to edit) and AccountingView (to read/report).
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  const handleAddTransaction = (newTx: Transaction) => {
    setTransactions(prev => [newTx, ...prev]);
  };

  const handleAddBatchTransactions = (newTxs: Transaction[]) => {
    setTransactions(prev => [...newTxs, ...prev]);
  };

  // Nav Item Component
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
        currentView === view 
          ? 'bg-slate-800 text-white shadow-lg shadow-slate-900/20' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-erp-50 flex font-sans text-erp-800">
      
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-erp-900 text-white transition-all duration-300 ease-in-out fixed h-full z-30 flex flex-col border-r border-slate-800`}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-800 px-4">
          {isSidebarOpen ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                 <Bike className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">MotoRent ERP</span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                 <Bike className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <NavItem view="dashboard" icon={LayoutDashboard} label={isSidebarOpen ? "Executive Dashboard" : ""} />
          <NavItem view="transactions" icon={ListOrdered} label={isSidebarOpen ? "Transaction Data" : ""} />
          <NavItem view="fleet" icon={Bike} label={isSidebarOpen ? "Fleet Management" : ""} />
          <NavItem view="accounting" icon={FileText} label={isSidebarOpen ? "Financial Core" : ""} />
          <NavItem view="procurement" icon={CreditCard} label={isSidebarOpen ? "Procurement (AP)" : ""} />
          
          <div className="pt-8 pb-2">
             {isSidebarOpen && <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">System</p>}
             <button className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-lg">
                <Settings className="w-5 h-5" />
                {isSidebarOpen && <span className="font-medium">Settings</span>}
             </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className={`flex items-center ${isSidebarOpen ? 'space-x-3' : 'justify-center'}`}>
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                 <User className="w-4 h-4 text-slate-300" />
              </div>
              {isSidebarOpen && (
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">Prof. Accountant</p>
                    <p className="text-xs text-slate-500 truncate">Admin Access</p>
                 </div>
              )}
              {isSidebarOpen && (
                 <button className="text-slate-400 hover:text-white">
                    <LogOut className="w-4 h-4" />
                 </button>
              )}
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 px-8 flex justify-between items-center">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
               System Status: Online
            </span>
            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600">
               <Bell className="w-5 h-5" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-8 max-w-7xl mx-auto">
          {currentView === 'dashboard' && (
            <Dashboard 
              financials={MOCK_FINANCIALS} 
              transactions={transactions}
              bikes={MOCK_BIKES}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionManager 
              transactions={transactions} 
              onAddTransaction={handleAddTransaction}
              onAddBatchTransactions={handleAddBatchTransactions}
            />
          )}
          
          {currentView === 'fleet' && (
            <FleetManager bikes={MOCK_BIKES} />
          )}

          {currentView === 'accounting' && (
            <AccountingView transactions={transactions} />
          )}

          {currentView === 'procurement' && (
            <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
               <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-slate-400" />
               </div>
               <h3 className="text-xl font-bold text-slate-900">Procurement Module</h3>
               <p className="text-slate-500 max-w-md">The Purchase Order and Vendor Management interface would be implemented here, featuring AI-driven automated invoice matching.</p>
            </div>
          )}
        </div>
      </main>

      {/* AI Voice Agent Overlay */}
      <VoiceAgent 
        bikes={MOCK_BIKES} 
        financials={MOCK_FINANCIALS} 
        transactions={transactions} 
      />
    </div>
  );
};

export default App;