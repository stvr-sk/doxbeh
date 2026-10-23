# doxbeh.

**Stačí len začať.**

Jednoduchá webová aplikácia na evidenciu behov, porovnávanie kilometrov a sledovanie týždenných cieľov. Všetko podstatné na jednom mieste — od pridania behu až po mesačný prehľad príspevkov.

## Čo aplikácia ponúka

- **Záznamy behov** — pridanie dátumu a vzdialenosti, úprava záznamu a odstránenie s potvrdením.
- **Mesačné porovnanie** — graf členov zoradený od najväčšieho počtu kilometrov.
- **Osobný prehľad** — kilometre, počet behov, priemerná dĺžka a najdlhší beh vo vybranom mesiaci.
- **Mesačný a týždenný prehľad** — prepínanie osobných štatistík a spoločný mesačný pool so základom 10 € za každého člena a pokutami za ukončené týždne.
- **Týždenný cieľ** — počet splnených behov a ukazovateľ pokroku pre aktuálny týždeň.
- **História kilometrov** — rozbaľovací graf posledných 12 mesiacov končiacich vybraným mesiacom.
- **Príspevky** — automatický výpočet základného príspevku a príplatkov za nesplnené týždenné ciele.
- **Stav platieb** — admin označí príspevok ako zaplatený alebo nezaplatený pre konkrétneho člena a mesiac. Stav vidia aj používatelia.

Tmavý vzhľad s oranžovými akcentmi, vlastný kalendár a rozloženie prispôsobené mobilu aj počítaču. Hlavnú časť stránky tvoria pridanie behu, porovnávací graf a prehľad záznamov; doplnkové detaily zostávajú zbalené.

## Používateľ a admin

**Používateľ** sa prihlasuje nickom a PIN-om, pridáva vlastné behy a môže upravovať alebo mazať svoje záznamy vytvorené pod aktuálnym účtom. Vidí aj mesačné porovnanie a prehľad ostatných členov.

**Admin** sa prihlasuje e-mailom a heslom na adrese `/admin/` (pri GitHub Pages za názvom repozitára, napr. `/doxbeh/admin/`). Spravuje členov, pridáva, upravuje a odstraňuje behy všetkých členov a môže si prepnúť osobné štatistiky na konkrétneho člena.

## Týždenné ciele a príspevky

Základný mesačný príspevok je **10 €**. Za každý chýbajúci povinný beh sa pripočítava **2,50 €**.

Pokuty sa započítajú až po ukončení týždňa, pri poslednom čiastočnom týždni po skončení mesiaca. Aktuálny týždeň ešte nezvyšuje príspevok. Spoločný pool je súčet základných príspevkov všetkých členov a doteraz započítaných pokút; označenie platby ako zaplatenej jeho výšku nemení. Dodatočná oprava behu prepočíta aj príslušnú pokutu.

| Počet dní týždňa vo vybranom mesiaci | Povinné behy |
| --- | ---: |
| 1–3 dni | 0 |
| 4–6 dní | 1 |
| 7 dní | 2 |

Týždne sa počítajú od pondelka do nedele. V prehľade sa zobrazujú iba dátumy patriace do vybraného mesiaca.

Pre november 2026 platí výnimka: beh z nedele **1. 11.** sa započíta do prvého povinného týždňa **2. – 8. 11.**, ktorého cieľ zostáva 2 behy.

## Technológie

HTML · CSS · JavaScript · Firebase Authentication · Cloud Firestore

Aplikácia funguje bez zostavovania a je pripravená na hostovanie cez GitHub Pages.
