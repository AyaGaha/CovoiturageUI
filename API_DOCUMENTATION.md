# 📚 Documentation API - Module Auth (Covoiturage)

## 🔐 Overview

La base URL est : `http://localhost:3000/auth`

Tous les endpoints acceptent et retournent du **JSON**.

---

## 📋 Endpoints

### 1️⃣ **REGISTER - Créer un compte**

**Endpoint :** `POST /auth/register`

#### 📤 Request
```json
{
  "name": "Ali Souissi",
  "email": "ali@example.com",
  "password": "SecurePass@123",
  "phone": "+21612345678"  // OPTIONNEL
}
```

#### ✅ Validations
| Champ | Type | Règles |
|-------|------|--------|
| `name` | string | 2-50 caractères, requis |
| `email` | string | Format email valide, requis, UNIQUE |
| `password` | string | Min 8 chars, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial (@$!%*?&) |
| `phone` | string | OPTIONNEL - Format Tunisien: +216 ou 0 suivi de [2459]\d{7} |

#### 📥 Response Success (201 Created)
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "Ali Souissi",
    "email": "ali@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "15m"
}
```

#### ❌ Response Errors
```json
// Email déjà existant (409)
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

```json
// Validation échouée (400)
{
  "statusCode": 400,
  "message": [
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
  ],
  "error": "Bad Request"
}
```

#### ⚙️ Événements Déclenchés
- `user.registered` → Envoie un email de bienvenue à l'adresse fournie

---

### 2️⃣ **LOGIN - Se connecter**

**Endpoint :** `POST /auth/login`

#### 📤 Request
```json
{
  "email": "ali@example.com",
  "password": "SecurePass@123"
}
```

#### ✅ Validations
| Champ | Type | Règles |
|-------|------|--------|
| `email` | string | Format email valide, requis |
| `password` | string | Min 8 chars, requis |

#### 📥 Response Success (200 OK)
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "Ali Souissi",
    "email": "ali@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "15m"
}
```

#### ❌ Response Errors
```json
// Identifiants incorrects (401)
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

---

### 3️⃣ **REFRESH - Renouveler le token**

**Endpoint :** `POST /auth/refresh`

#### 📤 Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### ✅ Validations
| Champ | Type | Règles |
|-------|------|--------|
| `refreshToken` | string | JWT valide, requis |

#### 📥 Response Success (200 OK)
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "15m"
}
```

#### ⚠️ Flux de Token Rotation
1. Client envoie un `refreshToken` valide
2. Serveur vérifie la signature JWT
3. Serveur vérifie que le token n'est pas révoqué en BD
4. Ancien token marqué comme `isRevoked = true`
5. Nouveau token généré et sauvegardé

#### ❌ Response Errors
```json
// Token expiré (401)
{
  "statusCode": 401,
  "message": "Refresh token expired",
  "error": "Unauthorized"
}
```

```json
// Token révoqué (401)
{
  "statusCode": 401,
  "message": "Invalid or revoked refresh token",
  "error": "Unauthorized"
}
```

```json
// Token invalide (401)
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

---

### 4️⃣ **LOGOUT - Se déconnecter**

**Endpoint :** `POST /auth/logout`

#### 🔐 Authentification Requise
- **Header :** `Authorization: Bearer <accessToken>`

#### 📤 Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### ✅ Validations
| Champ | Type | Règles |
|-------|------|--------|
| `refreshToken` | string | JWT valide, requis |
| **Header Auth** | JWT | Access token valide requis |

#### 📥 Response Success (200 OK)
```json
{
  "message": "Logout successful"
}
```

