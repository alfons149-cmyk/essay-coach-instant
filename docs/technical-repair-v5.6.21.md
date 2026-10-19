# v5.6.21 — begrensd herstel van brede auditfragmenten

Gebaseerd op v5.6.20 (e7c7f73), op `fix/essaycoach-v5.6.0`. Geen deployment; main blijft ongewijzigd.

## Feiten en onzekerheid

De eigenaar rapporteerde één live test met het remote-work-essay van 401 woorden inclusief titel op v5.6.20 / gpt-5.4. HTTP 502 ASSESSMENT_INCOMPLETE, 107.801 ms extern en 102.984 ms in de Worker. Taaklezing: 1 × 5.696 ms; beoordeling: 1 × 35.885 ms; reviews: 35.498 en 25.905 ms. De beoordeling ging wegens OVERLIMIT_ADDITION en EXISTING_SUPPORT naar review. Review 1 faalde op EVIDENCE_GRANULARITY en meer dan zes gecorrigeerde zinnen; review 2 opnieuw op EVIDENCE_GRANULARITY. Alle vier antwoorden eindigden met `stop`; geen aanwijzing voor timeout of tokenafkapping. De leerling kreeg geen nextDraft.

De ruwe afgekeurde JSON-antwoorden ontbreken. Daardoor zijn de precieze quotes, posities en de keuzes van de reviewer niet vast te stellen. De nieuwe mock reproduceert de combinatie van afkeuringsregels, niet de oorspronkelijke modelantwoorden. De eerdere mislukte aanvraag van 393 woorden blijft een afzonderlijk, niet gereproduceerd incident.

## Aangetroffen oorzaken in code

`auditRepair.localChangeHints` was uitsluitend tekstuele hulp. Het volgende schema stond opnieuw vrije originalQuote/replacementQuote-paren toe. De reviewer kon dus opnieuw drie of meer wijzigingen samenvoegen. De hersteltekst vroeg brede fragmenten te splitsen en bevindingen te behouden, zonder een concrete gezamenlijke selectie voor de limieten van zes zinnen en achttien fragmenten. Deze code verklaart hoe het gemelde patroon mogelijk blijft, maar bewijst niet waarom het model dat in deze live aanvraag deed.

Een aanvullende regressie vond een concrete fout in `quotedChange`: de uniciteitscontrole keek alleen naar latere voorkomens van het citaat. Bij herhaling kon een eerder gelijk citaat worden gemist. Dat is nu in beide richtingen gecontroleerd. Of dit bij de live aanvraag speelde, is onbekend.

## Reparatie

- De eerste review krijgt expliciet het verschil tussen maximaal zes oorspronkelijke zinnen en achttien lokale fragmenten uitgelegd. Bij ruimtegebrek moet de reviewer hele zinnen selecteren en afhankelijke feedback aanpassen.
- Alleen als constructie uitsluitend faalt op granulariteit en/of het aantal zinnen, maakt de server herstelkandidaten. Elk oorspronkelijk citaat moet exact en uniek zijn. Alle wijzigingen moeten compatibel zijn; hun lokale citaten worden opnieuw op uniciteit en exact dezelfde wijziging gecontroleerd. De volledige reconstructie moet byte voor byte dezelfde zin opleveren als het verenigde oorspronkelijke auditvoorstel.
- Patchposities (`originalOffset`, `originalEnd`) en de grenzen van het uitgebreide citaat (`quoteOffset`, `quoteEnd`) zijn afzonderlijk benoemd; dit zijn JavaScript UTF-16-posities binnen de oorspronkelijke zin.
- De volgende onafhankelijke review krijgt een begrensd `sentenceRepairs`-schema. Zij kiest maximaal zes volledige kandidaten en schrijft voor **iedere** lokale wijziging een eigen verklaring. Er worden geen brede citaten opnieuw gegenereerd en geen oude algemene verklaringen automatisch als bewijs overgenomen. De herstelboodschap luidt onder meer: “Select a sentence only if EVERY change is a necessary language correction. If any change is optional, incorrect, unexplained or unsuitable, omit the WHOLE sentence and reconcile its lessons, insights and criticism.”
- De server verwerpt onbekende of dubbele selecties, ontbrekende verklaringen, extra selectievelden, meer dan zes zinnen en meer dan achttien fragmenten. Conflicterende of verzonnen broncitaten krijgen geen automatisch opgesplitste herstelkandidaten. Alle bestaande eindcontroles blijven daarna gelden, inclusief reconstructie, causal-for, interpunctie, bronfeedback en afhankelijke leervoorbeelden. Geen extra retry, hogere deadline, hoger tokenbudget of ongecontroleerde succesfallback.
- De frontend laat nu `learningPoints[1].practiceInstruction` en `.issue` herkenbaar door in de veilige diagnostiek. Alleen veldnamen, regels en bestaande veilige metadata worden getoond; essays, providerteksten en verklaringen blijven uitgesloten. Ook de nieuwe vaste herstelveldnamen zijn toegestaan. De scriptversie in index.html voorkomt gebruik van de oude helper uit de cache.

