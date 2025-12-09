import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MonthlyStat, Transaction, Bike } from '../types';
import { analyzeFinancialHealth } from '../services/geminiService';
import { Activity, DollarSign, TrendingUp, AlertTriangle, BrainCircuit } from 'lucide-react';

interface DashboardProps {
  financials: MonthlyStat[];
  transactions: Transaction[];
  bikes: Bike[];
}

const Dashboard: React.FC<DashboardProps> = ({ financials, transactions, bikes }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totalRevenue = financials.reduce((acc, curr) => acc + curr.revenue, 0);
  // Add live transactions revenue to the static mock total for demo purposes if desired, 
  // or simply rely on MonthlyStat. For now, let's keep consistency with the props.
  
  const totalProfit = financials.reduce((acc, curr) => acc + curr.profit, 0);
  const activeRentals = bikes.filter(b => b.status === 'Rented').length;
  const utilizationRate = Math.round((activeRentals / bikes.length) * 100);

  const handleRunAnalysis = async () => {
    setLoading(true);
    const result = await analyzeFinancialHealth(financials, transactions);
    setAiAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-500">YTD Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900">
                Rp {totalRevenue.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2 font-medium">+12.5% vs last year</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-500">Net Profit</p>
              <h3 className="text-2xl font-bold text-slate-900">
                Rp {totalProfit.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2 font-medium">Margin: {Math.round((totalProfit/totalRevenue)*100)}%</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-500">Fleet Utilization</p>
              <h3 className="text-2xl font-bold text-slate-900">{utilizationRate}%</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{activeRentals} / {bikes.length} units active</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-500">Maintenance Alert</p>
              <h3 className="text-2xl font-bold text-red-600">
                {bikes.filter(b => b.status === 'Maintenance' || b.status === 'Overdue').length} Units
              </h3>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Requires immediate attention</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Financial Performance</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financials}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value/1000000}M`} />
                <Tooltip 
                  formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#0f172a" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#94a3b8" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight Panel */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-lg text-white flex flex-col">
          <div className="flex items-center space-x-2 mb-4">
            <BrainCircuit className="w-6 h-6 text-accent" />
            <h4 className="text-lg font-semibold text-white">AI Financial Consultant</h4>
          </div>
          
          <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar text-sm text-slate-300 leading-relaxed">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p>Analyzing General Ledger...</p>
              </div>
            ) : aiAnalysis ? (
              <div className="prose prose-invert prose-sm">
                <p className="whitespace-pre-line">{aiAnalysis}</p>
              </div>
            ) : (
              <p className="italic opacity-70">
                Click the button below to generate a real-time analysis of your revenue streams and expense anomalies using Google Gemini.
              </p>
            )}
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="w-full py-3 px-4 bg-accent hover:bg-sky-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>Generate Insight</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;