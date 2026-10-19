# EssayCoach: foutdiagnostiek en capaciteit (19 oktober 2026)

## Status en beschikbare broncode

De live healthcheck meldde `2026-10-19-coaching-v5.6.19`, model `gpt-5.4`, modelbron `OPENAI_MODEL` en een aanwezige API-keybinding. De sleutel is niet opgevraagd of getoond. Dit bewijst geen quota, abonnement, budget of beschikbaarheid voor belasting.

De aanvankelijk genoemde commit `c380539d55878d1068854556ca546b951708d6a4` op `fix/essaycoach-v5.6.14` was niet beschikbaar (`not our ref`). De eigenaar leverde daarna de exacte live Worker via snapshotbranch `snapshot/essaycoach-worker-v5.6.19`, commit `89efa0fc4509bcca969d4363024d459a2f730da9`. Die snapshot is fast-forward opgenomen op de bestaande reparatiebranch `fix/essaycoach-v5.6.0`. `apps/worker/src/worker.js` is vervolgens gesynchroniseerd met die volledige v5.6.19-bron vóór de v5.6.20-reparaties. Recentere Workerfuncties zijn dus behouden. Het oorspronkelijke snapshotbestand blijft ongewijzigd beschikbaar.

De nieuwe volledige Worker is `downloads/essaycoach-worker-v5.6.20.txt`, bytegelijk aan `apps/worker/src/worker.js`. Build `2026-10-19-coaching-v5.6.20`. De daadwerkelijk geserveerde frontend `js/app.js` is eveneens opgehaald en bleek bytegelijk aan de branchbasis. Geen wijziging van main of deployment. De eerder uitgevoerde v5.6.5-loadbaseline blijft expliciet als historisch meetbestand beschikbaar; de tests zijn daarna herhaald op v5.6.20.

## C2-fout: vastgesteld en nog onbekend

Vastgesteld frontenddefect: `correctEssay` maakte bij een niet-2xx-respons een exception van HTTP-status plus de hele responsebody. De catch logde die exception en verving de zichtbare melding door één algemene Engelse zin. Daardoor verdwenen code, fase, afkeuringsregels en tijden uit de interface; de console kon onnodig leerlingtekst/diagnostiek bevatten. Deze catch kon bovendien ook een renderfout na HTTP 200 verbergen. Uit de oude screenshot volgt dus niet eens zeker dat de API HTTP 502 retourneerde.

De precieze oorzaak van de oorspronkelijke 393-woordenfout is **niet vastgesteld**: er is geen ruwe response, request-ID of bevestigde identieke invoer. De later aangeleverde tekst telt 401 woorden inclusief de titel van acht woorden; zonder titel 393. De eigenaar bevestigt niet dat de eerder mislukte tekst alleen hierin verschilde. We mogen die gelijkheid niet aannemen. `tests/fixtures/remote-work-user-20261019.json` bewaart de later aangeleverde tekst inclusief titel en de volledige instructies/bronnen. Feedbacktaal NL is voor de nieuwe test gekozen; de oorspronkelijke keuze is niet bekend. De bijschriften “Opdracht” en “Antwoordessay: te lang, foutief en off-task” zijn niet als leerlinginvoer opgenomen. Het is geen exacte replay van de oorspronkelijke aanvraag.

Voor definitieve reproductie nodig: de exacte oorspronkelijke requestbody (essay inclusief titel/regelovergangen, task, sourceBodies indien gebruikt, level en feedbackLanguage), HTTP-status en response of de nieuwe veilige diagnostiek, tijdstip en liefst een server-correlatie-ID. De benodigde v5.6.19-broncode is inmiddels via de snapshot ontvangen. De oorspronkelijke 393-woordenrequest en foutrespons blijven ontbreken.

## Echte AI-test en gerichte Worker-reparatie

