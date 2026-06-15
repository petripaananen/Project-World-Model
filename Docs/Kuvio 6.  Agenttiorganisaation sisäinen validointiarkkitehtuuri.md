# Vastavoimien (Rivals) Vuokaavion Rakenne

Tämä tiedosto on tekstimuotoinen kuvaus `rivals_flowchart_v5.png` -kaaviosta. Se on luotu erityisesti ohjaamaan NotebookLM:n kognitiota ymmärtämään kyseisen kuvan ylhäältä alas etenevän, rinnakkaisia ja iteroivia agenttisilmukoita sisältävän prosessirakenteen.

## Yleiskuvaus
Kaavio esittää agenttiorganisaation vastavoimallista prosessia (Rivals), missä työntekijä- ja kriitikkoagenttien välinen auditoiva sykli suoritetaan rinnakkaisesti itsenäisissä poluissa. Prosessi alkaa työn haarautumisella, kulkee palautesilmukoiden kautta yhdistämiseen ja päättyy lopuksi "human-in-the-loop" -validointiin (Skenaariostrategi). 

Virtaus etenee puumaisesti ylhäältä alas.

---

## 1. Ylin Solmu: Haarautuminen
Ylimpänä keskellä on harmaa timantin/risteyskohdan muotoinen solmukohta:
- **Otsikko:** HAARAUTUMINEN
- **Kuvaus:** Järjestelijäagentin jakamat rinnakkaiset alitehtävät

Tästä solmusta prosessi halkeaa; yksi nuoli kaartuu alaviistoon vasemmalle ja toinen oikealle.

---

## 2. Toimija- / Työntekijäkerros
Nuolten päissä on molemmilla puolilla rinnakkaiset laatikot (väritykseltään vaalean liiloja):
- **Vasen puoli:** **Työntekijäagentti A** (Tehtävänä: Koodin generointi)
- **Oikea puoli:** **Työntekijäagentti B** (Tehtävänä: Animaation luonti)

Kummastakin työntekijälaatikosta osoittaa suora siirtymänuoli alaspäin.

---

## 3. Kriitikkokerros ja Palautesilmukat
Kummallakin puolella, tarkalleen työntekijäagenttien alapuolella, istuu auditoivat instanssit (väritykseltään vaalean oransseja laatikoita):
- **Vasen puoli:** **Kriitikkoagentti A** (Tehtävänä: Suorituskyvyn auditointi)
- **Oikea puoli:** **Kriitikkoagentti B** (Tehtävänä: Visuaalisen eheyden auditointi)

### Iteratiivinen hylkäys / Palautesilmukka:
Molemmilta kriitikoilta kaartuu punainen katkoviivanuoli takaisin pystysuunnassa ylöspäin heidän omille työntekijäagenteilleen. Näihin on liitetty isolla punainen teksti: **Hylätty: Palautus korjattavaksi**. (Tämä luo molemmille puolille autonomisen korjaussilmukan).

### Eteneminen / Hyväksyntä:
Kun palaute täyttää kriteerit, kummaltakin kriitikolta lähtee sisäviistoon alaspäin vihreä nuoli. Näissä vihreissä nuolissa lukee teksti: **Hyväksytty**.

---

## 4. Alempi Solmu: Yhdistäminen
Molemmilta puolilta saapuvat vihreät hyväksyntänuolet kohtaavat jälleen pystylinjalla keskellä. Ne yhtyvät toiseen harmaaseen timantin muotoiseen solmukohtaan:
- **Otsikko:** YHDISTÄMINEN
- **Kuvaus:** Agenttien sisäisen konsensuksen saavuttaminen

Kun rinnakkaiset tuotokset on integroitu, tästä solmusta lähtee yksi, yhteinen suora nuoli alaspäin.

---

## 5. Alin Solmu: Inhimillinen ohjaus
Vuon päätepisteessä alimpana on sinertävä, leveä laatikko:
- **Otsikko:** SKENAARIOSTRATEGI
- **Kuvaus:** Inhimillinen luova auditointi ja tavoitefunktioiden päivitys

Tämä kuvaa meta-tason validointia ja ulkoista oppimisvaihetta, jolloin ohjaus palautuu takaisin ihmiselle (tai Skenaariostrategille) koko agenttikierroksen läpimenon ja validointien jälkeen.
