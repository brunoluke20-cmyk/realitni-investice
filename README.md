# Realitní investice

Mobilní webové nástroje pro předběžné posouzení investiční nemovitosti.

- [Domovská stránka](./index.html)
- [Investiční kalkulačka](./investicni-kalkulacka.html)
- [Správce prohlídky a checklist](./spravce-projektu.html)

Nový projekt začíná prázdný; vyplněná data se ukládají pouze v místním úložišti konkrétního prohlížeče. Exportuj JSON jako zálohu.

## Aktualizace realitních nabídek

Tlačítko **Aktualizovat inzeráty** načítá `listings-feed.json`, přidá nové bytové a vícegenerační domy a duplicitní URL přeskočí. Feed má definované pole `listings` a lze jej napojit na autorizované API nebo datové feedy jednotlivých portálů.

**Důležité:** automatické zdroje portálů zatím nejsou připojené. Tlačítko proto samo o sobě neprohledává všechny inzertní weby. Každý portál potřebuje podporovaný API/feed nebo samostatnou oprávněnou serverovou integraci. Nabídky a možnost rozdělení domu vždy ověř u inzerenta a příslušného úřadu.

## Testování a nasazení

Každý pull request spouští workflow `.github/workflows/quality-gate.yml`, které provádí:
- syntaktickou kontrolu JavaScriptu a kontrolu lokálních skriptů,
- prohlížečové regresní testy filtrů a jejich kombinací,
- test zachování výběru nástrojů z karty inzerátu,
- test aktualizace feedu, deduplikace a bezpečného vykreslení nedůvěryhodného názvu inzerátu.

Při selhání se vytvoří artefakt s logem, Playwright reportem a automatickým promptem pro opravu. Opravy mají zachovat existující pracovní postupy a přidat regresní test. Změny se nemají nasadit do produkce, dokud kontrola neprojde.

Produkční nasazení GitHub Pages spouští `.github/workflows/static.yml` při změně větve `main`. V nastavení repozitáře otevři Settings → Pages a pokud je potřeba, nastav Build and deployment → Source na GitHub Actions.

Právní přehled v aplikaci je pouze orientační; ověř aktuální právní stav a konkrétní podmínky s projektantem a stavebním úřadem.
