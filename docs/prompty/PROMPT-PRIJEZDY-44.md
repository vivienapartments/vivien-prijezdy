PROMPT PŘÍJEZDY-44: WhatsApp vždy první, s ikonou, i u zpráv po předání

Úsporný režim: bez prohlížeče a snímků, neprocházej celé repo, piš stručně. Build, test, commit, push, Ready. PROMPT-*.md necommituj.

## Problém
Po předání (a v Detail ▾) má menu zpráv jen „Zkopírovat zprávu“ (`PrehledClient.tsx` ~ř. 1478, `kopirovatZpravu`). Nikol chce poslat třeba „Je vše v pořádku?“ nebo „Dotaz na odjezd“ a musí kopírovat a ručně otevírat WhatsApp.

## Oprava
1. **Všude, kde je menu zpráv s přepínači** (hlavní náhled před předáním, Detail ▾ po předání, seznam odjezdů 18:00, seznam „Je vše v pořádku?“ 11:00, nabídka po Uklizeno), jsou tlačítka v tomto pořadí:
   1. **WhatsApp** (zelené, s ikonou WhatsApp vlevo): otevře WhatsApp s **vybranou** zprávou (stejně jako `odkazWhatsAppPrehled` u odjezdů). Zapíše do historie.
   2. **Poslat e-mailem** (s potvrzením, jak je dnes), jen když má host e-mail.
   3. **Zkopírovat zprávu** (šedé, nejméně výrazné).
2. Ikona: malé inline SVG logo WhatsApp (bílé na zeleném #25D366), žádný externí soubor ani knihovna. Jedna komponenta `TlacitkoWhatsApp`, použij ji všude místo dnešních „Napsat na WhatsApp“.
3. V menu zpráv po předání musí být k výběru i **„Je vše v pořádku?“** a **„Dotaz na odjezd“** (texty už existují), předvybraná podle dne: den po příjezdu „Je vše v pořádku?“, den před odjezdem „Dotaz na odjezd“, jinak žádná.
4. Když host nemá WhatsApp číslo, tlačítko WhatsApp ukaž šedé s textem „Chybí telefon“ a nech e-mail a kopírování.

Na konci 2 věty.
