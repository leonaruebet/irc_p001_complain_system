# Implementation Plan - Complaint Management System MVP

**Timeline:** 2-3 weeks for MVP  
**Team Size:** 1-2 developers  
**Approach:** Iterative development with checkpoints  

---

## Phase 0: Project Setup (Day 1)
### Goal: Initialize project structure and environment

#### Tasks:
- [ ] Create project directory structure
- [ ] Initialize Git repository
- [ ] Setup root package.json with concurrently
- [ ] Create .env.example file
- [ ] Setup docker-compose.yml
- [ ] Create README.md with basic instructions

#### Commands:
```bash
mkdir -p frontend backend shared
npm init -y
npm install --save-dev concurrently
git init
```

#### Checkpoint 0: ✅ Project structure ready

---

## Phase 1: Database & Models (Day 2)
### Goal: Setup MongoDB connection and define schemas

#### Tasks:
- [ ] Setup MongoDB Atlas cluster
- [ ] Create database and collections
- [ ] Implement Mongoose models:
  - [ ] Employee model
  - [ ] ComplaintSession model  
  - [ ] HrAllowlist model
- [ ] Create database connection utility
- [ ] Test database connectivity
- [ ] Create database indexes

#### Files to create:
```
backend/src/models/
├── employee.js
├── complaint_session.js
└── hr_allowlist.js
backend/src/utils/database.js
```

#### Test:
```javascript
// backend/src/test_db.js
const connectDB = require('./utils/database');
const Employee = require('./models/employee');

async function test() {
  await connectDB();
  const count = await Employee.countDocuments();
  console.log('Connected! Employee count:', count);
}
test();
```

#### Checkpoint 1: ✅ Database models working

---

## Phase 2: Backend Core API (Day 3-4)
### Goal: Build Express API with basic endpoints

#### Tasks:
- [ ] Setup Express server
- [ ] Configure environment variables
- [ ] Implement CORS middleware
- [ ] Create health check endpoint
- [ ] Build complaint endpoints:
  - [ ] GET /api/complaints (list)
  - [ ] GET /api/complaints/:id (detail)
  - [ ] POST /api/complaints (create)
- [ ] Add basic error handling
- [ ] Setup logging utility

#### Files to create:
```
backend/src/
├── server.js
├── config/index.js
├── middleware/cors.js
├── controllers/complaints.js
├── routes/complaints.js
└── utils/logger.js
```

#### Test with curl:
```bash
# Health check
curl http://localhost:3001/health

# Get complaints
curl http://localhost:3001/api/complaints
```

#### Checkpoint 2: ✅ API responding to basic requests

---

## Phase 3: LINE Bot Integration (Day 5-6)
### Goal: Connect LINE OA and handle messages

#### Tasks:
- [ ] Setup LINE Developers account
- [ ] Create LINE OA channel
- [ ] Configure webhook URL
- [ ] Implement webhook handler
- [ ] Handle LINE events:
  - [ ] Text messages
  - [ ] /complain command
  - [ ] /submit command
- [ ] Create session management
- [ ] Store chat logs in database
- [ ] Test with LINE app

#### Files to create:
```
backend/src/
├── controllers/line_webhook.js
├── routes/line.js
├── utils/line_client.js
└── utils/session_manager.js
```

#### LINE Setup:
1. Go to https://developers.line.biz
2. Create new channel (Messaging API)
3. Get Channel Secret & Access Token
4. Set webhook URL: https://your-domain/api/line/webhook
5. Enable webhook & disable auto-reply

#### Test:
- Send message to LINE OA
- Type `/complain`
- Send complaint text
- Type `/submit`
- Check database for session

#### Checkpoint 3: ✅ LINE bot receiving and storing messages

---

## Phase 4: Authentication Setup (Day 7-8)
### Goal: Implement SSO authentication for HR dashboard

#### Tasks:
- [ ] Choose IdP (Google/Okta/Azure)
- [ ] Configure OAuth application
- [ ] Implement auth endpoints:
  - [ ] POST /api/auth/login
  - [ ] GET /api/auth/callback
  - [ ] GET /api/auth/me
  - [ ] POST /api/auth/logout
- [ ] Create JWT middleware
- [ ] Setup HR allowlist check
- [ ] Protect complaint endpoints

#### Files to create:
```
backend/src/
├── controllers/auth.js
├── routes/auth.js
├── middleware/auth.js
└── utils/jwt.js
```

#### Test auth flow:
1. Access /api/auth/login
2. Redirect to IdP
3. Login with HR account
4. Callback receives token
5. Access protected endpoint

