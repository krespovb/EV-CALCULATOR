import React, { useState } from 'react';
import { ManualTab } from './components/ManualTab';
import { SmartTab } from './components/SmartTab';
import { Calculator, Zap } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'manual' | 'smart'>('manual');

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">EV Charge Smart</h1>
              <p className="text-xs text-slate-500">Calculadora & Optimizador PVPC España</p>
            </div>
          </div>
          <div className="text-xs text-right hidden sm:block text-slate-400">
            v1.0.0 &bull; Sin Auth
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 mt-8">
        {/* Tab Navigation */}
        <div className="bg-slate-200 p-1 rounded-xl inline-flex mb-8 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === 'manual'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Calculadora Manual</span>
          </button>
          <button
            onClick={() => setActiveTab('smart')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
              activeTab === 'smart'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Carga Inteligente</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'manual' ? <ManualTab /> : <SmartTab />}
        </div>
      </main>

      <footer className="mt-12 text-center text-slate-400 text-sm pb-8">
        <p>Datos de precios PVPC (Península) - Estimaciones no vinculantes.</p>
      </footer>
    </div>
  );
}

export default App;
