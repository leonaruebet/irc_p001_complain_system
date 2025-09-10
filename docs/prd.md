# Product Requirements Document (PRD)  
**System:** Complaint Management System (LINE OA Integrated)  
**Tech Stack:** Next.js (Frontend), Node.js (Backend), MongoDB (Database), Enterprise Auth  
**Author:** Leo Naruebet
**Date:** 2025-09-08  

---

## 1. Objective  
Enable employees to log complaints through **LINE OA chat commands** (`/complain`, `/submit`) with conversations stored in MongoDB. HR can access a **secure dashboard** (Next.js app) to view, track, and report complaints. **AI-powered sentiment analysis and issue classification** provides automated insights for better complaint management and trend analysis.

---

## 2. Goals & Non-Goals  

### Goals  
- Provide a **chat-first complaint submission flow** integrated with LINE OA.  
- Store all conversations with **user_id + timestamp** in MongoDB.  
- **Automatically analyze complaints** using Google Gemini AI for sentiment and issue classification.
- Ensure HR has **enterprise-grade secure access** to the dashboard.  
- HR can:  
  - View complaints by status with **AI-generated insights**.  
  - Review chat logs with **sentiment analysis**.  
  - Access **automated issue categorization** and severity assessment.
  - Generate **AI-powered analytics reports** and word clouds.
  - Update complaint status & notes.  

### Non-Goals  
- No access for executives or employees beyond HR.  
- No anonymous submissions (LINE user_id always logged).  
- ~~No AI classification in MVP~~ **✅ IMPLEMENTED: AI classification now available**.  

---

## 3. User Stories  

### Employee (via LINE OA)  
- As an employee, I can type `/complain` to start a session.  
- As an employee, I can type freely with the bot.  
- As an employee, I can type `/submit` to finalize my complaint.  
- As an employee, I receive acknowledgment & updates.  

### HR (via Dashboard)  
- As HR, I can **log in with enterprise authentication** (SSO, MFA required).  
- As HR, I can view a list of complaints **with AI-generated sentiment indicators**.  
- As HR, I can filter complaints (by date, status, employee, **sentiment, issue category, severity level**).  
- As HR, I can view complaint chat logs **with automatic sentiment analysis**.  
- As HR, I can see **AI-generated summaries** and **recommended actions** for each complaint.
- As HR, I can access **word cloud visualizations** showing common complaint themes.
- As HR, I can view **automated issue categorization** (harassment, discrimination, management issues, etc.).
- As HR, I can generate **AI-powered analytics reports** with sentiment trends and category breakdowns.
- As HR, I can update status and add resolution notes.  
- As HR, I can **trigger AI re-analysis** for complaints when needed.  

---

## 4. Functional Requirements  

### LINE OA Bot  
- Commands supported: `/complain`, `/submit`.  
- Capture employee messages (with `user_id`, `timestamp`).  
- Send acknowledgment with complaint ID.  

### Backend (API Layer)  
- **Session management** between `/complain` and `/submit` with **automatic AI processing**.  
- **MongoDB Collections**:  
  - `complaint_sessions` (session_id, user_id, status, embedded chat_logs).  
  - `ai_complaint_tags` (**NEW**: AI analysis results, sentiment, categorization, keywords).  
  - `employees` (user registry and profile data).
  - `hr_allowlist` (HR authorization and access control).
  - `line_events_raw` (webhook audit trail).
- **tRPC APIs**:  
  - `complaint.create` - Start new complaint session
  - `complaint.addChatLog` - Add messages to active session  
  - `complaint.submit` - Submit complaint + **trigger AI analysis**  
  - `complaint.getById` - Get complaint details (HR only)
  - `complaint.list` - List complaints with pagination (HR only)
  - `complaint.getStats` - Get basic statistics (HR only)
  - `aiTagging.processComplaint` - **NEW**: Process AI analysis (HR only)
  - `aiTagging.getAnalysis` - **NEW**: Get AI analysis results (HR only)
  - `aiTagging.getAnalytics` - **NEW**: Get AI-powered analytics (HR only)
  - `aiTagging.batchProcessComplaints` - **NEW**: Batch process multiple complaints (HR only)
  - `employee.register` - Auto-register employees from LINE interactions  

