# valtris — designdokument

Status: **godkänt designskede, ej implementerat**
Datum: 2026-08-12
Repo: [`bambapappa/valtris`](https://github.com/bambapappa/valtris) (privat)

## Vad det är

Ett neutralt webbaserat Tetris där klossarna är partiernas verkliga
vallöften, hämtade live från [`utlovat.se/api/v1`](https://utlovat.se/api/v1/promises.json).
Spelaren bygger rader med placement-skicklighet; poängen hämtas från
löftenas verkliga kostnader. Spelet är byggt för att ingen ska kunna spela
det och dra slutsatsen att ett parti är “bäst” eller “sämst”.

Datat som utlovat.se publicerar är licensierat CC-BY-4.0. valtris är en
oberoende konsument av det API:et och bär inget ansvar för utlovats
innehåll — men attribuerar källan tydligt (se Attribution nedan).

## Neutralitetskontraktet

Detta styr varje designbeslut och provas, inte bara påstås.

- Partiet på en kloss är **kosmetiskt** — färg och förkortning visas, men
  påverkar aldrig mekanik, poäng, hastighet eller svårighet.
- Klossarna dras ur hela beståndet och viktas enbart efter antal löften per
  parti, så verklighetens fördelning återspeglas. Spelaren väljer inte parti.
- Samma regler gäller för varje kloss oavsett ursprung. Poäng = din
  skicklighet att rensa rader, inte partiernas förtjänst.
- Tonen i all text i spelet är torr och saklig, i linje med utlovat. Inga
  värderingar om löften eller partier.
- Ett automatiserat prov kör många spawn-cykler och kontrollerar att inget
  parti får en systematiskt bättre eller sämre formfördelning än dess löfteantal
  förutsäger. (Se Testning.)

## Datamappning — hur datan används, inte bara pryder

Källor: `promises.json` (≈620 löften, varav ≈588 aktiva) och `parties.json`
(8 partier med färg, mandat, röster, block).

| Löftesdata | Spel-roll | Hur |
|---|---|---|
| `category` (9 st) | **Klossens form** | Kartläggning kategori → tetromino (I, O, T, S, Z, J, L). 9 kategorier → 7 former; två kategorier delar form (utbildning & välfärd → I, försvar & infrastruktur → J). Gör kategorin spelledande. |
| `cost.msek_base` | **Poängvikt** | Baskostnaden adderas till poängen när klossen låses. Radrensning multiplicerar summan av radens löften. Dyrare löften = mer poäng. Nollkostnadslöften (regleringar, utredningar) ger en baspoäng. |
| `parties[0]` + färg | **Kosmetisk** | Klossens färg = partiets färg från `parties.json`. Förkortning (S, M, C …) visas på klossen. Ingen mekanisk effekt. |
| `title`, citat, kostnad | **Utbildande flertext** | Tryck/hover på nästa-kloss eller rensad rad visar löftets rubrik, parti, kostnad och kategori. Gör datan levande utan att störa spelet. |

### Varför kostnaden är poäng, inte en förlustmätare

Vissa enskilda löften är större än hela reformutrymmet (80 md/år), och
totalbeståndet (~3 920 md) vida överstiger utrymmet (~320 md över en
mandatperiod). Vore kostnaden en förlustmätare (budgeten spricker) skulle en
enda kloss avsluta spelet. Genom att göra kostnaden till en **poängvikt**
blir ett löften större än budgeten bara en högpoängare — spelet går inte
sönder, och budgetproblemet kringgås helt.

## Kategori → form ( preliminär; slutgiltig vid implementation )

| Kategori | Form | Antal löften (ca) |
|---|---|---|
| välfärd | I | 148 |
| utbildning | I (delar) | 90 |
| skatter | L | 86 |
| klimat-miljö | T | 68 |
| rättsväsende | Z | 68 |
| migration | S | 55 |
| övrigt | O | 63 |
| försvar | J (delar) | 23 |
| infrastruktur | J (delar) | 19 |

Fördelningen dokumenteras i koden när den fastställs. Valet att två kategorier
delar form görs uttryckligen, inte i tysthet.

## Löftespool — ren löftespåse (tolkning 1)

- Poolen består av aktiva löften, blandade.
- Klossar dras **uniformt slumpmässigt utan återläggning** — varje löfte dyker
  upp en gång innan något upprepas. Vid uttömning (maratonspel) blandas poolen om.
- Återanvändning är **inte** bunden till radrensning (en kloss som återvänder
  efter att ha rensats vore konstigt och suddar ut datat).
- **Ingen antitorka.** En tidigare design (hybrid-C) lät en sällsynt form
  tvingas fram om den inte dykt upp på ett antal drag, för att ge bättre
  spelkänsla. Neutralitetstestet bevisade att den mekanismen **bröt
  neutralitetskontraktet**: formerna är kopplade till kategorier och kategorierna
  är partikorrelerade, så att tvinga fram en sällsynt form boostade systematiskt
  det parti som äger den (mätt +7 pp på en delmängd; konvergerade över frön och
  N). Det går inte att boosta partikorrelerade former utan att vinkla
  partirepresentationen, så antitorkan togs bort. Ren uniform dragning är neutral
  per konstruktion och ger varje form sin *verkliga* andel — det är balanserat
  mot utlovats data. Sällsynta kategorier (försvar, infrastruktur) förblir
  proportionerligt sällsynta, vilket är det datatroget neutrala utfallet.

## Spel-loop

1. Vid start: hämta `promises.json` + `parties.json` live, bygg poolen, blanda, starta.
2. En kloss (löfte) faller. Form = kategori, färg/förkortning = parti,
   poängvikt = kostnad. Antitorka-skyddet kan vika nästa val.
3. Spelaren flyttar/roterar med tanke på formen. Nästa-kloss-förhandsvisning visas.
4. Klossen låses → baskostnaden läggs till poängen. Fylls en rad rensas den och
   radens löftessumma multipliceras in som bonuspoäng.
5. Hastigheten ökar med nivå (fler rensade rader → högre nivå → snabbare fall).
6. När en låst kloss passerar toppen: **game over**. Skärmen visar löftet som
   sprängde dig (rubrik, parti, kostnad, citat) + slutpoäng och antal rensade
   rader/löften.

## Poängsystem

- **Lås-poäng:** klossens `cost.msek_base` (minst en baspoäng för nollkostnadslöften).
- **Rad-bonus:** vid rensad rad adderas summan av radens löfteskostnader, multiplicerat
  med en faktor som ökar med antal samtidigt rensade rader (single/double/triple/tetris).
- **Nivå-multiplikator:** högre nivå förstärker rad-bonusen.
- Highscore sparas lokalt i `localStorage`.

## MVP-omfång (v1)

**Med:**
- Full grundloop: fall, rotate/move, soft/hard drop, radrensning, nivåer, game-over.
- Datamappning (kategori→form, kostnad→poäng, parti→kosmetisk).
- Hybridpool C med antitorka.
- Nästa-kloss-förhandsvisning.
- Tryck/hover för löftedetaljer (rubrik, parti, kostnad).
- Game-over-skärm med det sprängande löftet.
- Lokal highscore (`localStorage`).
- CC-BY-4.0-attribution tydligt i spelet.
- Kort “så spelar/så mäts poäng”-text + uttryckligt neutralitetsuttalande.
- Tangentbordsstyrning (desktop), responsiv canvas.

**Utanför v1 (parkerat till senare):**
- Online-highscore med egna namn + moderering (se nedan).
- Multiplayer/duell.
- Mobil-touch-kontroller.
- Hold-piece, T-spins och andra modern-Tetris-finesser.
- Ljud/musik.

### Varför online-highscore flyttades till v2

Skrytvärdet i en topplista sitter i att kunna ha ett eget namn. Att filtrera
stötande namn går inte att lösa med en fast svartlista (lätt att kringgå med
l33tsp34k, unicode och termer man inte tänkt på). Robusta alternativ —
anonyma auto-handtag, ML-toxilitetsfilter eller en mänsklig godkännandekö —
kräver antingen att man tar bort skrytvärdet eller bygger en backend. Det
beslutet vill göras med eftertanke, inte under press, och därför ligger hela
online-highscore-funktionen i v2. v1 har endast lokal highscore och behöver
ingen backend.

## Arkitektur & stack

TypeScript + HTML Canvas + Vite. Ren statisk sajt, deploy till GitHub Pages.
Inget backend, inga serverkostnader, ingen hemlighet att hantera.

### Modulstruktur

Små, väl avgränsade enheter, var och en med ett tydligt syfte och ett testbart gränssnitt.

| Modul | Ansvar | Beroenden |
|---|---|---|
| `api.ts` | Hämta+validera `promises.json`/`parties.json` från utlovat. Enda nätberoende modul. | nät |
| `pool.ts` | Bygga, blanda och leverera löften ur poolen; hybrid-C med antitorka. | datamodell |
| `mapping.ts` | kategori→form, kostnad→poängvikt, parti→färg. En tabell. | datamodell |
| `engine.ts` | Tetris-logik: board, kollision, rotation, radrensning, game-over. Ren logik, ingen DOM. | mapping |
| `score.ts` | Poängräkning (lås-poäng + rad-bonus + nivå). | mapping |
| `render.ts` | Ritar board + klossar på canvas. | engine |
| `ui.ts` | Nästa-kloss, poäng, nivå, highscore, game-over, löftedetaljer, metod-/neutralitetstext. | engine, score |
| `main.ts` | Kopplar ihop, lyssnar på tangentbord, startar loopen. | alla |

`engine`, `mapping`, `score` och `pool` är ren logik utan DOM eller nät och
provas isolerat — i linje med utlovats ande att proven mäter mot riktig data,
inte fixturer.

## Felhantering

- API-anropet har en timeout. Misslyckas det: spelet visar ett tydligt, torrt
  meddelande (“Kunde inte hämta löften från utlovat.se just nu — försök igen.”)
  och inaktiverar spelande. Ingen tyst halvfunktion.
- Ogiltig/oförväntad data i en enskild post sorteras bort med standardvärden;
  spelet fortsätter. Saknas kategori → “övrigt”; saknas kostnad → 0 (baspoäng).
  Antal bortsorterade poster räknas och syns i dev-läge, inte för spelaren.

## Testning

- Enhetstester för `mapping`, `score`, `pool` (inkl. att antitorkan slår till
  efter N steg) och `engine` (kollision, rotation vid vägg, radrensning,
  game-over-topp).
- Ett prov som verifierar att ett sparat API-svar går igenom valideringen
  (körs offline mot fixturen).
- Ett **neutralitetsprov** som kör många spawn-cykler och kontrollerar att
  formfördelningen per parti stämmer med dess löfteantal (ingen systematisk
  för-/nackdel).
- Bygget måste vara grönt före deploy (GitHub Actions).

## Attribution och licens

- Spelet attribuerar tydligt att datan kommer från utlovat.se under CC-BY-4.0.
- Själva valtris-koden får en egen licens i repots README (beslut vid implementation).
- Ingen finansiering eller koppling till något parti. valtris är ett oberoende projekt.

## Öppna frågor (att besluta vid implementation)

- Slutgiltig kategori→form-kartläggning (preliminär ovan).
- Exakta poängfaktorer (single/double/triple/tetris, nivåmultiplikator).
- v1-kodlicens.
