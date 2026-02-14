#!/usr/bin/env python3
"""Generate language-specific pages with proper SEO"""

import re
from pathlib import Path
import time

LANGUAGES = {
    'en': {'name': 'English', 'flag': '🇬🇧', 'title': 'Live Silver, Gold & Metal Prices', 'desc': 'Live precious metal prices - Silver, Gold, Platinum, Palladium. Real-time spot prices, charts, and Shanghai silver premium.'},
    'zh': {'name': '中文', 'flag': '🇨🇳', 'title': '实时银价、金价和金属价格', 'desc': '实时贵金属价格 - 白银、黄金、铂金、钯金。实时现货价格、图表和上海白银溢价。'},
    'hi': {'name': 'हिंदी', 'flag': '🇮🇳', 'title': 'लाइव चांदी, सोना और धातु की कीमतें', 'desc': 'लाइव कीमती धातु की कीमतें - चांदी, सोना, प्लैटिनम, पैलेडियम। रीयल-टाइम स्पॉट कीमतें, चार्ट और शंघाई चांदी प्रीमियम।'},
    'ms': {'name': 'Bahasa Melayu', 'flag': '🇲🇾', 'title': 'Harga Perak, Emas & Logam Langsung', 'desc': 'Harga logam berharga langsung - Perak, Emas, Platinum, Palladium. Harga spot masa nyata, carta dan premium perak Shanghai.'},
    'de': {'name': 'Deutsch', 'flag': '🇩🇪', 'title': 'Live Silber-, Gold- & Metallpreise', 'desc': 'Live Edelmetallpreise - Silber, Gold, Platin, Palladium. Echtzeit-Spotpreise, Charts und Shanghai-Silberprämie.'},
    'es': {'name': 'Español', 'flag': '🇪🇸', 'title': 'Precios de Plata, Oro y Metales en Vivo', 'desc': 'Precios de metales preciosos en vivo - Plata, Oro, Platino, Paladio. Precios spot en tiempo real, gráficos y prima de plata de Shanghái.'},
    'it': {'name': 'Italiano', 'flag': '🇮🇹', 'title': 'Prezzi Argento, Oro e Metalli in Tempo Reale', 'desc': 'Prezzi metalli preziosi in tempo reale - Argento, Oro, Platino, Palladio. Prezzi spot, grafici e premio argento Shanghai.'},
    'fr': {'name': 'Français', 'flag': '🇫🇷', 'title': 'Prix de l\'Argent, de l\'Or et des Métaux en Direct', 'desc': 'Prix des métaux précieux en direct - Argent, Or, Platine, Palladium. Prix spot en temps réel, graphiques et prime argent Shanghai.'},
    'pt': {'name': 'Português', 'flag': '🇧🇷', 'title': 'Preços de Prata, Ouro e Metais ao Vivo', 'desc': 'Preços de metais preciosos ao vivo - Prata, Ouro, Platina, Paládio. Preços spot em tempo real, gráficos e prêmio de prata de Xangai.'},
    'tr': {'name': 'Türkçe', 'flag': '🇹🇷', 'title': 'Canlı Gümüş, Altın ve Metal Fiyatları', 'desc': 'Canlı değerli metal fiyatları - Gümüş, Altın, Platin, Paladyum. Gerçek zamanlı spot fiyatlar, grafikler ve Şanghay gümüş primi.'},
    'ja': {'name': '日本語', 'flag': '🇯🇵', 'title': 'ライブ銀・金・金属価格', 'desc': 'ライブ貴金属価格 - 銀、金、プラチナ、パラジウム。リアルタイムスポット価格、チャート、上海シルバープレミアム。'},
    'ru': {'name': 'Русский', 'flag': '🇷🇺', 'title': 'Цены на серебро, золото и металлы в реальном времени', 'desc': 'Цены на драгоценные металлы в реальном времени - серебро, золото, платина, палладий. Спотовые цены, графики и шанхайская премия на серебро.'},
}

def generate_hreflang_tags():
    """Generate hreflang link tags for all languages"""
    tags = ['    <link rel="alternate" hreflang="x-default" href="https://silverprice.win/" />']
    tags.append('    <link rel="alternate" hreflang="en" href="https://silverprice.win/" />')
    for lang in LANGUAGES:
        if lang != 'en':
            tags.append(f'    <link rel="alternate" hreflang="{lang}" href="https://silverprice.win/{lang}/" />')
    return '\n'.join(tags)

