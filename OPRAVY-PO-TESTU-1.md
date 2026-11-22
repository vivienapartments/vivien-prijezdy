# Opravy po testu majitele na ostré (22. 11. 2026 večer)

Majitel prošel poptávku jako host na ostré (telefon + notebook). Oprav všech 15 bodů. Každý bod ověř na šířce 360, 390 a na notebooku (1366 a 1920 px). Nasaď až po „nasaď“. Stav a seznam změn zapiš do ODPOVED-PRO-CLAUDE.md.

## A. Vzhled

**1. Dlaždice apartmánů (krok Apartmány i „Mohly by vám sedět také“ ve výsledku dotazníku)**
- Všechny dlaždice stejně vysoké, fotka vždy nahoře na stejném místě a ve stejné výšce (u „Celá galerie“ je dnes posunutá dolů).
- Pod fotkou název na jeden řádek, pod ním řádek s cenou nebo „obsazeno“. Stejná výška textové části u všech, i když řádek chybí.
- Cena i „obsazeno“ mají stejné odsazení zleva jako název (dnes jsou nalepené na levém okraji). Cena zlatě, „obsazeno“ tlumeně.
- V dlaždici zkrácený název V5: cs Tlumené tóny · en Muted Tones · de Gedämpfte Töne · pl Stonowane barwy · uk Приглушені тони · zh-Hant 柔和色調 · es Tonos suaves · fr Tons feutrés · it Toni tenui · pt Tons suaves · sv Dämpade toner · hu Tompa tónusok · da Dæmpede toner. Jinde plný název.

**13. Notebook / širší obrazovka – dnes „tragédie“**
- Celá poptávka (všechny kroky, výběr jazyka, výsledek dotazníku) je na širší obrazovce **jeden sloupec uprostřed, max. šířka 520 px**, kolem tmavé pozadí. Vypadá stejně jako na telefonu.
- Fotky v dlaždicích se nesmí roztáhnout do pruhů přes celou šířku.

**14. Obsazený apartmán v dlaždici** musí být vidět na první pohled: celá dlaždice ztlumená (průhlednost ~40 %), štítek „obsazeno“ v rohu fotky, nejde vybrat. Dnes vypadá stejně jako volný.

**15. Výběr jazyka – roletka, ne dlaždice**
- Obrazovku s 13 dlaždicemi jazyků **zruš**. Při prvním otevření odkazu `?od=` místo ní obrazovka podle `nahled-vyber-jazyka.html` **varianta C**: fotka zahrady, logo, „Vyberte jazyk“, **jedno pole s rozbalovací nabídkou** (🇨🇿 Čeština ▾, předvybraný jazyk doporučitele) a zlaté tlačítko Pokračovat.
- **V každém kroku všech druhů poptávky** (věrný, doporučený, běžná, firma, dotazník, výsledek, kontakt, děkujeme) je vpravo nahoře malá roletka „🌐 CS ▾“. Klepnutí otevře seznam 13 jazyků (vlajka + název v daném jazyce), výběr přepne celou stránku a zůstane zachovaný termín i vyplněné údaje.

## B. Kalendář

**9. Den odjezdu:** jakýkoli den jde zvolit jako odjezd, i když je ten den „plno“, pokud je noc před ním volná (příklad: 26.→27. 11. ve Zlaté rovnováze musí jít).

**10. Jasně noci, ne dny**
- Příjezd plně zlatě, dny mezi zlatě slabě, odjezd jen zlatým rámečkem a **bez ceny**.
- Po prvním klepnutí pod kalendářem: „Teď vyberte den odjezdu“.
- Po druhém klepnutí: „25.–26. 11. · 1 noc“ (počet nocí vždy napsaný).
- Cena pod dnem = cena za noc z toho dne.

**11. Proč termín nejde:** když žádný apartmán není volný na všechny noci termínu, nepouštěj potichu. Ukaž: „V tomto termínu nemáme jeden apartmán volný na všechny noci.“ + tlačítko „Ukázat nejbližší volný termín“ (stejná délka pobytu, nejbližší před i po).

**12. Minulé dny** (před dneškem): jen tlumené číslo, bez „plno“, bez ceny, nejde vybrat.

## C. Obsazenost

**2. Výsledek dotazníku**
- „Nejsilnější shoda“ se vybírá **jen z apartmánů volných v termínu hosta**.
- Pokud by hostovi víc seděl apartmán, který je obsazený, ukaž ho pod tím se štítkem „Ve vašem termínu obsazeno“ a tlačítkem „Kdy je volný?“ → 3 nejbližší volné termíny stejné délky (před i po). Klepnutí termín změní a host pokračuje s tím apartmánem.
- V „Mohly by vám sedět také“ obsazené ztlumené se štítkem „obsazeno“, nejdou vybrat.

**6. Pojistka před odesláním:** těsně před odesláním poptávky server znovu ověří, že zvolený apartmán (nebo aspoň jeden u „Kterýkoli volný“) je volný ve všech nocích. Když ne: poptávka neodejde, host vidí „Tento apartmán je ve vašem termínu obsazený.“ a nabídku volného apartmánu nebo jiného termínu. (Dnes odešla poptávka na V1 25.–26. 11., i když je V1 obsazená.)

## D. Telefon

**3. Automatické doplnění telefonu:** číslo vybrané z nabídky telefonu se musí uložit stejně jako napsané a po opuštění pole zůstat (dnes se vrátí na ručně napsaný začátek). Když doplnění vloží celé číslo s +420 / 00420, předvolbu nastav sama a v poli nech zbytek. Pole čísla `autocomplete="tel-national"`, `inputmode="tel"`.

**4. Chybová hláška telefonu jen jednou** (pod polem), ne i nad tlačítkem Odeslat.

**5. Bílé kolečko se šipkou v poli telefonu** – pokud je z naší aplikace (datalist / rozbalovací nabídka), odstraň ho. Číslo nesmí nic zakrývat.

## E. Poptávka pro nás

**7. Odkaz z Telegramu otevře přímo tu poptávku** v Přehledu (dnes vede jen na /prehled a poptávka nejde otevřít). Detail poptávky: termín, počet nocí, apartmán, cena za pobyt a sleva, odkud host přišel (věrný / doporučení + od koho / web / firma), jazyk, telefon, poznámka. Tlačítka: Zavolat, WhatsApp, Potvrdit termín.

**8. Zpráva v Telegramu:** datum česky („25.–26. 11. · 1 noc“), apartmán názvem, cena se slevou („1 473 Kč, sleva 5 %“), odkud („doporučení od: jméno“ / „věrný host“ / „web“ / „firma“), jazyk hosta. Zkušební poptávky (TESTPOMAJ apod.) označ „ZKOUŠKA“.

## Kontrola na konci
- Poptávka přes `?od=` na telefonu i notebooku: dlaždice zarovnané, obsazené ztlumené, sloupec max 520 px.
- Kalendář: 26.→27. 11. jde (1 noc, Zlatá rovnováha), 25.→27. 11. ukáže hlášku z bodu 11, minulé dny tlumené.
- Dotazník s termínem 25.–26. 11. nedoporučí V1.
- Poptávka na obsazený apartmán neodejde.
- Telefon z automatického doplnění zůstane vyplněný.
- Telegram: odkaz otevře detail poptávky, zpráva má cenu a odkud.
- Jazyk: roletka v každém kroku, přepnutí nesmaže termín ani údaje; žádná obrazovka s dlaždicemi jazyků.
