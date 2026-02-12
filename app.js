// Metal Prices App - Single Metal View
const TROY_OZ_TO_GRAM = 31.1035;
const TROY_OZ_TO_KG = 0.0311035;
const OZ_PER_KG = 32.1507;

// Translations
const i18n = {
    en: {
        gold: 'Gold', silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium',
        calculator: 'Calculator', westernSpot: 'Western Spot', premium: 'Premium',
        shanghaiSilver: 'Shanghai Silver (Ag T+D)', indiaMcx: 'India MCX Silver',
        intlSpot: 'International Spot', mcxPrice: 'MCX Price', includesDuty: 'includes duty + GST',
        status: 'Status', duty: 'Duty', updated: 'Updated every 60s • Data for informational purposes'
    },
    hi: {
        gold: 'सोना', silver: 'चांदी', platinum: 'प्लैटिनम', palladium: 'पैलेडियम',
        calculator: 'कैलकुलेटर', westernSpot: 'पश्चिमी स्पॉट', premium: 'प्रीमियम',
        shanghaiSilver: 'शंघाई चांदी (Ag T+D)', indiaMcx: 'भारत MCX चांदी',
        intlSpot: 'अंतर्राष्ट्रीय स्पॉट', mcxPrice: 'MCX कीमत', includesDuty: 'शुल्क + GST शामिल',
        status: 'स्थिति', duty: 'शुल्क', updated: 'हर 60 सेकंड में अपडेट • केवल सूचना के लिए'
    },
    ms: {
        gold: 'Emas', silver: 'Perak', platinum: 'Platinum', palladium: 'Paladium',
        calculator: 'Kalkulator', westernSpot: 'Spot Barat', premium: 'Premium',
        shanghaiSilver: 'Perak Shanghai (Ag T+D)', indiaMcx: 'Perak MCX India',
        intlSpot: 'Spot Antarabangsa', mcxPrice: 'Harga MCX', includesDuty: 'termasuk duti + GST',
        status: 'Status', duty: 'Duti', updated: 'Dikemas kini setiap 60s • Data untuk maklumat sahaja'
    },
    it: {
        gold: 'Oro', silver: 'Argento', platinum: 'Platino', palladium: 'Palladio',
        calculator: 'Calcolatrice', westernSpot: 'Spot Occidentale', premium: 'Premio',
        shanghaiSilver: 'Argento Shanghai (Ag T+D)', indiaMcx: 'Argento MCX India',
        intlSpot: 'Spot Internazionale', mcxPrice: 'Prezzo MCX', includesDuty: 'include dazio + GST',
        status: 'Stato', duty: 'Dazio', updated: 'Aggiornato ogni 60s • Dati solo informativi'
    },
    de: {
        gold: 'Gold', silver: 'Silber', platinum: 'Platin', palladium: 'Palladium',
        calculator: 'Rechner', westernSpot: 'Westlicher Spot', premium: 'Aufpreis',
        shanghaiSilver: 'Shanghai Silber (Ag T+D)', indiaMcx: 'Indien MCX Silber',
        intlSpot: 'Internationaler Spot', mcxPrice: 'MCX Preis', includesDuty: 'inkl. Zoll + GST',
        status: 'Status', duty: 'Zoll', updated: 'Alle 60s aktualisiert • Nur zu Informationszwecken'
    },
    es: {
        gold: 'Oro', silver: 'Plata', platinum: 'Platino', palladium: 'Paladio',
        calculator: 'Calculadora', westernSpot: 'Spot Occidental', premium: 'Prima',
        shanghaiSilver: 'Plata Shanghai (Ag T+D)', indiaMcx: 'Plata MCX India',
        intlSpot: 'Spot Internacional', mcxPrice: 'Precio MCX', includesDuty: 'incluye arancel + GST',
        status: 'Estado', duty: 'Arancel', updated: 'Actualizado cada 60s • Datos solo informativos'
    }
};

