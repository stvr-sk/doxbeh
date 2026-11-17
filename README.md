# doxbeh.

**Stačí len začať.**

Jednoduchá webová aplikácia na evidenciu behov, porovnávanie kilometrov a sledovanie týždenných cieľov. Všetko podstatné na jednom mieste — od pridania behu až po mesačný prehľad príspevkov.

Kompletné pravidlá s príkladmi nájdeš na [stránke Pravidlá](./pravidla/).

## Čo aplikácia ponúka

- **Záznamy behov** — pridanie dátumu a vzdialenosti, úprava záznamu a odstránenie s potvrdením.
- **Prehľad aktivity** — oddelení členovia, ktorí už behali, a tí bez záznamu; kilometre, príspevok a platba sú na jednom riadku. Jednotlivé behy sa dajú rozbaliť.
- **Mesačné porovnanie** — graf členov zoradený od najväčšieho počtu kilometrov.
- **Osobný prehľad** — kilometre, počet behov, priemerná dĺžka a najdlhší beh vo vybranom mesiaci.
- **Mesačný a týždenný prehľad** — prepínanie osobných štatistík a spoločný mesačný pool so základom 10 € za každého člena a pokutami za ukončené týždne.
- **Týždenné plnenie** — výber jedného týždňa, vizuálne kroky k cieľu a skupiny podľa splnenia. Budúce týždne zostávajú bez predčasného hodnotenia, ukončené zobrazujú prípadné pokuty.
- **Týždenný cieľ** — počet splnených behov a ukazovateľ pokroku pre aktuálny týždeň.
- **História kilometrov** — rozbaľovací graf posledných 12 mesiacov končiacich vybraným mesiacom.
- **Príspevky** — automatický výpočet základného príspevku a príplatkov za nesplnené týždenné ciele.
- **Evidencia platieb** — základný príspevok 10 € a pokuty za jednotlivé ukončené týždne majú vlastné označenie zaplatenia. Admin ich spravuje v tabuľke, používatelia vidia rozpis aj zostávajúcu sumu.

Tmavý vzhľad s oranžovými akcentmi, vlastný kalendár a rozloženie prispôsobené mobilu aj počítaču. Hlavnú časť stránky tvoria pridanie behu, porovnávací graf a prehľad záznamov; doplnkové detaily zostávajú zbalené.

## Používateľ a admin

**Používateľ** sa prihlasuje nickom a PIN-om, pridáva vlastné behy a môže upravovať alebo mazať svoje záznamy vytvorené pod aktuálnym účtom. Vidí aj mesačné porovnanie a prehľad ostatných členov.

**Admin** sa prihlasuje e-mailom a heslom na adrese `/admin/` (pri GitHub Pages za názvom repozitára, napr. `/doxbeh/admin/`). Spravuje členov, pridáva, upravuje a odstraňuje behy všetkých členov a môže si prepnúť osobné štatistiky na konkrétneho člena.

## Týždenné ciele a príspevky

Základný mesačný príspevok je **10 €**. Za každý chýbajúci povinný beh sa pripočítava **2,50 €**.

Do týždenného plnenia sa počítajú iba jednotlivé behy s dĺžkou **aspoň 3,0 km**. Kratšie behy zostávajú v záznamoch, celkových kilometroch a štatistikách, ale neznižujú pokutu za nesplnený týždenný cieľ. Viac kratších behov sa na splnenie cieľa nesčítava.

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

## Započítané kilometre

Pri novom zázname sa uchováva pôvodná vzdialenosť a deň zápisu v časovom pásme Europe/Bratislava. Interiérový beh má zrážku 10 %; zápis po dni behu zrážku 50 %. Zrážky sa uplatňujú postupne: najprv 10 % za interiér a následne 50 % zo zostávajúcej vzdialenosti za oneskorený zápis, výsledok sa zaokrúhli na dve desatinné miesta. Formulár zobrazí rozpis ešte pred uložením.

Graf, poradie členov a kilometrové štatistiky používajú vzdialenosť po zrážkach. Týždenný limit 3 km a peňažné pokuty sa vždy vyhodnocujú z pôvodnej dĺžky behu. Pri úprave sa zachováva pôvodný deň zápisu; staršie záznamy bez novej evidencie sa samotným načítaním spätne nepenalizujú.

## Mesačné výhry

Tretie miesto získa 10 €, druhé 20 € a prvé zvyšok mesačného poolu po odpočítaní 30 €. Poradie vychádza zo započítaných kilometrov po zrážkach; priebežný rozpis výhier je pri porovnávacom grafe.
