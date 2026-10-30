/**
 * Prompt 54 · stupňované zprávy hostům (schválená pravidla majitele, texty připravil Claude).
 * 1 = normální, 2 = ostřejší, 3 = důrazný (jen pravdivé důsledky). Nic se neposílá samo.
 */
import type { GuideLang } from './types';

/** A1 · chybí check-in, 1. stupeň (normální). {odkaz} = stávající věta podle zdroje rezervace (vetaCheckinu). */
/** Dovětek: po check-inu otevřít průvodce a vyplnit čas a způsob příjezdu (schválil majitel 30. 10.). */
export const ZPRAVA_CHECKIN_1: Record<GuideLang, string> = {
  cs: "Dobrý den, před příjezdem je ještě potřeba vyplnit online check-in. Hned po něm vám pošleme průvodce s PINy. Vyplnění zabere jen chvilku. {odkaz}\n\nPo check-inu vám hned přijde průvodce k příjezdu. Otevřete ho prosím a vyplňte v něm čas a způsob příjezdu. Teprve pak je vše hotové.",
  en: "Hello, before your arrival you still need to complete the online check-in. Right after that we will send you the guide with the PIN codes. It only takes a moment. {odkaz}\n\nRight after the check-in you will receive your arrival guide. Please open it and fill in your arrival time and how you are coming. Only then is everything done.",
  de: "Guten Tag, vor Ihrer Anreise ist noch der Online-Check-in nötig. Gleich danach schicken wir Ihnen den Führer mit den PINs. Das dauert nur einen Moment. {odkaz}\n\nDirekt nach dem Check-in erhalten Sie Ihren Anreiseführer. Bitte öffnen Sie ihn und tragen Sie dort Ihre Ankunftszeit und die Art der Anreise ein. Erst dann ist alles erledigt.",
  pl: "Dzień dobry, przed przyjazdem trzeba jeszcze wypełnić odprawę online. Zaraz potem wyślemy Wam przewodnik z kodami PIN. Zajmie to tylko chwilę. {odkaz}\n\nZaraz po odprawie otrzymacie przewodnik przyjazdu. Prosimy go otworzyć i podać w nim godzinę oraz sposób przyjazdu. Dopiero wtedy wszystko jest gotowe.",
  uk: "Добрий день, перед приїздом ще потрібно заповнити онлайн-реєстрацію. Одразу після неї ми надішлемо вам путівник із PIN-кодами. Це займе лише хвилинку. {odkaz}\n\nОдразу після реєстрації ви отримаєте путівник до приїзду. Будь ласка, відкрийте його та вкажіть у ньому час і спосіб приїзду. Лише тоді все буде готово.",
  'zh-Hant': "您好，抵達前還需要完成線上入住登記。完成後我們會立刻寄給您含 PIN 碼的指南。只需要一點時間。{odkaz}\n\n完成入住登記後，您會立刻收到抵達指南。請打開指南，填寫抵達時間與抵達方式。這樣才算全部完成。",
  sv: "Hej, före ankomsten behöver ni fortfarande fylla i incheckningen online. Direkt efter skickar vi guiden med PIN-koderna. Det tar bara en stund. {odkaz}\n\nDirekt efter incheckningen får ni er ankomstguide. Öppna den och fyll i ankomsttid och hur ni kommer. Först då är allt klart.",
  es: "Hola, antes de su llegada todavía tienen que completar el check-in online. Justo después les enviaremos la guía con los códigos PIN. Solo lleva un momento. {odkaz}\n\nJusto después del check-in recibirán su guía de llegada. Ábranla, por favor, e indiquen en ella la hora y el modo de llegada. Solo entonces estará todo listo.",
  fr: "Bonjour, avant votre arrivée, il reste à faire l’enregistrement en ligne. Juste après, nous vous enverrons le guide avec les codes PIN. Cela ne prend qu’un instant. {odkaz}\n\nJuste après l’enregistrement, vous recevrez votre guide d’arrivée. Merci de l’ouvrir et d’y indiquer votre heure et votre mode d’arrivée. C’est seulement alors que tout sera prêt.",
  it: "Buongiorno, prima dell’arrivo è ancora necessario completare il check-in online. Subito dopo vi invieremo la guida con i codici PIN. Ci vuole solo un attimo. {odkaz}\n\nSubito dopo il check-in riceverete la guida all’arrivo. Apritela e indicate l’orario e il modo di arrivo. Solo allora sarà tutto pronto.",
  hu: "Jó napot, érkezés előtt még ki kell tölteni az online bejelentkezést. Utána rögtön elküldjük a PIN-kódos útmutatót. Csak egy pillanat. {odkaz}\n\nA bejelentkezés után rögtön megkapják az érkezési útmutatót. Kérjük, nyissák meg, és adják meg benne az érkezés idejét és módját. Csak ezután van minden kész.",
};

