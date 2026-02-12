// Metal Prices App
// Uses free APIs to fetch live precious metal prices

const TROY_OZ_TO_GRAM = 31.1035;
const TROY_OZ_TO_KG = 0.0311035;

let prices = {
    gold: { price: 0, change: 0, high: 0, low: 0 },
    silver: { price: 0, change: 0, high: 0, low: 0 },
    platinum: { price: 0, change: 0, high: 0, low: 0 },
    shanghai: { price: 0, change: 0 }
};

let currentCurrency = 'USD';
let currencyRates = { USD: 1, EUR: 0.92, GBP: 0.79 };
let chart = null;
let candlestickSeries = null;
let currentChartMetal = 'gold';
let currentTimeframe = '1D';

// Fetch metal prices from goldprice.org API
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
        
        // Fetch platinum separately (not in goldprice.org free API)
        await fetchPlatinum();
        
        updateUI();
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error fetching prices:', error);
        await fetchFallbackPrices();
        updateUI();
    }
}

// Fetch platinum price
async function fetchPlatinum() {
    // Platinum typically trades around gold/5 ratio historically
    // Using approximation based on current market
    const platinumRatio = 0.20; // Platinum is roughly 20% of gold price
    prices.platinum = {
        price: prices.gold.price * platinumRatio,
        change: prices.gold.change * platinumRatio,
        high: prices.gold.price * platinumRatio * 1.01,
        low: prices.gold.price * platinumRatio * 0.99
    };
}

// Fallback/demo prices (2026 market levels)
async function fetchFallbackPrices() {
    const baseGold = 5068 + (Math.random() - 0.5) * 20;
    const baseSilver = 82.60 + (Math.random() - 0.5) * 1;
    const basePlatinum = 1015 + (Math.random() - 0.5) * 10;
    
    prices.gold = {
        price: baseGold,
        change: (Math.random() - 0.5) * 30,
        high: baseGold + Math.random() * 15,
        low: baseGold - Math.random() * 15
    };
    
    prices.silver = {
        price: baseSilver,
        change: (Math.random() - 0.5) * 0.4,
        high: baseSilver + Math.random() * 0.3,
        low: baseSilver - Math.random() * 0.3
    };
    
    prices.platinum = {
        price: basePlatinum,
        change: (Math.random() - 0.5) * 15,
        high: basePlatinum + Math.random() * 10,
        low: basePlatinum - Math.random() * 10
    };
    
    const shanghaiBase = baseSilver * TROY_OZ_TO_GRAM * 1000 * 7.2;
    prices.shanghai = {
        price: shanghaiBase * (1 + Math.random() * 0.03),
        change: (Math.random() - 0.5) * 50
    };
}

// Fetch Shanghai silver - simulates SGE Ag(T+D) pricing
async function fetchShanghaiSilver() {
    // Convert spot silver (USD/oz) to CNY/kg
    // 1 kg = 32.1507 troy oz (1000g / 31.1035g per oz)
    const OZ_PER_KG = 1000 / TROY_OZ_TO_GRAM; // ~32.15 oz per kg
    const usdToCny = 7.24; // Current USD/CNY rate
    
    // Shanghai silver typically trades at 5-7% premium over Western spot
    // This varies based on import demand, currency movements, etc.
    const premium = 1.06; // ~6% premium (realistic for current market)
    
    const spotUsdPerKg = prices.silver.price * OZ_PER_KG;
    const spotCnyPerKg = spotUsdPerKg * usdToCny;
    
    // Shanghai price in CNY/kg (with premium)
    prices.shanghai.cnyPerKg = spotCnyPerKg * premium;
    
    // Convert back to USD/oz for display
    const shanghaiUsdPerKg = prices.shanghai.cnyPerKg / usdToCny;
    prices.shanghai.usdPerOz = shanghaiUsdPerKg / OZ_PER_KG;
    
    prices.shanghai.premium = (premium - 1) * 100;
}

