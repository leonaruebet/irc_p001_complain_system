# File Structure - Complaint Management System (MVP)

**Architecture:** Simple monolith structure for MVP  
**Tech Stack:** Next.js 15, Node.js, MongoDB Atlas, LINE OA  
**Pattern:** Basic MVC with minimal layers  

---

## 1. Root Directory Structure

```
irc_p001_complain-system/
├── frontend/                      # Next.js HR Dashboard
├── backend/                       # Node.js API + LINE Bot
├── shared/                        # Common types & utils
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 2. Frontend Structure (`frontend/`)

```
frontend/                          # Next.js 15 HR Dashboard
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/page.tsx
│   ├── dashboard/
│   │   ├── complaints/
│   │   │   ├── page.tsx           # List complaints
│   │   │   └── [id]/page.tsx      # View complaint detail
│   │   ├── reports/page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── complaint-list.tsx
│   ├── complaint-detail.tsx
│   └── navbar.tsx
├── lib/
│   ├── auth.ts                    # BetterAuth config
│   ├── api.ts                     # API client
│   └── utils.ts
├── .env.local
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 3. Backend Structure (`backend/`)

```
backend/                           # Node.js API + LINE Bot
├── src/
│   ├── controllers/
│   │   ├── auth.js
│   │   ├── complaints.js
│   │   └── line-webhook.js        # LINE bot handler
│   ├── models/
│   │   ├── employee.js            # Mongoose model
│   │   ├── complaint-session.js
│   │   └── hr-allowlist.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── complaints.js
│   │   └── line.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── cors.js
│   ├── utils/
│   │   ├── database.js            # MongoDB connection
│   │   ├── line-client.js
│   │   └── logger.js
│   ├── config/
│   │   └── index.js               # Environment config
│   └── server.js                  # Express app
├── .env
└── package.json
```

---

## 4. Shared Structure (`shared/`)

```
shared/
├── types.js                       # Common TypeScript types
├── constants.js                   # App constants
└── utils.js                       # Shared utilities
```

---

## 5. Key Files Content

### Root `package.json`
```json
{
  "name": "complaint-system",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build": "cd frontend && npm run build && cd ../backend && npm run build"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

### Root `.env.example`
```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/complaint_system

# Authentication  
OIDC_PROVIDER_URL=https://your-idp.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret

# LINE OA
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_CHANNEL_SECRET=your-line-secret

# API
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

### `docker-compose.yml`
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
```

---

## 6. Core Database Models

### Employee Model (`backend/src/models/employee.js`)
```javascript
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  _id: String,                     // LINE userId
  display_name: String,
  department: String,
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
```

### Complaint Session Model (`backend/src/models/complaint-session.js`)
```javascript
const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
  timestamp: Date,
  direction: { type: String, enum: ['user', 'bot'] },
  message: String
}, { _id: false });

const complaintSessionSchema = new mongoose.Schema({
  _id: String,                     // session_id
  complaint_id: { type: String, unique: true },
  user_id: String,                 // LINE userId  
  status: { type: String, enum: ['open', 'submitted'], default: 'open' },
  chat_logs: [chatLogSchema],
  start_time: Date,
  end_time: Date
}, { timestamps: true });

module.exports = mongoose.model('ComplaintSession', complaintSessionSchema);
```

---

## 7. Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Install app dependencies
cd frontend && npm install && cd ../backend && npm install && cd ..
```

### Development
```bash
# Start both frontend and backend
npm run dev

# Or separately
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:3001
```

### Build & Deploy
```bash
# Build for production
npm run build

# Deploy with Docker
docker-compose up --build
```

---

## 8. API Endpoints (MVP)

```
# Authentication
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout

# Complaints
GET  /api/complaints              # List all complaints (HR only)
GET  /api/complaints/:id          # Get complaint details
PUT  /api/complaints/:id/status   # Update complaint status

# LINE Webhook
POST /api/line/webhook            # LINE bot events
```

---

## 9. LINE Bot Commands

```
/complain  - Start complaint session
/submit    - Submit complaint
/cancel    - Cancel current session
```

---

## 10. MVP Features

✅ **Core Functionality**
- Employee submits complaints via LINE OA
- HR views complaints in web dashboard
- Basic authentication with SSO
- Chat logs stored in MongoDB

❌ **Not in MVP** (Future versions)
- Multiple deployment environments
- Complex monitoring/logging
- Advanced security features
- Report generation
- File uploads
- Email notifications

---

This streamlined structure focuses on getting the core complaint system working quickly without over-engineering.