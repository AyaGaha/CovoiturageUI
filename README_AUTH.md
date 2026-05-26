# 📚 Documentation Complète - Module Auth

## 📖 Fichiers de Documentation

### 1️⃣ **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**
   - **Format** : Markdown lisible
   - **Contient** : 
     - ✅ Tous les 4 endpoints REST (register, login, refresh, logout)
     - ✅ Détails complets de chaque endpoint (méthode, path, params, réponses)
     - ✅ Validations requises
     - ✅ Codes d'erreur et exemples
     - ✅ Structures JWT
     - ✅ Flux d'authentification
     - ✅ Exemples cURL
     - ✅ **3 opérations GraphQL** (me, userProfile, updateProfile)
     - ✅ Exemples Apollo Client, Urql, Fetch
     - ✅ GraphQL Playground guide
   - **Cas d'usage** : 
     - 📖 Lire pour comprendre comment fonctionne l'API
     - 📝 Documenter les spécifications
     - 🔍 Référence rapide pour les développeurs
     - 🚀 Documentation complète REST + GraphQL

### 2️⃣ **[AUTH_API.json](AUTH_API.json)**
   - **Format** : JSON structuré
   - **Contient** :
     - ✅ Spécification OpenAPI-like de tous les 4 endpoints REST
     - ✅ **Spécification complète GraphQL** (3 operations)
     - ✅ Types de données et validations
     - ✅ Erreurs possibles
     - ✅ Workflows complets
     - ✅ Tokens et configuration
   - **Cas d'usage** :
     - 🤖 Générer du code automatiquement
     - 🔌 Intégrer dans des outils (Postman, Swagger, etc.)
     - 📊 Analyser l'API programmatiquement
     - 🧪 Créer des tests automatisés
     - 🎯 Référence machine-readable REST + GraphQL

### 3️⃣ **[FRONTEND_EXAMPLES.ts](FRONTEND_EXAMPLES.ts)**
   - **Format** : TypeScript/React complet
   - **Contient** :
     - ✅ Types & Interfaces
     - ✅ Service API (fetch) REST
     - ✅ React Hooks (useAuth)
     - ✅ Composants REST (RegisterForm, LoginForm, etc.)
     - ✅ Axios interceptor pour auto-refresh
     - ✅ **GraphQL Queries & Mutations** (Apollo Client)
     - ✅ **React Hooks GraphQL** (useMyProfile, useUpdateProfile)
     - ✅ **GraphQL Client** (Fetch API)
     - ✅ **React Composants GraphQL** (UserProfileComponent, UpdateProfileComponent)
     - ✅ Utilitaires de validation
     - ✅ Exemples d'intégration
   - **Cas d'usage** :
     - 💻 Copier-coller du code prêt à utiliser (REST + GraphQL)
     - 🚀 Démarrer rapidement un frontend React
     - 🎯 Référence pour les patterns TypeScript
     - 📱 Intégration Apollo Client ou Fetch

---

## 🎯 Comment Utiliser Ces Fichiers

### Scénario 1: Je veux comprendre l'API
```
Lis → API_DOCUMENTATION.md
  ↓
Vois les endpoints, paramètres, réponses
  ↓
Teste avec les exemples cURL
```

### Scénario 2: Je dois générer du code frontend
```
Lis → FRONTEND_EXAMPLES.ts
  ↓
Copie les types et le service
  ↓
Adapte à ton framework (Vue, Angular, etc.)
```

### Scénario 3: Je dois intégrer dans un outil (Postman, Swagger)
```
Utilise → AUTH_API.json
  ↓
Import dans Postman/Swagger
  ↓
Génère la documentation automatiquement
```

### Scénario 4: Je dois créer une spec technique
```
Génère depuis → AUTH_API.json
  ↓
Convertis en HTML/PDF
  ↓
Partage avec l'équipe
```

---

