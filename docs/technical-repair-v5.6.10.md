# EssayCoach v5.6.10: bewijsrollen bij bronverdraaiing

## Waarneming

Twee productieaanvragen op v5.6.9 beoordeelden bron 2 terecht als `distorted` omdat zin S10 de hoofdpositie van de auteur omdraait. De bronreview gaf onder hetzelfde foutlabel ook de correcte historische en ondersteunende zinnen S11 en S12 weer. De Nederlandse uitleg maakte dat onderscheid wel, maar de bronbewijsweergave kon de leerling misleiden. De tweede run duurde 107 seconden door één gerepareerde review; de eerste duurde 74 seconden. Dit zijn v5.6.9-metingen, geen v5.6.10-metingen.

## Verandering

De source-essay schema-uitvoer heeft per bronpunt `evidenceItems`, waarin elk aangehaald oorspronkelijk leerlingzinnummer apart `agrees` of `contradicts` krijgt. De server controleert unieke nummers en een relatie die past bij `covered`, `partial`, `missing` of `distorted`. Bij `distorted` bouwt hij het bestaande `essayEvidenceIds` en `essayEvidence` uitsluitend uit de tegenstrijdige zinnen op. Correcte details komen apart in `accurateEvidenceIds` en `accurateEvidence`; de bestaande frontend toont alleen het oorspronkelijke foutbewijsveld en kan de correcte details in de uitleg blijven benoemen. Het v2-contract blijft bestaan en krijgt slechts aanvullende velden.

Het model blijft de betekenis van zinnen classificeren. De structurele controles bewijzen niet dat elke keuze `agrees` of `contradicts` grammaticaal of inhoudelijk juist is. De onafhankelijke review krijgt daarom dezelfde expliciete opdracht. Er is geen automatische tekstcorrectie op basis van bronbetekenis, geen extra AI-fase en geen budgetverhoging. De taal- en interpunctiecontroles uit v5.6.9 blijven behouden.

## Tests

De vastgelegde combinatie S10 (`contradicts`), S11 en S12 (`agrees`) levert precies S10 op als weergegeven foutbewijs. Dubbele zinnen, een `distorted` punt zonder tegenspraak en een `covered` punt met tegenspraak worden afgewezen. Het bestaande C2-contract, andere schrijftaken, reconstructie van taalcorrecties en frontendcontroles blijven onder mocks getest. Echte AI-nauwkeurigheid voor v5.6.10 is vóór deployment niet gemeten.

De editorplakversie `downloads/essaycoach-worker-v5.6.10.txt` is bytegelijk aan `apps/worker/src/worker.js`. Na plaatsing: controleer de healthversie `2026-10-18-coaching-v5.6.10`; voer de C2-casus opnieuw uit en inspecteer in `sourceReview[1]` zowel `essayEvidence` als `accurateEvidence`. Alleen HTTP 200 of automatische steekproefchecks zijn onvoldoende voor inhoudelijke juistheid.