/** A2 · chybí check-in, 2. stupeň (ostřejší). */
export const ZPRAVA_CHECKIN_2: Record<GuideLang, string> = {
  cs: "Dobrý den, online check-in od vás stále nemáme. Bez něj vám nemůžeme poslat průvodce s PINy a nebudeme vás moci ubytovat. Vyplňte ho prosím co nejdříve. {odkaz}\n\nPo check-inu vám hned přijde průvodce k příjezdu. Otevřete ho prosím a vyplňte v něm čas a způsob příjezdu. Teprve pak je vše hotové.",
  en: "Hello, we still do not have your online check-in. Without it we cannot send you the guide with the PIN codes and we will not be able to accommodate you. Please complete it as soon as possible. {odkaz}\n\nRight after the check-in you will receive your arrival guide. Please open it and fill in your arrival time and how you are coming. Only then is everything done.",
  de: "Guten Tag, Ihr Online-Check-in fehlt uns immer noch. Ohne ihn können wir Ihnen den Führer mit den PINs nicht schicken und Sie nicht unterbringen. Bitte füllen Sie ihn so bald wie möglich aus. {odkaz}\n\nDirekt nach dem Check-in erhalten Sie Ihren Anreiseführer. Bitte öffnen Sie ihn und tragen Sie dort Ihre Ankunftszeit und die Art der Anreise ein. Erst dann ist alles erledigt.",
  pl: "Dzień dobry, wciąż nie mamy od Was odprawy online. Bez niej nie możemy wysłać przewodnika z kodami PIN ani Was zakwaterować. Prosimy wypełnić ją jak najszybciej. {odkaz}\n\nZaraz po odprawie otrzymacie przewodnik przyjazdu. Prosimy go otworzyć i podać w nim godzinę oraz sposób przyjazdu. Dopiero wtedy wszystko jest gotowe.",
  uk: "Добрий день, ми досі не маємо вашої онлайн-реєстрації. Без неї ми не можемо надіслати путівник із PIN-кодами і не зможемо вас поселити. Будь ласка, заповніть її якнайшвидше. {odkaz}\n\nОдразу після реєстрації ви отримаєте путівник до приїзду. Будь ласка, відкрийте його та вкажіть у ньому час і спосіб приїзду. Лише тоді все буде готово.",
  'zh-Hant': "您好，我們仍未收到您的線上入住登記。沒有登記，我們無法寄出含 PIN 碼的指南，也無法讓您入住。請盡快完成。{odkaz}\n\n完成入住登記後，您會立刻收到抵達指南。請打開指南，填寫抵達時間與抵達方式。這樣才算全部完成。",
  sv: "Hej, vi har fortfarande inte fått er incheckning online. Utan den kan vi inte skicka guiden med PIN-koderna och kan inte ta emot er. Fyll i den så snart som möjligt. {odkaz}\n\nDirekt efter incheckningen får ni er ankomstguide. Öppna den och fyll i ankomsttid och hur ni kommer. Först då är allt klart.",
  es: "Hola, todavía no tenemos su check-in online. Sin él no podemos enviarles la guía con los códigos PIN ni alojarles. Complétenlo lo antes posible, por favor. {odkaz}\n\nJusto después del check-in recibirán su guía de llegada. Ábranla, por favor, e indiquen en ella la hora y el modo de llegada. Solo entonces estará todo listo.",
  fr: "Bonjour, nous n’avons toujours pas votre enregistrement en ligne. Sans lui, nous ne pouvons pas vous envoyer le guide avec les codes PIN ni vous héberger. Merci de le faire au plus vite. {odkaz}\n\nJuste après l’enregistrement, vous recevrez votre guide d’arrivée. Merci de l’ouvrir et d’y indiquer votre heure et votre mode d’arrivée. C’est seulement alors que tout sera prêt.",
  it: "Buongiorno, non abbiamo ancora il vostro check-in online. Senza di esso non possiamo inviarvi la guida con i codici PIN né ospitarvi. Completatelo il prima possibile, per favore. {odkaz}\n\nSubito dopo il check-in riceverete la guida all’arrivo. Apritela e indicate l’orario e il modo di arrivo. Solo allora sarà tutto pronto.",
  hu: "Jó napot, az online bejelentkezésük még mindig nincs meg. Enélkül nem tudjuk elküldeni a PIN-kódos útmutatót, és nem tudjuk önöket elszállásolni. Kérjük, töltsék ki minél előbb. {odkaz}\n\nA bejelentkezés után rögtön megkapják az érkezési útmutatót. Kérjük, nyissák meg, és adják meg benne az érkezés idejét és módját. Csak ezután van minden kész.",
};

/** A3 · chybí check-in, 3. stupeň (den před / den příjezdu, důrazný). */
export const ZPRAVA_CHECKIN_3: Record<GuideLang, string> = {
  cs: "Dobrý den, bez vyplněného online check-inu vás nemůžeme ubytovat. Pokud ho nevyplníte před příjezdem, apartmán vám nebudeme moci předat. Vyplňte ho prosím hned. {odkaz}\n\nPo check-inu vám hned přijde průvodce k příjezdu. Otevřete ho prosím a vyplňte v něm čas a způsob příjezdu. Teprve pak je vše hotové.",
  en: "Hello, without the completed online check-in we cannot accommodate you. If it is not completed before your arrival, we will not be able to hand over the apartment. Please complete it right away. {odkaz}\n\nRight after the check-in you will receive your arrival guide. Please open it and fill in your arrival time and how you are coming. Only then is everything done.",
  de: "Guten Tag, ohne ausgefüllten Online-Check-in können wir Sie nicht unterbringen. Wenn er vor Ihrer Ankunft nicht ausgefüllt ist, können wir Ihnen das Apartment nicht übergeben. Bitte füllen Sie ihn sofort aus. {odkaz}\n\nDirekt nach dem Check-in erhalten Sie Ihren Anreiseführer. Bitte öffnen Sie ihn und tragen Sie dort Ihre Ankunftszeit und die Art der Anreise ein. Erst dann ist alles erledigt.",
  pl: "Dzień dobry, bez wypełnionej odprawy online nie możemy Was zakwaterować. Jeśli nie wypełnicie jej przed przyjazdem, nie będziemy mogli przekazać Wam apartamentu. Prosimy wypełnić ją od razu. {odkaz}\n\nZaraz po odprawie otrzymacie przewodnik przyjazdu. Prosimy go otworzyć i podać w nim godzinę oraz sposób przyjazdu. Dopiero wtedy wszystko jest gotowe.",
  uk: "Добрий день, без заповненої онлайн-реєстрації ми не можемо вас поселити. Якщо ви не заповните її до приїзду, ми не зможемо передати вам апартаменти. Будь ласка, заповніть її негайно. {odkaz}\n\nОдразу після реєстрації ви отримаєте путівник до приїзду. Будь ласка, відкрийте його та вкажіть у ньому час і спосіб приїзду. Лише тоді все буде готово.",
  'zh-Hant': "您好，沒有完成線上入住登記，我們無法讓您入住。若抵達前仍未完成，我們將無法交付公寓。請立即完成。{odkaz}\n\n完成入住登記後，您會立刻收到抵達指南。請打開指南，填寫抵達時間與抵達方式。這樣才算全部完成。",
  sv: "Hej, utan ifylld incheckning online kan vi inte ta emot er. Om den inte är ifylld före ankomsten kan vi inte lämna över lägenheten. Fyll i den genast. {odkaz}\n\nDirekt efter incheckningen får ni er ankomstguide. Öppna den och fyll i ankomsttid och hur ni kommer. Först då är allt klart.",
  es: "Hola, sin el check-in online completado no podemos alojarles. Si no lo completan antes de llegar, no podremos entregarles el apartamento. Complétenlo ahora mismo, por favor. {odkaz}\n\nJusto después del check-in recibirán su guía de llegada. Ábranla, por favor, e indiquen en ella la hora y el modo de llegada. Solo entonces estará todo listo.",
  fr: "Bonjour, sans enregistrement en ligne complété, nous ne pouvons pas vous héberger. S’il n’est pas fait avant votre arrivée, nous ne pourrons pas vous remettre l’appartement. Merci de le faire tout de suite. {odkaz}\n\nJuste après l’enregistrement, vous recevrez votre guide d’arrivée. Merci de l’ouvrir et d’y indiquer votre heure et votre mode d’arrivée. C’est seulement alors que tout sera prêt.",
  it: "Buongiorno, senza il check-in online completato non possiamo ospitarvi. Se non lo completate prima dell’arrivo, non potremo consegnarvi l’appartamento. Completatelo subito, per favore. {odkaz}\n\nSubito dopo il check-in riceverete la guida all’arrivo. Apritela e indicate l’orario e il modo di arrivo. Solo allora sarà tutto pronto.",
  hu: "Jó napot, kitöltött online bejelentkezés nélkül nem tudjuk önöket elszállásolni. Ha érkezés előtt nem töltik ki, nem tudjuk átadni az apartmant. Kérjük, töltsék ki azonnal. {odkaz}\n\nA bejelentkezés után rögtön megkapják az érkezési útmutatót. Kérjük, nyissák meg, és adják meg benne az érkezés idejét és módját. Csak ezután van minden kész.",
};

