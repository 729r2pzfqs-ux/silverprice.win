// Metal Prices App - Single Metal View
const TROY_OZ_TO_GRAM = 31.1035;
const TROY_OZ_TO_KG = 0.0311035;
const METALPRICE_API_KEY = '0ae37d0957a3c6802e2ec39d9c1a939c';

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
    
    // Copper - estimated (no free API with CORS)
    // ~$4.50/lb, 1 lb = 14.583 troy oz
    const copperPerLb = 4.50;
    const copperPerOz = copperPerLb / 14.583;
    prices.copper = {
        price: copperPerOz,
        change: 0,
        high: copperPerOz * 1.01,
        low: copperPerOz * 0.99
    };
}

async function fetchFallbackPrices() {
    prices.gold = { price: 5068, change: -5.7, high: 5080, low: 5050 };
    prices.silver = { price: 82.6, change: -1.5, high: 83.5, low: 82 };
    prices.platinum = { price: 2122, change: -9, high: 2155, low: 2084 };
    prices.palladium = { price: 1697, change: -2, high: 1752, low: 1665 };
    prices.copper = { price: 0.31, change: 0, high: 0.315, low: 0.305 };
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
        
        if (data.copper && data.copper.perOz > 0) {
            prices.copper.price = data.copper.perOz;
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
        rightPriceScale: { 
            borderColor: 'rgba(255,255,255,0.1)',
            scaleMargins: { top: 0.15, bottom: 0.15 }  // Add padding so price isn't cut off
        },
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

// Cache for historical data
let historicalCache = {};

async function updateChart() {
    const metalSymbols = { gold: 'XAU', silver: 'XAG', platinum: 'XPT', palladium: 'XPD', copper: 'XCU' };
    const symbol = metalSymbols[selectedMetal];
    const basePrice = prices[selectedMetal].price || 100;
    
    // For copper or 1D view, use simulated (API has no intraday data)
    if (selectedMetal === 'copper' || currentTimeframe === '1D') {
        updateChartSimulated();
        return;
    }
    
    // Try to fetch real OHLC data (5 days max on free tier)
    const cacheKey = `${symbol}_${currentTimeframe}`;
    const now = Date.now();
    
    // Use cache if fresh (15 min)
    if (historicalCache[cacheKey] && (now - historicalCache[cacheKey].time) < 900000) {
        candlestickSeries.setData(historicalCache[cacheKey].data);
        chart.timeScale().fitContent();
        return;
    }
    
    try {
        // Calculate date range (max 5 days for free tier)
        const days = currentTimeframe === '1W' ? 5 : 5;
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days);
        
        const formatDate = d => d.toISOString().split('T')[0];
        const candleData = [];
        
        // Fetch OHLC for each day (builds proper candlesticks)
        for (let i = 0; i <= days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = formatDate(date);
            
            // Skip future dates and today (incomplete candle)
            const today = formatDate(endDate);
            if (date > endDate || dateStr === today) continue;
            
            try {
                const ohlcUrl = `https://api.metalpriceapi.com/v1/ohlc?api_key=${METALPRICE_API_KEY}&base=${symbol}&currency=USD&date=${dateStr}`;
                const resp = await fetch(ohlcUrl);
                const data = await resp.json();
                
                if (data.success && data.rate) {
                    candleData.push({
                        time: Math.floor(date.getTime() / 1000),
                        open: +data.rate.open.toFixed(2),
                        high: +data.rate.high.toFixed(2),
                        low: +data.rate.low.toFixed(2),
                        close: +data.rate.close.toFixed(2)
                    });
                }
            } catch (e) {
                console.log(`Skip ${dateStr}:`, e);
            }
        }
        
        // Add today's partial candle from live data
        const todayOpen = candleData.length > 0 ? candleData[candleData.length - 1].close : basePrice;
        candleData.push({
            time: Math.floor(new Date().setHours(0,0,0,0) / 1000),
            open: todayOpen,
            high: Math.max(todayOpen, basePrice) * 1.002,
            low: Math.min(todayOpen, basePrice) * 0.998,
            close: basePrice
        });
        
        if (candleData.length > 1) {
            // Cache the result
            historicalCache[cacheKey] = { data: candleData, time: now };
            candlestickSeries.setData(candleData);
            chart.timeScale().fitContent();
            console.log(`✅ Real OHLC data: ${candleData.length} candles`);
            return;
        }
    } catch (e) {
        console.log('OHLC fetch error:', e);
    }
    
    // Fallback to simulated
    updateChartSimulated();
}

function updateChartSimulated() {
    const points = currentTimeframe === '1D' ? 24 : currentTimeframe === '1W' ? 7 : currentTimeframe === '1M' ? 30 : currentTimeframe === '3M' ? 90 : 365;
    const basePrice = prices[selectedMetal].price || 100;
    const change = prices[selectedMetal].change || 0;
    const volatility = selectedMetal === 'gold' ? 0.003 : selectedMetal === 'silver' ? 0.006 : selectedMetal === 'copper' ? 0.008 : 0.004;
    
    const candleData = [];
    const now = Math.floor(Date.now() / 1000);
    const interval = currentTimeframe === '1D' ? 3600 : 86400;
    
    const totalChange = currentTimeframe === '1D' ? change : change * (points / 24);
    let price = basePrice - totalChange;
    
    for (let i = 0; i < points; i++) {
        const progress = i / (points - 1);
        const targetPrice = (basePrice - totalChange) + (totalChange * progress);
        const noise = (Math.random() - 0.5) * volatility * basePrice;
        const open = price;
        const close = targetPrice + noise * 0.3;
        const body = Math.abs(close - open);
        const wick = Math.max(body * 0.3, basePrice * volatility * 0.2);
        const high = Math.max(open, close) + Math.random() * wick;
        const low = Math.min(open, close) - Math.random() * wick;
        
        candleData.push({
            time: now - (points - i) * interval,
            open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2)
        });
        price = close;
    }
    
    if (candleData.length) candleData[candleData.length - 1].close = basePrice;
    
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

// Theme toggle
let isDark = true;
function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('light', !isDark);
    document.getElementById('themeToggle').textContent = isDark ? '🌙' : '☀️';
    
    // Update chart colors
    if (chart) {
        chart.applyOptions({
            layout: { textColor: isDark ? '#94a3b8' : '#475569' },
            grid: {
                vertLines: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                horzLines: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
            }
        });
    }
    
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

// Init
document.addEventListener('DOMContentLoaded', async () => {
    await fetchPrices();
    initChart();
    setInterval(fetchPrices, 60000);
});
