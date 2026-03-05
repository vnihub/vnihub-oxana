# Oxana - Strategie de Deployment și Infrastructură

Acest document descrie planul de lansare și evoluție a infrastructurii pentru platforma Oxana.

## Faza 1: Testare Real-World (Railway)
**Scop:** Lansarea rapidă pentru feedback de la colegi.

- **Platformă:** [Railway.app](https://railway.app)
- **Bază de Date:** SQLite (`dev.db`) în volum persistent.
- **Stocare Fișiere:** Unificată în volum persistent (via `STORAGE_PATH`).
- **Configurație Critică:**
    - Utilizarea unui **singur Railway Volume** montat la `/app/storage`.
    - **Start Command:** `npx prisma db push && npm run start` (asigură crearea/sincronizarea tabelelor pe server).
    - Conectare automată cu GitHub pentru Continuous Deployment (CD).
- **Securitate Date:** Fișierul `prisma/dev.db` este inclus în `.gitignore` pentru a preveni suprascrierea bazei de date de producție cu date locale.

## Faza 2: Optimizare și Control (Migrare VPS)
**Scop:** Reducerea costurilor pe termen lung și control total asupra serverului.

- **Platformă:** VPS (DigitalOcean, Hetzner sau similar).
- **Metodă de Migrare:**
    - Transferul întregului conținut din `/app/storage` (care include `dev.db` și folderul `uploads`) de pe Railway pe VPS.
    - Configurarea unui proces de rulare continuă (PM2 sau Docker).
- **Bază de Date:** Continuăm cu SQLite până când traficul impune o schimbare.

## Evoluție Bază de Date: SQLite -> PostgreSQL
**Scop:** Scalabilitate pentru utilizare masivă (peste 500+ utilizatori simultani).

- **Indicatori pentru migrare:**
    - Erori frecvente de tip "Database is locked".
    - Nevoia de a rula aplicația pe mai multe servere simultan (Load Balancing).
- **Proces:** Modificarea provider-ului în `schema.prisma` (care folosește deja `env("DATABASE_URL")`) și migrarea datelor.

## Variabile de Mediu Necesare (Railway)
- `DATABASE_URL`: `file:/app/storage/dev.db`
- `STORAGE_PATH`: `/app/storage`
- `NEXTAUTH_SECRET`: Cheia de securitate pentru sesiuni
- `NEXTAUTH_URL`: URL-ul public al aplicației (ex: `https://vnihub-oxana-production.up.railway.app`)
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`

## Configurare Volum Persistent (Railway)
- **Mount Path:** `/app/storage`
- **Conținut:** Acest folder va conține automat `dev.db` și subfolderul `uploads/` (gestionat prin `src/lib/storage.ts`).
- **Servire Fișiere:** Fișierele sunt servite din volum prin ruta dinamică `/src/app/uploads/[...path]/route.ts`.
