# Atreo

Frontend (React/Vite) and backend (Express) live in this folder. Backend is in `atreo-backend/`.

## Structure

```
Atreo/                    ← you are here
├── atreo-backend/       ← API server (Node/Express, MongoDB)
├── src/                 ← React app (TypeScript, Vite)
├── public/
├── package.json         ← frontend
└── README.md
```

- **Frontend**: `src/` — `main.tsx`, `App.tsx`, pages in `src/pages/`, API in `src/services/api/`.
- **Backend**: `atreo-backend/` — `server.js`, routes in `atreo-backend/routes/`, models in `atreo-backend/models/`.

Full structure is documented in the workspace root: `PROJECT_STRUCTURE.md`.

## Setup

### Frontend

```bash
npm install
npm run dev
```

Runs Vite dev server (default port from `vite.config.ts`).

### Backend

```bash
cd atreo-backend
npm install
cp .env.example .env   # if present, then edit .env
npm run dev
```

Uses Node 18+, MongoDB. Configure `atreo-backend/.env` (e.g. `MONGODB_URI`, `JWT_SECRET`, port).

## Scripts (frontend)

| Command           | Description        |
|-------------------|--------------------|
| `npm run dev`     | Start Vite dev     |
| `npm run build`   | Production build   |
| `npm run preview` | Preview production |
| `npm run lint`    | Run ESLint         |
| `npm run test`    | Run Vitest         |

## Scripts (backend)

From `atreo-backend/`:

| Command              | Description              |
|----------------------|--------------------------|
| `npm run dev`        | Start with nodemon       |
| `npm start`          | Start server             |
| `npm run test-db`    | Test MongoDB connection  |
| `npm run create-admin` | Create admin user     |
