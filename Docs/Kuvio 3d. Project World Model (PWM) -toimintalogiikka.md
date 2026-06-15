# Project World Model (PWM) Arkkitehtuurikaavio

Tämä tiedosto kuvaa `pwm_architecture_diagram.png` -kaavion tarkan rakenteen, asettelun ja sisällön tekstimuodossa (suunniteltu erityisesti NotebookLM:ää ja muita tekstiä lukevia kielimalleja varten).

## Yleiskuvaus
Kaavio esittää Project World Model (PWM) -järjestelmän arkkitehtuurin, joka on jaettu kolmeen rinnakkaiseen loogiseen vaiheeseen vasemmalta oikealle (Havainnointi, Ennustaminen, Ohjaus) ja yhteen näiden alla kulkevaan palaute- ja ohjausmekanismiin (Skenaariostrategi). 

Virtaus etenee vasemmalta oikealle synnyttäen datasta ymmärrystä ja lopulta toimenpiteitä, joiden tuottama palaute palaa oikealta alakautta takaisin keskelle ydinmalliin.

---

## 1. Vasen Pilari: Havainnointi ja spatiaalinen ymmärrys
Tämä vaihe kerää projektidataa eri järjestelmistä sisään PWM-malliin. Laatikot on piirretty sinisellä värillä varustettuna. Pilari sisältää kolme päällekkäistä lähdettä:
- **Versiohallinta**
- **Tehtävienhallinta**
- **Tiimiviestintä**

Kaikista kolmesta laatikosta lähtee suora siirtymänuoli keskipilarin "Project World Model (PWM)" -taustalaatikkoon.

---

## 2. Keskipilari: Ennustaminen (Dynaaminen simulointi)
Keskellä oleva suuri harmaa taustalaatikko on järjestelmän ydin, joka on nimetty otsikolla: **Project World Model (PWM)**. 

Tämän ydinlaatikon sisällä on kaksi toisiinsa syklisesti vaikuttavaa alikomponenttia (merkitty keltaisella huomiovärillä):
- Ylempi laatikko: **Piilevä simulaatiotila** (Kausaalinen päättely)
- Alempi laatikko: **Asynkroninen agenttiorganisaatio** (Haarautuminen ja Yhdistäminen)

Näiden kahden sisälaatikon välillä kiertää kehämäinen nuolisto, mikä kuvaa algoritmien ja simulointitilan vuorovaikutteista iteratiivista prosessointia. PWM-päälaatikon oikeasta reunasta lähtee vastaavasti siirtymänuolet kohti oikeaa pilaria.

---

## 3. Oikea Pilari: Ohjaus (Autonomiset toimenpiteet)
Oikealla oleva pilari esittää PWM-järjestelmän tuottamat suorat toimenpiteet. Pilari sijaitsee kokonaisuudessaan oman ison harmaan raaminsa sisällä, mikä tekee siitä järjestelmän tuotoskerroksen. Pilari sisältää kolme päällekkäistä toimenpidekokonaisuutta (väritetty vahvan vihreällä korostuksella):
- **Kaskadihäiriöiden ja riskien ennakointi**
- **Automaattinen riippuvuuksien korjaus**
- **Tehtävien algoritminen delegointi**

Oikean pilarin tulos- ja tuotoskehikon alareunasta lähtee paksu vihreä katkoviivanuoli alaspäin, poistuen kehyksestä kohti alapuolella sijaitsevaa Skenaariostrategia.

---

## 4. Alhaalla: Palautesilmukka / Inhimillinen ohjaus
Koko kaavion alapuolella on yksi leveä, punertava laatikko:
- **Skenaariostrategi**

Tämä komponentti edustaa järjestelmää tai roolia, joka evaluoi tulokset. Se ottaa vastaan Ohjaus-pilarin palautteen (vihreä katkoviivasyöte saapuu oikealta pilarista). Skenaariostrategi-laatikon yläreunasta nousee vastavuoroisesti sininen katkoviivanuoli takaisin suoraan ylöspäin keskipilarin **Project World Model (PWM)** -rakenteen pohjaan. 

Tämä katkoviivoin merkitty silmukka oikealta alas ja takaisin keskelle kuvaa järjestelmän "human-in-the-loop" tai meta-tason palautemekanismia ja strategista tavoiteohjausta mallin ohjauksessa.
