import React, { useState } from 'react';
import { Bike, BikeStatus } from '../types';
import { analyzeFleetMaintenance } from '../services/geminiService';
import { Settings, Wrench, CheckCircle, Clock, AlertCircle, Sparkles } from 'lucide-react';

interface FleetManagerProps {
  bikes: Bike[];
}

const FleetManager: React.FC<FleetManagerProps> = ({ bikes }) => {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (status: BikeStatus) => {
    switch (status) {
      case BikeStatus.AVAILABLE:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Available</span>;
      case BikeStatus.RENTED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1"/> Rented</span>;
      case BikeStatus.MAINTENANCE:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Wrench className="w-3 h-3 mr-1"/> Maintenance</span>;
      case BikeStatus.OVERDUE:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1"/> Overdue</span>;
      default:
        return null;
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    const result = await analyzeFleetMaintenance(bikes);
    setAiSuggestion(result);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Fleet Management</h2>
          <p className="text-slate-500">Real-time asset tracking and maintenance scheduling.</p>
        </div>
        <button 
            onClick={runAnalysis}
            className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
        >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>AI Maintenance Forecast</span>
        </button>
      </div>

      {/* AI Panel (Collapsible or Conditionally Rendered) */}
      {(aiSuggestion || loading) && (
        <div className="bg-gradient-to-r from-slate-50 to-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-md font-bold text-slate-800 flex items-center mb-3">
            <Settings className="w-5 h-5 mr-2 text-indigo-600" />
            Operational Intelligence
          </h3>
          {loading ? (
             <p className="text-sm text-slate-500 animate-pulse">Analyzing mileage patterns and service history...</p>
          ) : (
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line">
                {aiSuggestion}
            </div>
          )}
        </div>
      )}

      {/* Fleet Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Asset Info</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mileage</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Next Service</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Daily Rate</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {bikes.map((bike) => (
                <tr key={bike.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-slate-100 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-slate-600 text-xs">{bike.id}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{bike.model}</div>
                        <div className="text-sm text-slate-500">{bike.plateNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(bike.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {bike.mileage.toLocaleString()} km
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{bike.nextServiceDue.toLocaleString()} km</div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                        <div 
                            className={`h-1.5 rounded-full ${bike.mileage > bike.nextServiceDue ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${Math.min(100, (bike.mileage / bike.nextServiceDue) * 100)}%` }}
                        ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900 font-medium">
                    Rp {bike.dailyRate.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900">Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FleetManager;