#### ❌ Response Errors
```json
// Access token manquant ou invalide (401)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

```json
// Refresh token invalide (400)
{
  "statusCode": 400,
  "message": "Invalid refresh token",
  "error": "Bad Request"
}
```

---

## 🔑 JWT Token Structure

### Access Token
- **Secret :** `JWT_SECRET` (du .env)
- **TTL :** `15m` (15 minutes)
- **Payload :**
  ```json
  {
    "sub": 1,
    "email": "ali@example.com",
    "iat": 1704067200,
    "exp": 1704068100
  }
  ```

### Refresh Token
- **Secret :** `JWT_REFRESH_SECRET` (du .env)
- **TTL :** `7d` (7 jours)
- **Payload :**
  ```json
  {
    "sub": 1,
    "email": "ali@example.com",
    "iat": 1704067200,
    "exp": 1704672000
  }
  ```

### Utilisation
```
Authorization: Bearer <accessToken>
```

---

## 👤 Réponse User Object

Tous les endpoints de login/register retournent cet objet utilisateur :

```json
{
  "id": 1,
  "name": "Ali Souissi",
  "email": "ali@example.com",
  "role": "user",  // "user" ou "admin"
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

---

## 🔄 Flux d'Authentification Complet

### 1. Registration
```
User → POST /auth/register → Server → BD + Email
                                   ↓
                          User account créé
                          Access + Refresh tokens générés
                          Email de bienvenue envoyé
                          Response: tokens + user
```

### 2. Login
```
User → POST /auth/login → Server → BD lookup
                                  ↓
                        Password validé (bcrypt)
                        Tokens générés
                        Response: tokens + user
```

### 3. Protected Routes (avec Access Token)
```
User → GET /protected → Authorization header
         ↓
      JWT vérifié
      User extrait du token
      Route exécutée
```

### 4. Token Refresh
```
User → POST /auth/refresh + refreshToken → Server
            ↓
      Refresh token valide ?
      Refresh token pas révoqué ?
      ↓ Oui
      Ancien token → isRevoked = true
      Nouveaux tokens générés
      Response: new tokens
```

### 5. Logout
```
User → POST /auth/logout + refreshToken + Authorization header
            ↓
      Access token valide ?
      Refresh token existe ?
      ↓ Oui
      Refresh token → isRevoked = true
      Response: success message
```

---

## 🧪 Exemples cURL

### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ali Souissi",
    "email": "ali@example.com",
    "password": "SecurePass@123",
    "phone": "+21612345678"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ali@example.com",
    "password": "SecurePass@123"
  }'
```

### Refresh
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Logout (avec authentification)
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## 📱 Frontend Implementation Tips

### 1. Store Tokens
```javascript
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);
```

### 2. Auto-Refresh Logic
```javascript
// Quand access token expire (401)
const newTokens = await fetch('/auth/refresh', {
  method: 'POST',
  body: JSON.stringify({ 
    refreshToken: localStorage.getItem('refreshToken') 
  })
});
localStorage.setItem('accessToken', newTokens.accessToken);
// Retry la requête originale
```

### 3. Logout
```javascript
await fetch('/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  },
  body: JSON.stringify({ 
    refreshToken: localStorage.getItem('refreshToken') 
  })
});
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

---

## ⏱️ Configuration Tokens (du .env)

```
JWT_SECRET=chaimaJWT                    # Secret access token
JWT_EXPIRATION=15m                      # TTL access token
JWT_REFRESH_SECRET=chaimaJWTRefresh     # Secret refresh token
JWT_REFRESH_EXPIRATION=7d               # TTL refresh token
```

---

## 🛡️ Sécurité

✅ **Implémenté :**
- Password hashing (bcrypt 10 rounds)
- JWT signature verification
- Refresh token rotation (ancien token révoqué)
- Token revocation tracking en BD
- Strong password requirements
- Email uniqueness validation
- Rate limiting (à ajouter)

⏳ **À faire :**
- Refresh token rotation delay
- IP whitelist
- User agent validation
- Suspicious login alerts

---

## � GraphQL API - Users Module

**Endpoint :** `POST http://localhost:3000/graphql`  
**Playground :** `http://localhost:3000/graphql` (visitez dans le navigateur)

---

### 1️⃣ **Query: me** - Récupérer le profil de l'utilisateur authentifié

#### 🔐 Authentification Requise
- **Header :** `Authorization: Bearer <accessToken>`

#### 📤 Request (GraphQL)
```graphql
query {
  me {
    id
    name
    email
    role
    phone
    profileImage
    rating
    isEmailVerified
    emergencyContact
    emergencyPhone
    createdAt
    updatedAt
  }
}
```

#### 📥 Response Success
```json
{
  "data": {
    "me": {
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
  }
}
```

#### ❌ Response Errors
```json
{
  "errors": [
    {
      "message": "Unauthorized",
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```

---

### 2️⃣ **Query: userProfile** - Récupérer le profil public d'un utilisateur

#### 🔐 Authentification Requise
- ❌ Non (public)

