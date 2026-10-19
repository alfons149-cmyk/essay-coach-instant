# Onderzoek C2-afwijzing v5.6.21 — afzonderlijk van frontendpublicatie

## Feiten

De eigenaar meldt voor de 401-woordeninvoer HTTP 502 na 100.777 ms (Worker 95.198 ms): task 1 geldig (5.667 ms), assessment 1 geldig (33.598 ms), review 1 EVIDENCE_GRANULARITY (34.443 ms), review 2 RESPONSE_CONSISTENCY / conflicterende wijzigingen in S9 (21.490 ms). Alle antwoorden hadden finish_reason=stop en bleven onder 6.000 outputtokens. Het veilige rapport bevat niet de ruwe auditfragmenten, het gebruikte herstelschema of de reden waarom herstelkandidaten eventueel ontbreken. De S9-toewijzing komt uit de toelichting van de eigenaar; de veilige JSON vermeldt alleen languageAudit.corrections.

S9 in de aangeleverde fixture is de zin die begint met “My cousin, who is working from home since two years…”. De exacte live modelwijzigingen zijn onbekend. De oorspronkelijke 393-woordenfout is hiermee niet gereproduceerd.

## Concrete bevindingen in v5.6.21

1. `sentenceRepairCandidates` is alles-of-niets. Eén falende lokale positie-/reconstructiecontrole retourneert `[]` voor de volledige kandidaatset. `reviewSchema` kiest dan weer vrije `corrections`; `auditRepairContext` geeft de algemene instructie om alle spans opnieuw te bouwen. Een eerste fout die uitsluitend EVIDENCE_GRANULARITY heet, garandeert dus **niet** dat de tweede review begrensd is.
2. Dit is mechanisch reproduceerbaar met de echte S9 als oorspronkelijke zin en een **synthetisch**, niet uit de live uitvoer afkomstig voorstel. Wijzig daarin `is working` naar `has been working` en `told me` naar `has told me`. De tweede keuze is alleen testdata en wordt niet als noodzakelijke taalcorrectie aanbevolen. Constructie meldt alleen granulariteit. De volledige-zindiff plaatst de invoeging ` has` op oorspronkelijke positie 52. Voor het lokale citaat `years, told` → `years, has told` plaatst dezelfde diff-routine `has ` op positie 53. Beide representaties leveren dezelfde tekst op, maar de strikte vergelijking van patchposities retourneert geen herstelkandidaten. Het tweede schema laat vervolgens weer vrije fragmenten toe.
3. In de resolver zit bovendien een compatibiliteitspad: als `sentenceRepairs` ontbreekt, wordt een gewone `corrections`-lijst doorgelaten naar de eindvalidator, ook wanneer er wel herstelkandidaten waren. Het strikte providerschema hoort zo'n antwoord te voorkomen, maar runtime wordt de gekozen herstelroute niet afgedwongen. De test toont dat conflicterende vrije voorstellen hierdoor de resolver passeren en vervolgens terecht door de constructiecontrole worden afgewezen. Dit is **geen bewijs** dat OpenAI in de live aanvraag het strikte schema negeerde.
4. Wanneer de begrensde route daadwerkelijk wordt gebruikt, worden alle lokale wijzigingen uit serverkandidaten overgenomen. Die zijn al op conflicten en exacte reconstructie gecontroleerd. Een volledig S9-voorstel met has been working / for two years / wants / hates / likes wordt in de karakterisatietest zonder conflict geconstrueerd. Dit test de mechanica, niet de semantische kwaliteit van een echt modelantwoord.
5. De lokale fragmenten kunnen grammaticaal afhankelijke delen opsplitsen: `who is` → `who has` en `is working` → `is been working`. Gecombineerd klopt de reconstructie, maar afzonderlijk maakt dat een passende uitleg lastiger. Dit is een extra aandachtspunt voor een gerichte vervolgimplementatie, geen aangetoonde oorzaak van het gerapporteerde conflict.

## Wat we wel en niet kunnen concluderen

De begrensde route beschermt alleen wanneer hij geactiveerd én gevolgd wordt. Er bestaat een aangetoonde terugval naar vrije fragmenten na uitsluitend een granulariteitsfout. Dat maakt het gerapporteerde patroon mogelijk; het zegt nog niet dat precies de hierboven beschreven spatieverschuiving in het echte antwoord voorkwam. Zonder de oorspronkelijke review-audits en de schema-/routekeuze kan de precieze live oorzaak niet worden vastgesteld. De eindcontrole heeft het conflict veilig tegengehouden; er wordt niets versoepeld.

