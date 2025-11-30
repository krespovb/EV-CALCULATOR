import React, { useState, useMemo } from 'react';
import { InputSlider } from './ui/InputSlider';
import { Zap, Clock, Wallet } from 'lucide-react';
import { DEFAULT_BATTERY_CAPACITY, DEFAULT_CHARGING_POWER, DEFAULT_PRICE } from '../constants';

export const ManualTab: React.FC = () => {
  const [batteryCap, setBatteryCap] = useState(DEFAULT_BATTERY_CAPACITY);
  const [power, setPower] = useState(DEFAULT_CHARGING_POWER);
  const [price, setPrice] = useState(DEFAULT_PRICE);
  const [startPct, setStartPct] = useState(10);
  const [endPct, setEndPct] = useState(80);

  const results = useMemo(() => {
    // Logic to prevent endPct < startPct
    const validEndPct = Math.max(startPct, endPct);
    
    const energyNeeded = batteryCap * ((validEndPct - startPct) / 100);
    const timeHours = power > 0 ? energyNeeded / power : 0;
    const cost = energyNeeded * price;

    const hours = Math.floor(timeHours);
    const minutes = Math.round((timeHours - hours) * 60);

    return {
      energyNeeded,
      cost,
      timeString: `${hours}h ${minutes}m`
    };
  }, [batteryCap, power, price, startPct, endPct]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Inputs */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-600" /> Parámetros del Vehículo
          </h2>
          
          <InputSlider label="Capacidad Batería" value={batteryCap} onChange={setBatteryCap} min={10} max={150} step={1} unit="kWh" />
          <InputSlider label="Potencia de Carga" value={power} onChange={setPower} min={1} max={22} step={0.1} unit="kW" />
          <InputSlider label="Precio Electricidad" value={price} onChange={setPrice} min={0.01} max={0.50} step={0.001} unit="€/kWh" />
          
          <div className="pt-4 border-t border-slate-100">
             <InputSlider label="Carga Inicial" value={startPct} onChange={(v) => { setStartPct(v); if(v > endPct) setEndPct(v); }} min={0} max={100} step={1} unit="%" />
             <InputSlider label="Carga Final (Objetivo)" value={endPct} onChange={(v) => { setEndPct(v); if(v < startPct) setStartPct(v); }} min={0} max={100} step={1} unit="%" />
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-md">
            <div className="flex items-center space-x-3 mb-2 opacity-90">
              <Wallet className="w-6 h-6" />
              <span className="text-sm font-medium uppercase tracking-wider">Coste Estimado</span>
            </div>
            <div className="text-5xl font-bold">
              {results.cost.toFixed(2)}€
            </div>
            <div className="mt-2 text-blue-100 text-sm">
              para cargar {results.energyNeeded.toFixed(1)} kWh
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col justify-center">
             <div className="flex items-center space-x-3 mb-2 text-slate-500">
              <Clock className="w-6 h-6" />
              <span className="text-sm font-medium uppercase tracking-wider">Tiempo Requerido</span>
            </div>
            <div className="text-4xl font-bold text-slate-800">
              {results.timeString}
            </div>
            <div className="mt-2 text-slate-400 text-sm">
              a una potencia media de {power} kW
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