#### 📤 Request (GraphQL)
```graphql
query {
  userProfile(id: 1) {
    id
    name
    role
    phone
    profileImage
    rating
    isEmailVerified
    createdAt
  }
}
```

#### 📥 Response Success
```json
{
  "data": {
    "userProfile": {
      "id": 1,
      "name": "Ali Souissi",
      "role": "user",
      "phone": "+21612345678",
      "profileImage": null,
      "rating": 0,
      "isEmailVerified": false,
      "createdAt": "2026-05-25T19:09:26.000Z"
    }
  }
}
```

#### ❌ Response Errors
```json
{
  "errors": [
    {
      "message": "User not found"
    }
  ]
}
```

---

### 3️⃣ **Mutation: updateProfile** - Mettre à jour le profil de l'utilisateur

#### 🔐 Authentification Requise
- **Header :** `Authorization: Bearer <accessToken>`

#### 📤 Request (GraphQL)
```graphql
mutation {
  updateProfile(input: {
    name: "Ali Mohamed Souissi"
    phone: "+21612345679"
    profileImage: "https://example.com/photo.jpg"
    emergencyContact: "Fatma Souissi"
    emergencyPhone: "+21622222222"
  }) {
    id
    name
    email
    phone
    profileImage
    emergencyContact
    emergencyPhone
    updatedAt
  }
}
```

#### ✅ Validations
| Champ | Type | Règles |
|-------|------|--------|
| `name` | string | OPTIONNEL - 2-50 caractères |
| `phone` | string | OPTIONNEL - Format Tunisien |
| `profileImage` | string | OPTIONNEL - URL de l'image |
| `emergencyContact` | string | OPTIONNEL - Nom du contact |
| `emergencyPhone` | string | OPTIONNEL - Format Tunisien |

#### 📥 Response Success
```json
{
  "data": {
    "updateProfile": {
      "id": 1,
      "name": "Ali Mohamed Souissi",
      "email": "ali@example.com",
      "phone": "+21612345679",
      "profileImage": "https://example.com/photo.jpg",
      "emergencyContact": "Fatma Souissi",
      "emergencyPhone": "+21622222222",
      "updatedAt": "2026-05-26T10:30:00.000Z"
    }
  }
}
```

#### ❌ Response Errors
```json
{
  "errors": [
    {
      "message": "Phone number must be in Tunisian format (e.g., +216 20123456, 020123456, or 20123456)",
      "extensions": { "invalidFields": { "phone": "Invalid format" } }
    }
  ]
}
```

---

## 📊 GraphQL vs REST Comparison

| Aspect | REST | GraphQL |
|--------|------|---------|
| Register | ✅ POST /auth/register | ❌ N/A (REST only) |
| Login | ✅ POST /auth/login | ❌ N/A (REST only) |
| Get Profile | ❌ N/A | ✅ query me |
| Get Public Profile | ❌ N/A | ✅ query userProfile |
| Update Profile | ❌ N/A | ✅ mutation updateProfile |
| Logout | ✅ POST /auth/logout | ❌ N/A (REST only) |

---

## 🧪 Exemples GraphQL

### Test dans GraphQL Playground

1. Ouvrez : `http://localhost:3000/graphql`
2. Cliquez sur "HTTP HEADERS" en bas à gauche
3. Ajoutez :
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

### Query: Get My Profile
```graphql
query GetMyProfile {
  me {
    id
    name
    email
    role
    phone
    rating
  }
}
```

### Query: Get Other User Profile
```graphql
query GetUserProfile($userId: Int!) {
  userProfile(id: $userId) {
    id
    name
    phone
    rating
    createdAt
  }
}
```

### Mutation: Update Profile
```graphql
mutation UpdateMyProfile {
  updateProfile(input: {
    name: "New Name"
    phone: "+21699999999"
  }) {
    id
    name
    phone
    updatedAt
  }
}
```

---

## 💻 GraphQL Client Examples

### Apollo Client (React)
```typescript
import { useMutation, useQuery } from '@apollo/client';
import gql from 'graphql-tag';

// Query
const ME_QUERY = gql`
  query {
    me {
      id
      name
      email
      phone
    }
  }
`;

// Mutation
const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      phone
      updatedAt
    }
  }
`;

