# EssayCoach v5.6.2 — taalversie en C2-reviewcontract

Basis: `12bca93` op `fix/essaycoach-v5.6.0`. Build: `2026-10-18-coaching-v5.6.2`. Geen deployment of wijziging aan main. Geen nieuwe dependencies, secrets of frontend-responsevelden.

## Bevindingen en wijzigingen

De eigenaar meldt twee geslaagde live v5.6.1 C2-aanvragen van ongeveer 113 en 138 seconden, beide task 1 / assessment 1 / review 2. De assessment wilde geldig causaal `for` vervangen; de eerste review strandde op interpunctiebewijs of `learningPoints.sourceQuote`. Dit zijn door de eigenaar gemelde metingen, niet in deze sessie herhaalde aanvragen. De volledige afgekeurde modelantwoorden ontbreken, dus de precieze foutieve fragmenten en bron-ID-keuze zijn niet vastgesteld.

De code bevat drie concrete ambiguïteiten die daarop aansluiten:

1. De assessmentprompt noemde `for` → `as` als optioneel, terwijl de eindcontrole ook `because` en `since` afwijst. Assessment en review noemen nu alle drie expliciet en eisen behoud van geldig causaal `for`, ook bij andere fouten in dezelfde zin. Een ontbrekende komma mag afzonderlijk worden gecorrigeerd.
2. Het auditcontract vroeg om de hele markering te citeren, maar de validator vereist bovendien een daadwerkelijke wijziging bij die markering of de direct volgende afbakening. Prompt en kandidaatbeschrijvingen maken dit nu expliciet. Een plaatselijke komma na `however` krijgt eigen interpunctiebewijs; een breed citaat met een wijziging elders is onvoldoende. De v5.6.1-reconstructie, conflictcontrole en interpunctie-eindcontrole blijven ongewijzigd.
3. In C2 wordt `sourceQuote` door de server afgeleid van `sourcePointId`. Het schema stond een lege ID toe, ook bij `source_interpretation`. Het schema gebruikt nu twee strikte learning-point-varianten: broninterpretatie vereist een catalogus-ID; andere categorieën mogen een lege ID hebben. Bronbevindingen worden vóór de daarvan afhankelijke lessen gegenereerd. Een lege ID bij broninterpretatie levert ook een concrete reparatie-instructie voor `learningPoints.sourcePointId` op. De bestaande inhoudelijke broncontroles blijven gelden: een geldige ID alleen bewijst geen juiste uitleg.

Het schema gebruikt geneste `anyOf`-varianten binnen `learningPoints.items`, geen voorwaardelijke `if/then`-schema's. Alle objecten blijven strikt en alle velden vereist. Compatibiliteit van deze build met het ingestelde echte model is nog niet via een AI-aanvraag getest.

## Frontend

EN: “Language-corrected version”; NL: “Taalgecorrigeerde versie”; ES: “Versión con correcciones lingüísticas”. Een permanent zichtbare toelichting zegt dat alleen noodzakelijke taalcorrecties zijn toegepast, dat bron- en taakfouten kunnen blijven staan en dat dit geen volledig verbeterd antwoord is. De textarea verwijst toegankelijk naar die toelichting.

Bij onvolledige taakbeantwoording of een aangetoonde bronverdraaiing vermeldt de waarschuwing expliciet dat het inhoudelijke probleem nog niet is hersteld. Links gaan rechtstreeks naar de bronuitleg en de voorbeelden/oefeningen. Een bronlink opent de bronsectie. De bronsectie bij verdraaiing staat standaard al open; voorbeelden blijven direct zichtbaar. Leerlinginhoud wordt niet automatisch herschreven. De onjuiste interpretatie kan dus bewust in nextDraft blijven staan, naast een afzonderlijk correct voorbeeld. Modeltekst wordt als tekst weergegeven, niet als HTML.

## Technische verificatie versus echte AI

**190 technische checks**: 76 Worker, 43 coaching, 37 language-audit, 16 v5.6.1-regressies, 12 writing-coach en 6 tense-feedback. Worker-syntax/build en mobile web build slagen. De plakversie is bytegelijk aan de Worker.

Gerichte regressies controleren het C2-schema, ontbrekend interpunctiebewijs, lege bron-ID en de resterende afwijzing daarvan. Volledige gesimuleerde C2-aanvragen doorlopen de echte Worker zonder legacy-auditadapter. Geldig bewijs gebruikt task 1 / assessment 1 / review 1; een opzettelijk ongeldige eerste review wordt opnieuw beoordeeld. Dit test de procedure, niet of een echt model meteen het juiste antwoord geeft. De bron-2-verdraaiing, juiste bronuitleg en voorbeeld blijven aanwezig; `for`, de komma na `however` en de oorspronkelijke inhoud blijven volgens het correctiecontract behouden.

De technische scenario's omvatten B2 universiteit/bibliotheek, een correct C1-milieu-essay van 224 woorden bij zijn echte opdracht, hetzelfde essay bij een verkeerde geschiedenisopdracht, C1 museum en C2 homeschooling. Het correcte C1-essay blijft bij beide opdrachten taalkundig ongewijzigd; de taakbeoordeling verschilt. EN/NL/ES-labels, expliciete waarschuwing, links en bronvoorbeelden zijn met de DOM-harness getest. Dit is geen visuele browsertest.

Lokale suites duurden circa 0,17 / 0,19 / 0,13 / 0,10 / 0,04 / 0,05 seconden. Dit zijn geen modeltijden. Er is **geen bruikbare lokale API-binding**: geen OPENAI_API_KEY in de omgeving en geen Worker `.dev.vars`, `.env` of `.dev.vars.local`. Geen nieuwe echte AI-aanvragen uitgevoerd, geen live tijdwinst of verbeterde nauwkeurigheid geclaimd. De deadline, tokenbudgetten en poginglimieten zijn niet verhoogd.

## Afzonderlijk plaatsen (nog niet uitgevoerd)

- **Worker:** vervang de volledige Worker door `downloads/essaycoach-worker-v5.6.2.txt` (of deploy `apps/worker/src/worker.js` via de bestaande procedure). Behoud bestaande secrets en `OPENAI_MODEL`. Controleer daarna build `2026-10-18-coaching-v5.6.2` via `/api/health`.
- **Frontend:** plaats samen `index.html`, `js/i18n.js` en `js/writing-coach.js` via de bestaande GitHub Pages-procedure. De index bevat nieuwe scriptversies voor deze twee JS-bestanden. De huidige v5.6.1-response wordt ondersteund; er is geen gekoppelde Worker-deployment nodig om de duidelijkere labels te gebruiken. Voor een mobiele distributie moet ook de gegenereerde webbundle opnieuw worden opgenomen.
- Publicatie van deze code naar de reparatiebranch deployt niet: repository-deploymentworkflows luisteren naar `main` of handmatig starten. Main en Cloudflare blijven ongemoeid.

Na afzonderlijke autorisatie/deployment: draai `scripts/test-live-feedback.mjs` met `--base https://essaycoach.alfons149.workers.dev`, `--case library`, `--case c1`, `--case c1-wrong-task` en `--case homeschooling`. Voor C2 gebruik `--language es --repeat 3`; de runner verwacht standaard v5.6.2 en bewaart tijden, fasepogingen en feedback. Beoordeel de concrete bronuitleg en voorbeelden handmatig naast de automatische controles. Test de drie frontendtalen ook in de browser.
