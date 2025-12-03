import React, { useState, useEffect, useCallback } from 'react';
import { getEsiosPrices } from '../services/esiosService';
import { PricePoint, ChargingOption } from '../types';
import { PriceChart } from './PriceChart';
import { InputSlider } from './ui/InputSlider';
import { RefreshCw, BatteryCharging, Moon, AlertTriangle, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { DEFAULT_BATTERY_CAPACITY, DEFAULT_CHARGING_POWER } from '../constants';

export const SmartTab: React.FC = () => {
  // Date Selection Logic
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // EV Params
  const [batteryCap, setBatteryCap] = useState(DEFAULT_BATTERY_CAPACITY);
  const [power, setPower] = useState(DEFAULT_CHARGING_POWER);
  const [startPct, setStartPct] = useState(0);
  const [endPct, setEndPct] = useState(100);
  
  // Data State
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'api' | 'fallback'>('api');
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  
  // Results State
  const [results, setResults] = useState<ChargingOption[]>([]);
  const [hoursNeeded, setHoursNeeded] = useState(0);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ChargingOption | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(undefined);
    
    const dateObj = new Date(selectedDate);
    const { data, source: dataSource, error } = await getEsiosPrices(dateObj);
    
    setPrices(data);
    setSource(dataSource);
    if (error) setErrorMsg(error);
    
    setLoading(false);
    setSelectedOption(null);
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optimization Algorithm
  useEffect(() => {
    if (prices.length === 0) return;

    const validEndPct = Math.max(startPct, endPct);
    const kwhNeeded = batteryCap * ((validEndPct - startPct) / 100);
    
    // Avoid division by zero
    const effectivePower = power > 0 ? power : 3.7;
    const hours = kwhNeeded / effectivePower;
    
    setHoursNeeded(hours);

    // Calculate slots needed (assuming hourly slots)
    // If we need 2.5 hours, we basically need 3 hourly slots to cover it fully in this simple model,
    // or we assume partial charging. For this UI, we map to full hour blocks for simplicity.
    const slotsNeeded = Math.ceil(hours);

    if (kwhNeeded <= 0 || slotsNeeded === 0) {
        setResults([]);
        return;
    }

    if (slotsNeeded > 24) {
      // Cannot charge more than 24h in a single day view
      setResults([]);
      return;
    }

    const calculatedOptions: ChargingOption[] = [];

    // Helper: Calculate average price for a window
    const calcWindow = (startIdx: number) => {
      let costSum = 0;
      for (let i = 0; i < slotsNeeded; i++) {
        // Handle wrap around? No, day view only.
        const idx = startIdx + i;
        if (idx < prices.length) {
          costSum += prices[idx].price;
        } else {
          costSum += 999; // Penalty
        }
      }
      return costSum / slotsNeeded;
    };

    // 1. Cheapest Overall
    let bestStart = 0;
    let minAvg = 9999;
    
    for (let i = 0; i <= prices.length - slotsNeeded; i++) {
        const avg = calcWindow(i);
        if (avg < minAvg) {
            minAvg = avg;
            bestStart = i;
        }
    }
    
    calculatedOptions.push({
        startHour: bestStart,
        endHour: bestStart + slotsNeeded,
        avgPrice: minAvg,
        totalCost: minAvg * kwhNeeded, // cost = price/kwh * kwh
        label: "Más Económica"
    });

    // 2. Night Preference (start between 00:00 and 06:00)
    let bestNightStart = -1;
    let minNightAvg = 9999;
    
    for (let i = 0; i <= Math.min(6, prices.length - slotsNeeded); i++) {
        const avg = calcWindow(i);
        if (avg < minNightAvg) {
            minNightAvg = avg;
            bestNightStart = i;
        }
    }

    if (bestNightStart !== -1 && bestNightStart !== bestStart) {
        calculatedOptions.push({
            startHour: bestNightStart,
            endHour: bestNightStart + slotsNeeded,
            avgPrice: minNightAvg,
            totalCost: minNightAvg * kwhNeeded,
            label: "Nocturna",
            isNightly: true
        });
    }

    // 3. Alternative (Just another local minimum far from the first)
    let bestAltStart = -1;
    let minAltAvg = 9999;
    
    for (let i = 0; i <= prices.length - slotsNeeded; i++) {
        if (Math.abs(i - bestStart) < 2) continue; // Skip close to best
        if (bestNightStart !== -1 && Math.abs(i - bestNightStart) < 2) continue;

        const avg = calcWindow(i);
        if (avg < minAltAvg) {
            minAltAvg = avg;
            bestAltStart = i;
        }
    }
    
    if (bestAltStart !== -1) {
         calculatedOptions.push({
            startHour: bestAltStart,
            endHour: bestAltStart + slotsNeeded,
            avgPrice: minAltAvg,
            totalCost: minAltAvg * kwhNeeded,
            label: "Alternativa"
        });
    }

    setResults(calculatedOptions);
    if (!selectedOption && calculatedOptions.length > 0) {
        setSelectedOption(calculatedOptions[0]);
    }

  }, [prices, batteryCap, power, startPct, endPct, hoursNeeded]);

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" /> 
                Fecha y Datos
            </h2>
            <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full md:w-auto px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InputSlider label="Capacidad Batería" value={batteryCap} onChange={setBatteryCap} min={1} max={150} step={1} unit="kWh" />
            <InputSlider label="Potencia Carga" value={power} onChange={setPower} min={1} max={22} step={0.1} unit="kW" />
            
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InputSlider label="% Inicial" value={startPct} onChange={(v) => { setStartPct(v); if(v > endPct) setEndPct(v); }} min={0} max={100} step={1} unit="%" />
                <InputSlider label="% Final" value={endPct} onChange={(v) => { setEndPct(v); if(v < startPct) setStartPct(v); }} min={0} max={100} step={1} unit="%" />
            </div>
        </div>

        {source === 'fallback' && !loading && (
             <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center text-amber-800 text-sm">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>
                    <strong>Modo Offline:</strong> {errorMsg || "No hay datos disponibles para esta fecha o error de conexión."} Se muestran datos estimados.
                </span>
             </div>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-2" />
            <p>Conectando a ESIOS...</p>
        </div>
      ) : (
        <>
            {/* Results Grid */}
            {results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {results.map((opt, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setSelectedOption(opt)}
                            className={`relative cursor-pointer border rounded-xl p-4 transition-all ${
                                selectedOption === opt 
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                                : 'border-slate-200 bg-white hover:border-blue-300'
                            }`}
                        >
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex justify-between">
                                {opt.label}
                                {opt.isNightly && <Moon className="w-3 h-3 text-indigo-400" />}
                            </div>
                            <div className="text-2xl font-bold text-slate-800 mb-1">
                                {opt.totalCost.toFixed(2)}€
                            </div>
                            <div className="text-sm text-slate-600 flex items-center">
                                <span className="font-mono bg-slate-100 px-1 rounded">
                                    {opt.startHour.toString().padStart(2,'0')}:00
                                </span>
                                <span className="mx-1">➔</span>
                                <span className="font-mono bg-slate-100 px-1 rounded">
                                    {(opt.endHour > 23 ? opt.endHour - 24 : opt.endHour).toString().padStart(2,'0')}:00
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center bg-slate-100 rounded-xl text-slate-500">
                    Ajusta los porcentajes de batería para ver recomendaciones.
                </div>
            )}

            {/* Chart */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <h3 className="text-sm font-medium text-slate-600 mb-4">Evolución PVPC (€/kWh) - {selectedDate}</h3>
                 <PriceChart data={prices} highlightOption={selectedOption} />
            </div>

            {/* Details Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <button 
                    onClick={() => setExpandedDetails(!expandedDetails)}
                    className="w-full flex justify-between items-center p-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                    <span>Ver Tabla Detallada</span>
                    {expandedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {expandedDetails && (
                    <div className="max-h-60 overflow-y-auto bg-white p-2">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                <tr><th className="p-2">Hora</th><th className="p-2">Precio</th></tr>
                            </thead>
                            <tbody>
                                {prices.map(p => (
                                    <tr key={p.hour} className="border-b">
                                        <td className="p-2 font-mono">{p.displayHour}</td>
                                        <td className={`p-2 font-bold ${p.price < 0.1 ? 'text-green-600' : p.price > 0.2 ? 'text-red-600' : 'text-slate-700'}`}>
                                            {p.price.toFixed(4)} €
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
      )}
    </div>
  );
};
