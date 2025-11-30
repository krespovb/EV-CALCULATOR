import React, { useState, useEffect, useCallback } from 'react';
import { getElectricityPrices } from '../services/electricityService';
import { PricePoint, ChargingOption } from '../types';
import { PriceChart } from './PriceChart';
import { InputSlider } from './ui/InputSlider';
import { RefreshCw, BatteryCharging, Moon, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { DEFAULT_BATTERY_CAPACITY, DEFAULT_CHARGING_POWER, ESIOS_SEARCH_URL } from '../constants';

export const SmartTab: React.FC = () => {
  const [isTomorrow, setIsTomorrow] = useState(false);
  
  // New inputs based on requirements
  const [batteryCap, setBatteryCap] = useState(DEFAULT_BATTERY_CAPACITY);
  const [power, setPower] = useState(DEFAULT_CHARGING_POWER);
  const [startPct, setStartPct] = useState(0);
  const [endPct, setEndPct] = useState(100);
  
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [results, setResults] = useState<ChargingOption[]>([]);
  const [hoursNeeded, setHoursNeeded] = useState(0);
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ChargingOption | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Add artificial delay to show loading state for better UX
    await new Promise(r => setTimeout(r, 600)); 
    const { data, usingFallback: isFallback } = await getElectricityPrices(isTomorrow);
    setPrices(data);
    setUsingFallback(isFallback);
    setLoading(false);
    setSelectedOption(null); // Reset selection
  }, [isTomorrow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optimization Algorithm
  useEffect(() => {
    if (prices.length === 0) return;

    // Logic to prevent endPct < startPct
    const validEndPct = Math.max(startPct, endPct);
    
    // Calculate Energy Needed based on battery capacity and percentage diff
    const kwhNeeded = batteryCap * ((validEndPct - startPct) / 100);
    const hours = power > 0 ? kwhNeeded / power : 0;
    const slotsNeeded = Math.ceil(hours);
    
    setHoursNeeded(hours);

    if (kwhNeeded <= 0) {
        setResults([]);
        return;
    }

    if (slotsNeeded > 24) {
      setResults([]); // Too long to charge in one day
      return;
    }

    const calculatedOptions: ChargingOption[] = [];

    // Helper to calc cost for a start hour
    const calcCost = (startIdx: number) => {
      let sum = 0;
      for (let i = 0; i < slotsNeeded; i++) {
        const idx = startIdx + i;
        if (idx < prices.length) {
          sum += prices[idx].price;
        } else {
           // Penalty for running out of day data
           sum += 999; 
        }
      }
      return sum / slotsNeeded; // avg price
    };

    // 1. Find purely cheapest contiguous block
    let bestStart = 0;
    let minAvg = 999;
    
    for (let i = 0; i <= prices.length - slotsNeeded; i++) {
        const avg = calcCost(i);
        if (avg < minAvg) {
            minAvg = avg;
            bestStart = i;
        }
    }
    
    calculatedOptions.push({
        startHour: bestStart,
        endHour: bestStart + slotsNeeded,
        avgPrice: minAvg,
        totalCost: minAvg * kwhNeeded,
        label: "Opción Más Económica"
    });

    // 2. Find Night option (Fixed Rule: Priority 00:00 - 07:00)
    let bestNightStart = 0;
    let minNightAvg = 999;
    const nightLimit = 5; // Start no later than 5am to finish morning
    
    for (let i = 0; i <= Math.min(nightLimit, prices.length - slotsNeeded); i++) {
        const avg = calcCost(i);
        if (avg < minNightAvg) {
            minNightAvg = avg;
            bestNightStart = i;
        }
    }

    // Only add if it's distinct from the first option
    if (bestNightStart !== bestStart) {
        calculatedOptions.push({
            startHour: bestNightStart,
            endHour: bestNightStart + slotsNeeded,
            avgPrice: minNightAvg,
            totalCost: minNightAvg * kwhNeeded,
            label: "Carga Nocturna (Valle)",
            isNightly: true
        });
    }

    // 3. Find a third option (Alternative)
    let bestAltStart = -1;
    let minAltAvg = 999;
    
    for (let i = 0; i <= prices.length - slotsNeeded; i++) {
        // Avoid starting exactly same as previous
        if (Math.abs(i - bestStart) < 2) continue; 
        if (bestNightStart !== bestStart && Math.abs(i - bestNightStart) < 2) continue;

        const avg = calcCost(i);
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
            label: "Opción Alternativa"
        });
    }

    // Sort by cost
    calculatedOptions.sort((a, b) => a.totalCost - b.totalCost);

    setResults(calculatedOptions);
    // Select the best one by default
    if (calculatedOptions.length > 0 && !selectedOption) {
        setSelectedOption(calculatedOptions[0]);
    }

  }, [prices, batteryCap, power, startPct, endPct, hoursNeeded]);

  const openExternalSearch = () => {
      window.open(ESIOS_SEARCH_URL, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <BatteryCharging className="w-5 h-5 mr-2 text-green-600" /> 
                Configuración Carga Inteligente
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setIsTomorrow(false)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${!isTomorrow ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Hoy
                </button>
                <button 
                    onClick={() => setIsTomorrow(true)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${isTomorrow ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Mañana
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InputSlider label="Capacidad Batería" value={batteryCap} onChange={setBatteryCap} min={1} max={150} step={1} unit="kWh" />
            <InputSlider label="Potencia de Carga" value={power} onChange={setPower} min={1} max={22} step={0.1} unit="kW" />
            
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <InputSlider label="Carga Inicial" value={startPct} onChange={(v) => { setStartPct(v); if(v > endPct) setEndPct(v); }} min={0} max={100} step={1} unit="%" />
                <InputSlider label="Carga Final (Objetivo)" value={endPct} onChange={(v) => { setEndPct(v); if(v < startPct) setStartPct(v); }} min={0} max={100} step={1} unit="%" />
            </div>
        </div>

        {usingFallback && !loading && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 mr-2 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-800 mb-1">
                            Modo Sin Conexión
                        </p>
                        <p className="text-sm text-amber-700">
                            No se pudo descargar los datos en vivo. Se están usando precios estimados estándar.
                        </p>
                        <button 
                            onClick={openExternalSearch}
                            className="mt-2 text-sm text-blue-700 hover:text-blue-900 font-medium underline flex items-center"
                        >
                            Ver precios oficiales en internet <ExternalLink className="w-3 h-3 ml-1" />
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-2" />
            <p>Conectando con mercado eléctrico...</p>
        </div>
      ) : (
        <>
        {/* Results Cards */}
        {results.length > 0 ? (
            <div className="space-y-4">
                <h3 className="text-md font-medium text-slate-700">Mejores horarios sugeridos:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {results.map((opt, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setSelectedOption(opt)}
                            className={`cursor-pointer border rounded-xl p-4 transition-all relative overflow-hidden ${
                                selectedOption === opt 
                                ? 'border-green-500 bg-green-50 shadow-md ring-1 ring-green-500' 
                                : 'border-slate-200 bg-white hover:border-green-300'
                            }`}
                        >
                            {opt.isNightly && <Moon className="absolute top-2 right-2 w-4 h-4 text-indigo-400" />}
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                                {opt.label}
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-2xl font-bold text-slate-800">
                                        {opt.startHour}:00 <span className="text-sm font-normal text-slate-400">a</span> {opt.endHour > 23 ? opt.endHour - 24 : opt.endHour}:00
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1">
                                        {hoursNeeded.toFixed(1)}h de carga
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-green-700">
                                        {opt.totalCost.toFixed(2)}€
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {(opt.avgPrice).toFixed(3)} €/kWh
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
             <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center text-blue-800">
                La batería ya está cargada al nivel deseado o los parámetros no requieren carga.
            </div>
        )}

        {/* Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-medium text-slate-600 mb-2">Curva de Precios {isTomorrow ? 'Mañana' : 'Hoy'}</h3>
            <PriceChart data={prices} highlightOption={selectedOption} />
        </div>

        {/* Technical Details Expander */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <button 
                onClick={() => setExpandedDetails(!expandedDetails)}
                className="w-full flex justify-between items-center p-4 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
                <span>Ver tabla de datos detallada</span>
                {expandedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {expandedDetails && (
                <div className="p-4 bg-white overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th className="px-4 py-2">Hora</th>
                                <th className="px-4 py-2">Precio (€/kWh)</th>
                                <th className="px-4 py-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prices.map((p) => (
                                <tr key={p.hour} className="border-b hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium">{p.displayHour}</td>
                                    <td className="px-4 py-2">
                                        <span className={`${p.price < 0.10 ? 'text-green-600 font-bold' : p.price > 0.20 ? 'text-red-500' : ''}`}>
                                            {p.price.toFixed(4)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        {p.price < 0.10 ? 'Valle (Barato)' : p.price > 0.20 ? 'Punta (Caro)' : 'Llano'}
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
