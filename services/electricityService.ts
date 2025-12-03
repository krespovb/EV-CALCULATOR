import { PricePoint } from '../types';
import { generateFallbackData, API_ENDPOINT } from '../constants';

interface ApiPrice {
  date: string;
  hour: string; // "00-01"
  price: number; // MWh price usually, or kWh
  units: string;
}

/**
 * Fetches prices. Note: Public APIs often have CORS issues when called from browser directly.
 * We implement a robust fallback mechanism.
 */
export const getElectricityPrices = async (isTomorrow: boolean = false): Promise<{ data: PricePoint[], usingFallback: boolean }> => {
  // Simulating an API call structure. 
  // In a real browser-only environment without a proxy, external APIs often fail CORS.
  // We will attempt a fetch, but likely default to fallback for stability in this demo environment.
  
  const d = new Date();
  if (isTomorrow) {
    d.setDate(d.getDate() + 1);
  }
  const dateStr = d.toISOString().split('T')[0];

  try {
    // Note: This specific API endpoint often blocks cross-origin. 
    // We add a short timeout to fail fast and show the "Offline Mode" logic which is a requirement.
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);

    // Normally we would append ?date=tomorrow if API supports it, but simple public APIs usually just give "current"
    // For the sake of this demo, we will force fallback if 'tomorrow' is requested as free APIs rarely give tomorrow data easily without auth.
    if (isTomorrow) {
        throw new Error("Tomorrow data not available in public free tier without auth");
    }

    const response = await fetch(API_ENDPOINT, { 
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(id);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const json = await response.json();
    
    // Parse logic for the specific API format (Object of objects usually)
    // Assuming format: { "00-01": { price: 150.20, units: "€/MWh" ... }, ... }
    const data: PricePoint[] = Object.values(json).map((item: any) => {
        const hourStr = item.hour.split("-")[0];
        const hour = parseInt(hourStr, 10);
        // API usually returns €/MWh, convert to €/kWh
        const priceKwh = item.price / 1000; 
        
        return {
            hour,
            price: priceKwh,
            date: dateStr,
            displayHour: `${hour.toString().padStart(2, '0')}:00`
        };
    }).sort((a, b) => a.hour - b.hour);

    return { data, usingFallback: false };

  } catch (error) {
    console.warn("API unavailable or CORS blocked. Using robust fallback data.", error);
    return { 
      data: generateFallbackData(dateStr), 
      usingFallback: true 
    };
  }
};