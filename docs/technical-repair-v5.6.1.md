# EssayCoach v5.6.1 — taakbeantwoording en auditbewijs

Versie: `2026-10-17-coaching-v5.6.1`. Geen frontendwijzigingen, extra runtimepakketten of nieuwe secrets.

## Vastgestelde problemen

Vier echte aanvragen tegen v5.6.0-audit-fix op 17 oktober:

| Aanvraag | Uitkomst | Wandtijd |
| --- | --- | ---: |
| B2 bibliotheken, ES, 162 woorden | Alle vijf ingevoegde taalfouten correct hersteld; totaaloordeel ten onrechte verlaagd ondanks volledige taakdekking | 42,877 s |
| Correct C1 milieu-essay, EN, 236 woorden | HTTP 200, tekst behouden, taak beantwoord | 27,332 s |
| Datzelfde C1-essay bij een geschiedenisopdracht, ES | HTTP 200, correct als niet beantwoord beoordeeld, taal behouden | 36,032 s |
| C2 homeschooling met volledige instructies, NL, 256 woorden | HTTP 502 na vier aanroepen; beide reviews melden overlap en onvoldoende reconstructie | 105,157 s |

De geanonimiseerde technische statussen uit de B2- en off-topic C1-uitvoer, plus C2-foutcodes, staan in `tests/fixtures/v561-live-regressions.json`. Deze fixture bevat geen volledige essays, bronpassages of leerlingfeedback. De reconstructietests gebruiken synthetische teksten en een zin uit de al bestaande openbare homeschooling-fixture. De ruwe afgekeurde C2-modelantwoorden zijn niet beschikbaar. We weten daarom niet of de gemelde overlap uitsluitend context, dubbele wijzigingen of echte conflicten betrof. De nieuwe regressies voor deze overlapvormen zijn synthetisch, geen exacte replay van ontbrekende modelantwoorden.

## Reparatie 1: taakbeantwoording

Voor gewone opdrachten controleert `task_coverage` alle daadwerkelijk gevraagde onderdelen: onderwerp, genre, gevraagde punten, vergelijking, redenen en eigen mening waar die gevraagd wordt. De prompt legt dit expliciet uit aan beoordelaar én reviewer. De server leidt het totaaloordeel af uit deze dekking. Advies over verdere verdieping, register of organisatie maakt een voltooide opdracht niet automatisch onvolledig. Deze aspecten blijven hun eigen feedback en scores behouden.

Bij bronessays blijven taakdekking, brongetrouwheid, evaluatie en eigen standpunt vereist. Een ontbrekende bronkern, verdraaide bron of onvoldoende vereiste evaluatie kan dus nog steeds geen volledige taakbeantwoording krijgen. Ontbrekende, dubbele of ongeldige controles worden niet ingevuld of geraden. Ontbrekende opdrachten blijven niet beoordeelbaar. De regressie met de echte B2-respons bevestigt dat alleen het totaaloordeel verandert, niet de onderliggende bevindingen, correcties of scores.

## Reparatie 2: geciteerde context versus daadwerkelijke wijzigingen

v5.6.0 behandelde elk geciteerd fragment als een afzonderlijke vervangopdracht. Twee correcte verklaringen konden dezelfde onveranderde woorden citeren, of dezelfde komma dubbel onderbouwen, en werden dan als overlap afgekeurd.

v5.6.1 berekent uit elk exact, uniek origineel citaat en zijn vervanging de daadwerkelijke wijzigingen op posities in de oorspronkelijke zin. Een begrensde tokenvergelijking scheidt meerdere wijzigingen binnen een breed citaat. Identieke wijzigingen tellen één keer; onveranderde context mag overlappen. Vervolgens moet de vereniging van alle onderbouwde wijzigingen exact de door het model voorgestelde volledige zin opleveren. De server verandert de voorgestelde zin niet.

Behoud van controles:

- Verzonnen of niet-unieke oorspronkelijke citaten blijven ongeldig.
- Ontbrekende uitleg, ongeldige categorieën en ontbrekende zindekking blijven ongeldig.
- Tegenstrijdige vervangingen en invoegingen binnen verwijderde tekst worden afgewezen.
- Extra wijzigingen die niet door het auditbewijs worden gereconstrueerd worden afgewezen.
- Een interpunctiebewijs moet de markering bevatten én een daadwerkelijke wijziging bij die markering of de direct volgende afbakening ondersteunen. Alleen een lange zin met die markering citeren is niet voldoende.
- De bestaande bescherming van geldige tijden, causaal `for`, bronverwijzingen en passende ochtenduitleg blijft actief.
- Bij een onopgelost conflict volgt nog steeds een foutrespons, geen ongecontroleerde tekst.

De tokenvergelijking gebruikt maximaal 65.536 tabelcellen per bewijsfragment. Grotere verschillen vallen terug op één exacte vervanging: dat kan conservatief een conflict veroorzaken, maar laat geen onverklaarde wijziging door. Tijdslimieten en maximale AI-pogingen zijn niet verhoogd.

## Verificatie en grenzen

Alle **179 technische checks** slagen: 76 Worker, 38 coaching, 35 audit, 16 nieuwe regressies, 8 writing-coach en 6 tense-feedback. Eén nieuwe regressie omvat daarnaast 400 deterministisch gevarieerde reconstructies. Worker-syntaxis en bytegelijkheid van de nieuwe plakversie zijn gecontroleerd.

De tests controleren ook volledige gesimuleerde aanvragen: compatibel bewijs geeft zonder extra reviewpoging een resultaat; blijvende echte conflicten leveren nog steeds HTTP 502. Tests die vroeger identieke dubbele bewijsfragmenten als fout behandelden gebruiken nu daadwerkelijk tegenstrijdige wijzigingen.

Exacte reconstructie bewijst niet dat een grammaticale verklaring inhoudelijk juist is. De modelbeoordeling van taakdekking kan eveneens fout zijn. Live v5.6.1-nauwkeurigheid en snelheid zijn nog niet getest: de nieuwe code moet eerst apart in Cloudflare geplaatst worden. Deze technische resultaten mogen niet als geslaagde live C2-test worden voorgesteld.

## Plaatsen en controleren

Vervang de volledige bestaande Worker door `downloads/essaycoach-worker-v5.6.1.txt`. Behoud `OPENAI_MODEL=gpt-5.4` en de bestaande `OPENAI_API_KEY`-secret. De healthcheck moet `2026-10-17-coaching-v5.6.1` tonen. Plaats niet alleen een nieuw versienummer.

Herhaal daarna het B2-bibliothekenessay uit deze testsessie en het bestaande C2-homeschoolingessay met volledige instructies en Nederlandse feedback. Controleer of B2 als beantwoord blijft beoordeeld, of C2 feedback teruggeeft, of de komma na `however` en het bronprobleem goed worden uitgelegd, en of `for` en `a head` behouden blijven. Controleer vervolgens correct C1 en off-topic C1 op behoud van taal en juist taakonderscheid. Vergelijk echte tijden; deze wijziging belooft geen vaste tijdwinst.

De eerdere v5.6.0-plakversie blijft beschikbaar voor terugrollen. Deze reparatie wordt alleen op de reparatiebranch gepubliceerd, niet op `main` of naar Cloudflare gedeployed.
