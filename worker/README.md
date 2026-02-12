# Shanghai Silver Price Worker

Cloudflare Worker that scrapes real Shanghai Silver prices from goldsilver.ai.

## Deploy to Cloudflare

1. Go to https://workers.cloudflare.com
2. Create account or login
3. Create new Worker
4. Paste `shanghai-price.js` content
5. Deploy
6. Get your worker URL (e.g., `https://shanghai-price.YOUR-SUBDOMAIN.workers.dev`)

## Update metal-prices site

Add this to `app.js`:

```javascript
async function fetchShanghaiFromWorker() {
    try {
        const response = await fetch('https://YOUR-WORKER.workers.dev');
        const data = await response.json();
        
        prices.shanghai = {
            usdPerOz: data.shanghai.usdPerOz,
            cnyPerKg: data.shanghai.cnyPerKg,
            premium: data.premium.percent
        };
    } catch (e) {
        // Fallback to calculated
        fetchShanghaiSilver();
    }
}
```

## Response Format

```json
{
  "shanghai": {
    "usdPerOz": 88.64,
    "cnyPerKg": 20650,
    "cnyPerGram": 20.65
  },
  "western": {
    "usdPerOz": 83.62
  },
  "premium": {
    "usd": 5.02,
    "percent": 6.0
  },
  "timestamp": "2026-02-12T14:20:00.000Z",
  "source": "goldsilver.ai"
}
```
