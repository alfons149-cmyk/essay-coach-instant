# EssayCoach v5.6.0 — technisch herstel

Nieuwe versie: `2026-10-17-coaching-v5.6.0`. Bron: `apps/worker/src/worker.js`. Volledige, identieke ES-module voor de Cloudflare-editor: `downloads/essaycoach-worker-v5.6.0.txt`. Geen frontendwijzigingen of nieuwe runtimepakketten. Het bestaande v2-responscontract blijft bruikbaar; audit en diagnostiek zijn aanvullingen.

De eerder in deze chat genoemde v5.6.0-bestanden waren bij hervatting niet meer aanwezig in de schone v5.5.5-checkout. Deze wijziging is opnieuw opgebouwd en getest; dit verslag beschrijft de huidige bestanden en de nieuwe metingen van 17 oktober. De oorzaak van het mislukte publiceren van de cloudomgeving is niet uit de repository vast te stellen. De reparatie wordt voor review vastgelegd op `fix/essaycoach-v5.6.0`. Er is niets naar productie gedeployed. Een push naar deze branch activeert de repository-deployworkflows niet: die vereisen een push naar `main` of een handmatige workflow_dispatch.

## Onderzoek en oorzaken

De oorspronkelijke keten leest bij C2 eerst taak/bronnen, maakt een beoordeling en voert vervolgens een onafhankelijke review uit. Een verschil in taakclassificatie kon taaklezing én beoordeling opnieuw laten uitvoeren, ook als alleen de basis explicit/assumed veranderde. Bekende onnodige taalcorrecties werden eerst opnieuw door de oorspronkelijke beoordelaar behandeld. Een simpele tegenstrijdigheid tussen de samenvattende taakconclusie en de eigen deelcontroles kon twee volledige reviews laten mislukken.

De reviewer werd wel gevraagd iedere zin te lezen, maar er was geen expliciet dekkingscontract of controle dat alle veranderingen binnen een volledige zinsvervanging onderbouwd waren. De grens van acht gewijzigde zinnen kon aanvullende fouten buiten beeld houden. De oude diagnostiek registreerde aantallen en completion-uitkomsten, maar geen afzonderlijke duur of afkeuringsgeschiedenis per poging.

## Reparaties