// Usage
function UserProfile() {
  const { data, loading } = useQuery(ME_QUERY);
  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {data.me.name}</h1>
      <button onClick={() => updateProfile({
        variables: { input: { name: "New Name" } }
      })}>
        Update Profile
      </button>
    </div>
  );
}
```

### Urql (React)
```typescript
import { useQuery, useMutation } from 'urql';
import gql from 'graphql-tag';

const meQuery = gql`
  query {
    me {
      id
      name
    }
  }
`;

function UserProfile() {
  const [{ data, fetching }] = useQuery({ query: meQuery });
  
  if (fetching) return <div>Loading...</div>;
  return <div>Hi {data.me.name}</div>;
}
```

### Fetch API (Vanilla JS)
```javascript
async function getMyProfile(accessToken) {
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      query: `
        query {
          me {
            id
            name
            email
            phone
          }
        }
      `
    })
  });

  const result = await response.json();
  return result.data.me;
}

async function updateMyProfile(accessToken, name, phone) {
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      query: `
        mutation {
          updateProfile(input: { name: "${name}", phone: "${phone}" }) {
            id
            name
            phone
            updatedAt
          }
        }
      `
    })
  });

  const result = await response.json();
  return result.data.updateProfile;
}
```

---

## 📝 User Type Schema

```graphql
type UserType {
  id: Int!
  name: String!
  email: String!
  role: String!
  phone: String
  profileImage: String
  rating: Float!
  isEmailVerified: Boolean!
  emergencyContact: String
  emergencyPhone: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

input UpdateProfileInput {
  name: String
  phone: String
  profileImage: String
  emergencyContact: String
  emergencyPhone: String
}
```

---

## 🔄 Workflow Complet: Auth → GraphQL

```
1. POST /auth/register (REST)
   ↓
   Obtenir: accessToken + refreshToken

2. query me() (GraphQL)
   + Header: Authorization: Bearer <accessToken>
   ↓
   Récupérer le profil complet

3. mutation updateProfile() (GraphQL)
   + Header: Authorization: Bearer <accessToken>
   ↓
   Mettre à jour le profil

4. POST /auth/refresh (REST)
   + refreshToken expiré
   ↓
   Obtenir nouveaux tokens

5. POST /auth/logout (REST)
   + accessToken + refreshToken
   ↓
   Déconnexion complète
```

---

## ⏱️ Configuration GraphQL (du app.module.ts)

```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: true,
  playground: true,
  context: ({ req }) => ({ req }),  // Pass JWT token to context
})
```

---

## 🛡️ GraphQL Security

✅ **Implémenté :**
- JWT authentication via GqlJwtAuthGuard
- Input validation (class-validator)
- Type safety (TypeScript)
- Authorization on resolvers (@UseGuards)

⏳ **À faire :**
- Query complexity limiting
- Rate limiting
- Depth limiting

---

## 📞 Intégration avec AuthService

Le module GraphQL Users utilise automatiquement :
- **AuthService** : Pour les tokens JWT
- **UsersService** : Pour les opérations sur la BD
- **GqlJwtAuthGuard** : Pour l'authentification des queries/mutations

Aucune configuration supplémentaire n'est nécessaire - tout est intégré ! ✅

---

## 🔐 Sécurité des Queries

### Query me (Protégée)
```graphql
query {
  me {  # ← Nécessite un access token valide
    id
    email
  }
}
```

```
Response (Authentifié) ✅ → Retourne votre profil
Response (Pas Authentifié) ❌ → Erreur "Unauthorized"
```

### Query userProfile (Publique)
```graphql
query {
  userProfile(id: 1) {  # ← Aucune authentification
    name
    rating
  }
}
```

```
Response ✅ → Retourne le profil public
```

### Mutation updateProfile (Protégée)
```graphql
mutation {
  updateProfile(input: { name: "New" }) {  # ← Nécessite access token
    name
  }
}
```

```
Response (Authentifié) ✅ → Profil mis à jour
Response (Pas Authentifié) ❌ → Erreur "Unauthorized"
```

---

## 📞 Contact & Support

Pour plus d'infos :
- REST Auth API : Voir les sections REST ci-dessus
- GraphQL API : Voir les sections GraphQL
- Frontend : Voir FRONTEND_EXAMPLES.ts
- Full Spec : Voir AUTH_API.json