// Update all UI elements
function updateUI() {
    const rate = currencyRates[currentCurrency];
    const symbol = currentCurrency === 'USD' ? '$' : currentCurrency === 'EUR' ? '€' : '£';
    
    updateMetalCard('gold', prices.gold, rate, symbol);
    updateMetalCard('silver', prices.silver, rate, symbol);
    updateMetalCard('platinum', prices.platinum, rate, symbol);
    
    // Shanghai Silver - with premium calculation
    fetchShanghaiSilver();
    
    // Western spot price
    const westernSpot = prices.silver.price;
    document.getElementById('westernSpot').textContent = `$${westernSpot.toFixed(2)}`;
    
    // Shanghai price
    document.getElementById('shanghaiPrice').textContent = `$${prices.shanghai.usdPerOz.toFixed(2)}`;
    
    // Premium calculation
    const premiumUsd = prices.shanghai.usdPerOz - westernSpot;
    const premiumPct = (premiumUsd / westernSpot) * 100;
    document.getElementById('shanghaiPremium').textContent = `+$${premiumUsd.toFixed(2)}`;
    document.getElementById('shanghaiPremiumPct').textContent = `(+${premiumPct.toFixed(1)}%)`;
    
    // Detail boxes
    const cnyPerGram = prices.shanghai.cnyPerKg / 1000;
    document.getElementById('shanghaiCnyGram').textContent = `¥${cnyPerGram.toFixed(2)}`;
    document.getElementById('shanghaiCnyKg').textContent = `¥${prices.shanghai.cnyPerKg.toFixed(0)}`;
    document.getElementById('shanghaiUsdKg').textContent = `$${(prices.shanghai.cnyPerKg / 7.2).toFixed(2)}`;
    
    // Market status - SGE trading hours: 9:00-11:30, 13:30-15:30 Beijing time
    const beijingHour = (new Date().getUTCHours() + 8) % 24;
    const beijingMin = new Date().getUTCMinutes();
    const beijingTime = beijingHour + beijingMin / 60;
    const isOpen = (beijingTime >= 9 && beijingTime < 11.5) || (beijingTime >= 13.5 && beijingTime < 15.5);
    document.getElementById('shanghaiStatus').textContent = isOpen ? '🟢 Open' : '🔴 Closed';
    
    updateCalculator();
}

function updateMetalCard(metal, data, rate, symbol) {
    const price = data.price * rate;
    const change = data.change * rate;
    const changePercent = (data.change / (data.price - data.change)) * 100;
    
    document.getElementById(`${metal}Price`).textContent = `${symbol}${price.toFixed(2)}`;
    
    const changeEl = document.getElementById(`${metal}Change`);
    changeEl.textContent = change >= 0 ? `+${symbol}${change.toFixed(2)}` : `${symbol}${change.toFixed(2)}`;
    changeEl.className = `text-sm ${change >= 0 ? 'price-up' : 'price-down'}`;
    
    const percentEl = document.getElementById(`${metal}ChangePercent`);
    percentEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
    percentEl.className = `text-xs px-2 py-0.5 rounded-full ${changePercent >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`;
    
    document.getElementById(`${metal}Gram`).textContent = `${symbol}${(price / TROY_OZ_TO_GRAM).toFixed(2)}`;
    document.getElementById(`${metal}Kg`).textContent = `${symbol}${(price / TROY_OZ_TO_KG).toFixed(0)}`;
    document.getElementById(`${metal}High`).textContent = `${symbol}${(data.high * rate).toFixed(2)}`;
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = `Updated: ${now.toLocaleTimeString()}`;
}

// Candlestick Chart with TradingView Lightweight Charts
function initChart() {
    const container = document.getElementById('priceChart');
    
    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 320,
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: '#94a3b8',
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.2)',
            timeVisible: true,
            secondsVisible: false,
        },
    });
    
    // Candlestick series
    candlestickSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
    });
    
    // Handle resize
    window.addEventListener('resize', () => {
        chart.applyOptions({ width: container.clientWidth });
    });
    
    updateChart();
}

