# Project World Model (PWM) - Kerrosarkkitehtuuri

Tämä tiedosto kuvaa `pwm_architecture_layer_model.png` -kaavion tarkan rakenteen, kerrosjaon ja informaatiovirrat tekstimuodossa (suunniteltu erityisesti NotebookLM:n kaltaisia RAG-järjestelmiä ja saavutettavuutta varten).

## Yleiskuvaus
Kaavio esittää Project World Model (PWM) -järjestelmän vertikaalisen viisikerroksisen arkkitehtuurin. Malli rakentuu alhaalta ylöspäin nousevasta datan prosessointiketjusta (Kerrokset 1–4) ja huipulla sijaitsevasta inhimillisestä ohjauskerroksesta (Kerros 5).

---

## 1. Kerrosrakenne (Kerros 1–5)

### Kerros 1: Havainnointi ja spatiaalinen ymmärrys
- **Sijainti:** Kaavion alin laatikko.
- **Tunniste:** "Kerros 1" vasemmassa yläkulmassa.
- **Väri:** Vaaleansininen tausta, tummansiniset reunat.
- **Tekniset referenssit:** [LingBot-World, V-JEPA 2.1].
- **Erityishuomio:** "Muuttumaton tapahtumaloki" (kaavion alaosassa laatikon sisällä).
- **Syötteet:** Alhaalta päin saapuvat kolme pitkää harmaata tietovirtaa:
    - Jira/Git-telemetria
    - Pelimoottorin data (Unreal/Unity)
    - Assettituotanto

### Kerros 2: Piilevä simulaatio (latentti ydin)
- **Sijainti:** Toinen laatikko alhaalta.
- **Tunniste:** "Kerros 2" vasemmassa yläkulmassa.
- **Väri:** Keltainen tausta, oranssit katkoviivareunat.
- **Ominaisuus:** [Toimintaehdollistettu simulaatio / LingBot-World, AMI, Cosmos].
- **Tuotos:** "Tuottaa: kausaalinen todiste".
- **Yhteys:** Kerros 1:stä nouseva vahva harmaa nuoli tuo havainnot simulaatioympäristöön.

### Kerros 3: Agenttiorganisaatio ja orkestraatio
- **Sijainti:** Kaavion keskikerros.
- **Tunniste:** "Kerros 3" vasemmassa yläkulmassa.
- **Väri:** Keltainen tausta, oranssit reunat. Sisältää kolme valkoista alalaatikkoa:
    - QA-agentti
    - Build-agentti
    - Art-integraatioagentti
- **Toiminta:** "Asynkroninen neuvottelu" agenttien välillä (katkoviivanuolet ja seliteteksti).
- **Tekniset referenssit:** [Muse Spark, AsyncThink].

### Kerros 4: Validointi ja vastavoimien auditointi
- **Sijainti:** Ylin tekninen kerros.
- **Tunniste:** "Kerros 4" vasemmassa yläkulmassa.
- **Väri:** Vaaleanvihreä tausta, tummanvihreät reunat.
- **Tekniset referenssit:** [Claude Mythos + Sisäiset auditointiluotaimet].
- **Erityistoiminto:** "Toiminto: strategisen epärehellisyyden havaitseminen".

### Kerros 5: Skenaariostrategi
- **Sijainti:** Kaavion korkein taso.
- **Tunniste:** "Kerros 5" vasemmassa yläkulmassa.
- **Väri:** Vaaleanpunainen tausta, punaiset reunat.
- **Rooli:** Inhimillinen ohjaus ja "Palkkioarkkitehti".

---

## 2. Dynaamiset ohjausvirrat (Sivunuolet)

Kaavion sivuilla on kolme kriittistä palautesilmukkaa:

1.  **Strateginen ohjaus ja luovat kompromissit:** Sininen katkoviivanuoli Kerros 5:stä Kerros 3:een.
2.  **Palkkio- ja lupaprotokolla:** Pitkä sininen katkoviivanuoli Kerros 5:stä Kerros 2:een.
3.  **Ennakoivat ilmoitukset ja skenaariot:** Vihreä katkoviivanuoli Kerros 4:stä Kerros 5:een.

---

## 3. Ryhmittely: Itseohjautuvat työnkulut

Kaavion oikeassa reunassa on harmaa aaltosulku, joka kattaa kerrokset **2, 3 ja 4**. Sulun vieressä on teksti:
> **Itseohjautuvat työnkulut = tuotos + todiste**