/** B1 · check-in hotový, průvodce nedokončený. Pevný text, kroky jsou vždy stejné (čas, způsob příjezdu, pravidla). */
export const ZPRAVA_PRUVODCE_1: Record<GuideLang, string> = {
  cs: "Dobrý den, online check-in máte hotový, děkujeme. V průvodci k příjezdu na vás čekají vstupní PINy do domu a apartmánu. Abyste se k nim dostali, otevřete prosím průvodce, vyplňte čas a způsob příjezdu a potvrďte pravidla. Zabere to minutu.",
  en: "Hello, your online check-in is done, thank you. Your entry PIN codes for the house and the apartment are waiting in your arrival guide. To reach them, please open the guide, fill in your arrival time and how you are coming, and confirm the house rules. It takes a minute.",
  de: "Guten Tag, Ihr Online-Check-in ist erledigt, danke. In Ihrem Anreiseführer warten die Eingangs-PINs für Haus und Apartment auf Sie. Um sie zu erhalten, öffnen Sie bitte den Führer, tragen Sie Ankunftszeit und Art der Anreise ein und bestätigen Sie die Hausregeln. Das dauert eine Minute.",
  pl: "Dzień dobry, odprawę online macie już za sobą, dziękujemy. W przewodniku przyjazdu czekają na Was kody PIN do domu i apartamentu. Aby się do nich dostać, otwórzcie przewodnik, podajcie godzinę i sposób przyjazdu oraz potwierdźcie regulamin. Zajmie to minutę.",
  uk: "Добрий день, онлайн-реєстрацію ви вже пройшли, дякуємо. У путівнику до приїзду на вас чекають вхідні PIN-коди до будинку та апартаментів. Щоб їх отримати, відкрийте путівник, вкажіть час і спосіб приїзду та підтвердіть правила. Це займе хвилину.",
  'zh-Hant': "您好，您已完成線上入住登記，謝謝。抵達指南中有房子與公寓的入口 PIN 碼在等著您。請打開指南，填寫抵達時間與抵達方式，並確認住宿規則，即可取得。只需一分鐘。",
  sv: "Hej, er incheckning online är klar, tack. I ankomstguiden väntar PIN-koderna till huset och lägenheten. För att nå dem, öppna guiden, fyll i ankomsttid och hur ni kommer och bekräfta husreglerna. Det tar en minut.",
  es: "Hola, su check-in online ya está hecho, gracias. En la guía de llegada les esperan los códigos PIN de la casa y del apartamento. Para acceder a ellos, abran la guía, indiquen la hora y el modo de llegada y confirmen las normas. Lleva un minuto.",
  fr: "Bonjour, votre enregistrement en ligne est fait, merci. Dans votre guide d’arrivée vous attendent les codes PIN d’entrée de la maison et de l’appartement. Pour y accéder, ouvrez le guide, indiquez votre heure et votre mode d’arrivée et confirmez le règlement. Cela prend une minute.",
  it: "Buongiorno, il check-in online è fatto, grazie. Nella guida all’arrivo vi aspettano i codici PIN di ingresso della casa e dell’appartamento. Per accedervi, aprite la guida, indicate l’orario e il modo di arrivo e confermate le regole. Ci vuole un minuto.",
  hu: "Jó napot, az online bejelentkezés megvan, köszönjük. Az érkezési útmutatóban várják önöket a ház és az apartman belépő PIN-kódjai. Ahhoz, hogy hozzájuk férjenek, nyissák meg az útmutatót, adják meg az érkezés idejét és módját, és fogadják el a házirendet. Egy perc az egész.",
};

/** B2 · průvodce, 2. stupeň. */
export const ZPRAVA_PRUVODCE_2: Record<GuideLang, string> = {
  cs: "Dobrý den, v průvodci k příjezdu nám stále chybí čas a způsob příjezdu a potvrzení pravidel. Bez toho nevíme, kdy vás čekat, a vstupní PINy vám nemůžeme zpřístupnit. Otevřete prosím průvodce a doplňte to co nejdříve.",
  en: "Hello, your arrival guide is still missing your arrival time, how you are coming and the confirmation of the house rules. Without this we do not know when to expect you and we cannot make the entry PIN codes available to you. Please open the guide and complete it as soon as possible.",
  de: "Guten Tag, in Ihrem Anreiseführer fehlen uns noch Ankunftszeit, Art der Anreise und die Bestätigung der Hausregeln. Ohne diese Angaben wissen wir nicht, wann wir Sie erwarten sollen, und können Ihnen die Eingangs-PINs nicht freigeben. Bitte öffnen Sie den Führer und ergänzen Sie das so bald wie möglich.",
  pl: "Dzień dobry, w przewodniku przyjazdu wciąż brakuje godziny i sposobu przyjazdu oraz potwierdzenia regulaminu. Bez tego nie wiemy, kiedy na Was czekać, i nie możemy udostępnić Wam kodów PIN. Otwórzcie przewodnik i uzupełnijcie to jak najszybciej.",
  uk: "Добрий день, у путівнику досі бракує часу та способу приїзду і підтвердження правил. Без цього ми не знаємо, коли вас чекати, і не можемо надати вам вхідні PIN-коди. Будь ласка, відкрийте путівник і доповніть це якнайшвидше.",
  'zh-Hant': "您好，您的抵達指南仍缺少抵達時間、抵達方式以及住宿規則的確認。沒有這些資料，我們不知道何時迎接您，也無法提供入口 PIN 碼。請打開指南並盡快補齊。",
  sv: "Hej, i ankomstguiden saknas fortfarande ankomsttid, hur ni kommer och bekräftelse av husreglerna. Utan det vet vi inte när vi ska vänta er och kan inte göra PIN-koderna tillgängliga. Öppna guiden och fyll i det så snart som möjligt.",
  es: "Hola, en la guía de llegada todavía nos falta la hora y el modo de llegada y la confirmación de las normas. Sin ello no sabemos cuándo esperarles ni podemos facilitarles los códigos PIN. Abran la guía y complétenlo lo antes posible, por favor.",
  fr: "Bonjour, dans votre guide d’arrivée, il nous manque encore votre heure et votre mode d’arrivée ainsi que la confirmation du règlement. Sans cela, nous ne savons pas quand vous attendre et ne pouvons pas vous donner accès aux codes PIN. Merci d’ouvrir le guide et de le compléter au plus vite.",
  it: "Buongiorno, nella guida all’arrivo ci mancano ancora l’orario e il modo di arrivo e la conferma delle regole. Senza questi dati non sappiamo quando aspettarvi e non possiamo rendervi disponibili i codici PIN. Aprite la guida e completatela il prima possibile, per favore.",
  hu: "Jó napot, az érkezési útmutatóban még mindig hiányzik az érkezés ideje és módja, valamint a házirend elfogadása. Enélkül nem tudjuk, mikor várjuk önöket, és nem tudjuk elérhetővé tenni a PIN-kódokat. Kérjük, nyissák meg az útmutatót, és pótolják minél előbb.",
};

