export interface PricePoint {
  hour: number; // 0 to 23
  price: number; // €/kWh
  date: string; // YYYY-MM-DD
  displayHour: string; // "00:00"
}

export interface ChargingOption {
  startHour: number;
  endHour: number; // exclusive
  avgPrice: number;
  totalCost: number;
  label: string;
  isNightly?: boolean; // If it falls strictly within 00-07
}

export interface OptimizationResult {
  options: ChargingOption[];
  hoursNeeded: number;
}
