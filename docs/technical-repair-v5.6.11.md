# EssayCoach v5.6.11: hoofdletter na het verwijderen van een opener

## Live v5.6.10

De productie-healthcheck toonde `2026-10-18-coaching-v5.6.10`. Een echte C2-aanvraag gaf HTTP 200 na 107 seconden, met één taaklezing, één assessment en twee reviewpogingen. Het doel van v5.6.10 werkte: bron 2 had alleen S10 in `essayEvidence` onder `distorted`; S11 en S12 stonden apart in `accurateEvidence`. De eerste review wilde een geldige puntkomma veranderen en werd afgewezen, waarna de tweede review die behield.

De tweede review liet wel een nieuwe fout door: `Although, homeschooling ...` werd `homeschooling ...` aan het begin van de verbeterde zin. De exacte auditfragmenten reconstrueerden die foutieve zin en de oude controles keken niet naar de noodzakelijke beginhoofdletter.

## Reparatie

De review-instructie vraagt nu om de eerste letter mee te corrigeren wanneer een ongeschikte concessieve opener wordt verwijderd. De server weigert een gereconstrueerde correctie die na het verwijderen van een zininitieel `Although,` of `Even though,` met een kleine letter begint. De diagnose `CAPITALIZATION_AUDIT` geeft de herstelpoging een concrete aanwijzing. Bij blijvend falen volgt de bestaande 502-uitkomst zonder ongecontroleerde verbeterde tekst. Bestaande checks voor de puntkomma, `however`, causaal `for`, de bronclaim en exact auditbewijs blijven gelden.

De controle is bewust beperkt tot dit waargenomen patroon. Zij bewijst geen volledige grammaticale juistheid van andere zinnen.

## Tests en release

De live S11-variant met twee exact passende fragmenten maar een kleine beginletter wordt afgewezen. Dezelfde zin met hoofdletter slaagt. Een ander onderwerp laat zien dat een afwijzing naar een geldige tweede review leidt. Alle modelantwoorden in deze regressies zijn mocks; v5.6.11 heeft nog geen echte AI-meting.

De volledige editorplakversie `downloads/essaycoach-worker-v5.6.11.txt` is bytegelijk aan `apps/worker/src/worker.js`. Na plaatsing: controleer healthversie `2026-10-18-coaching-v5.6.11` en inspecteer bij een echte C2-aanvraag de hoofdletter in `nextDraft`, de gescheiden bronbewijzen en de reviewgeschiedenis.