#### Checkpoint 4: ✅ Authentication working

---

## Phase 5: Frontend Dashboard (Day 9-11)
### Goal: Build Next.js HR dashboard

#### Tasks:
- [ ] Initialize Next.js 15 app
- [ ] Setup TailwindCSS
- [ ] Install shadcn/ui
- [ ] Create layouts:
  - [ ] Auth layout
  - [ ] Dashboard layout
- [ ] Build pages:
  - [ ] Login page
  - [ ] Complaints list
  - [ ] Complaint detail view
- [ ] Implement API client
- [ ] Add authentication flow
- [ ] Setup protected routes

#### Commands:
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card table
```

#### Files to create:
```
frontend/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── dashboard/
│   │   ├── complaints/page.tsx
│   │   └── complaints/[id]/page.tsx
│   └── layout.tsx
├── components/
│   ├── complaint_list.tsx
│   └── complaint_detail.tsx
└── lib/
    ├── api.ts
    └── auth.ts
```

#### Checkpoint 5: ✅ Dashboard displaying complaints

---

## Phase 6: Integration Testing (Day 12-13)
### Goal: End-to-end testing of complete flow

#### Test Scenarios:
1. **Employee Flow:**
   - [ ] Send `/complain` to LINE bot
   - [ ] Send complaint message
   - [ ] Send `/submit`
   - [ ] Receive confirmation

2. **HR Flow:**
   - [ ] Login to dashboard
   - [ ] View complaints list
   - [ ] Click complaint to see details
   - [ ] View chat logs

3. **Error Cases:**
   - [ ] Invalid commands
   - [ ] Unauthorized access
   - [ ] Database errors

#### Checkpoint 6: ✅ Complete flow working

---

## Phase 7: Docker & Deployment (Day 14)
### Goal: Deploy to production

#### Tasks:
- [ ] Create Dockerfiles:
  - [ ] frontend/Dockerfile
  - [ ] backend/Dockerfile
- [ ] Update docker-compose.yml
- [ ] Setup environment variables
- [ ] Choose hosting:
  - Frontend: Vercel
  - Backend: Railway/Render
- [ ] Configure domains
- [ ] Setup HTTPS
- [ ] Update LINE webhook URL
- [ ] Final testing

#### Deployment Steps:
```bash
# Build containers
docker-compose build

# Test locally
docker-compose up

# Deploy frontend to Vercel
cd frontend && vercel

# Deploy backend to Railway
cd backend && railway up
```

#### Checkpoint 7: ✅ System live in production

---

## Phase 8: Documentation & Handover (Day 15)
### Goal: Complete documentation

#### Tasks:
- [ ] Write user guide for employees
- [ ] Write admin guide for HR
- [ ] Document API endpoints
- [ ] Create troubleshooting guide
- [ ] Record demo video
- [ ] Prepare handover notes

#### Documents to create:
- docs/user_guide.md
- docs/admin_guide.md
- docs/api_documentation.md
- docs/troubleshooting.md

#### Final Checkpoint: 🎉 **MVP Complete!**

---

## Quick Start Commands

### Development Setup:
```bash
# Clone and setup
git clone <repo>
cd irc_p001_complain-system
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Start development
npm run dev
```

### Testing Commands:
```bash
# Test backend API
curl http://localhost:3001/health

# Test database
cd backend && npm run test:db

# Test LINE webhook
curl -X POST http://localhost:3001/api/line/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"message","message":{"text":"/complain"}}]}'
```

---

## Success Criteria

### MVP Must Have:
- ✅ Employees can submit complaints via LINE
- ✅ HR can view complaints in dashboard
- ✅ Authentication protects HR access
- ✅ Chat logs are stored and viewable
- ✅ System is deployed and accessible

### Nice to Have (Post-MVP):
- 📊 Reports and analytics
- 📧 Email notifications
- 📎 File attachments
- 🔍 Search and filters
- 📱 Mobile responsive dashboard

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LINE API changes | Keep webhook simple, version lock SDK |
| Database overload | Implement rate limiting, use indexes |
| Auth complexity | Start with single IdP (Google) |
| Deployment issues | Use Docker for consistency |
| Data privacy | Encrypt sensitive fields, audit logs |

---

## Weekly Milestones

**Week 1:**
- ✅ Database setup
- ✅ Backend API
- ✅ LINE bot integration

**Week 2:**
- ✅ Authentication
- ✅ Frontend dashboard
- ✅ Integration testing

**Week 3:**
- ✅ Deployment
- ✅ Documentation
- ✅ Handover

---

This plan provides a clear path from zero to deployed MVP in 2-3 weeks.