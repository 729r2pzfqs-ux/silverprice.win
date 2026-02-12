// Metal Prices App - Single Metal View
const TROY_OZ_TO_GRAM = 31.1035;
const TROY_OZ_TO_KG = 0.0311035;
const METALPRICE_API_KEY = '0ae37d0957a3c6802e2ec39d9c1a939c';

let prices = {
    gold: { price: 0, change: 0, high: 0, low: 0 },
    silver: { price: 0, change: 0, high: 0, low: 0 },
    platinum: { price: 0, change: 0, high: 0, low: 0 },
    palladium: { price: 0, change: 0, high: 0, low: 0 },
    shanghai: { cnyPerKg: 0, usdPerOz: 0, premium: 0 }
};

let currentCurrency = 'USD';
let currencyRates = { USD: 1, EUR: 0.92, GBP: 0.79 };
let selectedMetal = 'gold';
let tvWidget = null;

const metalConfig = {
    gold: { name: 'Gold', code: 'XAU/USD', tvSymbol: 'TVC:GOLD', color: '#FFD700', borderColor: 'border-yellow-500/50', bgColor: 'bg-yellow-500/20' },
    silver: { name: 'Silver', code: 'XAG/USD', tvSymbol: 'TVC:SILVER', color: '#C0C0C0', borderColor: 'border-slate-400/50', bgColor: 'bg-slate-400/20' },
    platinum: { name: 'Platinum', code: 'XPT/USD', tvSymbol: 'TVC:PLATINUM', color: '#60A5FA', borderColor: 'border-blue-400/50', bgColor: 'bg-blue-400/20' },
    palladium: { name: 'Palladium', code: 'XPD/USD', tvSymbol: 'TVC:PALLADIUM', color: '#E2E8F0', borderColor: 'border-slate-300/50', bgColor: 'bg-slate-300/20' }
};

// Fetch prices from goldprice.org
async function fetchPrices() {
    try {
        const response = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
        const data = await response.json();
        
        if (data && data.items && data.items[0]) {
            const item = data.items[0];
            prices.gold = {
                price: item.xauPrice,
                change: item.chgXau,
                high: item.xauPrice + Math.abs(item.chgXau) * 0.5,
                low: item.xauPrice - Math.abs(item.chgXau) * 0.5
            };
            prices.silver = {
                price: item.xagPrice,
                change: item.chgXag,
                high: item.xagPrice + Math.abs(item.chgXag) * 0.3,
                low: item.xagPrice - Math.abs(item.chgXag) * 0.3
            };
        }
        
        await fetchOtherMetals();
        fetchShanghaiSilver();
        updateUI();
        if (chart) updateChart();
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error:', error);
        await fetchFallbackPrices();
        updateUI();
        if (chart) updateChart();
    }
}

async function fetchOtherMetals() {
    // Fetch Platinum from Kitco
    try {
        const ptResponse = await fetch('https://proxy.kitco.com/getPM?symbol=PT&currency=USD');
        const ptData = await ptResponse.text();
        const ptParts = ptData.split(',');
        if (ptParts.length >= 8) {
            prices.platinum = {
                price: parseFloat(ptParts[4]) || 2100,
                change: parseFloat(ptParts[7]) || 0,
                high: parseFloat(ptParts[6]) || 2100,
                low: parseFloat(ptParts[5]) || 2100
            };
        }
    } catch (e) {
        prices.platinum = { price: 2100, change: 0, high: 2110, low: 2090 };
    }
    
    // Fetch Palladium from Kitco
    try {
        const pdResponse = await fetch('https://proxy.kitco.com/getPM?symbol=PD&currency=USD');
        const pdData = await pdResponse.text();
        const pdParts = pdData.split(',');
        if (pdParts.length >= 8) {
            prices.palladium = {
                price: parseFloat(pdParts[4]) || 1700,
                change: parseFloat(pdParts[7]) || 0,
                high: parseFloat(pdParts[6]) || 1700,
                low: parseFloat(pdParts[5]) || 1700
            };
        }
    } catch (e) {
        prices.palladium = { price: 1700, change: 0, high: 1710, low: 1690 };
    }
    
}

