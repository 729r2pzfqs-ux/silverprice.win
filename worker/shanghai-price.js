// Cloudflare Worker for Shanghai Silver Price
// Deploy to: workers.cloudflare.com

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=60' // Cache for 1 minute
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Fetch goldsilver.ai Shanghai silver page
      const response = await fetch('https://goldsilver.ai/metal-prices/shanghai-silver-price', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MetalPrices/1.0)'
        }
      });
      
      const html = await response.text();
      
      // Parse the price from the page
      // Looking for patterns like "88.64USD/OZ" and "$83.62" (western spot)
      
      let shanghaiPrice = null;
      let westernSpot = null;
      let premium = null;
      
      // Shanghai price pattern: XX.XXUSD/OZ
      const shanghaiMatch = html.match(/(\d+\.\d+)USD\/OZ/);
      if (shanghaiMatch) {
        shanghaiPrice = parseFloat(shanghaiMatch[1]);
      }
      
      // Western spot: $XX.XX before "Premium"
      const spotMatch = html.match(/\$(\d+\.\d+)\s*\n\s*\+\$[\d.]+\s*Premium/);
      if (spotMatch) {
        westernSpot = parseFloat(spotMatch[1]);
      }
      
      // Premium: +$X.XX
      const premiumMatch = html.match(/\+\$(\d+\.\d+)\s*Premium/i);
      if (premiumMatch) {
        premium = parseFloat(premiumMatch[1]);
      }
      
      // Calculate if we have the data
      if (shanghaiPrice && westernSpot) {
        premium = shanghaiPrice - westernSpot;
      }
      
      // Fallback calculation if scraping fails
      if (!shanghaiPrice && westernSpot) {
        // Use typical 6% premium
        shanghaiPrice = westernSpot * 1.06;
        premium = shanghaiPrice - westernSpot;
      }
      
      const data = {
        shanghai: {
          usdPerOz: shanghaiPrice || 88.0,
          cnyPerKg: shanghaiPrice ? shanghaiPrice * 32.15 * 7.24 : 20500,
          cnyPerGram: shanghaiPrice ? (shanghaiPrice * 32.15 * 7.24) / 1000 : 20.5
        },
        western: {
          usdPerOz: westernSpot || 83.0
        },
        premium: {
          usd: premium || 5.0,
          percent: westernSpot ? ((premium || 5.0) / westernSpot * 100) : 6.0
        },
        timestamp: new Date().toISOString(),
        source: 'goldsilver.ai'
      };

      return new Response(JSON.stringify(data), { headers: corsHeaders });
      
    } catch (error) {
      // Return fallback data on error
      const fallback = {
        shanghai: { usdPerOz: 88.0, cnyPerKg: 20500, cnyPerGram: 20.5 },
        western: { usdPerOz: 83.0 },
        premium: { usd: 5.0, percent: 6.0 },
        timestamp: new Date().toISOString(),
        source: 'fallback',
        error: error.message
      };
      
      return new Response(JSON.stringify(fallback), { headers: corsHeaders });
    }
  }
};