Eén nieuwe echte POST naar de live v5.6.19, met de aangeleverde 401-woordenvariant en NL-feedback, gaf **HTTP 200 in 147,331 seconden**. Geen reproductie van de onbevestigde 393-woordenfout. Fasen: task 1 (11,638s), assessment 1 (48,267s), review 2 (46,015 + 41,169s). Alle completions hadden `finish_reason=stop`; er is in deze aanvraag geen bewijs van tokenafkapping of timeout. De response rapporteerde 414 / 2.547 / 2.739 / 2.656 completiontokens, totaal 8.356; inputtokens werden door v5.6.19 niet gerapporteerd. Dit is één waarneming, geen percentiel of gemiddelde.

De eerste review faalde op `languageAudit.corrections[4]`: een breed citaat bevatte meer dan twee onafhankelijke wijzigingen. `constructAuditedEdits` zette bij een fout de hele editlijst leeg (terecht geen gedeeltelijk resultaat), maar de keten ging daarna door met de finale edit-/lesvalidatie. Daardoor ontstonden negen afgeleide of herhaalde meldingen over ontbrekende edits, niet-overeenkomende lessen en insights. Het herstel kreeg daardoor de onjuiste indruk dat alle correcties ontbraken.

**v5.6.20:** een constructiefout blokkeert succes en gaat rechtstreeks naar een gericht reparatiedossier. De afgeleide controles worden uitsluitend uitgesteld totdat constructie lukt; daarna draaien alle bestaande eindcontroles. Het dossier bevat nu per span leesbare lokale diff-hints vanuit originele posities. Die hints zijn geen bewijs van grammaticale noodzaak en worden niet automatisch toegepast. Het model moet elke lokale wijziging opnieuw onderbouwen. De grens van maximaal twee veranderingen per span, conflictcontrole, unieke originele citaten en exacte reconstructie blijven behouden. Nieuwe stabiele diagnose `EVIDENCE_GRANULARITY` onderscheidt dit van een algemene inconsistentie.

De geslaagde live response bevatte inderdaad de twee resterende taalfouten die de eigenaar noemde. Een taal-learning point gebruikte zelfs de zin met “easy for connect” als volledig verbeterd voorbeeld. De feedback zei letterlijk: “Je eigen mening mag wel, maar pas nadat je eerst duidelijk hebt gemaakt wat beide teksten beweren.” Dat volgt niet uit de opdracht.

**v5.6.20:** prompt vereist een volledige grammaticale herlezing van elke geselecteerde gereconstrueerde zin, met lokale bewijsfragmenten voor alle noodzakelijke wijzigingen in die zin. Bestaande contextgevoelige surface-checks worden nu ook op alle uitgegeven correctiezinnen toegepast, niet alleen op het oorspronkelijke foutpatroon of een lesvoorbeeld. Aanvullende categorieën dekken adjectief + onjuist `for` + basiswerkwoord en het institutionele `commute to work`, met correcte tegenvoorbeelden zoals `easy for students to connect` en `commute to the work site`. Geen automatische zoek/vervangcorrectie. De checks zijn gericht, geen volledige grammaticale parser. Vaker blokkeren is mogelijk als het model fouten blijft missen; er is geen bewezen nieuwe succesratio.

Beoordelaar en reviewer krijgen expliciet dat samenvatten/evalueren/eigen ideeën geen vaste volgorde voorschrijven. Een beperkte EN/NL/ES-eindcontrole wijst de aangetoonde verplichte-volgordeclaim af wanneer die niet uit de taakinstructies volgt. Optionele volgordevoorstellen, geïntegreerde opbouw en expliciet voorgeschreven volgorde zijn tegenvoorbeelden. Deze taalkundige patrooncontrole herkent niet elke mogelijke parafrase; semantische beoordeling blijft nodig.

Veilige meetgegevens: `docs/live-diagnostic-20261019.json`. De volledige succesvolle response is alleen lokaal in `/tmp/essaycoach-v5619-live.json.response.json` opgeslagen, met beperkte bestandsrechten, niet gepusht. De afgekeurde modelantwoordtekst zelf is niet beschikbaar: de reconstructieregressie bootst het waargenomen fouttype na met drie lokale agreementfouten, niet met verzonnen “originele” live spans.