## 📊 Vue d'ensemble des Endpoints

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/auth/register` | POST | ❌ | Créer un compte |
| `/auth/login` | POST | ❌ | Se connecter |
| `/auth/refresh` | POST | ❌ | Renouveler token |
| `/auth/logout` | POST | ✅ | Se déconnecter |

---

## 🚀 GraphQL Operations

| Query/Mutation | Type | Auth | Description |
|---|---|---|---|
| `me` | Query | ✅ | Récupérer mon profil |
| `userProfile(id)` | Query | ❌ | Récupérer profil public |
| `updateProfile(input)` | Mutation | ✅ | Mettre à jour profil |

**Endpoint :** `POST http://localhost:3000/graphql`  
**Playground :** `http://localhost:3000/graphql`

---

## 🔑 Tokens

### Access Token
- **TTL** : 15 minutes
- **Usage** : Accéder aux routes protégées
- **Header** : `Authorization: Bearer <token>`

### Refresh Token
- **TTL** : 7 jours
- **Usage** : Renouveler l'access token
- **Stockage** : localStorage ou cookie sécurisé
- **Rotation** : Ancien token révoqué lors du refresh

---

## 🔐 Sécurité

✅ **Implémenté** :
- Password hashing (bcrypt 10 rounds)
- JWT signature verification
- Token rotation
- Token revocation tracking
- Strong password requirements

⏳ **À faire** :
- Rate limiting
- IP whitelist
- Suspicious login alerts

---

## 🧪 Test Rapide

### 1. Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass@123"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass@123"
  }'
```

### 3. Refresh
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<your-refresh-token>"
  }'
```

### 4. Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-access-token>" \
  -d '{
    "refreshToken": "<your-refresh-token>"
  }'
```

---

## 🎨 Frontend Quick Start

### Avec React + TypeScript

```tsx
import { useAuth, RegisterForm, LoginForm, LogoutButton } from './FRONTEND_EXAMPLES';

export default function App() {
  const { user } = useAuth();

  return (
    <div>
      {!user ? (
        <>
          <RegisterForm />
          <LoginForm />
        </>
      ) : (
        <>
          <h1>Bienvenue, {user.name}!</h1>
          <LogoutButton />
        </>
      )}
    </div>
  );
}
```

---

## 📱 Intégration avec Autres Modules

### GraphQL (Users Module)
- `query me()` → Récupère l'utilisateur authentifié
- `query userProfile(id)` → Récupère le profil public
- `mutation updateProfile()` → Met à jour le profil

### Trips Module
- `POST /trips` → Créer un trajet (protégé)
- `GET /trips` → Lister les trajets

### Bookings Module
- `POST /bookings` → Réserver une place (protégé)

---

## 🔗 Structures de Données

### User Object
```json
{
  "id": 1,
  "name": "Ali Souissi",
  "email": "ali@example.com",
  "role": "user",
  "phone": "+21612345678",
  "profileImage": null,
  "rating": 0,
  "isEmailVerified": false,
  "emergencyContact": null,
  "emergencyPhone": null,
  "createdAt": "2026-05-25T19:09:26.000Z",
  "updatedAt": "2026-05-25T19:09:26.000Z"
}
```

### Auth Response
```json
{
  "message": "Login successful",
  "user": { ...User Object... },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

---

## 🚀 Next Steps

1. **Frontend** : Utilise [FRONTEND_EXAMPLES.ts](FRONTEND_EXAMPLES.ts)
2. **Testing** : Utilise les exemples cURL dans [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
3. **Documentation** : Partage [AUTH_API.json](AUTH_API.json) avec l'équipe
4. **Integration** : Intègre les autres modules (Trips, Users GraphQL, Bookings)

---

## 📞 Support

Pour les questions :
- 📖 Vérifiez [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- 💻 Regardez les exemples dans [FRONTEND_EXAMPLES.ts](FRONTEND_EXAMPLES.ts)
- 🔌 Consultez [AUTH_API.json](AUTH_API.json) pour la spécification

---

## ✨ Fichiers Fournis

```
📦 Covoiturage Project
├── API_DOCUMENTATION.md      (📖 Markdown - Lire en premier!)
├── AUTH_API.json             (🔌 JSON - Pour la génération de code)
├── FRONTEND_EXAMPLES.ts      (💻 React TypeScript - Code prêt à utiliser)
└── README_AUTH.md            (📋 Ce fichier)
```

---

**Créé le** : 26/05/2026  
**Module** : Auth (Authentication)  
**Statut** : ✅ Complète et Testée
