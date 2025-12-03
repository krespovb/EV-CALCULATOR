import { PricePoint } from '../types';
import { generateFallbackData, ESIOS_TOKEN, ESIOS_INDICATOR_PVPC, GEO_ID_PENINSULA } from '../constants';

/**
 * Fetches prices from ESIOS API.
 * Uses 'allorigins' proxy to bypass CORS restrictions in the browser.
 */
export const getEsiosPrices = async (date: Date): Promise<{ data: PricePoint[], source: 'api' | 'fallback', error?: string }> => {
  const dateStr = date.toISOString().split('T')[0];
  
  // ESIOS URL structure
  // https://api.esios.ree.es/indicators/1001?start_date=2023-10-27T00:00&end_date=2023-10-27T23:59&geo_ids=8741
  const esiosUrl = `https://api.esios.ree.es/indicators/${ESIOS_INDICATOR_PVPC}?start_date=${dateStr}T00:00&end_date=${dateStr}T23:59&geo_ids=${GEO_ID_PENINSULA}`;
  
  // Proxy URL to bypass CORS
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(esiosUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    const proxyData = await response.json();
    
    if (!proxyData.contents) {
        throw new Error("Proxy returned empty contents");
    }

    const esiosData = JSON.parse(proxyData.contents);

    if (esiosData.errors) {
        throw new Error("ESIOS API returned an error (likely date not available yet)");
    }

    // Parse ESIOS standard JSON format
    const values = esiosData.indicator?.values;

    if (!values || values.length === 0) {
        throw new Error("No data available for this date yet.");
    }

    // Map ESIOS values to our PricePoint format
    // ESIOS returns value in €/MWh usually. We need €/kWh (divide by 1000)
    // Sometimes they return €/kWh directly, but standard PVPC is €/MWh. 
    // Let's assume MWh based on indicator 1001 standard.
    const cleanData: PricePoint[] = values.map((v: any) => {
        const datetime = new Date(v.datetime);
        // Adjust for timezone offset if necessary, but usually standardizing to 0-23 index is safer
        // ESIOS returns ISO strings with offset.
        // We will trust the API order or extract hour from string.
        const hour = datetime.getHours(); 
        
        return {
            hour: hour,
            price: v.value / 1000, // Convert MWh to kWh
            date: dateStr,
            displayHour: `${hour.toString().padStart(2, '0')}:00`
        };
    }).sort((a: PricePoint, b: PricePoint) => a.hour - b.hour);

    // Fill missing hours if any (sometimes clocks change)
    // This is a simple visualizer, we map to 0-23 slots
    const filledData: PricePoint[] = [];
    for(let i=0; i<24; i++) {
        const found = cleanData.find(d => d.hour === i);
        if(found) {
            filledData.push(found);
        } else {
            // If missing (e.g. clock change), interpolate or use prev
            filledData.push({
                hour: i,
                price: filledData[i-1]?.price || 0.15,
                date: dateStr,
                displayHour: `${i.toString().padStart(2, '0')}:00`
            });
        }
    }

    return { data: filledData, source: 'api' };

  } catch (error: any) {
    console.warn("ESIOS Fetch failed:", error);
    
    // Attempt fallback to a public mirror if the token/proxy failed, 
    // or just return standard fallback if it's a date issue.
    // For this specific request, we return fallback logic immediately to keep app stable.
    return { 
      data: generateFallbackData(dateStr), 
      source: 'fallback',
      error: error.message 
    };
  }
};