/** B3 · průvodce, den příjezdu. */
export const ZPRAVA_PRUVODCE_3: Record<GuideLang, string> = {
  cs: "Dobrý den, dnes máte přijet a v průvodci stále chybí čas a způsob příjezdu a potvrzení pravidel. Bez těchto údajů vás dnes nemůžeme ubytovat ani vám předat apartmán, a pokud přijedete autem, nezaparkujete. Pokud je nedoplníte, může to skončit jako nedojezd (no-show). Otevřete průvodce a doplňte je hned.",
  en: "Hello, you are arriving today and your guide is still missing your arrival time, how you are coming and the confirmation of the house rules. Without these details we cannot accommodate you today or hand over the apartment, and if you come by car, you will not be able to park. If they are not completed, this may end as a no-show. Open the guide and complete them right away.",
  de: "Guten Tag, Sie reisen heute an und in Ihrem Führer fehlen noch Ankunftszeit, Art der Anreise und die Bestätigung der Hausregeln. Ohne diese Angaben können wir Sie heute weder unterbringen noch Ihnen das Apartment übergeben, und wenn Sie mit dem Auto kommen, können Sie nicht parken. Wenn Sie sie nicht ergänzen, kann das als Nichtanreise (No-Show) enden. Öffnen Sie den Führer und ergänzen Sie sie sofort.",
  pl: "Dzień dobry, dziś przyjeżdżacie, a w przewodniku wciąż brakuje godziny i sposobu przyjazdu oraz potwierdzenia regulaminu. Bez tych danych nie możemy Was dziś zakwaterować ani przekazać apartamentu, a jeśli przyjedziecie autem, nie zaparkujecie. Jeśli ich nie uzupełnicie, może się to skończyć jako niestawienie się (no-show). Otwórzcie przewodnik i uzupełnijcie je od razu.",
  uk: "Добрий день, сьогодні ви приїжджаєте, а в путівнику досі бракує часу та способу приїзду і підтвердження правил. Без цих даних ми не можемо сьогодні вас поселити чи передати апартаменти, а якщо ви приїдете автомобілем, то не зможете припаркуватися. Якщо ви їх не доповните, це може закінчитися неприїздом (no-show). Відкрийте путівник і доповніть їх негайно.",
  'zh-Hant': "您好，您今天抵達，但指南中仍缺少抵達時間、抵達方式以及住宿規則的確認。沒有這些資料，我們今天無法讓您入住，也無法交付公寓；若您開車前來，也將無法停車。若未補齊，可能會被視為未入住（no-show）。請立即打開指南並補齊。",
  sv: "Hej, ni kommer i dag och i guiden saknas fortfarande ankomsttid, hur ni kommer och bekräftelse av husreglerna. Utan dessa uppgifter kan vi inte ta emot er i dag eller lämna över lägenheten, och om ni kommer med bil kan ni inte parkera. Om de inte fylls i kan det sluta som utebliven ankomst (no-show). Öppna guiden och fyll i dem genast.",
  es: "Hola, llegan hoy y en la guía todavía falta la hora y el modo de llegada y la confirmación de las normas. Sin estos datos no podemos alojarles hoy ni entregarles el apartamento, y si vienen en coche, no podrán aparcar. Si no los completan, esto puede acabar como no presentado (no-show). Abran la guía y complétenlos ahora mismo.",
  fr: "Bonjour, vous arrivez aujourd’hui et il manque encore dans votre guide votre heure et votre mode d’arrivée ainsi que la confirmation du règlement. Sans ces informations, nous ne pouvons ni vous héberger aujourd’hui ni vous remettre l’appartement, et si vous venez en voiture, vous ne pourrez pas vous garer. S’ils ne sont pas complétés, cela peut se terminer en non-présentation (no-show). Ouvrez le guide et complétez-les tout de suite.",
  it: "Buongiorno, arrivate oggi e nella guida mancano ancora l’orario e il modo di arrivo e la conferma delle regole. Senza questi dati oggi non possiamo ospitarvi né consegnarvi l’appartamento e, se arrivate in auto, non potrete parcheggiare. Se non li completate, potrebbe finire come mancata presentazione (no-show). Aprite la guida e completateli subito.",
  hu: "Jó napot, ma érkeznek, és az útmutatóban még mindig hiányzik az érkezés ideje és módja, valamint a házirend elfogadása. Ezek nélkül ma nem tudjuk önöket elszállásolni, sem átadni az apartmant, és ha autóval jönnek, nem tudnak parkolni. Ha nem pótolják, ez meg nem jelenésként (no-show) végződhet. Nyissák meg az útmutatót, és pótolják azonnal.",
};