**Geen echte AI-aanvraag met v5.6.20:** lokaal ontbreekt OPENAI_API_KEY; de publieke Worker draait nog v5.6.19 en er is niets gedeployed. De nieuwe prompts/controles en snelheid zijn uitsluitend technisch/mock getest. Alleen de v5.6.19-baseline hierboven is een echte AI-meting. De eerste Node-poging faalde al bij de healthcheck door DNS; de geslaagde poging gebruikte de omgevingsproxy en startte precies één correctieaanvraag.

## Directe codeverbeteringen

- `js/correction-api.js`: beperkt fouten tot een expliciete allowlist van status, foutcode, fase, versie, tijden, pogingentellers, afkeuringsregels/velden en tokenlimietsignalen. Vrije foutteksten, providerbody's, essaycitaten, issues, prompts, sleutels en stacktraces komen niet in het deelbare rapport. Onbekende codes/velden worden `HTTP_ERROR`/`unknown`.
- EN/NL/ES-foutmelding met status, code en fase; uitklapbare technische gegevens in tekstvorm. Bij falen worden eerder getoonde resultaten en nextDraft gewist, resultaatkaarten verborgen en wordt geen beoordelingssucces gerenderd. Ook een onvolledige HTTP 200 is een fout: schemaVersion 2, niet-lege nextDraft, edits-array en `diagnostics.reviewCompleted=true` zijn vereist.
- Geen automatische browser-retries. Herhaalde klikken tijdens een actieve aanvraag starten geen tweede aanvraag. Een browser-timeout van 190 seconden beëindigt de lokale wachttijd; dit is geen wijziging van de Worker-deadline. Wisselen van niveau of wissen annuleert de browseraanvraag. **Abort in de browser bewijst niet dat upstream AI-verwerking en kosten stoppen.** Multi-tab- en server-idempotentie zijn nog niet opgelost.
- `js/config.js`: een willekeurige `?api=https://...` kon essays naar een andere server sturen. Overrides worden nu alleen geaccepteerd voor exact de geconfigureerde service-origin en het API-pad, zonder credentials/query/hash. Een aangepaste ontwikkelserver moet bewust in de configuratie worden ingesteld, niet via een gedeelde link.
- Worker begrenst het inkomende JSON-body tot 512 KiB tijdens het lezen, vóór parsing en modelcalls. Provider-429 wordt herkenbaar 503 `AI_RATE_LIMITED`, met veilige upstreamstatus en numerieke Retry-After waar beschikbaar, zonder automatische retries. Completiondiagnostiek bevat voortaan ook prompttokens als de provider ze levert.
- Regressies en Pages-CI controleren deze foutpaden, privacy, succes-tegenvoorbeeld en dubbele indiening. Er is geen eindvalidator van de Worker versoepeld.

Plaatsen zodra afzonderlijk geautoriseerd:

- **Frontend:** `index.html`, `js/app.js`, `js/config.js` en nieuw `js/correction-api.js` samen. De helper laadt vóór app.js. Mobiel opnieuw bouwen/synchroniseren. Geen essays/API-sleutels in de deelbare foutdetails.
- **Worker:** de volledige `downloads/essaycoach-worker-v5.6.20.txt` of `apps/worker/src/worker.js`, met behoud van secrets en modelbinding. Health moet `2026-10-19-coaching-v5.6.20` tonen. De volledige v5.6.19-snapshot blijft beschikbaar voor terugrollen. Geen deadlines of tokenbudgetten verhoogd.

## Inhoudelijke kwaliteit: resterende fouten

De eigenaar meldt in een geslaagde v5.6.19-uitvoer “need to commute to the work” en “easy for connect with other people”. In deze context zijn “need to commute to work” en “easy to connect with other people” passend. Een correct tegenvoorbeeld is “commute to the work site”: daar is `the` wel geldig. Dit vraagt om een contextuele controle van de hele uiteindelijke zin, niet een globale zoek/vervangregel voor `the work`.

