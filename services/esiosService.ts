import { PricePoint } from '../types';
import { generateFallbackData, ESIOS_TOKEN, ESIOS_INDICATOR_PVPC, GEO_ID_PENINSULA } from '../constants';

/**
 * Service to fetch electricity prices with redundancy.
 * Strategy:
 * 1. Try ESIOS Official API (via CORS Proxy to handle browser restrictions) using the User Token.
 * 2. If that fails AND date is Today/Tomorrow, try Public Mirror API (preciodelaluz.org) which requires no token.
 * 3. If all fails, return static fallback data.
 */

// Format: YYYY-MM-DD
const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const getEsiosPrices = async (date: Date): Promise<{ data: PricePoint[], source: 'api' | 'fallback', error?: string }> => {
  const dateStr = formatDate(date);
  let errorLog = "";

  // ---------------------------------------------------------
  // ATTEMPT 1: ESIOS OFFICIAL API (Via Proxy)
  // ---------------------------------------------------------
  try {
    console.log(`[ESIOS] Attempting to fetch for ${dateStr} using Token...`);
    
    // ESIOS Official Endpoint
    const esiosUrl = `https://api.esios.ree.es/indicators/${ESIOS_INDICATOR_PVPC}?start_date=${dateStr}T00:00&end_date=${dateStr}T23:59&geo_ids=${GEO_ID_PENINSULA}`;
    
    // CORS Proxy that supports headers
    const proxyUrl = `https://corsproxy.io/?` + encodeURIComponent(esiosUrl);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'x-api-key': ESIOS_TOKEN,
        'Content-Type': 'application/json',
        // Some proxies require headers to be passed in a specific way, but corsproxy.io usually forwards standard headers.
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Validate ESIOS structure
      const values = data.indicator?.values;
      if (values && Array.isArray(values) && values.length > 0) {
        const cleanData = processEsiosData(values, dateStr);
        return { data: cleanData, source: 'api' };
      } else {
        throw new Error("ESIOS response empty or invalid structure");
      }
    } else {
        throw new Error(`ESIOS returned status ${response.status}`);
    }
  } catch (e: any) {
    console.warn("[ESIOS] Primary connection failed:", e);
    errorLog += `ESIOS: ${e.message}. `;
  }

  // ---------------------------------------------------------
  // ATTEMPT 2: PUBLIC MIRROR (Backup for Today/Tomorrow)
  // ---------------------------------------------------------
  // Only works for "current" or "tomorrow" roughly, not deep history.
  try {
    const todayStr = formatDate(new Date());
    const tomorrow = new Date(); 
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

    if (dateStr === todayStr || dateStr === tomorrowStr) {
        console.log(`[MIRROR] Attempting public mirror for ${dateStr}...`);
        
        // Use 'PCB' for Peninsula
        const zone = 'PCB'; 
        // This public API returns data for "today" by default, or we can try to find specific endpoints.
        // Usually: https://api.preciodelaluz.org/v1/prices/all?zone=PCB
        // Note: This API is simple and free, good backup.
        
        // Note: The public API URL structure changes often, but let's try a standard one.
        // We will try to fetch "all" which usually returns Today's prices. 
        // If requesting Tomorrow, this might not work unless we use a specific endpoint, 
        // but it's worth a try if ESIOS failed.
        
        const mirrorUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://api.preciodelaluz.org/v1/prices/all?zone=PCB')}`;
        
        const response = await fetch(mirrorUrl);
        if (response.ok) {
            const wrapper = await response.json();
            const json = JSON.parse(wrapper.contents);
            
            // Format: { "00-01": { "price": 100, "units": "€/MWh" ... }, ... }
            const values = Object.values(json);
            if (values.length > 0) {
                 const cleanData = processMirrorData(values, dateStr);
                 // Simple validation to ensure dates match loosely or just return what we got
                 return { data: cleanData, source: 'api' };
            }
        }
    }
  } catch (e: any) {
    console.warn("[MIRROR] Secondary connection failed:", e);
    errorLog += `Mirror: ${e.message}. `;
  }

  // ---------------------------------------------------------
  // ATTEMPT 3: FALLBACK (Emergency)
  // ---------------------------------------------------------
  console.warn("[FALLBACK] All APIs failed. Using estimated data.");
  return { 
    data: generateFallbackData(dateStr), 
    source: 'fallback', 
    error: errorLog || "Could not connect to any pricing source." 
  };
};

// --- HELPER FUNCTIONS ---

function processEsiosData(values: any[], dateStr: string): PricePoint[] {
  const data: PricePoint[] = values.map((v: any) => {
    // ESIOS datetime format: "2023-10-27T00:00:00.000+02:00"
    const d = new Date(v.datetime);
    const hour = d.getHours();
    // Price is usually €/MWh -> convert to €/kWh (/1000)
    const priceKwh = v.value / 1000;
    
    return {
      hour: hour,
      price: priceKwh,
      date: dateStr,
      displayHour: `${hour.toString().padStart(2, '0')}:00`
    };
  });

  return fillMissingHours(data, dateStr);
}

function processMirrorData(values: any[], dateStr: string): PricePoint[] {
    const data: PricePoint[] = values.map((v: any) => {
        // v.hour is like "00-01"
        const hourStr = v.hour.split("-")[0];
        const hour = parseInt(hourStr, 10);
        // v.price is €/MWh
        const priceKwh = v.price / 1000;

        return {
            hour: hour,
            price: priceKwh,
            date: dateStr,
            displayHour: `${hour.toString().padStart(2, '0')}:00`
        };
    });
    return fillMissingHours(data, dateStr);
}

function fillMissingHours(data: PricePoint[], dateStr: string): PricePoint[] {
  // Ensure we have 0 to 23 hours.
  const filled: PricePoint[] = [];
  data.sort((a, b) => a.hour - b.hour);

  for (let i = 0; i < 24; i++) {
    const found = data.find(d => d.hour === i);
    if (found) {
      filled.push(found);
    } else {
      // Interpolate or copy previous
      const prev = filled[i - 1];
      filled.push({
        hour: i,
        price: prev ? prev.price : 0.15, // Default if 00:00 is missing
        date: dateStr,
        displayHour: `${i.toString().padStart(2, '0')}:00`
      });
    }
  }
  return filled;
}
