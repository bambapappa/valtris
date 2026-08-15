# valtris

Ett neutralt Tetris där klossarna är partiernas verkliga vallöften, hämtade
live från [utlovat.se](https://utlovat.se). Spelet testar din skicklighet att
placera klossar; poängen hämtas från löftenas verkliga kostnader. Ingen ska
kunna spela det och dra slutsatsen att ett parti är “bäst” eller “sämst”.

## Om spelet

Varje kloss i spelet motsvarar ett verkligt vallöfte från de åtta riksdagspartierna. 
* **Formen** styrs av löftets kategori (välfärd, skatter, rättsväsende osv.).
* **Partiet och färgen** är 100 % kosmetiska och påverkar varken fysik, form eller poängberäkning.
* **Poängen** baseras på reformens verkliga kostnad i miljoner kronor (MSEK).

Neutraliteten i slumpningen och viktningen verifieras automatiskt av testsviten (`npm test`).


## Data och licens

Datat kommer från utlovat.se:s öppna API (`/api/v1/`), licensierat CC-BY-4.0.
valtris är en oberoende konsument av det API:et och bär inget ansvar för
utlovats innehåll. Ingen finansiering eller koppling till något parti.

## Stack

TypeScript + HTML Canvas + Vite. Ren statisk sajt avsedd för GitHub Pages.

## Licens

valtris egen kod är licensierad under Apache-2.0 (se `LICENSE`). Datat kommer
från utlovat.se under CC-BY-4.0.
