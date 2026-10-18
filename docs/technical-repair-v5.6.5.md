# EssayCoach v5.6.5 — C2-bronnen en interpunctiebewijs

Basis: v5.6.4 op de reparatiebranch. Worker-build `2026-10-18-coaching-v5.6.5`. Geen wijziging aan `main` of Cloudflare.

## Wijzigingen

- De UI biedt onder de taak twee optionele afzonderlijke C2-bronvelden in EN/NL/ES. Wanneer deze gevuld zijn, is het gewone taakveld uitsluitend voor schrijfinstructies. De Worker valideert beide volledige, verschillende bronpassages en voegt ze voor het bestaande leescontract samen. Zonder schrijfinstructies is de basis `assumed`; met instructies `explicit`. Gedeeltelijke velden en bronvelden bij B2/C1 krijgen HTTP 400.
- Voor de oude plakvorm met precies twee gescheiden blokken, elk een korte kop en minimaal 65 woorden doorlopende tekst, herkent de Worker een voorlopig C2-bronnencontract zonder inhoudelijke onderwerpregels. De bronlezer moet `source_essay` plus de juiste basis leveren, beide letterlijke bronlichamen citeren en per bron een of twee centrale punten onderbouwen. Andere opdrachten blijven vrij classificeerbaar; een echte classificatieafwijking kan nog een herlezing veroorzaken. De diagnostiek legt dan beide classificaties vast zonder leerlingtekst.
- De server accepteert een interpunctiebeslissing `correction` als een exact geciteerd en verklaard fragment de kandidaat raakt. Een als `grammar` gelabeld fragment kan ook tellen wanneer het de **werkelijke komma precies na de marker** invoegt en de uitleg uitdrukkelijk de komma/interpunctie noemt. Een ontbrekende komma, een andere wijziging, een fragment zonder de hele marker of een tegenstrijdige `valid`-beslissing blijft ongeldig. De server voegt geen komma toe op basis van een signaalwoord alleen.
- De bestaande eindcontroles, zes correctiezinnen, de bescherming van grammaticaal causaal `for`, contextueel `however`, bron- en taakaudit, en maximaal 180 seconden totaal/60 seconden per verzoek blijven actief. De Worker bouwt verbeterde zinnen nog steeds uitsluitend uit gevalideerde oorspronkelijke fragmenten.

## Testen en beperkingen

205 mockcontroles geslaagd: Worker 77, coaching 51, taalaudit 43, regressies 16, UI 12 en tense 6. Syntaxcontroles en Worker-/mobiele build geslaagd. De nieuwe regressies testen zowel afzonderlijke bronvelden als de herkenning van de oude twee-blokkenvorm, een gewone niet-bronopdracht, een komma die door een `grammar`-fragment werkelijk wordt toegevoegd, en tegenvoorbeelden zonder goed interpunctiebewijs. Exacte Worker-plakversie: `downloads/essaycoach-worker-v5.6.5.txt`.

Er is geen bruikbare lokale OpenAI-binding, dus er is **geen echte v5.6.5-AI-test** en geen gemeten tijdwinst. De v5.6.4-baseline op 18 oktober 2026 had C2 HTTP 200 na circa 153 seconden met twee taaklezingen, twee beoordelingen en twee reviews; eerste assessment verschilde in classificatie en eerste review miste bij P2 een passend bewijsfragment. De exacte oorspronkelijke classificatie en ruwe afgekeurde review waren niet beschikbaar. De nieuwe schema- en fragmentregels adresseren de zichtbare foutpatronen, maar een live herhaling blijft nodig voor bewijs van snelheid en inhoudelijke kwaliteit.

Gebruik na plaatsing dezelfde C2-test plus een correct tegenvoorbeeld. De runner verwacht standaard v5.6.5 en schrijft volledige invoer en feedback alleen naar het lokale rapportpad. Er is niets gedeployed. Plaats voor een aparte frontendrelease `index.html`, `js/app.js` en `js/i18n.js` samen; de Worker ondersteunt ook bestaande clients die de volledige taak in één tekstveld plakken.
