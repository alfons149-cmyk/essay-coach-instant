# EssayCoach v5.6.12: bronbetekenis en causaal `for` beschermen

## Live fout op v5.6.11

De tweede toegestane C2-productieaanvraag gaf HTTP 200 in 76,6 seconden maar de steekproef `preserveCausalFor` faalde. De onafhankelijke review gaf automatisch een nieuwe betekenis aan S10, hoewel die zin als verdraaide bronclaim was gelabeld en de leerling die zelf hoort te herschrijven. Hij veranderde daarnaast `for parents observe` in `for parents observing`, met een onjuiste uitleg dat na `for` geen volledige causale zin kon volgen. De bestaande bewijzen voor S10 als `distorted`, S11/S12 als accurate details en de beginhoofdletter waren wel correct.

## Reparatie

Een `distorted` bronpunt levert `essayEvidenceIds` op met alleen werkelijk tegenstrijdige leerlingzinnen. De server wijst vanaf nu iedere automatische taalcorrectie op zo'n zin af: de bronles geeft de leerling een herschrijfopdracht en `nextDraft` behoudt de oorspronkelijke betekenis. Dit is bewust conservatief; eventuele lokale taalproblemen in die zin worden pas aangepakt nadat de leerling de broninterpretatie heeft herzien.

De server verwerpt bovendien de waargenomen omzetting van een oorspronkelijke causale `for + onderwerp + persoonsvorm` naar `for + onderwerp + deelwoord`. Een komma vóór het oorspronkelijke causale `for` blijft een mogelijke noodzakelijke reparatie. De bestaande afwijzing van `for -> because/as/since` blijft gelden. De nieuwe diagnoses gaan binnen de bestaande pogingen naar de onafhankelijke review en geven bij blijvend falen geen ongecontroleerde verbeterde tekst terug.

De participiumcontrole is beperkt tot werkwoorden die de bestaande causale-forherkenning herkent en een regelmatige `-ing`-vorm volgens de gebruikte stamregel hebben. Zij is geen algemene grammaticale bewijsprocedure. Een oorspronkelijke beneficiaryconstructie `for parents observing` wordt niet als causaal `for parents observe` behandeld.

## Verificatie

Mockregressies herhalen beide afgekeurde live-correcties en eisen herstel. De juiste komma vóór `for` en een correct beneficiary-tegenvoorbeeld blijven toegestaan. Een volledige mockrequest laat zien dat een voorgestelde bronbetekeniswijziging naar review gaat en niet in `nextDraft` terechtkomt. De bestaande Worker-, coaching-, taal-, frontend- en regressiesuites plus de build slagen. v5.6.12 heeft nog geen echte AI-meting.

De volledige editorplakversie `downloads/essaycoach-worker-v5.6.12.txt` is bytegelijk aan `apps/worker/src/worker.js`. Na plaatsing: controleer health `2026-10-18-coaching-v5.6.12` en inspecteer bij een echte C2-run S10 en S12, de bronbewijzen, de leeropdracht en alle fasechecks. HTTP 200 alleen is geen inhoudelijk bewijs.
