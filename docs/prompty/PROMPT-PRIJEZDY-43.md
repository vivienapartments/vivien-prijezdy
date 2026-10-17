PROMPT PŘÍJEZDY-43: dřívější příjezd do stejného výběru času (ne velká tlačítka)

Dělej po 42. Malá úprava průvodce. Platí `psani-pro-lidi.mdc`. Build, testy, push, Ready. Piš stručně.

## Co je špatně
V červeném rámečku průvodce pod „Vyberte přibližný čas“ je teď 6 velkých tlačítek „11:00 · dřívější příjezd +450 Kč (potvrdíme)“ … „13:30 · +75 Kč“ a teprve pod nimi rozbalovací „Vyberte čas“. Na mobilu to zabere celou obrazovku a host musí rolovat k běžným časům.

## Oprava
- **Zruš velká tlačítka.** Dřívější časy dej do **stejného rozbalovacího seznamu** „Vyberte čas“, stejně jako jsou tam pozdní příjezdy s příplatkem.
- Seznam rozděl skupinami (`<optgroup>`), přelož:
  - **Dřívější příjezd (potvrdíme)**: 11:00 · +450 Kč … 13:30 · +75 Kč (jen časy, které dnes dávají smysl podle úklidu, jak je to v 38)
  - **Běžný příjezd**: 14:00 … 20:00
  - **Pozdní příjezd**: 20:30 · +100 Kč … 23:00 (beze změny)
- Výchozí pozice seznamu po otevření ať je u 14:00, ne nahoře u 11:00.
- Po výběru dřívějšího času pod seznamem malým písmem: „Dřívější příjezd vám potvrdíme, jakmile bude apartmán připravený.“
- Zelený rámeček „Váš apartmán je už připravený“ po „Uklizeno“ ponech, jen i v něm použij seznam místo tlačítek.
- Totéž v sekci „Dřívější příjezd a pozdější odjezd“ a ve výběru času odjezdu (pozdější odjezd do stejného seznamu se skupinou „Pozdější odjezd (potvrdíme)“).
- Logika cen, potvrzení a nedoplatků se nemění.

Snímek průvodce na mobilu: zavřený a otevřený seznam.

## Doplnění (majitel) – PLATÍ PŘEDNOSTNĚ, přepisuje body výše, kde se liší
1. **Dřívější příjezd je nahoře v seznamu**: skupina „Dřívější příjezd (potvrdíme)“ je první, pak běžný, pak pozdní. Seznam se otevírá normálně odshora (bod „výchozí pozice u 14:00“ neplatí).
2. **Samostatnou sekci „Dřívější příjezd a pozdější odjezd“ v průvodci zruš** (z 38). Stačí rozbalovací seznam.
3. **Zelený rámeček „Váš apartmán je už připravený“ zruš.** Po „Uklizeno“ jen zpráva hostovi, ta ho pošle do průvodce změnit čas příjezdu.
4. **Odkaz ve zprávě po „Uklizeno“** (e-mail i WhatsApp) vede přímo na výběr času příjezdu v průvodci (kotva `#cas-prijezdu`). Když host čas už zadal, jde změnit tamtéž.
5. **Nový text zprávy po „Uklizeno“** (`textPripraveno` v `okno-pobytu.ts`), přelož do všech jazyků, pořadí vět zachovej:
   > Dobrý den, máme pro vás dobrou zprávu. Váš apartmán je už uklizený a připravený. Pokud byste chtěli přijet dřív než ve 14:00, stačí si v průvodci změnit čas příjezdu. Dřívější časy najdete hned nahoře:
   > {odkaz}
   >
   > Moc se na vás těšíme.
   > Nikol a rodina VIVIEN

   Ve zprávě žádné částky ani zmínka o penězích (cena je vidět až v seznamu v průvodci).

   en: „Hello, we have good news for you. Your apartment is already cleaned and ready. If you would like to arrive earlier than 14:00, just change your arrival time in the guide. You will find the earlier times right at the top: {link} / We are very much looking forward to seeing you. / Nikol and the VIVIEN family“
6. Potvrzení majitelem (Potvrdit / Nelze) a příplatek do Plateb zůstávají jako dnes.
