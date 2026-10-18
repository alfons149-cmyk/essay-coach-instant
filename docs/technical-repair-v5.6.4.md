# EssayCoach v5.6.4 — gerichte taalcorrecties en serveropbouw

Basis: v5.6.3 op de reparatiebranch `fix/essaycoach-v5.6.0`. Build: `2026-10-18-coaching-v5.6.4`. De wijziging is uitsluitend voor de Worker en de test-runner; `main` en Cloudflare zijn niet gewijzigd. De volledige plakversie `downloads/essaycoach-worker-v5.6.4.txt` is bytegelijk aan `apps/worker/src/worker.js`.

## Contract en afbakening

- De beoordeling van de werkelijke schrijfopdracht, bronpositie, bronverdraaiing en eigen evaluatie blijft bestaan. Bij twee C2-bronnen zonder expliciete instructies legt de bronlezing de voorlopige `source_essay`/`assumed`-classificatie nu ook vast in het strikte output-schema van assessment en review. Een classificatieverschil kan daardoor in gewone gestructureerde modeluitvoer niet meer onnodig een bronherlezing en herbeoordeling activeren. De bestaande afwijkingscontrole blijft voor andere opdrachten en voor afwijkende providerantwoorden werken.
- De taalreview kiest **maximaal zes zinnen** met noodzakelijke, goed onderbouwde correcties; er is geen minimum. Het model geeft uitsluitend oorspronkelijke exacte fragmenten, vervangingen, categorie en uitleg terug, maximaal 18 fragmenten. De server berekent fragmentposities in de oorspronkelijke zin, combineert compatibele wijzigingen en bouwt daar zelf de volledige correctie uit. `edits` en `nextDraft` blijven onderdeel van het bestaande v2-clientantwoord, maar `edits` staat niet meer in het gestructureerde output-schema van de review. De eerste beoordeling kan voorlopige `edits` bevatten; de onafhankelijke review bepaalt de definitieve correcties.
- Een taal-leerpunt of correction-insight met passend evidenceId krijgt pas na geslaagde fragmentcontrole de exact opgebouwde verbeterde zin. Andere voorbeelden blijven eigen oefenvoorbeelden. De feedback noemt in EN/ES/NL de belangrijkste aandachtspunten en vult de lijst uitsluitend met de reeds gevalideerde leerpunten, in hun prioriteitsvolgorde. Ook bij nul correcties wordt geen foutloosheid geclaimd.
- Exacte unieke oorspronkelijke citaten, conflicten, puntsgewijze punctuatiebeslissingen, geldig causaal `for`, contextueel `however`, beschermde tense-vormen, bron- en taakconsistentie en alle bestaande eindcontroles blijven actief. Een ongeldige of conflicterende audit wordt niet deels toegepast; blijvende fouten geven HTTP 502 zonder `nextDraft`. Er is geen extra AI-aanroep of verhoogde deadline toegevoegd.

## Beperkingen

De server verifieert de structuur en kan specifieke bekende onnodige correcties blokkeren, maar hij kan niet volledig bewijzen dat een model een grammaticaal oordeel juist motiveert. Een fout die niet tot de zes gekozen correctiezinnen behoort, blijft mogelijk in de tekst staan; dat wordt nu expliciet aan de leerling gemeld. De bronlezing zelf kan nog een verkeerd auteursstandpunt kiezen. Een werkelijk tegenstrijdige of onvolledige bronlezing krijgt geen automatische succesfallback.

## Verificatie

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
cmp apps/worker/src/worker.js downloads/essaycoach-worker-v5.6.4.txt
```

**Mocks:** 202 controles geslaagd: worker 77, coaching 49, audit 42, bestaande regressies 16, UI 12, tense 6. De nieuwe controles oefenen de C2-output zonder `edits`, de serveropbouw, maximaal zes correctiezinnen, een ongeldige overlappende audit, behoud van causaal `for`, de vastgezette voorlopige bronclassificatie en de EN/ES/NL-prioriteitenlijst. Syntax en beide builds slagen. Mock-grammatica is geen echte AI-kwaliteitsmeting.

**Echte AI:** v5.6.4 is niet gedeployed en er is dus geen echte v5.6.4-AI-run of gemeten tijdwinst. De voorafgaande live v5.6.3-baseline bestond uit drie identieke C2-runs in het Nederlands (HTTP 200 in 138/169/164 seconden). Alle drie signaleerden bron 2 als `distorted`; alle drie voerden echter een extra taaklezing en assessment uit, twee kregen een aanvankelijk afgekeurde punctuatie-review, en één assessment probeerde het geldige `for` te vervangen. V5.6.4 adresseert de dubbele output en de voorlopige classificatie structureel; of fouten en tijden werkelijk afnemen moet na deployment met dezelfde C2-input en correcte tegenvoorbeelden worden gemeten. De runner weigert standaard een andere healthversie dan v5.6.4.

Volledige bron en plakversie zijn beschikbaar op de reparatiebranch. De bestaande v5.6.3-plakversie blijft beschikbaar voor terugrollen. Er zijn geen nieuwe secrets of packages nodig.