/** E · den příjezdu, čas známe (nahrazuje DEN_CAS). */
export const ZPRAVA_DEN_CAS: Record<GuideLang, string> = {
  cs: "Dobrý den, dnes vás čekáme kolem {čas}. V tu dobu budeme u domu a počkáme na vás 10 minut. Když nám asi 15 minut předem napíšete, že jste blízko, budeme připravení přesně na váš příjezd. Kdyby se čas během cesty změnil, upravte ho v průvodci nebo nám napište.",
  en: "Hello, we are expecting you today around {čas}. We will be at the house at that time and wait for you for 10 minutes. If you message us about 15 minutes before that you are close, we will be ready exactly for your arrival. If the time changes on the way, update it in the guide or write to us.",
  de: "Guten Tag, wir erwarten Sie heute gegen {čas}. Zu dieser Zeit sind wir am Haus und warten 10 Minuten auf Sie. Wenn Sie uns etwa 15 Minuten vorher schreiben, dass Sie in der Nähe sind, sind wir genau zu Ihrer Ankunft bereit. Falls sich die Zeit unterwegs ändert, passen Sie sie im Führer an oder schreiben Sie uns.",
  pl: "Dzień dobry, dziś czekamy na Was około {čas}. O tej porze będziemy przy domu i poczekamy 10 minut. Jeśli napiszecie nam około 15 minut wcześniej, że jesteście blisko, będziemy gotowi dokładnie na Wasz przyjazd. Gdyby godzina zmieniła się w drodze, zmieńcie ją w przewodniku albo napiszcie do nas.",
  uk: "Добрий день, сьогодні чекаємо на вас близько {čas}. У цей час ми будемо біля будинку й зачекаємо 10 хвилин. Якщо приблизно за 15 хвилин напишете, що ви поруч, ми будемо готові саме до вашого приїзду. Якщо час у дорозі зміниться, змініть його в путівнику або напишіть нам.",
  'zh-Hant': "您好，我們今天約 {čas} 等您。屆時我們會在房子前等候 10 分鐘。若您約提前 15 分鐘告訴我們您快到了，我們會準時迎接您。若途中時間有變，請在指南中修改或寫信給我們。",
  sv: "Hej, vi väntar er i dag runt {čas}. Då är vi vid huset och väntar 10 minuter. Om ni skriver ungefär 15 minuter innan att ni är nära, är vi redo precis när ni kommer. Om tiden ändras under resan, ändra den i guiden eller skriv till oss.",
  es: "Hola, hoy les esperamos hacia las {čas}. A esa hora estaremos en la casa y les esperaremos 10 minutos. Si nos escriben unos 15 minutos antes que están cerca, estaremos listos justo para su llegada. Si la hora cambia durante el viaje, cámbienla en la guía o escríbannos.",
  fr: "Bonjour, nous vous attendons aujourd’hui vers {čas}. À cette heure-là, nous serons à la maison et vous attendrons 10 minutes. Si vous nous écrivez environ 15 minutes avant que vous êtes tout près, nous serons prêts pile à votre arrivée. Si l’heure change en route, modifiez-la dans le guide ou écrivez-nous.",
  it: "Buongiorno, oggi vi aspettiamo verso le {čas}. A quell’ora saremo alla casa e vi aspetteremo 10 minuti. Se ci scrivete circa 15 minuti prima che siete vicini, saremo pronti proprio per il vostro arrivo. Se l’orario cambia durante il viaggio, modificatelo nella guida o scriveteci.",
  hu: "Jó napot, ma {čas} körül várjuk önöket. Akkor a háznál leszünk, és 10 percet várunk. Ha nagyjából 15 perccel előtte megírják, hogy közel vannak, pontosan az érkezésükre készen leszünk. Ha útközben változik az idő, módosítsák az útmutatóban, vagy írjanak nekünk.",
};

/** F1 · autem, chybí telefon k bráně a SPZ. Pevný text (vždy obojí), schválil majitel 30. 10. */
export const ZPRAVA_BRANA_1: Record<GuideLang, string> = {
  cs: "Dobrý den, přijíždíte autem, ještě nám prosím v průvodci doplňte telefon, ze kterého budete otevírat bránu, a SPZ auta. Údaje musíme do brány zaregistrovat předem, bez toho nezaparkujete. Děkujeme.",
  en: "Hello, you are arriving by car, please still add in the guide the phone number you will use to open the gate and your car’s licence plate. We have to register these details at the gate in advance, otherwise you cannot park. Thank you.",
  de: "Guten Tag, Sie reisen mit dem Auto an, bitte ergänzen Sie im Führer noch die Telefonnummer, mit der Sie das Tor öffnen werden, und das Kennzeichen Ihres Autos. Wir müssen die Angaben vorab im Tor registrieren, sonst können Sie nicht parken. Danke.",
  pl: "Dzień dobry, przyjeżdżacie autem, prosimy jeszcze uzupełnić w przewodniku numer telefonu, którym będziecie otwierać bramę, oraz numer rejestracyjny auta. Dane musimy wcześniej zarejestrować w bramie, inaczej nie zaparkujecie. Dziękujemy.",
  uk: "Добрий день, ви приїжджаєте автомобілем, будь ласка, доповніть у путівнику номер телефону, з якого відкриватимете ворота, і номерний знак авто. Дані потрібно заздалегідь зареєструвати у воротах, інакше ви не зможете припаркуватися. Дякуємо.",
  'zh-Hant': "您好，您開車前來，請在指南中補上用來開啟大門的電話號碼及車牌號碼。我們必須事先在大門登記這些資料，否則無法停車。謝謝。",
  sv: "Hej, ni kommer med bil, fyll gärna i guiden telefonnumret ni öppnar grinden med och bilens registreringsnummer. Vi måste registrera uppgifterna i grinden i förväg, annars kan ni inte parkera. Tack.",
  es: "Hola, llegan en coche, añadan todavía en la guía el teléfono con el que abrirán la barrera y la matrícula del coche. Tenemos que registrar estos datos en la barrera con antelación; si no, no podrán aparcar. Gracias.",
  fr: "Bonjour, vous arrivez en voiture, merci d’ajouter encore dans le guide le numéro de téléphone avec lequel vous ouvrirez le portail et la plaque d’immatriculation de la voiture. Nous devons enregistrer ces informations au portail à l’avance, sinon vous ne pourrez pas vous garer. Merci.",
  it: "Buongiorno, arrivate in auto, aggiungete ancora nella guida il numero di telefono con cui aprirete il cancello e la targa dell’auto. Dobbiamo registrare questi dati al cancello in anticipo, altrimenti non potrete parcheggiare. Grazie.",
  hu: "Jó napot, autóval érkeznek, kérjük, pótolják még az útmutatóban a telefonszámot, amelyről a kaput nyitni fogják, és az autó rendszámát. Az adatokat előre regisztrálnunk kell a kapunál, különben nem tudnak parkolni. Köszönjük.",
};