Deze constructie bewijst de mechanische exactheid van wijzigingen, niet zelfstandig hun grammaticale noodzaak. Daarvoor blijft de onafhankelijke reviewer met de bestaande semantische eindcontroles nodig. Een kandidaat met een ongeschikte wijziging moet als hele zin worden weggelaten; de laatste herstelpoging kan die zin niet vrij herschrijven. Ook dat kan tot een veilige afwijzing leiden. Meer dan achttien lokale wijzigingen in één kandidaat activeert deze begrensde route niet. Maximaal zes gecorrigeerde zinnen betekent bovendien niet dat alle taalfouten in een lang essay verdwijnen. nextDraft blijft een beperkte taalcorrectie, geen volledig juist C2-antwoord.

## Verificatie

**Technisch / mocks:** 238 controles geslaagd in elf suites; alle suites exit 0. Zie `test-results-v5.6.21.json` voor lokale suite-tijden. Negen nieuwe auditregressies dekken onder andere brede evidence plus zeven zinnen → tweede review → HTTP 200 met zes exact gereconstrueerde zinnen; blijvend brede evidence → HTTP 502 zonder nextDraft; onvolledige/verwisselde selecties; conflicten en verzonnen quotes; het fragmentbudget; herhaalde tekst; geldige lokale evidence; en het alsnog afkeuren van een optionele vervanging van causaal for door de ongewijzigde eindvalidator. Een extra frontendregressie bewaakt de twee veldpaden én het blokkeren van privétekst. Bestaande regressies voor however, broninterpretatie, leervoorbeelden, correcte zinnen, C2-structuur, woordlimiet en de twee remote-work-restfouten blijven groen.

Worker syntax/build en mobile frontend-build geslaagd. Deze builds voeren geen deployment uit. De nieuwe suite is opgenomen in de bestaande Worker-workflow; productieworkflows starten alleen op main of handmatig, niet bij deze reparatiebranchpush.

**Echte AI:** geen aanvraag uitgevoerd voor v5.6.21. In deze omgeving is geen OPENAI_API_KEY-binding aanwezig. De bovenstaande live meting is die van de eigenaar op v5.6.20. Geen claim over live tijdwinst, modelnauwkeurigheid of een opgeloste 393-woordenfout. Er is geen nieuwe loadtest nodig/gebruikt als bewijs voor deze gerichte herstelwijziging.

## Afzonderlijk plaatsen en eenmaal controleren

1. Worker: vervang de volledige Worker door `downloads/essaycoach-worker-v5.6.21.txt`; behoud bestaande bindings, waaronder OPENAI_MODEL. Dit bestand is bytegelijk aan `apps/worker/src/worker.js`. SHA-256: `7658916b0c2dfa9e6e3864c8ffaa25376358faa3f7444fdf9370cf2505a7f86d`.
2. Frontend: plaats `js/correction-api.js` en `index.html` samen. Er is geen wijziging in app.js of in de resultaatweergave nodig.
3. Controleer na eigen plaatsing de healthversie `2026-10-19-coaching-v5.6.21` en het ingestelde model. Voer daarna **één** aanvraag met precies dezelfde 401-woordeninvoer, bronnen, opdracht en feedbacktaal uit. Controleer HTTP 200 én `reviewCompleted`, maximaal zes gecorrigeerde zinnen, “commute to work”, “easy to connect”, geen voorgeschreven C2-volgorde die niet in de opdracht staat, en woordlimietfeedback die inkorten adviseert zonder blind uitbreiden. Leg fasepogingen, afkeuringsregels en tijden vast. Bij afwijzing blijven het veilige rapport en de exact gebruikte request nodig; de ontbrekende 393-woordenrequest/response is hiermee niet vervangen.