### HR Dashboard (Next.js)  
- **Authentication**:  
  - Use **OAuth 2.0 + OpenID Connect (OIDC)** with enterprise IdP (e.g., Azure AD, Okta, Google Workspace).  
  - Enforce **Multi-Factor Authentication (MFA)**.  
  - Role-Based Access Control (RBAC) → Only HR role can view complaints.  
- **Features**:  
  - Complaint list table **with AI sentiment indicators** and **issue category badges**.  
  - Complaint detail page with chat log **and AI analysis panel**.  
  - **AI-generated summaries** and **recommended actions** for each complaint.
  - **Interactive word cloud** visualization of complaint themes.
  - **Advanced filtering** by sentiment (positive/neutral/negative), issue category, and severity level.
  - **AI-powered analytics dashboard** with sentiment trends and category breakdowns.
  - Status & resolution notes with **AI insights integration**.  
  - **Enhanced reports** with AI-generated insights (volume, sentiment trends, category analysis, urgency patterns).  

---

## 5. Non-Functional Requirements  

- **Security**  
  - SSO + MFA required for HR login.  
  - Role-based access (HR only).  
  - Encrypt complaint logs in MongoDB (AES-256 at rest).  
  - TLS for all API communication.  
  - Audit logs of HR access.  

- **Scalability** 
  - MongoDB Atlas with auto-scaling. 
  - Backend supports 10k+ complaints/year.  

- **Reliability**  
  - 99.9% uptime target.  
  - Daily backups for MongoDB.  

---

## 6. Tech Stack  

- **Frontend (HR Dashboard):**  
  - Next.js 15  
  - TailwindCSS + shadcn/ui  
  - BetterAuth  

- **Backend (API):**  
  - Node.js + Express with **tRPC** for type-safe APIs  
  - LINE Messaging API SDK  
  - **Google Gemini AI** for complaint analysis and sentiment detection
  - JWT-based authentication and authorization  

- **Database:**  
  - MongoDB Atlas with optimized collections:
    - `complaint_sessions` (main complaint data with embedded chat logs)
    - `ai_complaint_tags` (**NEW**: AI analysis results, sentiment, categories, keywords)
    - `employees` (user registry and department mapping)
    - `hr_allowlist` (access control and authorization)
    - `line_events_raw` (audit trail for LINE webhook events)  

- **Authentication:**  
  - **SSO with IdP (Okta, Azure AD, Google Workspace)**  
  - **OIDC (OpenID Connect) + OAuth2.0**  
  - MFA enforcement  
  - Role-based access control  

- **Deployment:**  
  - Vercel (Frontend)  

---

## 7. Success Metrics  

- **Security**: 100% HR logins via SSO + MFA.  
- **Adoption**: >80% complaints submitted via LINE OA.  
- **Efficiency**: 30% faster HR resolution time **with AI-powered prioritization**.  
- **AI Accuracy**: >90% accurate sentiment classification and issue categorization.
- **Insight Generation**: 100% of complaints automatically analyzed within 30 seconds.
- **Dashboard Utilization**: HR uses AI insights for >75% of complaint reviews.
- **System Reliability**: >99.9% uptime for both complaint system and AI analysis.  

---

## 8. Future Enhancements  

- ~~AI classification for severity tagging~~ **✅ IMPLEMENTED**  
- **Advanced AI Features:**
  - Custom ML model training on historical complaint data
  - Predictive analytics for complaint escalation
  - Real-time sentiment monitoring with alerts
  - Multi-language complaint analysis
- **Integration Enhancements:**
  - Anonymous mode (mask user_id)  
  - Slack/Email notifications for high-severity complaints  
  - Export AI-powered reports (PDF/CSV with insights)
  - Integration with HRIS systems for employee context
- **Dashboard Improvements:**
  - Real-time complaint monitoring dashboard
  - Automated escalation workflows based on AI severity assessment
  - Comparative department analysis with AI insights  

---
