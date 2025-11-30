import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import { PricePoint, ChargingOption } from '../types';

interface PriceChartProps {
  data: PricePoint[];
  highlightOption?: ChargingOption | null;
}

export const PriceChart: React.FC<PriceChartProps> = ({ data, highlightOption }) => {
  // Calculate min/max for Y-axis domain padding
  const minPrice = Math.min(...data.map(d => d.price));
  const maxPrice = Math.max(...data.map(d => d.price));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-md text-sm">
          <p className="font-bold text-slate-700">{label}</p>
          <p className="text-blue-600">
            {`${payload[0].value.toFixed(3)} €/kWh`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="displayHour" 
            tick={{ fontSize: 10, fill: '#64748b' }} 
            interval={3}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#64748b' }} 
            domain={[minPrice * 0.8, maxPrice * 1.1]}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Highlight Selected Charging Window */}
          {highlightOption && (
            <ReferenceArea
              x1={data[highlightOption.startHour]?.displayHour}
              x2={data[Math.min(highlightOption.endHour, 23)]?.displayHour}
              fill="#22c55e"
              fillOpacity={0.2}
              strokeOpacity={0}
            />
          )}

          <Area
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPrice)"
            animationDuration={1000}
          />
          
          {/* Reference line for average */}
           <ReferenceLine y={data.reduce((a, b) => a + b.price, 0) / data.length} stroke="orange" strokeDasharray="3 3" />

        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
