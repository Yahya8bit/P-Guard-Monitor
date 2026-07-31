# P-Guard Monitor

Supervision console for Enova Robotics' P-Guard autonomous security robots.
real-time fleet overview, per-robot dashboards, statistics, alerts, and
PDF/CSV reports, derived from ~2 years of real robots logs.

## Stack

**Frontend:**

- React 18.3.1 (Vite, TypeScript)
- Tailwind CSS 3.4.14
- Recharts for visualisations
- Lucide React for icons
- react-leaflet for maps, react-router for routing, jsPDF for PDF reports

**Backend:**

- Django 6
- Django REST Framework
- Simple JWT for authentication
- PostgreSQL for the database
- django-cors-headers for CORS

## Quick start

Backend:

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data     # loads demo users, robots, log-derived data
python manage.py runserver     # http://localhost:8000
```

Frontend:

```bash
npm install
npm run dev                    # Vite dev server, http://localhost:3000
```

Demo accounts (password `demo` for all):

| Email | Role | Sees |
|-------|------|------|
| `ops@enova.local` | superadmin | all robots, Gestion (assign robots to admins) |
| `admin@enova.local` | admin | assigned robots, full log-derived detail |
| `client@site.tn` | client | one robot, results-only view |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | frontend dev server (HMR) |
| `npm run build` | typecheck (`tsc --noEmit`) + production build |
| `npm run lint` | ESLint |
| `npm run preview` | serve the production build |
| `python manage.py runserver` | backend dev server |
| `python manage.py test` | backend test suite |

## Architecture

```
backend/
├── myproject/            # Django project: settings, root urls
└── pguard/                # Django app
    ├── models.py          # Robot, User, Alert, PatrolTrack, ...
    ├── views.py            # auth, dashboard, trend, battery, alerts, reports
    ├── gestion.py          # user/robot assignment endpoints (superadmin/admin)
    ├── stats.py            # KPI/statistics derivations
    ├── serializers.py
    └── management/commands/seed_data.py   # loads log-derived seed data

frontend/src/
├── types/contract.ts    # frozen data contract — every shape crossing the API boundary
├── services/
│   ├── api.ts            # the only module pages import
│   ├── http.ts            # fetch wrapper: JWT auth header, error handling
│   └── clock.ts
├── auth/                 # auth context (JWT in localStorage) + route guards
├── components/           # AppShell, Sidebar, TopBar, dashboard/, stats/
├── pages/                 # Login, Fleet, Dashboard, Statistiques, Alertes, Rapports, Gestion, Paramètres
├── lib/report.ts         # jsPDF/CSV report generation
└── theme/                 # dark-default theme + language contexts
```

## API endpoints

All routes are under `/api/`, JWT-authenticated (`Authorization: Bearer <token>`) unless noted.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login/` | obtain access/refresh token |
| POST | `/auth/refresh/` | refresh access token |
| GET | `/auth/me/` | current user profile |
| POST | `/auth/change-password/` | change password |
| GET/PUT | `/auth/notifications/` | notification preferences |
| GET | `/robots/` | list robots visible to the user |
| POST | `/robots/create/` | create robot (superadmin/admin) |
| GET | `/robots/<robot_id>/` | robot detail |
| GET | `/robots/<robot_id>/dashboard/` | dashboard summary (`?period=`) |
| GET | `/robots/<robot_id>/trend/` | metric trend series |
| GET | `/robots/<robot_id>/battery/` | battery samples |
| GET | `/robots/<robot_id>/incidents-breakdown/` | incident breakdown |
| GET | `/robots/<robot_id>/info-stats/` | info stats |
| GET | `/robots/<robot_id>/last-known-track/` | last known GPS track |
| GET | `/robots/<robot_id>/statistics/` | statistics bundle |
| GET | `/patrol-tracks/` | patrol tracks |
| GET | `/robots/<robot_id>/alerts/` | alerts for a robot |
| GET | `/alerts/resolutions/` | alert resolutions |
| POST | `/alerts/<alert_id>/resolve/` | resolve an alert |
| POST | `/alerts/<alert_id>/reopen/` | reopen an alert |
| GET | `/robots/<robot_id>/reports/` | report history |
| GET | `/users/` | list users (superadmin/admin) |
| POST | `/admins/` | create admin (superadmin) |
| DELETE | `/admins/<user_id>/` | delete admin (superadmin) |
| POST | `/clients/` | create client (admin) |
| DELETE | `/clients/<user_id>/` | delete client (admin) |
| POST | `/robots/<robot_id>/assign-admin/` | assign robot to admin (superadmin) |
| POST | `/robots/<robot_id>/assign-client/` | assign robot to client (admin) |

Full route definitions: `backend/pguard/urls.py`.

## Roles & routing

- `/login` → `/fleet` (superadmin + admin) → `/robots/:id/{dashboard,statistiques,alertes,rapports,parametres}`
- Clients skip the fleet view and land directly on their robot's dashboard.
- `/gestion` (superadmin + admin): assign robots to admins / one robot per client.

## Data

KPIs (rounds, incidents, charge cycles, availability) and the patrol map are
derived from real P-Guard logs spanning Jun 2024 → Jun 2026, covering a
mid-life redeployment from Sousse/Monastir (TN) to Bietigheim (DE). Battery is
event-sampled at dock/undock — rendered stepped/scattered, never as a smooth
line. 