- **Conservatief taakverdict:** als `answered` botst met ongewijzigde deelcontroles `partial`/`missing`, wordt alleen die samenvattende enum afgeleid: `partly_answered` als er een met/partial-controle bestaat, anders `not_answered`. Dit wordt in `history[].normalisations` geregistreerd. Geen deelcontrole, bronbevinding, score of uitleg wordt gewijzigd. Onjuiste of ontbrekende deelcontroles blijven validatiefouten. De onafhankelijke inhoudelijke review blijft verplicht.
- **Veilig hergebruik:** na een nieuwe taaklezing mag een bestaande kandidaat rechtstreeks naar review als taaktype, letterlijke bronlichamen en bronpunt-ID/citaatcombinaties gelijk blijven. Bij gewijzigde bronnen of verwijzingen wordt opnieuw beoordeeld. Een hergebruikte kandidaat wordt nooit zonder review teruggegeven.
- **Minder dubbele taalreparaties:** complete kandidaten met uitsluitend bekende taalkundige geschillen, zoals een onnodige `for`-vervanging of een onjuiste lengteclaim, gaan samen met alle concrete afkeuringsredenen direct naar de onafhankelijke reviewer. Ontbrekende kerngegevens blijven eigen herstelpogingen vereisen. Geen validatie of onafhankelijke review wordt overgeslagen.
- **Zindekking:** de review registreert elke geschikte oorspronkelijke zin precies eenmaal. Ook korte volledige zinnen zoals `He go.` kunnen nu worden behandeld; korte losse kopjes zonder eindinterpunctie blijven buiten het bestaande zinsbewijscontract.
- **Bewijs per wijziging:** ieder noodzakelijk taaledit vereist unieke, niet-overlappende oorspronkelijke fragmenten, vervangingen, categorie grammar/punctuation/word_choice en uitleg. De server reconstrueert de volledige gewijzigde zin uit die fragmenten. Verzonnen citaten en onverklaarde extra stijl- of inhoudswijzigingen worden afgekeurd. De auditverklaringen worden de zichtbare correctieredenen. Correction-insights moeten dezelfde vervanging tonen als het edit.
- **Algemene taal- en interpunctiecontrole:** de reviewer controleert afzonderlijk zinsbouw, congruentie, werkwoordsvormen/tijdscontext, lidwoorden, woordvolgorde, verwijzing, woordbetekenis, spelling en interpunctie. Een adviserende scan markeert mogelijke afbakeningsproblemen bij onder meer however, therefore, moreover, for example en what is more. Iedere kandidaat vereist een contextuele beslissing. De scan past zelf niets toe: `However difficult it seems` kan geldig zijn. Een als fout beoordeelde kandidaat vereist bijpassend bewijs en een edit; valid/context_needed mag niet met zo'n automatische interpunctiewijziging botsen.
- **Gescheiden feedback:** broninterpretatie blijft in sourceReview/taskReview en leeractiviteiten. Optionele stijl blijft optioneel. Alleen noodzakelijke taalcorrecties komen in nextDraft. De EN/NL/ES-instructies, oefeningen, controlevragen, bronverwijzingen, woordentelling en bestaande bescherming van geldig for/read/a head en contextafhankelijk this morning blijven behouden.
- **Ruimere veiligheidsgrenzen:** maximaal 32 gewijzigde zinnen en 96 onderbouwde fragmenten, in plaats van acht gewijzigde zinnen. Dit is geen garantie op volledige correctie van zeer foutdichte teksten.

De totale deadline blijft 180 seconden; per providerverzoek maximaal 60 seconden en nooit meer dan de resterende totale tijd. Modelinstelling en bestaande secrets worden niet gewijzigd.

## Diagnostiek en configuratie

`diagnostics` bevat `totalMs`, `phaseMs`, `phaseAttempts`, `repairAttempts`, `taskRechecks`, `reusedAssessments` en `history`. Per poging: fase, totale duur, providertijd, validatietijd, uitkomst, eventuele normalisaties en controles met veld, regelcode en toelichting. Voorbeelden: SENTENCE_COVERAGE, ORIGINAL_EVIDENCE, UNEXPLAINED_CHANGE, PUNCTUATION_AUDIT, UNNECESSARY_CORRECTION. Oudere generieke consistentiecontroles hebben soms nog een breder veldpad. Afgekeurde eerdere beweringen blijven uitsluitend als afkeuringsgeschiedenis zichtbaar; ze worden niet als goedgekeurde leerlingfeedback gepresenteerd.

Health geeft naast versie/status alleen een gecontroleerde modelidentifier, de bron OPENAI_MODEL/default en apiKeyConfigured (boolean) terug. Correctiediagnostiek noemt het aangevraagde model en, indien de provider dit levert, `completions[].resolvedModel`. API-sleutelwaarden, ruwe providerfoutteksten en refusal-teksten worden niet geëxposeerd.

Op deze machine ontbreken OPENAI_API_KEY, OPENAI_MODEL, CLOUDFLARE_API_TOKEN en CLOUDFLARE_ACCOUNT_ID. De productie-healthcheck van v5.5.5 vermeldt het model niet. De eigenaarsopgave gpt-5.4 is dus niet onafhankelijk bevestigd. Er zijn geen sleutelwaarden opgevraagd of instellingen gewijzigd. De lokale healthcheck toont het bestaande fallbackmodel gpt-4o-mini met bron default en apiKeyConfigured=false; dat zegt niets over de Cloudflare-productieinstelling. Na deployment moet de echte healthcheck model=gpt-5.4 en modelSource=OPENAI_MODEL tonen. Pas een echte correctie bevestigt dat de binding werkt.