Gerichte vervolgstappen voor Worker-code, apart te beoordelen en te testen:

- Leg een veilige herstelroute en reden vast: constrained/freeform en een vaste redenenum zoals LOCAL_ALIGNMENT_MISMATCH. Alleen IDs, aantallen en vaste codes; geen essaycitaten of providerteksten.
- Dwing een gekozen constrained-schema ook runtime af; ontbrekende sentenceRepairs mag niet stil teruggaan naar vrije quotes.
- Canonicaliseer equivalente lokale invoegingen alleen met unieke originele citaten, niet-conflicterende patches én bewezen identieke volledige reconstructie. Combineer grammaticaal afhankelijke wijzigingen waar mogelijk binnen de bestaande grens van twee wijzigingen per fragment; vereis een passende nieuwe uitleg.
- Laat onveilige of niet volledig reconstrueerbare voorstellen afgewezen. Geen extra retry, hogere tijd-/tokenlimiet of ongecontroleerde fallback.

## Tests en wijzigingsscope

`node tests/audit-route-v5621.test.mjs`: drie karakterisatietests geslaagd. Dit zijn synthetische auditvoorstellen; geen echte AI-aanvraag en geen reconstructie van de ontbrekende live JSON. Het bestand legt de bestaande routinggaten vast en zal bij een toekomstige reparatie naar regressies op het gewenste gedrag moeten worden omgezet.

Voor dit afzonderlijke onderzoek zijn alleen dit verslag en de karakterisatietest toegevoegd op `fix/essaycoach-v5.6.0`. Worker-broncode, plakversie, modelconfiguratie, deadlines en retries zijn ongewijzigd. Niets naar Cloudflare gedeployd.

De frontend is afzonderlijk gepubliceerd in main-commit `4f04e03`: uitsluitend index.html, js/app.js, js/config.js, js/correction-api.js en — na expliciete aanvullende toestemming — tests/frontend-c2-sources.test.mjs. De vijf bestanden zijn identiek overgenomen uit de reparatiebranch. De vooraf uitgevoerde 34 frontendcontroles slaagden. Er is geen merge van de reparatiebranch uitgevoerd.

## Controle na frontendpush

Main is op afstand bevestigd als `4f04e03f5a64fbc80c0c2e001091c81fa8b9a5c0`; de commitdiff bevat exact de vijf toegestane bestanden. Pages-run: https://github.com/alfons149-cmyk/essay-coach-instant/actions/runs/39287588883 . Tijdens deze controle stond die run op Waiting, met een geproduceerd github-pages-artifact; de publieke website serveerde toen nog de oude bestanden. Dit is dus nog geen bevestigde succesvolle publicatie.

**Afwijking Worker-health:** om 16:43:12 UTC meldde de health na de frontendpush nog v5.6.21 / gpt-5.4. Om 16:44:24, 16:44:39 en 16:44:40 UTC meldde de health v5.6.7 / gpt-5.4, zowel zonder query als met een verificatiequery. Die versie komt overeen met de reeds aanwezige Worker-broncode op main, die niet in deze commit is gewijzigd. De geraadpleegde Actions-lijst toont geen nieuwe Deploy API-run voor 4f04e03. Een externe Cloudflare/Git-integratie is een mogelijke verklaring, geen vastgesteld feit: toegang tot de Cloudflare deploymenthistorie ontbreekt. Er is geen Worker-deploycommando uitgevoerd. Het doel dat live v5.6.21 blijft, is dus niet bevestigd; deze afwijking moet apart via de Cloudflare deploymenthistorie worden onderzocht. Herstel/deployment van Worker-code valt buiten de frontendpush.

**Eindcontrole 16:45:42 UTC:** Pages-run 39287588883 is geslaagd (3m42s). Alle vier publieke frontendbestanden retourneren HTTP 200 en zijn bytegelijk aan commit 4f04e03. De Worker-health meldt nog steeds `2026-10-18-coaching-v5.6.7` met `gpt-5.4`; die afwijking blijft dus open.