Een sluitende audit bewijst alleen dat alle aangebrachte wijzigingen onderbouwd en reproduceerbaar zijn. Zij bewijst niet dat alle fouten gevonden zijn. De nieuwe prompt en controles behandelen de hele gecorrigeerde zin; regressies omvatten meerdere fouten, exacte reconstructie, resterende fouten en correcte tegenvoorbeelden. De bestaande audit blijft een harde toelatingsvoorwaarde. De gefocuste zes-zinnenlimiet uit v5.6.19 blijft bestaan: niet alle fouten in een lang essay worden automatisch gecorrigeerd.

De opdracht vraagt samenvatten, evalueren en eigen ideeën, maar schrijft geen vaste volgorde of alinea-indeling voor. Feedback mag een mogelijke aanpak voorstellen; geen Content-/taakstraf omdat evaluatie verweven is met de samenvatting. Test een geïntegreerde en een gescheiden opbouw met dezelfde inhoud tegen dezelfde taakdekking. De nieuwe live response bevestigde deze onjuiste claim; prompt en eindcontrole zijn daarop gericht aangepast. Een algemene, vaste examenstructuur is niet ingevoerd.

## Technische keten en risico's

Browser → publieke `/api/correct` → Worker met geheime OpenAI-key → meerdere seriële AI-aanroepen → lokale validatie → alleen gevalideerd resultaat. In de geïnspecteerde v5.6.19-snapshot en de v5.6.20-reparatie:

| Onderdeel | Bevinding / consequentie |
| --- | --- |
| Accounts | Geen accountdatabase of gebruikersauthenticatie in deze correctieketen. 80.000 geregistreerde accounts zegt op zichzelf niets over correctiebelasting. |
| Deadlines | Eén 180s-budget, maximaal 60s per providercall. Task maximaal 2, assessment 3, review 2; totaal begrensd, soms extra classificatieherlezing binnen die budgetten. |
| Tokens | Eerst max_completion_tokens 6.000, bij afkappen 10.000. Volledige input en vorige kandidaat worden herhaald: retries vergroten tijd, tokens en kosten. Geen input-tokenbudget vooraf. v5.6.19/20 kiezen maximaal zes correctiezinnen en achttien auditfragmenten; dat is geen volledige correctie van alle fouten in een lang essay. |
| Providerstoring | v5.6.19: 429/503 leidt tot 502 AI_SERVICE; v5.6.20: 429 wordt 503 AI_RATE_LIMITED met numerieke Retry-After; provider-503 blijft 502 AI_SERVICE; geen blinde provider-retry. TIMEOUT geeft 504. Dit is veilige afwijzing, maar capaciteit/temporariteit is te weinig gedifferentieerd. |
| Limieten/misbruik | Veldlengte- en segmentlimieten bestaan; v5.6.20 begrenst de ruwe body nu vóór parsing; de bestaande veld-/segmentlimieten blijven daarna gelden. Geen aangetroffen gebruikersquotum, distributed concurrencylimiet, Turnstile, tenantbudget of rate-limiterbinding. CORS is geen authenticatie. Externe Cloudflare-regels kunnen bestaan maar zijn niet ingezien. |
| Idempotentie | Geen gedeelde request/jobregistratie. Herindiening of twee tabbladen kan opnieuw betalen/verwerken. Alleen de nieuwe UI-kliksuppressie is geïmplementeerd. |
| Observability | Per-response fasegeschiedenis en tijden beschikbaar. Geen aangetroffen centrale geaggregeerde fout-/latency-/tokenmetriek of eind-tot-eind request-ID. De lokale diagnostiek bevatte vrije citaten; de nieuwe UI-deelrapportage verwijdert die. |
| Privacy | Essays en bronnen gaan naar OpenAI. Browser bewaart feedback/invoer in geheugen; localStorage in app.js bevat taal en niveau, geen essayopslag aangetroffen daar. Geen persistente essayopslag in deze Worker aangetroffen. Dat zegt niets over providerretentie of externe logging. De ruwe succesdebug bevat leerlingtekst en blijft alleen voor de eigen gebruiker; deel alleen het veilige foutrapport. |
| CPU/geheugen | Exacte auditreconstructie en JSON-validation kosten CPU; lang modelwachten is niet hetzelfde als CPU-tijd. Lokale Node-throughput bewijst geen Workers-isolatebudget. |

