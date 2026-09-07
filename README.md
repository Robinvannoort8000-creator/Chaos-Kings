# Chaos Kings

Chaos Kings is een installeerbare webapp (PWA) voor het interactieve kaartspel van Barman Ronald en Café HP.

## Installeren op iPhone

1. Open de Cloudflare-link in Safari.
2. Tik op **Delen**.
3. Kies **Zet op beginscherm**.
4. Open Chaos Kings voortaan via het app-icoon.

De app bewaart een lopend spel lokaal op het apparaat en kan na het eerste volledige bezoek ook zonder internet worden geopend.

## Bestanden

- `index.html`: het volledige spel, versie 1.8.
- `manifest.webmanifest`: appnaam, kleuren en iconen.
- `service-worker.js`: offline cache en veilige updates.
- `icons/`: iconen voor iPhone en andere telefoons.

## Nieuwe versie publiceren

Werk eerst het versienummer van de cache in `service-worker.js` bij. Upload daarna de gewijzigde bestanden naar dezelfde repository. Opgeslagen spellen blijven in de browseropslag van hetzelfde domein staan.
