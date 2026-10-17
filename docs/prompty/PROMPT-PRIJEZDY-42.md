PROMPT PŘÍJEZDY-42: oprava nedoplatků, zpráva „Je vše v pořádku?“, stálí hosté, měsíční souhrn poplatku z pobytu

Majitel je pryč, pracuj samostatně. Platí paměť projektu a `psani-pro-lidi.mdc`. Provoz je ostrý.

## Pevná pravidla
- Hostům nic neposílej. Aplikace jen připraví zprávu, odesílá majitel.
- Ruční údaje majitele jsou svaté. Nic nemaž z Upstash.
- **Šetři Upstash:** žádné nové čtení po jednom klíči, používej seznam rezervací, který se v běhu čte jednou (707814a). Nové kontroly v `/api/zpracuj` ať sahají do úložiště jen ve svůj čas.
- **Dělej části v tomhle pořadí a každou nasaď zvlášť** (build, testy, push, Ready). Když dojde limit, ať je hotové a nasazené aspoň to, co je výš.
- Piš stručně. Na konci jedna souhrnná zpráva a snímky.

## A. Oprava: Nedoplatky jen u hostů, kteří už přijeli (malé, první)
- `src/app/prehled/ZalozkyPrehledu.tsx` (`const dluhy = seradNedoplatky(...)`): do filtru přidej `r.prijezd && r.prijezd <= dnes`.
- Totéž pro číslo u záložky Nedoplatky, ranní souhrn 7:30 a pondělní souhrn starších nedoplatků.
- Budoucí hosté se tam neukazují, na kartě se částka vede dál. Zrušené nikdy.
- Test: host s příjezdem zítra a poplatkem 400 Kč v Nedoplatcích není.

## B. Zpráva „Je vše v pořádku?“ den po příjezdu v 11:00
Majitel tuhle zprávu už posílá ručně, chce ji mít v aplikaci jako dotaz na odjezd v 18:00 (prompt 36).
- Komu: hosté, kteří **včera přijeli**, jsou předaní a **dnes neodjíždějí**. Nezrušení.
- V 11:00 push majiteli i Nikol: „Pošlete 2 hostům dotaz, jestli je vše v pořádku.“ Ťuknutí otevře seznam (stejný vzhled jako „Zítřejší odjezdy“): jméno · apartmán · „Napsat na WhatsApp“ · „Poslat e-mailem“ (s potvrzením) · po odeslání „Odesláno {čas}“ a zápis do historie. Každý host zvlášť.
- Zprávu dej i do menu zpráv na kartě.
- Text dej do **jedné konstanty**, majitel ho možná nahradí svým (pošle screenshot). Zatím tento:
  > Dobrý den, chtěli jsme se zeptat, jestli je u nás všechno v pořádku a jestli jste se dobře vyspali. Kdybyste cokoli potřebovali, stačí napsat nebo zavolat na [skryto].
  >
  > Přejeme vám krásný den.
  > Nikol a rodina VIVIEN
- en: „Hello, we wanted to ask if everything is fine and if you slept well. If you need anything, just write or call us at [skryto]. / Have a lovely day. / Nikol and the VIVIEN family“. Přelož do všech jazyků, pořadí vět zachovej.
- Čas 11:00 do konfigurace. Push jen jednou denně, jen když je komu psát.

## C. Stálí hosté
- Při načtení přehledu porovnej hosta s ostatními kartami (uchovávají se 24 měsíců): shoda **telefonu** (normalizovaný, s předvolbou) nebo **e-mailu** (mimo Booking relay `@guest.booking.com`, ty jsou pro každou rezervaci jiné), případně **jméno + příjmení + stejná země** jako slabší shoda.
- Na kartě a v seznamu příjezdů štítek **„Stálý host · 2. pobyt · naposledy 3/2026, V3“**. U slabší shody (jen jméno) „Možná stálý host“ šedě.
- V Detailu seznam předchozích pobytů (datum, apartmán, ťuknutím otevře kartu).
- Počítej v paměti z už načteného seznamu, žádné nové dotazy do Upstash.
- Starší pobyty (před dneškem smazané) nevidíme, to je v pořádku.

## D. Měsíční souhrn poplatku z pobytu
Podklad pro hlášení městu, ať majitel nic nesčítá ručně.
- V přehledu (záložka Hledat nebo malé tlačítko dole) **„Poplatek z pobytu · souhrn“** s výběrem měsíce (výchozí minulý měsíc) a také čtvrtletí.
- Počítej jen rezervace s `poplatek === 'ano'`, nezrušené. Noci **rozděl podle měsíce**, ve kterém noc je (pobyt 30. 10.–2. 11. = 2 noci v říjnu, 1 v listopadu).
- Tabulka po apartmánech V1–V5 a celkem: počet pobytů · osob · nocí · osobonocí · částka (osobonoci × 50 Kč) · vybráno / nevybráno (podle Zaplaceno u položky poplatku).
- Pod tím seznam pobytů: rezervace · jméno · termín · osob · noci v měsíci · částka · stav platby.
- Zvlášť počet rezervací s „poplatek ne“ a „poplatek neznámo“ v tom měsíci (ať majitel ví, co doplnit).
- Tlačítko **„Stáhnout CSV“** (UTF-8 s BOM, středník, ať se to otevře v Excelu česky).
- Pod tabulkou malým písmem: „Souhrn je z údajů v aplikaci. Před odesláním na úřad porovnejte s Better Hotelem.“
- Jen pro přihlášeného majitele.
- Testy: pobyt přes konec měsíce, zrušená rezervace, poplatek ne, CSV.

## Na konci
Napiš mi stručně, co je hotové a nasazené (A–D), co ne, a pošli snímky: Nedoplatky bez budoucích, seznam „Je vše v pořádku?“, štítek stálého hosta, souhrn poplatku. Kolik z limitu jsi spotřeboval, pokud to vidíš.