async function fetchFallbackPrices() {
    prices.gold = { price: 5068, change: -5.7, high: 5080, low: 5050 };
    prices.silver = { price: 82.6, change: -1.5, high: 83.5, low: 82 };
    prices.platinum = { price: 2122, change: -9, high: 2155, low: 2084 };
    prices.palladium = { price: 1697, change: -2, high: 1752, low: 1665 };
    fetchShanghaiSilver();
}

async function fetchShanghaiSilver() {
    const OZ_PER_KG = 1000 / TROY_OZ_TO_GRAM;
    const usdToCny = 7.24;
    
    // Try Cloudflare Worker for real Shanghai + Copper data
    try {
        const response = await fetch('https://metal-prices-api.729r2pzfqs.workers.dev/');
        const data = await response.json();
        
        if (data.shanghai && data.shanghai.usdPerOz > 0) {
            prices.shanghai.usdPerOz = data.shanghai.usdPerOz;
            prices.shanghai.cnyPerKg = data.shanghai.cnyPerKg;
            prices.shanghai.premium = data.premium.percent;
        }
        
        return;
    } catch (e) {
        console.log('Worker fallback:', e);
    }
    
    // Fallback: calculate from spot
    const premium = 1.06;
    const spotUsdPerKg = prices.silver.price * OZ_PER_KG;
    const spotCnyPerKg = spotUsdPerKg * usdToCny;
    
    prices.shanghai.cnyPerKg = spotCnyPerKg * premium;
    prices.shanghai.usdPerOz = (prices.shanghai.cnyPerKg / usdToCny) / OZ_PER_KG;
    prices.shanghai.premium = (premium - 1) * 100;
}

function selectMetal(metal) {
    selectedMetal = metal;
    
    // Update tabs
    ['gold', 'silver', 'platinum', 'palladium'].forEach(m => {
        const tab = document.getElementById(`tab-${m}`);
        const config = metalConfig[m];
        if (m === metal) {
            tab.className = `metal-tab flex-1 py-3 px-4 rounded-xl ${config.bgColor} border-2 ${config.borderColor} active`;
        } else {
            tab.className = 'metal-tab flex-1 py-3 px-4 rounded-xl bg-slate-700/50 border-2 border-transparent';
        }
    });
    
    // Show/hide Shanghai section
    document.getElementById('shanghaiSection').classList.toggle('hidden', metal !== 'silver');
    
    updateUI();
    loadTradingViewChart();
}

function updateUI() {
    const rate = currencyRates[currentCurrency];
    const symbol = currentCurrency === 'USD' ? '$' : currentCurrency === 'EUR' ? '€' : '£';
    const data = prices[selectedMetal];
    const config = metalConfig[selectedMetal];
    
    // Metal name and code
    document.getElementById('metalName').textContent = config.name;
    document.getElementById('metalCode').textContent = config.code;
    
    // Price
    const price = data.price * rate;
    const change = data.change * rate;
    const changePct = (data.change / (data.price - data.change)) * 100;
    
    document.getElementById('metalPrice').textContent = `${symbol}${price.toFixed(2)}`;
    
    const changeEl = document.getElementById('metalChange');
    changeEl.textContent = change >= 0 ? `+${symbol}${change.toFixed(2)}` : `${symbol}${change.toFixed(2)}`;
    changeEl.className = `text-sm ${change >= 0 ? 'price-up' : 'price-down'}`;
    
    const pctEl = document.getElementById('metalChangePct');
    pctEl.textContent = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
    pctEl.className = `text-xs px-2 py-0.5 rounded-full ${changePct >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`;
    
    // Per gram/kg
    document.getElementById('metalGram').textContent = `${symbol}${(price / TROY_OZ_TO_GRAM).toFixed(2)}`;
    document.getElementById('metalKg').textContent = `${symbol}${(price / TROY_OZ_TO_KG).toFixed(0)}`;
    document.getElementById('metalHigh').textContent = `${symbol}${(data.high * rate).toFixed(2)}`;
    
    // Shanghai (only if silver)
    if (selectedMetal === 'silver') {
        document.getElementById('westernSpot').textContent = `$${prices.silver.price.toFixed(2)}`;
        document.getElementById('shanghaiPrice').textContent = `$${prices.shanghai.usdPerOz.toFixed(2)}`;
        
        const premiumUsd = prices.shanghai.usdPerOz - prices.silver.price;
        const premiumPct = (premiumUsd / prices.silver.price) * 100;
        document.getElementById('shanghaiPremium').textContent = `+$${premiumUsd.toFixed(2)}`;
        document.getElementById('shanghaiPremiumPct').textContent = `(+${premiumPct.toFixed(1)}%)`;
        
        const cnyPerGram = prices.shanghai.cnyPerKg / 1000;
        document.getElementById('shanghaiCnyGram').textContent = `¥${cnyPerGram.toFixed(2)}`;
        document.getElementById('shanghaiCnyKg').textContent = `¥${prices.shanghai.cnyPerKg.toFixed(0)}`;
        document.getElementById('shanghaiUsdKg').textContent = `$${(prices.shanghai.cnyPerKg / 7.24).toFixed(0)}`;
        
        const beijingHour = (new Date().getUTCHours() + 8) % 24;
        const beijingMin = new Date().getUTCMinutes();
        const beijingTime = beijingHour + beijingMin / 60;
        const isOpen = (beijingTime >= 9 && beijingTime < 11.5) || (beijingTime >= 13.5 && beijingTime < 15.5);
        document.getElementById('shanghaiStatus').textContent = isOpen ? '🟢' : '🔴';
    }
    
    updateCalculator();
}

