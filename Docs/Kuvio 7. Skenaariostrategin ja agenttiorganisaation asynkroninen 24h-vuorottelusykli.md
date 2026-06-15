# 24h Sykli - Hybridityönkulun Organisoituminen

Tämä tiedosto on tekstimuotoinen kuvaus kaaviosta `24h_cycle_diagram_v6.png`. Se hahmottaa NotebookLM:lle yms. tekoälyn datakäsittelyn ja ihmistiimin rinnakkaisen työnjaon 24 tunnin vuorokausirytmissä pyöreänä ympyrädiagrammina (kellonkehänä).

## Yleiskuvaus
Kaavion keskiössä on renkaan / donitsin muotoinen kellotaulu. Kellonkehällä ylin kohta on 12:00, alin kohta 00:00, oikea laita kello 06:00 ja vasen laita kello 18:00. Kuva etenee myötäpäivään yhtenä loputtomana kehänä.

Kellonkehä on jaettu kolmeen selkeään pääalueeseen / ajanjaksoon: Yö, Aamu ja Päivä. Kultakin osalta johtaa katkoviiva erillisiin selitelaatikoihin kaavion sivuilla.

---

## 1. Yö-vaihe (Klo 18:00 – 08:00)
Tämä on syklin massiivisin osa, kestäen 14 tuntia. Se kattaa kellokehän vasemman ja yläpuolen. Se on väritetty liilan / violetin sävyiseksi. 

**Vastaava selitelaatikko (Sijainti: vasen yläkulma):**
- **Otsikko:** YÖ: Agenttiorganisaation asynkroninen ajo
- **Kuvaus:** PWM ajaa kaskadisimulaatiot latentissa tilassa. Järjestelijä- ja työntekijäagentit integroivat ja validoivat päivän aikana tuotetut digitaaliset resurssit.

Tämä ajanjakso edustaa suurinta automaatioasteen ja koneajan käyttöä (konepellin alla tapahtuvaa asynkronista työtä, kun ihmiset lepäävät).

---

## 2. Aamu-vaihe (Klo 08:00 – 10:00)
Tämä on lyhyt 2 tunnin rajapintasiirtymä. Se sijoittuu kellonkehän oikean yläneljänneksen alueelle ja on värjätty varoitusväri-oranssilla.

**Vastaava selitelaatikko (Sijainti: oikea suunta):**
- **Otsikko:** AAMU: Skenaariostrategin auditointi
- **Kuvaus:** Yöllisten simulaatioraporttien analyysi. Poikkeamien, kaskadihäiriöiden ja riskien arviointi ennen tuotannon jatkumista.

Tämä vaihe kuvastaa ihmisen tekemää "portinvartijahyväksyntää" (human-in-the-loop). Skenaariostrategi analysoi yön aikana kertyneen ratkaisumassan ja estää mahdollisten väärien johtopäätösten tai haitallisten ketjureaktioiden siirtymisen aktiivisen tuotannon datavirtaan.

---

## 3. Päivä-vaihe (Klo 10:00 – 18:00)
Tämä vaihe kattaa työpaikan tavanomaisen 8 tunnin kaistaleen kellonkehän oikean ja alaosan välillä, kello kymmenestä iltakuuteen. Se on väritetty elinvoimaisen vihreäksi.

**Vastaava selitelaatikko (Sijainti: vasen alakulma):**
- **Otsikko:** PÄIVÄ: Luova kitka ja strateginen ohjaus
- **Kuvaus:** Kompleksisten ongelmien ratkaisu ihmistiimin voimin. Uusien laadullisten tavoitefunktioiden ja reunaehtojen asettaminen agenteille seuraavaa yötä varten.

Tämä on syklin ihmiskeskeinen vaihe, tyypillinen operatiivisen suunnittelun, empatian ja neuvottelun ("luovan kitkan") huippukohta. Päivän aikana ihmiset eivät puurra digitaalista datavelkaa matalalla tasolla, vaan miettivät kokonaiskuvaa ja asettavat seuraavan ratkaisujoukon parametrit uutta yötä varten.

---

Kun myötäpäivän kierros ohittaa uudelleen kello 18:00 rajapyykin, vihreä vaihe loppuu ja liila (konevetoinen) yö ottaa täyden integraatiovastuun saumattomassa silmukassa.
