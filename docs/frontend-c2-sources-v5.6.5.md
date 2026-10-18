# EssayCoach frontend — afzonderlijke C2-bronteksten

De Worker v5.6.5 draait al live. De frontendwijziging staat op de reparatiebranch en is niet naar `main` of GitHub Pages gedeployed.

## Code

- `index.html`: C2-bronvelden blijven verborgen op B2/C1, hebben labels en tonen instructies voor gebruik. Scriptversies van `app.js` en `i18n.js` zijn bijgewerkt om oude browsercaches te vermijden.
- `js/app.js`: bij C2 gaan twee complete, verschillende bronnen naar `sourceBodies`; de taak bevat in dat geval uitsluitend de schrijfinstructies. De bestaande invoer met één volledig geplakte opdracht blijft werken. De bronuitleg vergelijkt ontvangen exacte citaten met dezelfde samengestelde taaktekst als de Worker gebruikt; ook na wisseling EN/NL/ES. Bewerken van een bron wist verouderde feedback, wisselen naar B2/C1 verbergt de C2-invoer en verstuurt die niet, wissen leegt beide bronvelden.
- `js/i18n.js`: labels en foutmeldingen in EN/NL/ES.
- `tests/frontend-c2-sources.test.mjs`: browserhandler met gesimuleerde DOM en onderschepte API-aanvraag; test payload, broncontext, taalwissel, ongeldige invoer, niveauwissel, wissen en oude plakvorm. `.github/workflows/pages-deploy.yml` voert deze test uit voordat de site wordt gepubliceerd.

## Verificatie

`node tests/frontend-c2-sources.test.mjs`, `node tests/writing-coach.test.mjs`, syntaxiscontroles en `npm run mobile:build` slagen. Er is geen visuele browsertest met een echte browser uitgevoerd en de nieuwe frontend is nog niet live. De drie frontendbestanden moeten samen worden gepubliceerd. De Worker hoeft voor deze frontendcorrectie niet opnieuw te worden geplakt.
