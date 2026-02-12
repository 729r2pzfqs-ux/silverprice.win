// Cloudflare Worker for Shanghai Silver + India MCX Prices
// Deploy to: workers.cloudflare.com
// Requires KV namespace "CACHE" bound to the worker

const CACHE_KEY = 'metal_prices';
const CACHE_TTL = 300; // 5 minutes

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=60'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Check KV cache first (if KV is bound)
    if (env.CACHE) {
      try {
        const cached = await env.CACHE.get(CACHE_KEY);
        if (cached) {
          const data = JSON.parse(cached);
          data.cached = true;
          return new Response(JSON.stringify(data), { headers: corsHeaders });
        }
      } catch (e) {
        // KV read failed, continue to fetch fresh
      }
    }

    try {
      // Fetch Shanghai silver from goldsilver.ai
      const shanghaiResponse = await fetch('https://goldsilver.ai/metal-prices/shanghai-silver-price', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MetalPrices/1.0)' }
      });
      const shanghaiHtml = await shanghaiResponse.text();
      
      // Fetch forex rates for INR, MYR, AUD, EUR
      let forex = { INR: 90.74, MYR: 3.92, AUD: 1.40, EUR: 0.842, CNY: 6.92 };
      try {
        const forexResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MetalPrices/1.0)' }
        });
        const forexData = await forexResponse.json();
        if (forexData.rates) {
          forex.INR = forexData.rates.INR || 90.74;
          forex.MYR = forexData.rates.MYR || 3.92;
          forex.AUD = forexData.rates.AUD || 1.40;
          forex.EUR = forexData.rates.EUR || 0.842;
          forex.CNY = forexData.rates.CNY || 6.92;
        }
      } catch (e) {
        // Keep defaults
      }
      
      // Fetch copper from Kitco
      let copperPrice = 4.50; // fallback
      try {
        const copperResponse = await fetch('https://www.kitco.com/price/base-metals/copper', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const copperHtml = await copperResponse.text();
        const copperMatch = copperHtml.match(/"bid":([\d.]+)/);
        if (copperMatch) {
          copperPrice = parseFloat(copperMatch[1]);
        }
      } catch (e) {
        // Keep fallback
      }
      
      const html = shanghaiHtml;
      
      let shanghaiPrice = null;
      let westernSpot = null;
      let premium = null;
      
      // Shanghai price: "font-bold">88.64</span>...USD/OZ
      const shanghaiMatch = html.match(/font-bold[^>]*>(\d+\.\d+)<\/span>[\s\S]*?USD\/OZ/);
      if (shanghaiMatch) {
        shanghaiPrice = parseFloat(shanghaiMatch[1]);
      }
      
      // Western spot: $<!-- -->83.62 (color:#c0c0c0 is silver color)
      const spotMatch = html.match(/color:#c0c0c0[^>]*>\$(?:<!--\s*-->)?(\d+\.\d+)/);
      if (spotMatch) {
        westernSpot = parseFloat(spotMatch[1]);
      }
      
      // Premium: +<!-- -->$<!-- -->5.02
      const premiumMatch = html.match(/\+(?:<!--\s*-->)?\$(?:<!--\s*-->)?(\d+\.\d+)/);
      if (premiumMatch) {
        premium = parseFloat(premiumMatch[1]);
      }
      
      // Calculate if we have the data
      if (shanghaiPrice && westernSpot) {
        premium = shanghaiPrice - westernSpot;
      }
      
      // Fallback calculation if scraping fails
      if (!shanghaiPrice && westernSpot) {
        shanghaiPrice = westernSpot * 1.06;
        premium = shanghaiPrice - westernSpot;
      }
      
      // Calculate India MCX Silver price
      // MCX trades in ₹/kg
      // Formula: Spot USD/oz × 32.15 oz/kg × USD/INR × 1.105 (7.5% import duty + 3% GST)
      const INDIA_DUTY_MULTIPLIER = 1.105;  // 7.5% duty + 3% GST = 10.5%
      const OZ_PER_KG = 32.1507;
      
      const mcxPricePerKg = westernSpot 
        ? westernSpot * OZ_PER_KG * forex.INR * INDIA_DUTY_MULTIPLIER 
        : 95000; // fallback ~₹95,000/kg
      
      const mcxPricePerGram = mcxPricePerKg / 1000;
      const mcxPricePerOz = mcxPricePerKg / OZ_PER_KG;
      
      // MCX premium over international spot (in USD terms)
      const mcxSpotEquivalent = mcxPricePerOz / forex.INR;
      const mcxPremium = westernSpot ? mcxSpotEquivalent - westernSpot : 0;
      const mcxPremiumPercent = westernSpot ? (mcxPremium / westernSpot * 100) : 18;
      
      // Copper: price is per pound, convert to per troy oz
      const copperPerOz = copperPrice / 14.583;
      
      const data = {
        shanghai: {
          usdPerOz: shanghaiPrice || 88.0,
          cnyPerKg: shanghaiPrice ? shanghaiPrice * OZ_PER_KG * forex.CNY : 20500,
          cnyPerGram: shanghaiPrice ? (shanghaiPrice * OZ_PER_KG * forex.CNY) / 1000 : 20.5
        },
        western: {
          usdPerOz: westernSpot || 83.0
        },
        premium: {
          usd: premium || 5.0,
          percent: westernSpot ? ((premium || 5.0) / westernSpot * 100) : 6.0
        },
        india: {
          inrPerKg: Math.round(mcxPricePerKg),
          inrPerGram: mcxPricePerGram.toFixed(2),
          usdPerOz: mcxSpotEquivalent.toFixed(2),
          premiumUsd: mcxPremium.toFixed(2),
          premiumPercent: mcxPremiumPercent.toFixed(1)
        },
        forex: {
          usdInr: forex.INR,
          usdCny: forex.CNY,
          usdMyr: forex.MYR,
          usdAud: forex.AUD,
          usdEur: forex.EUR
        },
        copper: {
          perLb: copperPrice,
          perOz: copperPerOz
        },
        timestamp: new Date().toISOString(),
        source: 'goldsilver.ai + exchangerate-api'
      };

      // Store in KV cache (if KV is bound)
      if (env.CACHE) {
        try {
          await env.CACHE.put(CACHE_KEY, JSON.stringify(data), { expirationTtl: CACHE_TTL });
        } catch (e) {
          // KV write failed, continue anyway
        }
      }

      return new Response(JSON.stringify(data), { headers: corsHeaders });
      
    } catch (error) {
      // Return fallback data on error
      const fallback = {
        shanghai: { usdPerOz: 88.0, cnyPerKg: 20500, cnyPerGram: 20.5 },
        western: { usdPerOz: 83.0 },
        premium: { usd: 5.0, percent: 6.0 },
        india: { inrPerKg: 270000, inrPerGram: "270.00", usdPerOz: "92.50", premiumUsd: "9.50", premiumPercent: "10.5" },
        forex: { usdInr: 90.74, usdCny: 6.92, usdMyr: 3.92, usdAud: 1.40, usdEur: 0.842 },
        copper: { perLb: 4.50, perOz: 0.31 },
        timestamp: new Date().toISOString(),
        source: 'fallback',
        error: error.message
      };
      
      return new Response(JSON.stringify(fallback), { headers: corsHeaders });
    }
  }
};