/** F2 · brána, 2. stupeň. */
export const ZPRAVA_BRANA_2: Record<GuideLang, string> = {
  cs: "Dobrý den, stále nám chybí telefon pro bránu a SPZ auta. Bez registrace vás brána nepustí a parkovací stání vám nemůžeme zajistit. Doplňte to prosím v průvodci co nejdříve.",
  en: "Hello, we are still missing the phone number for the gate and your car’s licence plate. Without registration the gate will not let you in and we cannot secure a parking space for you. Please add them in the guide as soon as possible.",
  de: "Guten Tag, uns fehlen noch die Telefonnummer für das Tor und das Kennzeichen Ihres Autos. Ohne Registrierung lässt Sie das Tor nicht hinein und wir können Ihnen keinen Stellplatz sichern. Bitte ergänzen Sie das so bald wie möglich im Führer.",
  pl: "Dzień dobry, wciąż brakuje nam numeru telefonu do bramy i numeru rejestracyjnego auta. Bez rejestracji brama Was nie wpuści i nie możemy zapewnić Wam miejsca parkingowego. Prosimy uzupełnić to w przewodniku jak najszybciej.",
  uk: "Добрий день, нам досі бракує номера телефону для воріт і номерного знака авто. Без реєстрації ворота вас не пропустять, і ми не зможемо забезпечити вам паркомісце. Будь ласка, доповніть це в путівнику якнайшвидше.",
  'zh-Hant': "您好，我們仍缺少開門用的電話號碼及車牌號碼。未登記的話，大門不會讓您進入，我們也無法為您保留車位。請盡快在指南中補上。",
  sv: "Hej, vi saknar fortfarande telefonnumret till grinden och bilens registreringsnummer. Utan registrering släpper grinden inte in er och vi kan inte säkra en parkeringsplats åt er. Fyll i det i guiden så snart som möjligt.",
  es: "Hola, todavía nos falta el teléfono para la barrera y la matrícula del coche. Sin registro la barrera no les dejará pasar y no podemos garantizarles una plaza de aparcamiento. Añádanlo en la guía lo antes posible, por favor.",
  fr: "Bonjour, il nous manque toujours le numéro de téléphone pour le portail et la plaque d’immatriculation. Sans enregistrement, le portail ne vous laissera pas entrer et nous ne pouvons pas vous garantir de place de parking. Merci de les ajouter dans le guide au plus vite.",
  it: "Buongiorno, ci mancano ancora il numero di telefono per il cancello e la targa dell’auto. Senza registrazione il cancello non vi farà entrare e non possiamo garantirvi un posto auto. Aggiungeteli nella guida il prima possibile, per favore.",
  hu: "Jó napot, még mindig hiányzik a kapuhoz tartozó telefonszám és az autó rendszáma. Regisztráció nélkül a kapu nem engedi be önöket, és nem tudunk parkolóhelyet biztosítani. Kérjük, pótolják az útmutatóban minél előbb.",
};

/** F3 · brána, den příjezdu. */
export const ZPRAVA_BRANA_3: Record<GuideLang, string> = {
  cs: "Dobrý den, dnes přijíždíte a pořád nám chybí telefon pro bránu a SPZ auta. Bez nich vás brána parkoviště nepustí a parkovací stání vám nebudeme moci dát. Budete pak muset parkovat jinde, na vlastní náklady. Doplňte to prosím hned v průvodci.",
  en: "Hello, you are arriving today and we are still missing the phone number for the gate and your car’s licence plate. Without them the car park gate will not let you in and we will not be able to give you a parking space. You would then have to park elsewhere at your own expense. Please add them in the guide right away.",
  de: "Guten Tag, Sie reisen heute an und uns fehlen immer noch die Telefonnummer für das Tor und das Kennzeichen Ihres Autos. Ohne diese Angaben lässt Sie das Parkplatztor nicht hinein und wir können Ihnen keinen Stellplatz geben. Sie müssten dann woanders auf eigene Kosten parken. Bitte ergänzen Sie das sofort im Führer.",
  pl: "Dzień dobry, dziś przyjeżdżacie, a wciąż brakuje nam numeru telefonu do bramy i numeru rejestracyjnego auta. Bez nich brama parkingu Was nie wpuści i nie będziemy mogli dać Wam miejsca parkingowego. Będziecie wtedy musieli zaparkować gdzie indziej na własny koszt. Prosimy uzupełnić to od razu w przewodniku.",
  uk: "Добрий день, сьогодні ви приїжджаєте, а нам досі бракує номера телефону для воріт і номерного знака авто. Без них ворота паркування вас не пропустять, і ми не зможемо надати вам паркомісце. Тоді вам доведеться паркуватися деінде власним коштом. Будь ласка, доповніть це в путівнику негайно.",
  'zh-Hant': "您好，您今天抵達，我們仍缺少開門用的電話號碼及車牌號碼。沒有這些資料，停車場大門不會讓您進入，我們也無法提供車位，您將需要自費到其他地方停車。請立即在指南中補上。",
  sv: "Hej, ni kommer i dag och vi saknar fortfarande telefonnumret till grinden och bilens registreringsnummer. Utan dem släpper parkeringsgrinden inte in er och vi kan inte ge er en parkeringsplats. Ni måste då parkera någon annanstans på egen bekostnad. Fyll i det i guiden genast.",
  es: "Hola, llegan hoy y todavía nos falta el teléfono para la barrera y la matrícula del coche. Sin ellos la barrera del aparcamiento no les dejará pasar y no podremos darles una plaza. Tendrán que aparcar en otro sitio por su cuenta. Añádanlo en la guía ahora mismo, por favor.",
  fr: "Bonjour, vous arrivez aujourd’hui et il nous manque toujours le numéro de téléphone pour le portail et la plaque d’immatriculation. Sans eux, le portail du parking ne vous laissera pas entrer et nous ne pourrons pas vous attribuer de place. Vous devrez alors vous garer ailleurs à vos frais. Merci de les ajouter tout de suite dans le guide.",
  it: "Buongiorno, arrivate oggi e ci mancano ancora il numero di telefono per il cancello e la targa dell’auto. Senza questi dati il cancello del parcheggio non vi farà entrare e non potremo darvi un posto auto. Dovrete quindi parcheggiare altrove a vostre spese. Aggiungeteli subito nella guida, per favore.",
  hu: "Jó napot, ma érkeznek, és még mindig hiányzik a kapuhoz tartozó telefonszám és az autó rendszáma. Ezek nélkül a parkoló kapuja nem engedi be önöket, és nem tudunk parkolóhelyet adni. Ilyenkor máshol kell parkolniuk, saját költségen. Kérjük, pótolják azonnal az útmutatóban.",
};

