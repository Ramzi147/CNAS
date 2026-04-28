# 🗄️ Guide: Configurer PostgreSQL - Étape par Étape

## ✅ Étape 1: Installer PostgreSQL

### Option A: Télécharger l'installeur (Recommandé)
1. Aller sur: https://www.postgresql.org/download/windows/
2. Télécharger PostgreSQL 15 ou 16 (Windows)
3. Lancer l'installeur
4. **Important**: Mémoriser le mot de passe du user 'postgres'
5. À la fin, laisser pgAdmin 4 coché

### Option B: Avec Docker (Si tu as Docker installé)
```bash
docker run -d \
  --name pfe-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pfe_cnas \
  -p 5432:5432 \
  postgres:16
```

### Option C: Avec Chocolatey (Si installé)
```powershell
choco install postgresql
# Pendant l'installation, noter le mot de passe pour 'postgres'
```

---

## ✅ Étape 2: Créer la Base de Données

### Via pgAdmin (Interface graphique)
1. Ouvrir pgAdmin 4 (préinstallé)
2. Clic droit sur "Databases" → "Create" → "Database"
3. Nom: `pfe_cnas`
4. Owner: `postgres`
5. Cliquer "Save"

### Via Command Line
```powershell
# Ouvrir PowerShell
psql -U postgres

# Dans psql (invite de commande postgres):
CREATE DATABASE pfe_cnas;
\l  # Vérifier que la BD est créée

# Quitter:
\q
```

---

## ✅ Étape 3: Configurer le Backend

### Fichier: backend/.env

Créer ou modifier `backend/.env` avec:

```env
# PORT
PORT=5000

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=15m

# DATABASE
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres        # ← Le mot de passe que tu as défini
DB_NAME=pfe_cnas

# CORS
CORS_ORIGIN=http://localhost:5173

# NODE ENV
NODE_ENV=development
```

**⚠️ Important**: Remplace `DB_PASSWORD` par le vrai mot de passe que tu as choisi à l'installation!

---

## ✅ Étape 4: Créer les Modèles Sequelize

### File: backend/models/User.js

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'hr', 'manager', 'employee'),
    defaultValue: 'employee',
  },
}, {
  timestamps: true,
  tableName: 'users'
});

module.exports = User;
```

### Créer les autres modèles:
- `backend/models/Agency.js`
- `backend/models/Structure.js`
- `backend/models/Service.js`
- `backend/models/Agent.js`
- `backend/models/Evaluation.js`

(Voir DETAILED_POSTGRES_SETUP.md pour les codes complets)

---

## ✅ Étape 5: Remplacer db.js par Sequelize

### File: backend/config/database.js

```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false, // Set to console.log for debugging
  }
);

module.exports = sequelize;
```

### Modifier: backend/server.js

```javascript
const sequelize = require('./config/database');

// ... autres imports ...

// Avant de start le serveur:
sequelize.sync({ alter: true }).then(() => {
  console.log('✅ Database synchronized');
}).catch(err => {
  console.error('❌ Database sync failed:', err);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
```

---

## ✅ Étape 6: Tester la Connexion

### Teste que ça marche:

```bash
# 1. Vérifier que PostgreSQL est en cours
psql -U postgres -d pfe_cnas -c "SELECT 1"
# Doit retourner: 1 ✓

# 2. Démarrer le backend
cd backend
npm start

# 3. Tu dois voir:
# ✅ Database synchronized
# ✅ Server running on http://localhost:5000
```

### Vérifier les tables:

Via pgAdmin ou CLI:
```bash
psql -U postgres -d pfe_cnas

# Lister les tables:
\dt

# Doit afficher: users, agencies, structures, services, agents, evaluations
```

---

## ✅ Étape 7: Seeder les Données

### File: backend/seeders/20260306-seed-data.js

```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    // Insérer les données de test
    await queryInterface.bulkInsert('users', [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@cnas.dz',
        passwordHash: await bcrypt.hash('admin123', 10),
        fullName: 'Admin CNAS',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // ... autres comptes ...
    ]);
  },
  
  async down(queryInterface) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
```

Lancer:
```bash
npx sequelize-cli db:seed:all
```

---

## 🧪 Test Complet

### Test 1: Vérifier la BD
```bash
psql -U postgres

# Dans psql:
\c pfe_cnas
SELECT * FROM users;
# Doit afficher 4 users
```

### Test 2: Vérifier le Backend
```bash
npm start

# Lance le script de test:
.\test-backend.ps1
```

### Test 3: Vérifier le Frontend
```bash
cd pfe-evaluation-cnas
npm run dev

# Va sur http://localhost:5173
# Essaie de te connecter
```

**Si tout marche = PostgreSQL est connecté! 🎉**

---

## ⚠️ Troubleshooting

### Erreur: "ECONNREFUSED"
```
= PostgreSQL n'est pas en cours
Solution: Relancer PostgreSQL via Services (Windows)
         ou: docker start pfe-postgres (si Docker)
```

### Erreur: "password authentication failed"
```
= Mot de passe PostgreSQL mauvais
Solution: Vérifier dans backend/.env que DB_PASSWORD est correct
         Aller dans pgAdmin → Tools → Change Password
```

### Erreur: "relation "users" does not exist"
```
= Les tables ne sont pas créées
Solution: sequelize.sync() au démarrage du serveur (voir Étape 5)
         ou: npx sequelize-cli db:migrate
```

### Port 5432 déjà utilisé
```
Solution: 
  netstat -ano | findstr :5432
  taskkill /PID [PID] /F
```

---

## ✨ Commandes Utiles

```bash
# À la racine du backend:

# Créer une migration:
npx sequelize-cli migration:generate --name create-users

# Lancer une migration:
npx sequelize-cli db:migrate

# Annuler dernière migration:
npx sequelize-cli db:migrate:undo

# Seeder les données:
npx sequelize-cli db:seed:all

# Annuler les seeders:
npx sequelize-cli db:seed:undo:all
```

---

## 📚 Prochaine Étape

Une fois PostgreSQL configuré:

1. **Ajouter Bcrypt** (voir file BCRYPT_SETUP.md)
2. **Ajouter Validation** (voir file VALIDATION_SETUP.md)
3. **Tester** (utilise test-backend.ps1)

---

**Temps estimé**: 30-45 minutes  
**Difficulté**: Moyenne  
**Status**: Ready to Start!
