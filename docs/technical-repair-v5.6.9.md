# EssayCoach v5.6.9: stabielere bronpunten bij C2

## Live waarneming op v5.6.8

Twee toegestane productieaanvragen met hetzelfde homeschoolingessay gaven beide HTTP 200 in respectievelijk 82 en 81 seconden, zonder herstelpogingen. De taalcorrecties waren in beide gevallen consistent: de geldige puntkomma vóór `what is more` bleef behouden, de komma na `however` werd toegevoegd en causaal `for` bleef staan.

De inhoudelijke beoordeling per bronpunt was niet consistent. In de eerste run was het correcte historische detail over bron 2 `covered` en de tegengestelde hoofdclaim `distorted`. In de tweede run groepeerde de bronlezer geschiedenis met de algemene conclusie; dit punt werd `distorted` ondanks de correcte historische zin. Een tweede punt groepeerde steunstructuren met de redenen van ouders en kreeg `partial`. De leerling kreeg in beide runs nog wel de juiste hoofdles over de omgekeerde positie van bron 2. De fout zat in de indeling van bronpunten, niet in het reconstrueren van taalcorrecties.

## Verandering

De taaklezing bevat nu precies één toetsbare centrale positie per bron. Het exacte citaat moet de conclusie van de auteur onderbouwen; een kop die de tekst weerspreekt, historisch feit, statistiek, voorbeeld of ondersteunende reden mag niet als tweede onafhankelijk beoordeeld standpunt dienen. Zulke details kunnen nog in `position`, `summary`, uitleg, oefening en evaluatie worden besproken.

Het JSON-schema en de servervalidatie eisen ieder precies één keyPoint per bron. Een antwoord met twee gemengde bronpunten wordt herlezen binnen de bestaande pogingengrens; bij blijvend falen volgt HTTP 502 zonder gecorrigeerde versie. De review beoordeelt de omgekeerde hoofdclaim op de zin die deze werkelijk bevat en mag correcte historische details toelichten zonder die foutief als verdraaid te bestempelen. Het v2-clientcontract, taalcontrole, budgetten en deadlines veranderen niet.

Dit is een bewuste beperking van granulariteit. Een bron met twee onafhankelijk belangrijke standpunten krijgt één overkoepelende bronbeoordeling; de evaluatie en feedback kunnen beide inhoudelijke argumenten nog toelichten. Het schema garandeert de structuur, maar kan niet semantisch bewijzen dat een model het beste citaat kiest. Echte AI-uitvoer van v5.6.9 moet daarom opnieuw inhoudelijk worden beoordeeld.

## Tests

Een regressie reconstrueert de twee gemengde punten uit de tweede live run en vereist een herstelpoging vóór de essaybeoordeling. De bronreview na herstel bevat precies twee punten, waarvan de tweede de tegengestelde hoofdclaim met de betreffende leerlingzin markeert. Correcte historische details mogen in de uitleg blijven staan. Bestaande mocks voor andere C2-teksten, gewone taken, causaal `for`, interpunctie en taalreconstructie blijven slagen. Alle tests zijn synthetisch; de twee productieuitkomsten hierboven horen bij v5.6.8, niet bij v5.6.9.

De volledige editorplakversie is `downloads/essaycoach-worker-v5.6.9.txt` en is bytegelijk aan `apps/worker/src/worker.js`. Na plaatsing: controleer `/api/health` op `2026-10-18-coaching-v5.6.9` en voer twee echte C2-herhalingen uit. Vergelijk de centrale bronclaim, het citaat, de aangehaalde leerlingzin en de leeropdracht; HTTP 200 alleen is onvoldoende.