/** J · dotaz na odjezd (nahrazuje text „a“ v odjezd.ts). */
export const ZPRAVA_ODJEZD: Record<GuideLang, string> = {
  cs: "Dobrý den, zítra vás čeká odjezd. Vyberte prosím v průvodci, v kolik budete odjíždět, ať se s vámi můžeme osobně rozloučit a převzít apartmán. Kdyby vám to v průvodci nešlo, napište nám čas sem. Běžný odjezd je do 10:00, pozdější po domluvě.",
  en: "Hello, your departure is tomorrow. Please choose in the guide what time you will leave, so we can say goodbye in person and take over the apartment. If it does not work in the guide, just write us the time here. Regular check-out is by 10:00, later only by agreement.",
  de: "Guten Tag, morgen steht Ihre Abreise an. Bitte wählen Sie im Führer, wann Sie abreisen, damit wir uns persönlich verabschieden und das Apartment übernehmen können. Falls es im Führer nicht klappt, schreiben Sie uns die Uhrzeit einfach hier. Regulärer Check-out bis 10:00, später nur nach Absprache.",
  pl: "Dzień dobry, jutro czeka Was wyjazd. Prosimy wybrać w przewodniku, o której będziecie wyjeżdżać, abyśmy mogli osobiście się pożegnać i odebrać apartament. Gdyby w przewodniku się nie udało, napiszcie nam godzinę tutaj. Zwykły wyjazd do 10:00, późniejszy po uzgodnieniu.",
  uk: "Добрий день, завтра у вас виїзд. Будь ласка, виберіть у путівнику, о котрій виїжджатимете, щоб ми могли особисто попрощатися й прийняти апартаменти. Якщо в путівнику не вийде, напишіть нам час тут. Звичайний виїзд до 10:00, пізніший за домовленістю.",
  'zh-Hant': "您好，您明天退房。請在指南中選擇離開的時間，方便我們親自道別並接收公寓。若在指南中無法選擇，請直接在這裡告訴我們時間。一般退房時間為 10:00 前，延後需事先說好。",
  sv: "Hej, i morgon är det dags för avresa. Välj i guiden när ni åker, så att vi kan säga hej då personligen och ta över lägenheten. Om det inte går i guiden, skriv tiden till oss här. Vanlig utcheckning senast 10:00, senare efter överenskommelse.",
  es: "Hola, mañana es su salida. Elijan en la guía a qué hora se irán, para que podamos despedirnos en persona y recoger el apartamento. Si en la guía no les funciona, escríbannos la hora aquí. La salida normal es hasta las 10:00; más tarde, solo si lo acordamos.",
  fr: "Bonjour, votre départ est demain. Merci de choisir dans le guide à quelle heure vous partirez, pour que nous puissions vous dire au revoir et reprendre l’appartement. Si cela ne fonctionne pas dans le guide, écrivez-nous simplement l’heure ici. Départ habituel avant 10:00, plus tard uniquement sur accord.",
  it: "Buongiorno, domani è il giorno della partenza. Scegliete nella guida a che ora partirete, così potremo salutarvi di persona e riprendere l’appartamento. Se nella guida non funziona, scriveteci l’orario qui. Il check-out normale è entro le 10:00, più tardi solo previo accordo.",
  hu: "Jó napot, holnap lesz a távozás. Kérjük, válasszák ki az útmutatóban, hánykor indulnak, hogy személyesen elköszönhessünk és átvehessük az apartmant. Ha az útmutatóban nem megy, írják meg nekünk itt az időpontot. A szokásos távozás 10:00-ig, később csak megbeszélés szerint.",
};

export const BRANA_TELEFON: Record<GuideLang, string> = {
  cs: "telefon, ze kterého budete otevírat bránu",
  en: "the phone number you will use to open the gate",
  de: "die Telefonnummer, mit der Sie das Tor öffnen",
  pl: "numer telefonu, z którego będziecie otwierać bramę",
  uk: "номер телефону, з якого відкриватимете ворота",
  'zh-Hant': "用來開啟大門的電話號碼",
  sv: "telefonnumret ni öppnar grinden med",
  es: "el teléfono con el que abrirán la barrera",
  fr: "le numéro de téléphone avec lequel vous ouvrirez le portail",
  it: "il numero di telefono con cui aprirete il cancello",
  hu: "a telefonszámot, amelyről a kaput nyitják",
};

export const BRANA_SPZ: Record<GuideLang, string> = {
  cs: "SPZ auta",
  en: "your licence plate",
  de: "das Kennzeichen",
  pl: "numer rejestracyjny auta",
  uk: "номерний знак авто",
  'zh-Hant': "車牌號碼",
  sv: "bilens registreringsnummer",
  es: "la matrícula del coche",
  fr: "la plaque d’immatriculation",
  it: "la targa dell’auto",
  hu: "az autó rendszámát",
};

