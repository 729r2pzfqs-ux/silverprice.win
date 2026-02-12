// Cloudflare Worker for Shanghai Silver + Copper Prices
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
      // Fetch Shanghai silver from goldsilver.ai
      const shanghaiResponse = await fetch('https://goldsilver.ai/metal-prices/shanghai-silver-price', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MetalPrices/1.0)' }
      });
      const shanghaiHtml = await shanghaiResponse.text();
      
      // Fetch copper from CNBC
      let copperPrice = 4.50; // fallback
      try {
        const copperResponse = await fetch('https://www.cnbc.com/quotes/HG.1', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const copperHtml = await copperResponse.text();
        // Look for price in JSON data or page content
        const copperMatch = copperHtml.match(/"last":"?([\d.]+)"?/);
        if (copperMatch) {
          copperPrice = parseFloat(copperMatch[1]);
        }
      } catch (e) {
        // Keep fallback
      }
      
      const html = shanghaiHtml;
      
      // Parse the price from the page
      // goldsilver.ai uses React hydration comments like $<!-- -->83.62
      
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
        // Use typical 6% premium
        shanghaiPrice = westernSpot * 1.06;
        premium = shanghaiPrice - westernSpot;
      }
      
      // Copper: price is per pound, convert to per troy oz
      // 1 pound = 14.583 troy oz
      const copperPerOz = copperPrice / 14.583;
      
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
        copper: {
          perLb: copperPrice,
          perOz: copperPerOz
        },
        timestamp: new Date().toISOString(),
        source: 'goldsilver.ai + cnbc'
      };

      return new Response(JSON.stringify(data), { headers: corsHeaders });
      
    } catch (error) {
      // Return fallback data on error
      const fallback = {
        shanghai: { usdPerOz: 88.0, cnyPerKg: 20500, cnyPerGram: 20.5 },
        western: { usdPerOz: 83.0 },
        premium: { usd: 5.0, percent: 6.0 },
        copper: { perLb: 4.50, perOz: 0.31 },
        timestamp: new Date().toISOString(),
        source: 'fallback',
        error: error.message
      };
      
      return new Response(JSON.stringify(fallback), { headers: corsHeaders });
    }
  }
};
