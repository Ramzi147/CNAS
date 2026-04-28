# 🚀 PFE CNAS - Système d'Évaluation et Performance

Plateforme web complète pour la gestion des évaluations et de la performance à la CNAS (Caisse Nationale des Assurances Sociales).

## 📋 Architecture

```
PFE/
├── pfe-evaluation-cnas/    (Frontend React + TypeScript)
├── backend/                (API Express.js + Node.js)
├── README.md               (Ce fichier)
```

## 🎯 Fonctionnalités Implémentées

### Frontend ✅
- **Authentification** - Login avec JWT, gestion des rôles (Admin, RH, Manager, Employé)
- **Dashboards** - Vue d'ensemble par rôle avec KPIs
- **Profil Utilisateur** - Affichage et édition du profil
- **Évaluations** - Tableau complet avec filtres, recherche, création/modification
- **Organisation Hiérarchique** - Navigation Agence → Structure → Service → Agent
- **Routes Protégées** - Contrôle d'accès basé sur les rôles (RBAC)

### Backend ✅
- **API REST** - Express.js avec endpoints CRUD
- **Authentification JWT** - Gestion des tokens et sessions
- **Base de Données In-Memory** - Données de test (évolutif vers PostgreSQL)
- **CORS** - Permettre les requêtes du frontend
- **Middleware** - Vérification du token et des permissions

## 🔐 Comptes de Test

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@cnas.dz | admin123 | Admin |
| rh@cnas.dz | rh123 | RH |
| manager@cnas.dz | manager123 | Manager |
| employee@cnas.dz | employee123 | Employé |

## 🚀 Démarrage Rapide

### 1. Démarrer le Backend

```bash
cd backend
npm install
npm start
```

Le serveur démarre sur `http://localhost:5000/api`

### 2. Démarrer le Frontend

```bash
cd pfe-evaluation-cnas
npm install
npm run dev
```

L'app démarre sur `http://localhost:5173`

### ✅ Vérifier la connexion

Visitez `http://localhost:5000/api/health` pour vérifier que le backend est actif.

## 📁 Structure du Frontend

```
src/
├── pages/
│   ├── Login.tsx              (Authentification)
│   ├── Dashboard.tsx          (Accueil)
│   ├── Profile.tsx            (Profil utilisateur)
│   ├── Evaluations.tsx        (Gestion des évaluations)
│   ├── Organization.tsx       (Hiérarchie organisationnelle)
│   ├── AdminDashboard.tsx     (Admin)
│   ├── HRDashboard.tsx        (RH)
│   ├── ManagerDashboard.tsx   (Manager)
│   └── EmployeeDashboard.tsx  (Employé)
├── services/
│   ├── api.ts                 (Client Axios)
│   ├── authService.ts         (Authentification)
│   ├── evaluationService.ts   (Évaluations)
│   └── entityAPI.ts           (API pour Agences, Structures, etc.)
├── context/
│   └── AuthContext.tsx        (Gestion d'état d'auth)
├── routes/
│   ├── AppRoutes.tsx          (Routage principal)
│   └── ProtectedRoute.tsx     (Routes protégées)
└── types/
    ├── evaluation.ts
    ├── user.ts
    └── entities.ts            (Types pour Agences, Structures, Services, Agents)
```

## 📡 Structure du Backend

```
backend/
├── server.js          (Serveur principal)
├── auth.js            (JWT & permissions)
├── db.js              (Base de données in-memory)
├── seed.js            (Données de test)
├── routes/
│   ├── auth.js        (Login, refresh)
│   ├── users.js       (Utilisateurs)
│   ├── agencies.js    (Agences)
│   ├── structures.js  (Structures)
│   ├── services.js    (Services)
│   ├── agents.js      (Agents)
│   └── evaluations.js (Évaluations)
├── .env               (Variables d'environnement)
└── package.json
```

## 🔌 Endpoints API

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Renouveler le token

### Utilisateurs
- `GET /api/users` - Lister tous les utilisateurs
- `GET /api/users/:id` - Obtenir un utilisateur
- `PUT /api/users/:id` - Modifier un utilisateur

### Agences
- `GET /api/agencies` - Lister
- `POST /api/agencies` - Créer
- `PUT /api/agencies/:id` - Modifier
- `DELETE /api/agencies/:id` - Supprimer

### Structures, Services, Agents
- Mêmes endpoints: `/api/structures`, `/api/services`, `/api/agents`

### Évaluations
- `GET /api/evaluations` - Lister
- `POST /api/evaluations` - Créer
- `PUT /api/evaluations/:id` - Modifier
- `DELETE /api/evaluations/:id` - Supprimer

## 🎨 Stack Technologique

### Frontend
- React 19
- TypeScript
- Vite (bundler)
- Material-UI (composants)
- React Router 7
- Axios (HTTP client)
- JWT-Decode (décodage tokens)

### Backend
- Node.js 22
- Express.js 4
- jsonwebtoken (JWT)
- bcryptjs (hashage mots de passe)
- CORS (requêtes cross-origin)
- dotenv (variables d'environnement)

## 🔄 Évolutions Futures

1. **Base de données réelle**
   - PostgreSQL + Sequelize/Prisma
   - Migrations automatiques

2. **Authentification avancée**
   - OAuth 2.0 / SAML
   - Double authentification (2FA)

3. **Dashboard avancé**
   - Graphiques et statistiques
   - Exports PDF/Excel
   - Notifications en temps réel

4. **Gestion des permissions**
   - Fine-grained RBAC
   - Audit trail complet

5. **Mobile**
   - Application React Native
   - Synchronisation offline

## 📝 Notes

- Les données sont stockées en mémoire (se réinitialisent au redémarrage)
- Pour la production, remplacer par une vraie base de données
- Variables d'environnement à configurer dans `.env`

## 👨‍💼 Support

Pour les questions ou bugs: [Contact]

---

**Version 1.0 - Mars 2026** ✨
