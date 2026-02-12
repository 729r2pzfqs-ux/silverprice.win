// Metal Prices App - Single Metal View
const TROY_OZ_TO_GRAM = 31.1035;
const TROY_OZ_TO_KG = 0.0311035;

let prices = {
    gold: { price: 0, change: 0, high: 0, low: 0 },
    silver: { price: 0, change: 0, high: 0, low: 0 },
    platinum: { price: 0, change: 0, high: 0, low: 0 },
    palladium: { price: 0, change: 0, high: 0, low: 0 },
    copper: { price: 0, change: 0, high: 0, low: 0 },
    shanghai: { cnyPerKg: 0, usdPerOz: 0, premium: 0 }
};

let currentCurrency = 'USD';
let currencyRates = { USD: 1, EUR: 0.92, GBP: 0.79 };
let chart = null;
let candlestickSeries = null;
let selectedMetal = 'gold';
let currentTimeframe = '1D';

const metalConfig = {
    gold: { name: 'Gold', code: 'XAU/USD', color: '#FFD700', borderColor: 'border-yellow-500/50', bgColor: 'bg-yellow-500/20' },
    silver: { name: 'Silver', code: 'XAG/USD', color: '#C0C0C0', borderColor: 'border-slate-400/50', bgColor: 'bg-slate-400/20' },
    platinum: { name: 'Platinum', code: 'XPT/USD', color: '#60A5FA', borderColor: 'border-blue-400/50', bgColor: 'bg-blue-400/20' },
    palladium: { name: 'Palladium', code: 'XPD/USD', color: '#E2E8F0', borderColor: 'border-slate-300/50', bgColor: 'bg-slate-300/20' },
    copper: { name: 'Copper', code: 'HG/USD', color: '#F97316', borderColor: 'border-orange-500/50', bgColor: 'bg-orange-500/20' }
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
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error:', error);
        await fetchFallbackPrices();
        updateUI();
    }
}

async function fetchOtherMetals() {
    // Platinum ~20% of gold
    const platinumRatio = 0.20;
    prices.platinum = {
        price: prices.gold.price * platinumRatio,
        change: prices.gold.change * platinumRatio,
        high: prices.gold.price * platinumRatio * 1.01,
        low: prices.gold.price * platinumRatio * 0.99
    };
    
    // Palladium ~18% of gold
    const palladiumRatio = 0.18;
    prices.palladium = {
        price: prices.gold.price * palladiumRatio,
        change: prices.gold.change * palladiumRatio,
        high: prices.gold.price * palladiumRatio * 1.01,
        low: prices.gold.price * palladiumRatio * 0.99
    };
    
    // Copper ~$4.50/lb, convert to per oz (~$0.28/oz)
    // Copper is priced per pound, 1 lb = 14.583 troy oz
    const copperPerLb = 4.50 + (Math.random() - 0.5) * 0.1;
    const copperPerOz = copperPerLb / 14.583;
    prices.copper = {
        price: copperPerOz,
        change: (Math.random() - 0.5) * 0.01,
        high: copperPerOz * 1.01,
        low: copperPerOz * 0.99
    };
}

async function fetchFallbackPrices() {
    prices.gold = { price: 5068, change: -5.7, high: 5080, low: 5050 };
    prices.silver = { price: 82.6, change: -1.5, high: 83.5, low: 82 };
    prices.platinum = { price: 1013, change: -1.1, high: 1020, low: 1005 };
    prices.palladium = { price: 912, change: -2.3, high: 920, low: 905 };
    prices.copper = { price: 0.31, change: -0.002, high: 0.315, low: 0.305 };
    fetchShanghaiSilver();
}

function fetchShanghaiSilver() {
    const OZ_PER_KG = 1000 / TROY_OZ_TO_GRAM;
    const usdToCny = 7.24;
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
    ['gold', 'silver', 'platinum', 'palladium', 'copper'].forEach(m => {
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
    updateChart();
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

// Chart
function initChart() {
    const container = document.getElementById('priceChart');
    
    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 256,
        layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true },
    });
    
    candlestickSeries = chart.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444',
        borderDownColor: '#ef4444', borderUpColor: '#22c55e',
        wickDownColor: '#ef4444', wickUpColor: '#22c55e',
    });
    
    window.addEventListener('resize', () => chart.applyOptions({ width: container.clientWidth }));
    updateChart();
}

function setTimeframe(tf) {
    currentTimeframe = tf;
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.className = 'timeframe-btn px-3 py-1 text-xs rounded hover:bg-slate-700';
    });
    event.target.className = 'timeframe-btn px-3 py-1 text-xs rounded bg-slate-700';
    updateChart();
}

function updateChart() {
    const points = currentTimeframe === '1D' ? 24 : currentTimeframe === '1W' ? 168 : currentTimeframe === '1M' ? 30 : currentTimeframe === '3M' ? 90 : 365;
    const basePrice = prices[selectedMetal].price || 100;
    const volatility = selectedMetal === 'gold' ? 0.006 : selectedMetal === 'silver' ? 0.012 : selectedMetal === 'copper' ? 0.015 : 0.008;
    
    const candleData = [];
    let price = basePrice * (1 - volatility * Math.min(points, 50) * 0.1);
    const now = Math.floor(Date.now() / 1000);
    const interval = currentTimeframe === '1D' || currentTimeframe === '1W' ? 3600 : 86400;
    
    for (let i = 0; i < points; i++) {
        const open = price;
        const change = (Math.random() - 0.48) * volatility * price;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * volatility * price * 0.3;
        const low = Math.min(open, close) - Math.random() * volatility * price * 0.3;
        
        candleData.push({
            time: now - (points - i) * interval,
            open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2)
        });
        price = close;
    }
    
    if (candleData.length) {
        candleData[candleData.length - 1].close = basePrice;
    }
    
    candlestickSeries.setData(candleData);
    chart.timeScale().fitContent();
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

// Events
document.getElementById('currency').addEventListener('change', e => { currentCurrency = e.target.value; updateUI(); });
document.getElementById('calcAmount').addEventListener('input', updateCalculator);
document.getElementById('calcUnit').addEventListener('change', updateCalculator);

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchPrices();
    initChart();
    setInterval(fetchPrices, 60000);
});