export const BRANA_A: Record<GuideLang, string> = {
  cs: "a",
  en: "and",
  de: "und",
  pl: "i",
  uk: "та",
  'zh-Hant': "及",
  sv: "och",
  es: "y",
  fr: "et",
  it: "e",
  hu: "és",
};
/** {odkaz} bez známé URL: jedna univerzální věta pro všechny zdroje (schválil majitel 30. 10.). */
export const ODKAZ_UNIVERZALNI: Record<GuideLang, string> = {
  cs: "Odkaz vám přišel e-mailem nebo do zpráv na webu či v aplikaci, kde jste rezervovali.",
  en: "You received the link by e-mail or in your messages on the website or app where you booked.",
  de: "Den Link haben Sie per E-Mail oder in den Nachrichten auf der Website bzw. in der App erhalten, über die Sie gebucht haben.",
  pl: "Link otrzymaliście e-mailem lub w wiadomościach na stronie albo w aplikacji, w której dokonaliście rezerwacji.",
  uk: "Посилання надійшло вам електронною поштою або в повідомленнях на сайті чи в застосунку, де ви бронювали.",
  'zh-Hant': "連結已透過電子郵件，或在您訂房的網站或應用程式訊息中寄給您。",
  sv: "Länken har ni fått via e-post eller i meddelandena på webbplatsen eller i appen där ni bokade.",
  es: "El enlace les llegó por correo electrónico o en los mensajes de la web o la aplicación donde reservaron.",
  fr: "Vous avez reçu le lien par e-mail ou dans vos messages sur le site ou l’application où vous avez réservé.",
  it: "Il link vi è arrivato via e-mail o nei messaggi del sito o dell’app dove avete prenotato.",
  hu: "A linket e-mailben vagy üzenetben kapták meg azon az oldalon vagy alkalmazásban, ahol foglaltak.",
};
/** A4 · Poslední výzva u check-inu (po 3. stupni, den před / den příjezdu). {odkaz} jako u A1–A3, {telefon} = stávající TELEFON. Schválil majitel 30. 10. */
export const ZPRAVA_CHECKIN_NEDOJEZD: Record<GuideLang, string> = {
  cs: "Dobrý den, stále od vás nemáme online check-in a na naše zprávy nereagujete. Pokud ho nevyplníte a do 20:00 nedorazíte, budeme rezervaci považovat za nedojezd (no-show) a pobyt propadá. {odkaz}\n\nHned po check-inu vám přijde průvodce k příjezdu. Otevřete ho a vyplňte v něm čas a způsob příjezdu. Bez toho vás nemůžeme ubytovat, a pokud přijedete autem, ani vám zajistit parkování.\n\nNapište nám hned na {telefon}. Děkujeme.",
  en: "Hello, we still do not have your online check-in and you are not replying to our messages. If it is not completed and you do not arrive by 20:00, we will treat the booking as a no-show and the stay will be forfeited. {odkaz}\n\nRight after the check-in you will receive your arrival guide. Open it and fill in your arrival time and how you are coming. Without this we cannot accommodate you and, if you come by car, we cannot arrange parking either.\n\nPlease write to us right away at {telefon}. Thank you.",
  de: "Guten Tag, Ihr Online-Check-in fehlt uns immer noch und Sie antworten nicht auf unsere Nachrichten. Wenn er nicht ausgefüllt wird und Sie bis 20:00 Uhr nicht ankommen, betrachten wir die Buchung als Nichtanreise (No-Show) und der Aufenthalt verfällt. {odkaz}\n\nDirekt nach dem Check-in erhalten Sie Ihren Anreiseführer. Öffnen Sie ihn und tragen Sie Ankunftszeit und Art der Anreise ein. Ohne diese Angaben können wir Sie nicht unterbringen und, wenn Sie mit dem Auto kommen, auch keinen Parkplatz sichern.\n\nBitte schreiben Sie uns sofort unter {telefon}. Danke.",
  pl: "Dzień dobry, wciąż nie mamy od Was odprawy online i nie odpowiadacie na nasze wiadomości. Jeśli jej nie wypełnicie i nie przyjedziecie do 20:00, uznamy rezerwację za niestawienie się (no-show) i pobyt przepada. {odkaz}\n\nZaraz po odprawie otrzymacie przewodnik przyjazdu. Otwórzcie go i podajcie godzinę oraz sposób przyjazdu. Bez tego nie możemy Was zakwaterować, a jeśli przyjedziecie autem, także zapewnić parkowania.\n\nNapiszcie do nas od razu na {telefon}. Dziękujemy.",
  uk: "Добрий день, ми досі не маємо вашої онлайн-реєстрації, і ви не відповідаєте на наші повідомлення. Якщо ви її не заповните і не приїдете до 20:00, ми вважатимемо бронювання неприїздом (no-show), і проживання анулюється. {odkaz}\n\nОдразу після реєстрації ви отримаєте путівник до приїзду. Відкрийте його та вкажіть час і спосіб приїзду. Без цього ми не можемо вас поселити, а якщо ви приїдете автомобілем, то й забезпечити паркування.\n\nНапишіть нам негайно на {telefon}. Дякуємо.",
  'zh-Hant': "您好，我們仍未收到您的線上入住登記，您也沒有回覆我們的訊息。若您未完成登記且未在 20:00 前抵達，我們將視此訂單為未入住（no-show），住宿將被取消且不退款。{odkaz}\n\n完成登記後，您會立刻收到抵達指南。請打開指南，填寫抵達時間與抵達方式。沒有這些資料，我們無法讓您入住；若您開車前來，也無法安排停車。\n\n請立即傳訊息至 {telefon}。謝謝。",
  sv: "Hej, vi har fortfarande inte fått er incheckning online och ni svarar inte på våra meddelanden. Om den inte fylls i och ni inte anländer senast 20:00 betraktar vi bokningen som utebliven ankomst (no-show) och vistelsen förfaller. {odkaz}\n\nDirekt efter incheckningen får ni er ankomstguide. Öppna den och fyll i ankomsttid och hur ni kommer. Utan detta kan vi inte ta emot er och, om ni kommer med bil, inte heller ordna parkering.\n\nSkriv till oss genast på {telefon}. Tack.",
  es: "Hola, todavía no tenemos su check-in online y no responden a nuestros mensajes. Si no lo completan y no llegan antes de las 20:00, consideraremos la reserva como no presentada (no-show) y la estancia se perderá. {odkaz}\n\nJusto después del check-in recibirán su guía de llegada. Ábranla e indiquen la hora y el modo de llegada. Sin esto no podemos alojarles y, si vienen en coche, tampoco garantizarles aparcamiento.\n\nEscríbannos ahora mismo al {telefon}. Gracias.",
  fr: "Bonjour, nous n’avons toujours pas votre enregistrement en ligne et vous ne répondez pas à nos messages. S’il n’est pas fait et que vous n’arrivez pas avant 20h00, nous considérerons la réservation comme une non-présentation (no-show) et le séjour sera perdu. {odkaz}\n\nJuste après l’enregistrement, vous recevrez votre guide d’arrivée. Ouvrez-le et indiquez votre heure et votre mode d’arrivée. Sans cela, nous ne pouvons pas vous héberger et, si vous venez en voiture, nous ne pouvons pas non plus vous garantir une place de parking.\n\nÉcrivez-nous tout de suite au {telefon}. Merci.",
  it: "Buongiorno, non abbiamo ancora il vostro check-in online e non rispondete ai nostri messaggi. Se non lo completate e non arrivate entro le 20:00, considereremo la prenotazione come mancata presentazione (no-show) e il soggiorno andrà perso. {odkaz}\n\nSubito dopo il check-in riceverete la guida all’arrivo. Apritela e indicate l’orario e il modo di arrivo. Senza questo non possiamo ospitarvi e, se arrivate in auto, nemmeno garantirvi il parcheggio.\n\nScriveteci subito al {telefon}. Grazie.",
  hu: "Jó napot, az online bejelentkezésük még mindig nincs meg, és nem válaszolnak az üzeneteinkre. Ha nem töltik ki, és 20:00-ig nem érkeznek meg, a foglalást meg nem jelenésnek (no-show) tekintjük, és a szállás elvész. {odkaz}\n\nA bejelentkezés után rögtön megkapják az érkezési útmutatót. Nyissák meg, és adják meg benne az érkezés idejét és módját. Enélkül nem tudjuk önöket elszállásolni, és ha autóval jönnek, parkolást sem tudunk biztosítani.\n\nKérjük, írjanak nekünk azonnal a {telefon} számra. Köszönjük.",
};