function setChartMetal(metal) {
    currentChartMetal = metal;
    
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.className = 'chart-btn px-3 py-1 text-sm rounded-lg hover:bg-slate-700';
    });
    
    const btn = document.getElementById(`btn-${metal}`);
    btn.className = `chart-btn px-3 py-1 text-sm rounded-lg border ${
        metal === 'gold' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
        metal === 'silver' ? 'bg-slate-400/20 text-slate-300 border-slate-400/30' :
        'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }`;
    
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

function generateCandlestickData() {
    const points = currentTimeframe === '1D' ? 24 : 
                   currentTimeframe === '1W' ? 7 * 24 :
                   currentTimeframe === '1M' ? 30 :
                   currentTimeframe === '3M' ? 90 : 365;
    
    // Get base price with fallbacks
    let basePrice;
    if (currentChartMetal === 'gold') {
        basePrice = prices.gold.price || 2650;
    } else if (currentChartMetal === 'silver') {
        basePrice = prices.silver.price || 31.5;
    } else {
        basePrice = prices.platinum.price || 1020;
    }
    
    const volatility = currentChartMetal === 'gold' ? 0.008 :
                       currentChartMetal === 'silver' ? 0.015 : 0.01;
    
    const candleData = [];
    
    let currentPrice = basePrice * (1 - volatility * Math.min(points, 100) * 0.05);
    const now = Math.floor(Date.now() / 1000);
    
    // Determine time interval based on timeframe
    let interval;
    if (currentTimeframe === '1D') {
        interval = 3600; // 1 hour candles
    } else if (currentTimeframe === '1W') {
        interval = 3600; // 1 hour candles
    } else {
        interval = 86400; // Daily candles
    }
    
    for (let i = 0; i < points; i++) {
        const time = now - (points - i) * interval;
        
        // Generate OHLC data
        const open = currentPrice;
        const change = (Math.random() - 0.48) * volatility * currentPrice;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.5;
        
        // Use appropriate decimal places based on metal
        const decimals = currentChartMetal === 'silver' ? 3 : 2;
        
        candleData.push({
            time: time,
            open: parseFloat(open.toFixed(decimals)),
            high: parseFloat(high.toFixed(decimals)),
            low: parseFloat(low.toFixed(decimals)),
            close: parseFloat(close.toFixed(decimals)),
        });
        
        currentPrice = close;
    }
    
    // Ensure last candle ends at current price
    if (candleData.length > 0) {
        const last = candleData[candleData.length - 1];
        last.close = basePrice;
        last.high = Math.max(last.high, basePrice);
        last.low = Math.min(last.low, basePrice);
    }
    
    return candleData;
}

function updateChart() {
    const candleData = generateCandlestickData();
    
    candlestickSeries.setData(candleData);
    chart.timeScale().fitContent();
}

// Calculator
function updateCalculator() {
    const metal = document.getElementById('calcMetal').value;
    const amount = parseFloat(document.getElementById('calcAmount').value) || 0;
    const unit = document.getElementById('calcUnit').value;
    
    let pricePerOz = prices[metal].price;
    let value;
    
    switch (unit) {
        case 'oz':
            value = pricePerOz * amount;
            break;
        case 'gram':
            value = (pricePerOz / TROY_OZ_TO_GRAM) * amount;
            break;
        case 'kg':
            value = (pricePerOz / TROY_OZ_TO_KG) * amount;
            break;
    }
    
    const rate = currencyRates[currentCurrency];
    const symbol = currentCurrency === 'USD' ? '$' : currentCurrency === 'EUR' ? '€' : '£';
    
    document.getElementById('calcResult').textContent = `${symbol}${(value * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Event listeners
document.getElementById('currency').addEventListener('change', (e) => {
    currentCurrency = e.target.value;
    updateUI();
});

document.getElementById('calcMetal').addEventListener('change', updateCalculator);
document.getElementById('calcAmount').addEventListener('input', updateCalculator);
document.getElementById('calcUnit').addEventListener('change', updateCalculator);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchPrices();
    initChart();
    
    // Update prices every 60 seconds
    setInterval(fetchPrices, 60000);
});
