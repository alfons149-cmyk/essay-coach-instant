# EssayCoach v5.6.3: C2-bronrelatie en auditherstel

Branch: `fix/essaycoach-v5.6.0` als beoogde publicatiebranch; lokaal ontwikkeld op `fix/essaycoach-v5.6.3` vanaf `96c3d78`. `main` is niet aangepast; er is niets gedeployed. De volledige Worker staat in `downloads/essaycoach-worker-v5.6.3.txt` en is bytegelijk aan `apps/worker/src/worker.js`. Versie: `2026-10-18-coaching-v5.6.3`. Geen frontend- of runtimepakketwijziging; het v2-responscontract blijft bestaan.

## Bewijs en onzekerheid

De twee v5.6.2-productieresponsen zijn lokaal onderzocht, maar de API-responsen bevatten alleen fasecodes en validatieberichten, **niet de ruwe afgekeurde modelantwoorden**. Die zijn niet gereconstrueerd of gepubliceerd. Run 1 gaf HTTP 200 en labelde het punt over een gevestigde onderwijspraktijk `partial`, terwijl de geciteerde leerlingzin de tegengestelde auteurspositie toeschrijft. Run 2 gaf HTTP 502 na `UNNECESSARY_CORRECTION` bij assessment en daarna `ORIGINAL_EVIDENCE`/`UNEXPLAINED_CHANGE` en opnieuw `UNEXPLAINED_CHANGE` in de reviews. Het eerste geschil bij assessment betrof de optionele vervanging van geldig causaal `for` door `because`.

Bewezen codegat bij bronfeedback: `coverage` werd van het model overgenomen; de validator controleerde alleen expliciet gemarkeerde `distorted`-punten. Een modelantwoord `partial` kreeg geen aparte toets van de beweerde relatie met de leerlingzin. De precieze interne redenering van het model is onbekend. Bewezen codegat bij herstel: de tweede review ontving wel het origineel, alle aangeleverde spans, conflicten en een gereconstrueerde zin, maar **niet** de wijzigingslijst van de oorspronkelijke naar de gewenste eindzin of de overgebleven verschillen. Of het live model daadwerkelijk uit een reeds bewerkte zin citeerde, welke posities overlapten, of welke stijlwijziging het aanhield, blijft een hypothese zonder ruwe antwoorden.

## Aanpassingen

- Ieder bronpunt heeft nu verplicht `evidenceRelation`: `agrees`, `contradicts` of `absent`. `contradicts` vereist `distorted`; `agrees` laat `covered` of `partial` toe; `absent` vereist `missing`. Het taak- en reviewprompt laat per bronpunt de **bronbody** en elke geciteerde oorspronkelijke leerlingzin vergelijken. Een expliciete omkering blijft een verdraaiing, ook als steunargumenten ontbreken. Een verenigbare maar onvolledige samenvatting blijft gedeeltelijk. Dit is algemeen geformuleerd, zonder onderwerpwoorden of een correct voorbeeld hard te coderen. De onafhankelijke reviewer controleert dit opnieuw. De server kan een intern inconsistente combinatie afwijzen; hij kan zonder onafhankelijke semantische taalinterpretatie niet bewijzen dat een model met zowel `agrees` als `partial` de leerlingzin echt goed gelezen heeft.
- De auditherstelronde krijgt per betrokken zin `targets[].targetChanges` met wijzigingsposities ten opzichte van het oorspronkelijke citaat en unieke contextquotes, plus `unaccountedChanges` tussen reeds gereconstrueerde zin en voorgestelde eindzin. Bij conflicterende spans blijft `reconstructed=null`. Deze verschillen zijn uitdrukkelijk **aanwijzingen, geen geautoriseerde correcties**. De reviewer moet eerst beslissen welke wijzigingen noodzakelijk zijn, de oorspronkelijke tekst citeren, conflicterende spans vervangen en de gehele eindzin opnieuw afleiden. De server behoudt alle `ORIGINAL_EVIDENCE`, conflicten, punctuatie, bescherming van causaal `for` en `UNEXPLAINED_CHANGE`-controles. Geen budget of deadline is verhoogd; blijvende fouten geven nog steeds HTTP 502 zonder `nextDraft`.
- De komma na verbindend `however` blijft vereist via de bestaande contextuele punctuatiecontrole; concessief/gradueel `however` blijft een geldig tegenvoorbeeld. Correcte causaliteit met `for` blijft beschermd.

## Regressies en verificatie

Nieuwe mocks toetsen een tegenstrijdige bronrelatie met `partial`, een verenigbare onvolledige samenvatting, een echt afwezig punt, herstel van de bronstatus tijdens review en een geblokkeerde audit met dubbele spans, ontbrekende doelwijziging en exacte oorspronkelijke posities. Een blijvend onverklaarde toevoeging geeft nog steeds 502. De bestaande museum-, energie-, C1- en overige correctheidstests zijn behouden. Testdata voor de nieuwe mislukte antwoordvormen zijn synthetisch en mogen niet als ruwe live-modelantwoorden worden voorgesteld.

```sh
node --check apps/worker/src/worker.js
node tests/worker.test.mjs
node tests/coaching.test.mjs
node tests/language-audit.test.mjs
node tests/v561-regression.test.mjs
node tests/writing-coach.test.mjs
node tests/tense-feedback.test.mjs
npm --prefix apps/worker run build
npm run mobile:build
cmp apps/worker/src/worker.js downloads/essaycoach-worker-v5.6.3.txt
```

**Mocks:** 197 controles geslaagd (76 worker, 48 coaching, 39 audit, 16 regressie, 12 UI, 6 tense), syntaxis- en beide buildcontroles geslaagd. Dit toont het contract en de fail-closed afhandeling, geen bewezen taalnauwkeurigheid.

**Echte AI:** geen aanvraag met v5.6.3 uitgevoerd; lokaal ontbreekt een bruikbare API-binding en er is volgens opdracht niets gedeployed. De eerdere twee v5.6.2-runs zijn een foutbaseline, geen meting van deze wijziging. Nauwkeurigheid, herstelpercentage en latentie moeten met de live versie afzonderlijk worden beoordeeld. De runner verwacht nu expliciet v5.6.3 en stopt vóór een aanvraag bij een andere healthversie.

Na afzonderlijke deployment: controleer `/api/health` op versie en model; herhaal C2 in meerdere feedbacktalen, controleer dat de omkering `distorted` heet, causale `for` behouden blijft, verbindend `however` een komma krijgt, en dat een onvolledige maar verenigbare bronweergave `partial` blijft. Vergelijk vervolgens auditdiagnostiek en tijden van zowel geslaagde als 502-runs. Er is geen garantie dat een taalmodel alle semantische fouten ziet; een intern consistent maar inhoudelijk onjuist oordeel kan de structurele validator passeren.
