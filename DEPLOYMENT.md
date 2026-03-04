# Oxana - Strategie de Deployment și Infrastructură

Acest document descrie planul de lansare și evoluție a infrastructurii pentru platforma Oxana.

## Faza 1: Testare Real-World (Railway)
**Scop:** Lansarea rapidă pentru feedback de la colegi.

- **Platformă:** [Railway.app](https://railway.app)
- **Bază de Date:** SQLite (`prisma/dev.db`)
- **Stocare Fișiere:** Local (`public/uploads`)
- **Configurație Critică:**
    - Utilizarea **Railway Volumes** pentru persistența fișierului `.db` și a folderului de `uploads`.
    - Conectare automată cu GitHub pentru Continuous Deployment (CD).
- **Avantaje:** HTTPS automat, configurare rapidă, ușurință în remedierea bug-urilor raportate de colegi.

## Faza 2: Optimizare și Control (Migrare VPS)
**Scop:** Reducerea costurilor pe termen lung și control total asupra serverului.

- **Platformă:** VPS (DigitalOcean, Hetzner sau similar).
- **Metodă de Migrare:**
    - Transferul fișierului `dev.db` de pe Railway pe VPS.
    - Transferul folderului `uploads`.
    - Configurarea unui proces de rulare continuă (PM2 sau Docker).
- **Bază de Date:** Continuăm cu SQLite până când traficul impune o schimbare.

## Evoluție Bază de Date: SQLite -> PostgreSQL
**Scop:** Scalabilitate pentru utilizare masivă (peste 500+ utilizatori simultani).

- **Indicatori pentru migrare:**
    - Erori frecvente de tip "Database is locked".
    - Nevoia de a rula aplicația pe mai multe servere simultan (Load Balancing).
    - Nevoia de funcții avansate de căutare (Full Text Search).
- **Proces:**
    - Modificarea provider-ului în `schema.prisma`.
    - Migrarea datelor folosind un script de conversie (Prisma facilitează acest proces).

## Variabile de Mediu Necesare (Secrete)
Pentru ambele faze, avem nevoie de următoarele variabile configurate pe Railway:
- `DATABASE_URL`: `file:/app/prisma/dev.db` (Indică volumul persistent)
- `NEXTAUTH_SECRET`: Cheia de securitate pentru sesiuni
- `NEXTAUTH_URL`: URL-ul public al aplicației (ex: `https://oxana-production.up.railway.app`)
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`

## Configurare Volume Persistente (Railway)
Pentru a asigura persistența datelor între deploy-uri, am configurat:
1. **Bază de date:** Mount Path `/app/prisma` legat la un volum persistent.
2. **Media/Uploads:** Mount Path `/app/public/uploads` legat la un volum persistent.