De code is inmiddels tegen de v5.6.19-snapshot gecontroleerd; externe dashboardinstellingen en productiequota zijn nog niet ingezien.

## 80.000 accounts: expliciete scenario's, geen quota-claims

Aannames, niet gemeten gebruik: 10 actieve uren per dag; piek = 10× gemiddelde binnen die uren; gemiddeld 85 seconden totale servicetijd; 4 modelcalls per correctie; totaal 20.000 inputtokens en 8.000 outputtokens per correctie over alle calls. 85 seconden is slechts een scenario gebaseerd op de door de eigenaar genoemde geslaagde aanvraag, geen gemeten gemiddelde. Werkelijke tokens en repairratio moeten worden gelogd. Little's law: gelijktijdige correcties ≈ aankomsten/seconde × gemiddelde servicetijd (exclusief extra wachtrijvertraging).

| Scenario | DAU | Correcties per DAU/dag | Correcties/dag | Gemiddeld/s (10 uur) | Piek/s | Gelijktijdig bij piek | Model-RPM bij piek | Totale TPM bij piek |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Rustig: 1% actief | 800 | 1 | 800 | 0,022 | 0,222 | 19 | 53 | 373.333 |
| Normaal scenario: 10% actief | 8.000 | 2 | 16.000 | 0,444 | 4,444 | 378 | 1.067 | 7.466.667 |
| Zware piekdag: 50% actief | 40.000 | 3 | 120.000 | 3,333 | 33,333 | 2.833 | 8.000 | 56.000.000 |

Een extra review kost doorgaans een extra call én herhaalde input en gegenereerde output. Tokenreservering/rate-limiting kan op de aangevraagde maximale output plaatsvinden; daadwerkelijk verbruik alleen kan daardoor de benodigde headroom onderschatten. Een wachtrij maakt tekort aan tokens/minuut niet ongedaan: als aankomstsnelheid hoger blijft dan verwerkingssnelheid groeit de wachttijd onbegrensd.

Kostenformule, zonder verzonnen actuele prijs: `dagkosten = correcties_per_dag × (inputtokens × prijs_input_per_miljoen + outputtokens × prijs_output_per_miljoen) / 1.000.000`, plus Worker-, opslag-, queue- en egresskosten waar van toepassing. Met bovengenoemde tokens is dat rustig `16 × P_in + 6,4 × P_out`, normaal `320 × P_in + 128 × P_out`, zwaar `2.400 × P_in + 960 × P_out` per dag. Cached tokens en retryverbruik apart meten; niet alle input als gecachet aannemen.

Actuele documentatie geprobeerd op 19 oktober: Cloudflare Workers limits, OpenAI rate limits en OpenAI your-data. Alle drie gaven vanuit deze omgeving `Tunnel connection failed: 403 Forbidden`. Bronnen ter verificatie:

- https://developers.cloudflare.com/workers/platform/limits/
- https://platform.openai.com/docs/guides/rate-limits
- https://platform.openai.com/docs/guides/your-data

Cloudflare-plan, CPU/subrequestlimieten, eventuele account-/zone-rate-limits, OpenAI-project/model RPM/TPM/daglimieten en budgetten zijn **niet geverifieerd**. Geen concrete providerquota of retentietermijnen worden daarom als feit gebruikt. Nodig: actuele dashboardwaarden en responseheaders (veilig geschoond), exacte modelversie, prijskaart, projectbudget en privacy-/retentieinstellingen. Geen API-sleutels delen.

## Mockload: gemeten, beperkte betekenis

