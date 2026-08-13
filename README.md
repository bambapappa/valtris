# valtris

Ett neutralt Tetris där klossarna är partiernas verkliga vallöften, hämtade
live från [utlovat.se](https://utlovat.se). Spelet testar din skicklighet att
placera klossar; poängen hämtas från löftenas verkliga kostnader. Ingen ska
kunna spela det och dra slutsatsen att ett parti är “bäst” eller “sämst”.

## Status

Designskede. Se
[`docs/superpowers/specs/2026-08-12-valtris-design.md`](docs/superpowers/specs/2026-08-12-valtris-design.md).

## Data och licens

Datat kommer från utlovat.se:s öppna API (`/api/v1/`), licensierat CC-BY-4.0.
valtris är en oberoende konsument av det API:et och bär inget ansvar för
utlovats innehåll. Ingen finansiering eller koppling till något parti.

## Stack

TypeScript + HTML Canvas + Vite. Ren statisk sajt avsedd för GitHub Pages.

## Licens

valtris egen kod är licensierad under Apache-2.0 (se `LICENSE`). Datat kommer
från utlovat.se under CC-BY-4.0.
