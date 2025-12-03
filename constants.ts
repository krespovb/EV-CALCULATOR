import { PricePoint } from './types';

// ESIOS Configuration
export const ESIOS_TOKEN = "f20fbca9eceb89b804f77febfcae302c8d3dce2f2f7235e2d3f78ee13fd462b2";
export const ESIOS_INDICATOR_PVPC = "1001"; // PVPC 2.0TD
export const GEO_ID_PENINSULA = "8741"; // Peninsula
export const API_ENDPOINT = "https://api.example.com/prices"; // Placeholder for generic API

// Fallback data if API fails completely
export const FALLBACK_PRICES: number[] = [
  0.08, 0.07, 0.06, 0.05, 0.05, 0.06, 0.08, 0.12, // 00-07
  0.15, 0.18, 0.22, 0.20, 0.18, 0.15, 0.12, 0.11, // 08-15
  0.12, 0.15, 0.20, 0.24, 0.25, 0.22, 0.15, 0.10  // 16-23
];

export const generateFallbackData = (dateStr: string): PricePoint[] => {
  return FALLBACK_PRICES.map((price, hour) => ({
    hour,
    price,
    date: dateStr,
    displayHour: `${hour.toString().padStart(2, '0')}:00`
  }));
};

// EV Defaults (Requested by user)
export const DEFAULT_BATTERY_CAPACITY = 10; // kWh
export const DEFAULT_CHARGING_POWER = 3.7; // kW
export const DEFAULT_PRICE = 0.10; // €/kWh