## Technische tests

Alle 154 controles zijn geslaagd met Node 20.20.2 (CI-versie) en Node 24.19.0: 76 Worker + 38 coaching + 26 taalaudit + 8 writing-coach DOM + 6 tense-feedback DOM. De nieuwe suite bevat andere essays en correcte zinnen: universiteitsvervoer, museumbezoek, energie en bibliotheekdiensten. De bestaande suites gebruiken een expliciete adapter voor synthetische auditgegevens bij oudere mockfixtures; de nieuwe auditsuite gebruikt de Worker rechtstreeks en test ontbrekende, onjuiste en tegenstrijdige auditgegevens. Dit bewijst controlelogica en behoud van regressies, niet dat een echt model grammatica altijd juist beoordeelt.

```sh
node --check apps/worker/src/worker.js
node tests/worker.test.mjs
node tests/coaching.test.mjs
node tests/language-audit.test.mjs
node tests/writing-coach.test.mjs
node tests/tense-feedback.test.mjs
npm --prefix apps/worker run build
npm run mobile:build
```

De deploymentworkflow voert de nieuwe suite ook uit. Build, mobiele webbundel en Cloudflare `deploy --dry-run` zijn gecontroleerd. De lokale Worker-runtime geeft health 200, ongeldige invoer 400/INPUT en ontbrekende OpenAI-binding 503/CONFIG. De live-runner stopt op die ontbrekende binding voordat hij een AI-aanvraag doet. Er is geen daadwerkelijke deployment uitgevoerd.

Aangetoonde aantallen in mocks: onnodige taalherbeoordeling 3 → 2 calls; basiswijziging met gelijk broncontract 5 → 4; reviewgeschil met gelijk broncontract 6 → 5. Een tegenstrijdig samenvattend verdict vraagt geen extra call meer. Dit is geen gemeten live tijdwinst. De kloktest gebruikt expliciet synthetische tijden: 7.000 ms assessment + 16.000 ms review = 23.000 ms totaal met één reviewherstelpoging.

## Echte AI-basismetingen — uitsluitend productie-v5.5.5

Deze metingen zijn op 17 oktober 2026 uitgevoerd tegen de ongewijzigde publieke Worker. Ze valideren **niet** de nieuwe v5.6.0. Volledige invoer/uitvoer staat in `tests/fixtures/v560-production-baseline.json`.

| Geval | Werkelijke wandtijd | Calls taak/assessment/review | Uitkomst |
| --- | ---: | --- | --- |
| Homeschooling ES | 107,517 s | 2 / 3 / 1 | HTTP 200, komma na however opnieuw gemist. Bron-2-omkering en zwakke evaluatie herkend; although hersteld; causaal for en a head behouden. |
| Correct energiefragment EN | 37,733 s | 0 / 1 / 2 | HTTP 502 ASSESSMENT_INCOMPLETE: answered botst met een partial/missing-deelcontrole. Geen gecorrigeerde tekst teruggegeven; behoud van de tekst is in deze aanvraag dus niet bevestigd. |
| Museumfragment NL | 41,004 s | 0 / 1 / 1 | HTTP 200; buy → bought. Read, toekomstige afspraak, tijdsbijzin en contextuele ochtenduitleg behouden. |

De oude versie geeft geen tijden per fase en bewaart geen afzonderlijke afkeuringsredenen van eerdere pogingen. Die zijn niet achteraf geschat. Het energiegeval motiveert de conservatieve verdict-normalisatie; de afkeuring zelf was een terechte consistentiecontrole, geen aangetoonde validator-false-positive.

## Resterende beperkingen