def generate_lang_dropdown(current_lang):
    """Generate language dropdown HTML"""
    info = LANGUAGES[current_lang]
    html = f'''<div class="lang-dropdown relative">
                    <button id="langBtn" class="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs flex items-center gap-1">
                        {info["flag"]} {current_lang.upper()} <span class="text-xs">▼</span>
                    </button>
                    <div id="langMenu" class="hidden absolute right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg py-1 z-50 min-w-[80px]">'''
    
    for l, i in LANGUAGES.items():
        href = '/' if l == 'en' else f'/{l}/'
        active = 'bg-slate-700' if l == current_lang else 'hover:bg-slate-700'
        html += f'''
                        <a href="{href}" class="block px-3 py-1 text-xs {active}">{i["flag"]} {l.upper()}</a>'''
    
    html += '''
                    </div>
                </div>'''
    return html

def update_html_for_lang(template, lang):
    """Update HTML content for specific language - starts from clean template each time"""
    info = LANGUAGES[lang]
    html = template
    cache_bust = int(time.time())
    
    # Update html lang attribute
    html = re.sub(r'<html lang="[^"]*">', f'<html lang="{lang}">', html)
    
    # Update title
    html = re.sub(
        r'<title>SilverPrice\.win - [^<]*</title>',
        f'<title>SilverPrice.win - {info["title"]}</title>',
        html
    )
    
    # Update meta description
    html = re.sub(
        r'<meta name="description" content="[^"]*">',
        f'<meta name="description" content="{info["desc"]}">',
        html
    )
    
    # Remove any existing hreflang tags first
    html = re.sub(r'\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*" />', '', html)
    
    # Add fresh hreflang tags after viewport meta
    hreflang = generate_hreflang_tags()
    html = re.sub(
        r'(<meta name="viewport"[^>]*>)',
        f'\\1\n{hreflang}',
        html
    )
    
    # Replace language dropdown/select
    lang_dropdown = generate_lang_dropdown(lang)
    html = re.sub(
        r'<select id="language"[^>]*>.*?</select>',
        lang_dropdown,
        html,
        flags=re.DOTALL
    )
    html = re.sub(
        r'<div class="lang-dropdown relative">.*?</div>\s*</div>\s*</div>',
        lang_dropdown,
        html,
        flags=re.DOTALL
    )
    
    # Set default language in JS
    html = re.sub(
        r"let currentLang = '[^']*';",
        f"let currentLang = '{lang}';",
        html
    )
    
    # Fix app.js path for subdirectories
    if lang != 'en':
        # Replace app.js with ../app.js for subdirectories
        html = re.sub(
            r'<script src="app\.js[^"]*">',
            f'<script src="../app.js?v={cache_bust}">',
            html
        )
    else:
        # Add cache bust for main page
        html = re.sub(
            r'<script src="app\.js[^"]*">',
            f'<script src="app.js?v={cache_bust}">',
            html
        )
    
    # Add pageLang script before app.js (remove any existing first)
    html = re.sub(r"<script>window\.pageLang = '[^']*';</script>\s*", '', html)
    html = re.sub(
        r'(<script src="[^"]*app\.js[^"]*">)',
        f"<script>window.pageLang = '{lang}';</script>\n    \\1",
        html
    )
    
    # Fix blog link for subdirectories
    if lang != 'en':
        html = html.replace('href="blog.html"', 'href="../blog.html"')
    
    # Remove any existing dropdown JS first, then add fresh
    html = re.sub(
        r'\s*<script>\s*// Language dropdown toggle.*?</script>',
        '',
        html,
        flags=re.DOTALL
    )
    
    # Add JS for dropdown toggle before </body>
    dropdown_js = '''
    <script>
        // Language dropdown toggle
        document.getElementById('langBtn')?.addEventListener('click', function(e) {
            e.stopPropagation();
            document.getElementById('langMenu').classList.toggle('hidden');
        });
        document.addEventListener('click', function() {
            document.getElementById('langMenu')?.classList.add('hidden');
        });
    </script>
</body>'''
    html = re.sub(r'\s*</body>', dropdown_js, html)
    
    return html

def main():
    base_dir = Path(__file__).parent
    
    # Read the ORIGINAL template (without any language modifications)
    # We'll use index.html but strip out any previous lang modifications
    template = (base_dir / 'index.html').read_text()
    
    # Generate all language versions including English
    for lang in LANGUAGES:
        lang_html = update_html_for_lang(template, lang)
        
        if lang == 'en':
            (base_dir / 'index.html').write_text(lang_html)
            print(f"✅ Updated /index.html (en)")
        else:
            lang_dir = base_dir / lang
            lang_dir.mkdir(exist_ok=True)
            (lang_dir / 'index.html').write_text(lang_html)
            print(f"✅ Created /{lang}/index.html")
    
    print(f"\n🌍 Generated {len(LANGUAGES)} language versions!")

if __name__ == '__main__':
    main()
