# TODO
* [ ] mining
* [ ] difficulty
* [x] async -> ask @jakobkordez
* [x] socket.io / websocket
* [ ] local chain backup
* [ ] synchronization

```
# Sinhronizacija:
ob novo ustvarjenem bloku boste poslali zadnji blok iz verige vsem ostalim vozliščem. Ta bodo potem uskladila svoje verige.  
Če je indeks zadnjega blok, ki ga je vozlišče dobilo, več kot za 1 večji od zadnjega bloka verige vozlišča,
potem celotno verigo zamenjamo. Če je za 1 večji, dodamo blok na konec, v nasprotnem primeru pa ne naredimo ničesar,
saj je naša veriga najdaljša.
```