Nieuwe-versie AI-nauwkeurigheid en netto verwerkingstijd zijn nog niet live gevalideerd: een bruikbare OpenAI-binding ontbreekt hier. Het auditcontract kan nog steeds een door de AI gemiste fout of een foutieve grammaticale verklaring doorlaten; exacte citaten en zindekking zijn geen algemene grammaticale/semantische bewijzen. Het model kan een stijlkeuze ten onrechte als noodzakelijk woordgebruik presenteren. Meer audituitvoer kan tokens en herstelpogingen toevoegen; netto tijdwinst moet na deployment worden gemeten.

De bestaande heuristische beschermingen blijven beperkt en zijn geen parser. Optionele regels mogen echte fouten niet blokkeren; de regressies controleren daarom ook geldige omliggende correcties, negaties, gesloten tijdscontexten en correcte zinnen. Er is geen native mobiele build of volledige visuele browsertest uitgevoerd. De vooraf al bekende boekintegriteits- en legacy-server-goldenproblemen staan los van deze correctieketen en zijn niet als geslaagde controles gepresenteerd.

## Deployment en live vervolgtests

1. Bewaar de bestaande Cloudflare Worker-instellingen. Controleer bij de bestaande Worker essaycoach onder Variables and Secrets dat OPENAI_MODEL de niet-geheime waarde gpt-5.4 heeft en dat OPENAI_API_KEY als secret aanwezig is. Zet geen sleutel in de code of chat.
2. Vervang in de Cloudflare-editor de volledige bestaande ES-module door `downloads/essaycoach-worker-v5.6.0.txt` en deploy. Het bestand is bytegelijk aan de bron en heeft geen externe runtime-imports. Alternatief met bestaande beveiligde Cloudflare-authenticatie: vanuit `apps/worker` `npm run build` en `npm exec -- wrangler deploy --keep-vars`. De bestaande GitHub Actions-workflow kan na review/commit naar main ook deployen met de bestaande secrets.
3. Controleer `/api/health`: versie `2026-10-17-coaching-v5.6.0`, model gpt-5.4, modelSource OPENAI_MODEL en apiKeyConfigured true. Health bewijst alleen configuratieaanwezigheid; voer daarna echte correcties uit.
4. Een aparte frontendrelease is niet nodig. De bestaande v2-velden blijven bruikbaar. Rollbackbestand `downloads/essaycoach-worker-v5.5.5.txt` is behouden.

De runner hieronder controleert de versie vóór de AI-aanvraag, gebruikt standaard één lokale aanvraag en print geen credentials. Rapporten bevatten werkelijke wandtijd, serverfasetijden, pogingen, automatische steekproeven en volledige feedback voor inhoudelijke beoordeling. Standaard map: /tmp/essaycoach-live, te wijzigen met --out.

```sh
node scripts/test-live-feedback.mjs --base https://essaycoach.alfons149.workers.dev --case homeschooling --language es --repeat 3
node scripts/test-live-feedback.mjs --base https://essaycoach.alfons149.workers.dev --case homeschooling --language nl --repeat 3
node scripts/test-live-feedback.mjs --base https://essaycoach.alfons149.workers.dev --case homeschooling --language en --repeat 3
node scripts/test-live-feedback.mjs --base https://essaycoach.alfons149.workers.dev --case energy --language en
node scripts/test-live-feedback.mjs --base https://essaycoach.alfons149.workers.dev --case museum --language nl
node scripts/test-live-feedback.mjs --base https://essaycoach.alfons149.workers.dev --case university --language es
node scripts/test-live-feedback.mjs --base https://essaycoach.alfons149.workers.dev --case library --language en
```

Beoordeel iedere uitvoer op noodzakelijkheid van alle wijzigingen; uitleg tegenover originele fragmenten; gemiste fouten; behoud van correcte vormen; broninterpretatie; samenvatting versus evaluatie; concrete oefening/controlevraag; feedbacktaal en expliciete aannames bij ontbrekende instructies. Vergelijk mediane en langzaamste tijden plus herstelpogingen. Automatische steekproeven bewijzen geen inhoudelijke juistheid; een andere geldige formulering kan handmatige beoordeling vereisen.
