import React from 'react';

interface InputSliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export const InputSlider: React.FC<InputSliderProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(val);
            }}
            className="w-20 text-right p-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            min={min}
            max={max}
            step={step}
          />
          <span className="ml-1 text-xs text-slate-500 w-8">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );
};