Reproduceerbaar via `node scripts/load-worker-mock.mjs <aantal> <gelijktijdig> <mock-wachttijd-ms> <scenario> <rapportpad>`. Fetch wordt volledig vervangen; er wordt nooit een echte netwerkrequest gedaan. Vaste synthetische C2-providerantwoorden uit een afzonderlijke helper, echte Worker-validatie, Node v24.19.0 op één proces. Het test niet accounts, Cloudflare scheduling, echte modelkwaliteit of echte providerlimieten. Geen duurtest. Heapdelta is GC-afhankelijk; geen productiegeheugenbudget.

| Scenario | Aanvragen | Gelijktijdig | Mockdelay/call | p50 / p95 / p99 ms | Uitkomst |
| --- | ---: | ---: | ---: | --- | --- |
| Geldig | 200 | 1 | 5 ms | 22 / 26 / 33 | 200× HTTP 200 |
| Geldig | 200 | 20 | 5 ms | 118 / 212 / 238 | 200× HTTP 200 |
| Geldig | 200 | 80 | 5 ms | 432 / 660 / 685 | 200× HTTP 200 |
| Tragere mock | 60 | 20 | 100 ms | 322 / 406 / 415 | 60× HTTP 200 |
| Eén reviewherstel | 120 | 20 | 5 ms | 137 / 205 / 222 | 120× HTTP 200 |
| Blijvend ongeldig | 80 | 20 | 5 ms | 143 / 214 / 224 | 80× HTTP 502 |
| Provider 429 | 80 | 20 | 5 ms | 19 / 50 / 80 | 80× HTTP 503 |
| Provider 503 | 80 | 20 | 5 ms | 32 / 75 / 86 | 80× HTTP 502 |
| Gesimuleerde timeout | 80 | 20 | 5 ms | 25 / 75 / 110 | 80× HTTP 504 |

Dit zijn de **v5.6.20-metingen**: 1.100 aanvragen, nul onverwachte statussen en nul nextDrafts op foutresponsen. Volledige cijfers: `docs/load-results-v5620.json`. De vóór ontvangst van de snapshot gemeten v5.6.5-baseline staat afzonderlijk in `docs/load-results-20261019.json`; die is geen v5.6.19-test. Vergelijk deze korte lokale runs niet als bewezen snelheidseffect: broncode, mocks en machinecondities verschillen.

Timeout is een geïnjecteerde TimeoutError, geen 60-secondenprovider-wachttest. De mock met 100ms is evenmin een realistische 85s AI-vertraging. Deze cijfers tonen het gedrag onder lokale overlap en fouten, geen capaciteit voor 80.000 klanten.

## Technische testresultaten

**228 checks geslaagd**: 77 Worker, 51 coaching, 43 language-audit, 16 eerdere reconstructieregressies, 12 writing-coach, 6 tense-feedback, 4 frontend-integratie, 10 veilige API-client, 1 endpointprivacy en 8 nieuwe v5.6.20-regressies. Worker-syntax/build, frontend/mobile-build en bytegelijkheid van de plakversie gecontroleerd. Geen echte AI-calls in deze suites.

De oudere mocks zijn aangepast aan het bestaande v5.6.19-contract met `evidenceItems` per bronzin en behoud van de geldige puntkomma. Tests zijn niet via een soepelere eindvalidator passend gemaakt. De bronvolgorde-test controleert de aangetoonde foute claim en geldige tegenvoorbeelden; hij bewijst niet dat een echt model altijd voldoende brondekking of taalkwaliteit geeft.

## Geprioriteerd plan en meetbare acceptatiecriteria

**P0 — actuele oorspronkelijke fout:** v5.6.19 is inmiddels als snapshot onder versiebeheer; leg request-ID, veilige diagnose en volledige oorspronkelijke testinvoer vast. Acceptatie: exacte fout op dezelfde versie reproduceerbaar of expliciet niet gereproduceerd, oorzaak terug te voeren op een concrete fase/regel; regressie voor de gevonden oorzaak plus geldig tegenvoorbeeld. Geen versie-downgrade en geen validatorbypass.