let currentLang = 'en';

let prices = {
    gold: { price: 0, change: 0, high: 0, low: 0 },
    silver: { price: 0, change: 0, high: 0, low: 0 },
    platinum: { price: 0, change: 0, high: 0, low: 0 },
    palladium: { price: 0, change: 0, high: 0, low: 0 },
    shanghai: { cnyPerKg: 0, usdPerOz: 0, premium: 0 },
    india: { inrPerKg: 0, inrPerGram: 0, premiumPct: 18, forex: 90.74 }
};

let currentCurrency = 'USD';
let currencyRates = { USD: 1, EUR: 0.84, GBP: 0.73, INR: 90.74, MYR: 3.92, AUD: 1.40 };
let selectedMetal = 'gold';

// Get text in current language
function t(key) {
    return i18n[currentLang]?.[key] || i18n.en[key] || key;
}

// Apply translations to UI
function applyTranslations() {
    // Metal tabs
    document.querySelector('#tab-gold .text-xs').textContent = t('gold');
    document.querySelector('#tab-silver .text-xs').textContent = t('silver');
    document.querySelector('#tab-platinum .text-xs').textContent = t('platinum');
    document.querySelector('#tab-palladium .text-xs').textContent = t('palladium');
    
    // All elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    
    // Footer
    document.querySelector('footer p').textContent = t('updated');
    
    // Update metal name if needed
    if (prices[selectedMetal]) updateUI();
}

const metalConfig = {
    gold: { name: 'Gold', code: 'XAU/USD', tvSymbol: 'TVC:GOLD', color: '#FFD700', borderColor: 'border-yellow-500/50', bgColor: 'bg-yellow-500/20' },
    silver: { name: 'Silver', code: 'XAG/USD', tvSymbol: 'TVC:SILVER', color: '#C0C0C0', borderColor: 'border-slate-400/50', bgColor: 'bg-slate-400/20' },
    platinum: { name: 'Platinum', code: 'XPT/USD', tvSymbol: 'TVC:PLATINUM', color: '#60A5FA', borderColor: 'border-blue-400/50', bgColor: 'bg-blue-400/20' },
    palladium: { name: 'Palladium', code: 'XPD/USD', tvSymbol: 'TVC:PALLADIUM', color: '#E2E8F0', borderColor: 'border-slate-300/50', bgColor: 'bg-slate-300/20' }
};

// Fetch prices from Kitco (real-time!)
async function fetchPrices() {
    const symbols = { gold: 'AU', silver: 'AG', platinum: 'PT', palladium: 'PD' };
    
    for (const [metal, symbol] of Object.entries(symbols)) {
        try {
            const response = await fetch(`https://proxy.kitco.com/getPM?symbol=${symbol}&currency=USD`);
            const text = await response.text();
            const parts = text.split(',');
            // Format: symbol,currency,unit,timestamp,bid,ask,mid,change,changePct,low,high
            if (parts.length >= 11) {
                prices[metal] = {
                    price: parseFloat(parts[4]) || 0,
                    change: parseFloat(parts[7]) || 0,
                    changePct: parseFloat(parts[8]) || 0,
                    low: parseFloat(parts[9]) || 0,
                    high: parseFloat(parts[10]) || 0
                };
            }
        } catch (e) {
            console.log(`Error fetching ${metal}:`, e);
        }
    }
    
    fetchRegionalPrices();
    updateUI();
    updateLastUpdated();
}

function fetchFallbackPrices() {
    prices.gold = { price: 5045, change: 0, high: 5070, low: 5020 };
    prices.silver = { price: 81.65, change: 0, high: 82.5, low: 81 };
    prices.platinum = { price: 2107, change: 0, high: 2120, low: 2090 };
    prices.palladium = { price: 1722, change: 0, high: 1740, low: 1700 };
    fetchRegionalPrices();
}

