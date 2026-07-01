# E-Cars

E-Cars is a cross-platform vehicle maintenance and valet service MVP built with FastAPI, async SQLite, WebSockets, Vite, React, Tailwind CSS, and Capacitor.

## Backend

```powershell
cd mytgo-backend
python -m pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload
```

Swagger is available at `http://localhost:8000/docs`.

Demo users created by the seed command:

- `customer@mytgo.local`
- `mechanic@mytgo.local`
- `valet@mytgo.local`
- `admin@mytgo.local`

Development-only password: `DemoPass123!`

## Frontend

```powershell
cd mytgo-frontend
npm install
npm run dev
```

For Android packaging:

```powershell
npm run cap:sync
```

## Realtime

- Valet tracking: `WS /ws/valet/{transfer_id}?token=...`
- Customer-mechanic chat: `WS /ws/chat/{conversation_id}?token=...`

## Deployment

Oracle Linux server deployment guide: [DEPLOY_ORACLE_LINUX.md](DEPLOY_ORACLE_LINUX.md)
