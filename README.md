# PFE CNAS - Systeme d'evaluation des performances

Plateforme web de gestion des evaluations RH pour la CNAS.  
Le projet est compose d'un frontend React/TypeScript et d'un backend Django REST avec authentification JWT et base PostgreSQL.

## Architecture

```text
PFE/
├── backend_django/         Backend Django + Django REST Framework
├── pfe-evaluation-cnas/    Frontend React + TypeScript + Vite
├── docs/                   Documentation projet
├── memoire/                Memoire et figures
└── README.md
```

## Fonctionnalites principales

- Authentification JWT et gestion des roles
- Dashboards selon le profil utilisateur
- Gestion des utilisateurs et des acces
- Organisation CNAS : agences, structures, services, agents
- Campagnes d'evaluation
- Evaluations manageriales
- Auto-evaluations
- Suivi quotidien et assiduite
- Rapports, rankings, audit et conformite

## Stack technique

### Frontend

- React 19
- TypeScript
- Vite
- Axios
- React Router
- Material UI
- Recharts

### Backend

- Django 6
- Django REST Framework
- SimpleJWT
- PostgreSQL
- django-cors-headers

## Pre-requis

- Python 3.12+ recommande
- Node.js 20+ ou 22+
- PostgreSQL
- npm

## Demarrage rapide

## 1. Backend Django

Depuis `backend_django/` :

```powershell
cd backend_django
Copy-Item .env.example .env
py -m pip install -r requirements.txt
py manage.py migrate
py manage.py seed_realistic
py manage.py runserver
```

Le backend demarre en general sur :

```text
http://localhost:8000/
```

API :

```text
http://localhost:8000/api/
```

## 2. Frontend React

Depuis `pfe-evaluation-cnas/` :

```powershell
cd pfe-evaluation-cnas
npm install
```

Creer un fichier `.env.local` avec :

```env
VITE_API_URL=http://localhost:8000/api
```

Puis lancer :

```powershell
npm run dev
```

Le frontend demarre en general sur :

```text
http://localhost:5173/
```

## Configuration de la base de donnees

Le fichier d'exemple est :

[`backend_django/.env.example`](</c:/wamp64/www/PFE/backend_django/.env.example>)

Variables principales :

```env
USE_SQLITE=False
DB_NAME=pfe_cnas
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

Avant `migrate`, il faut creer la base PostgreSQL correspondante, par exemple :

```sql
CREATE DATABASE pfe_cnas;
```

Si besoin, tu peux adapter `.env` a ta propre configuration PostgreSQL.

## Comptes de demonstration

Apres execution de :

```powershell
py manage.py seed_realistic
```

Tu peux utiliser par exemple :

- `superadmin@cnas.dz` / `Password123!`
- `rh.alger@cnas.dz` / `Password123!`
- `manager.it@cnas.dz` / `Password123!`
- `employee.amine@cnas.dz` / `Password123!`

## Structure utile du backend

```text
backend_django/
├── manage.py
├── requirements.txt
├── cnas_backend/
│   ├── settings.py
│   └── urls.py
└── apps/
    ├── accounts/
    ├── organization/
    └── evaluations/
```

Les elements importants :

- `apps/accounts/` : utilisateurs, roles, authentification
- `apps/organization/` : agences, structures, services, agents, profils
- `apps/evaluations/` : campagnes, evaluations, scores, audit, rapports

## Structure utile du frontend

```text
pfe-evaluation-cnas/
├── src/pages/
├── src/components/
├── src/services/
├── src/routes/
├── src/context/
└── src/types/
```

## Donnees et migrations

La structure de la base est definie par :

- les fichiers `models.py`
- les migrations dans `apps/*/migrations/`

Les donnees de demonstration sont injectees par :

[`backend_django/apps/organization/management/commands/seed_realistic.py`](</c:/wamp64/www/PFE/backend_django/apps/organization/management/commands/seed_realistic.py>)

## Important pour le partage GitHub

- Les fichiers `.env` ne doivent pas etre pushes
- Les dossiers `__pycache__/`, `node_modules/` et `dist/` sont ignores
- Le frontend `pfe-evaluation-cnas/` est maintenant integre comme dossier normal du depot principal

## Commandes Git utiles

Pour partager une modification :

```powershell
git add .
git commit -m "Update project"
git push
```

## Notes

- Le backend utilise PostgreSQL par defaut
- Le frontend doit pointer vers la bonne URL API via `VITE_API_URL`
- Si le binome clone le projet, il doit recreer son `.env`, installer les dependances, creer la base et lancer les migrations

---

Version projet academique CNAS.