async function fetchRegionalPrices() {
    const usdToCny = 7.24;
    
    // Try Cloudflare Worker for Shanghai + India data
    try {
        const response = await fetch('https://metal-prices-api.729r2pzfqs.workers.dev/');
        const data = await response.json();
        
        // Shanghai
        if (data.shanghai && data.shanghai.usdPerOz > 0) {
            prices.shanghai.usdPerOz = data.shanghai.usdPerOz;
            prices.shanghai.cnyPerKg = data.shanghai.cnyPerKg;
            prices.shanghai.premium = data.premium.percent;
        }
        
        // India MCX
        if (data.india) {
            prices.india.inrPerKg = data.india.inrPerKg;
            prices.india.inrPerGram = parseFloat(data.india.inrPerGram);
            prices.india.premiumPct = parseFloat(data.india.premiumPercent);
            prices.india.forex = data.forex?.usdInr || 90.74;
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
    
    // India fallback (18% duty+GST)
    const indiaDuty = 1.18;
    prices.india.inrPerKg = prices.silver.price * OZ_PER_KG * prices.india.forex * indiaDuty;
    prices.india.inrPerGram = prices.india.inrPerKg / 1000;
    prices.india.premiumPct = 18;
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
    
    // Show/hide regional section (Shanghai + India)
    document.getElementById('regionalSection').classList.toggle('hidden', metal !== 'silver');
    
    updateUI();
    loadTradingViewChart();
}

function updateUI() {
    const rate = currencyRates[currentCurrency];
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', MYR: 'RM', AUD: 'A$' };
    const symbol = symbols[currentCurrency] || '$';
    const data = prices[selectedMetal];
    const config = metalConfig[selectedMetal];
    
    // Metal name (translated) and code
    document.getElementById('metalName').textContent = t(selectedMetal);
    document.getElementById('metalCode').textContent = config.code;
    
    // Price
    const price = data.price * rate;
    const change = data.change * rate;
    const changePct = data.changePct || 0;
    
    document.getElementById('metalPrice').textContent = `${symbol}${price.toFixed(2)}`;
    
    const changeEl = document.getElementById('metalChange');
    changeEl.textContent = change >= 0 ? `+${symbol}${Math.abs(change).toFixed(2)}` : `-${symbol}${Math.abs(change).toFixed(2)}`;
    changeEl.className = `text-sm ${change >= 0 ? 'price-up' : 'price-down'}`;
    
    const pctEl = document.getElementById('metalChangePct');
    pctEl.textContent = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
    pctEl.className = `text-xs px-2 py-0.5 rounded-full ${changePct >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`;
    
    // Regional premiums (only if silver)
    if (selectedMetal === 'silver') {
        // Shanghai
        document.getElementById('westernSpot').textContent = `$${prices.silver.price.toFixed(2)}`;
        document.getElementById('shanghaiPrice').textContent = `$${prices.shanghai.usdPerOz.toFixed(2)}`;
        
        const premiumUsd = prices.shanghai.usdPerOz - prices.silver.price;
        const premiumPct = prices.silver.price > 0 ? (premiumUsd / prices.silver.price) * 100 : 0;
        document.getElementById('shanghaiPremium').textContent = `+$${premiumUsd.toFixed(2)}`;
        document.getElementById('shanghaiPremiumPct').textContent = `(+${premiumPct.toFixed(1)}%)`;
        
        const cnyPerGram = prices.shanghai.cnyPerKg / 1000;
        document.getElementById('shanghaiCnyGram').textContent = `¥${cnyPerGram.toFixed(2)}`;
        document.getElementById('shanghaiCnyKg').textContent = `¥${prices.shanghai.cnyPerKg.toFixed(0)}`;
        document.getElementById('shanghaiUsdKg').textContent = `$${(prices.shanghai.cnyPerKg / 7.24).toFixed(0)}`;
        
        // Shanghai market status (09:00-11:30, 13:30-15:30 Beijing time)
        const beijingHour = (new Date().getUTCHours() + 8) % 24;
        const beijingMin = new Date().getUTCMinutes();
        const beijingTime = beijingHour + beijingMin / 60;
        const isOpen = (beijingTime >= 9 && beijingTime < 11.5) || (beijingTime >= 13.5 && beijingTime < 15.5);
        document.getElementById('shanghaiStatus').textContent = isOpen ? '🟢' : '🔴';
        
        // India MCX
        document.getElementById('indiaSpot').textContent = `$${prices.silver.price.toFixed(2)}`;
        document.getElementById('indiaPrice').textContent = `₹${prices.india.inrPerGram.toFixed(2)}/g`;
        document.getElementById('indiaPremium').textContent = `+${prices.india.premiumPct.toFixed(0)}%`;
        document.getElementById('indiaInrGram').textContent = `₹${prices.india.inrPerGram.toFixed(2)}`;
        document.getElementById('indiaInrKg').textContent = `₹${prices.india.inrPerKg.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
        document.getElementById('indiaForex').textContent = prices.india.forex.toFixed(2);
    }
    
    updateCalculator();
}

function updateLastUpdated() {
    const el = document.getElementById('lastUpdate');
    if (el) el.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// TradingView Chart - Simple iframe embed
function loadTradingViewChart() {
    const container = document.getElementById('tradingview-widget');
    if (!container) return;
    
    const config = metalConfig[selectedMetal];
    const theme = isDark ? 'dark' : 'light';
    
    container.innerHTML = `<iframe 
        src="https://www.tradingview.com/widgetembed/?symbol=${config.tvSymbol}&interval=60&hidesidetoolbar=0&symboledit=0&saveimage=0&toolbarbg=000000&studies=[]&theme=${theme}&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en"
        style="width:100%;height:100%;border:none;"
        allowtransparency="true"
        frameborder="0"
        allowfullscreen
    ></iframe>`;
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
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', MYR: 'RM', AUD: 'A$' };
    const symbol = symbols[currentCurrency] || '$';
    
    // Format based on currency (INR uses Indian locale)
    const locale = currentCurrency === 'INR' ? 'en-IN' : 'en-US';
    document.getElementById('calcResult').textContent = `${symbol}${(value * rate).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
document.getElementById('currency').addEventListener('change', e => { 
    currentCurrency = e.target.value; 
    localStorage.setItem('currency', currentCurrency);
    updateUI(); 
});
document.getElementById('language').addEventListener('change', e => { 
    currentLang = e.target.value; 
    localStorage.setItem('lang', currentLang);
    applyTranslations();
});
document.getElementById('calcAmount').addEventListener('input', updateCalculator);
document.getElementById('calcUnit').addEventListener('change', updateCalculator);

// Detect browser language
function detectLanguage() {
    const saved = localStorage.getItem('lang');
    if (saved && i18n[saved]) return saved;
    
    const browserLang = navigator.language.split('-')[0];
    if (i18n[browserLang]) return browserLang;
    return 'en';
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved preferences
    currentLang = detectLanguage();
    document.getElementById('language').value = currentLang;
    
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency) {
        currentCurrency = savedCurrency;
        document.getElementById('currency').value = savedCurrency;
    }
    
    // Fetch forex rates for currency conversion
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        if (data.rates) {
            currencyRates.EUR = data.rates.EUR || 0.84;
            currencyRates.GBP = data.rates.GBP || 0.73;
            currencyRates.INR = data.rates.INR || 90.74;
            currencyRates.MYR = data.rates.MYR || 3.92;
            currencyRates.AUD = data.rates.AUD || 1.40;
        }
    } catch (e) {
        console.log('Using default forex rates');
    }
    
    applyTranslations();
    loadTradingViewChart();
    await fetchPrices();
    setInterval(fetchPrices, 60000);
});