**P0 — begrensde toegang/kosten:** server-side identiteit en abonnement/tenantquota; eventueel Turnstile vóór dure calls; bodylimiet vóór volledige parsing; atomische quota-/tokenreservering; globale én per-user inflightlimieten; beperkte wachtlijst. Gebruik een gedeelde sterke coordinator (bijvoorbeeld Durable Objects) voor atomiciteit, niet alleen een globale JS-Map in één isolate. Acceptatie: 100 gelijktijdige requests voor een account met quotum 1 veroorzaken maximaal één job en maximaal het gedocumenteerde AI-callbudget; overige krijgen 429 met gecontroleerde Retry-After. Storende limiter/backend faalt gesloten. Dagbudgetoverschrijding start nul extra modelcalls. Quota afgestemd op echte providerwaarden.

**P1 — idempotente jobs en backpressure:** POST maakt één job met idempotency-key, account en payload-hash; dezelfde key/zelfde payload retourneert dezelfde job, andere payload geeft 409. Duurzame status queued/running/completed/failed/cancelled, bounded queue, lease/heartbeat, polling of SSE. Lever geen nextDraft vóór finale validatie. Queues zijn at-least-once: voorkom dubbele facturatie; exact-once aan een externe provider mag niet zonder bewijs worden geclaimd. Acceptatie: 100 dubbele submits leveren één job; replay na crash verliest geen voltooid resultaat; wachtrij is begrensd, geen stille oneindige wachttijd; een herstelde job overschrijdt nooit zijn totale deadline/tokenbudget.

**P1 — providerstoringen en meten:** onderscheid 429, 5xx, afkappen, timeout en semantische afkeuring; respecteer Retry-After, beperkte exponential backoff+jitter binnen totale deadline, circuit breaker en globale concurrency. Geen automatische retry van ongeldige invoer of ongecontroleerde kosten na ambigue netwerkuitkomst. Registreer request/job-ID, versie, fase, wall/CPU-tijd, prompt/completiontokens, providerstatus en regelcodes zonder ruwe essays/prompts. Acceptatie: provideruitval stopt nieuwe upstreamcalls binnen een vastgelegde drempel; herstel via begrensde probes, geen retrygolf; p50/p95/p99 en repairratio per model/build zichtbaar.

**P1 — privacy:** expliciete opslag-/verwijdertermijn voor eventuele jobs en resultaten, autorisatie op iedere result/read, geen essaytekst in logs, minimale requestdiagnostiek, geverifieerde providerdata-instellingen. Acceptatie: tenant A kan geen resultaten van B lezen; automatische verwijdering aantoonbaar; canary-essaytekst en sleutelpatronen verschijnen niet in logs/supportrapporten. Browserdebug blijft geen centrale loggingbron.

Voorgestelde doelen (nog niet gehaald/aangetoond): 99,5% van geaccepteerde, geschikte aanvragen binnen het gecontracteerde belastingprofiel eindigt binnen 180s met gevalideerde feedback; p50 ≤60s, p95 ≤120s, p99 ≤180s; 100% van technische mislukkingen toont een veilige code/fase en geen ongevalideerde tekst. Deadline en succespercentage apart rapporteren: een nette 502 is veilige foutafhandeling, geen geslaagde correctie. Bij overbelasting snelle expliciete afwijzing of een jobstatus met wachttijd. Inhoudelijke kwaliteit apart meten op een meertalige, handmatig beoordeelde set met juiste zinnen, meerdere fouten per zin en bronverdraaiing; HTTP 200 is geen bewijs van foutloze feedback.

Om 80.000 klanten te onderbouwen: gemeten DAU/correcties/piekprofiel, goedgekeurde quota en budget, nieuwe architectuuracceptaties, 60-minutenstagingtest met 10× gekozen piek en langdurige providerlatenties via mocks, fault-injection en crashrecovery, gevolgd door een kleine begrensde echte AI-canary (geen massale OpenAI-loadtest). Herhaal op de daadwerkelijke Cloudflare-configuratie en v5.6.20. Tot die tijd is de capaciteit **niet aangetoond**.