function updateLastUpdated() {
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// TradingView Chart
function loadTradingViewChart() {
    const container = document.getElementById('tradingview-widget');
    if (!container) return;
    
    const config = metalConfig[selectedMetal];
    const theme = isDark ? 'dark' : 'light';
    
    // Clear container completely
    container.innerHTML = '';
    
    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.cssText = 'height:100%;width:100%;';
    
    const widgetInner = document.createElement('div');
    widgetInner.className = 'tradingview-widget-container__widget';
    widgetInner.style.cssText = 'height:100%;width:100%;';
    widgetContainer.appendChild(widgetInner);
    
    // Create script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": config.tvSymbol,
        "interval": "60",
        "timezone": "Etc/UTC",
        "theme": theme,
        "style": "1",
        "locale": "en",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "allow_symbol_change": false,
        "save_image": false,
        "calendar": false,
        "support_host": "https://www.tradingview.com"
    });
    
    widgetContainer.appendChild(script);
    container.appendChild(widgetContainer);
}

// Calculator
function updateCalculator() {
    const amount = parseFloat(document.getElementById('calcAmount').value) || 0;
    const unit = document.getElementById('calcUnit').value;
    const pricePerOz = prices[selectedMetal].price;
    
    let value;
    if (unit === 'oz') value = pricePerOz * amount;
    else if (unit === 'gram') value = (pricePerOz / TROY_OZ_TO_GRAM) * amount;
    else value = (pricePerOz / TROY_OZ_TO_KG) * amount;
    
    const rate = currencyRates[currentCurrency];
    const symbol = currentCurrency === 'USD' ? '$' : currentCurrency === 'EUR' ? '€' : '£';
    document.getElementById('calcResult').textContent = `${symbol}${(value * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Theme toggle
let isDark = true;
function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('light', !isDark);
    document.getElementById('themeToggle').textContent = isDark ? '🌙' : '☀️';
    loadTradingViewChart();
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Load saved theme
if (localStorage.getItem('theme') === 'light') {
    toggleTheme();
}

// Events
document.getElementById('currency').addEventListener('change', e => { currentCurrency = e.target.value; updateUI(); });
document.getElementById('calcAmount').addEventListener('input', updateCalculator);
document.getElementById('calcUnit').addEventListener('change', updateCalculator);

// Init - use window.onload to ensure everything is ready
window.addEventListener('load', async () => {
    await fetchPrices();
    // Longer delay to ensure DOM is fully painted
    setTimeout(() => loadTradingViewChart(), 500);
    setInterval(fetchPrices, 60000);
});
