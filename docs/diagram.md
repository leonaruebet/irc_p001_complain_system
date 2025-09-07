# Complaint Webapp — Database Schema & Diagram (MongoDB, single-tenant)

**Context:** LINE OA chat-first complaints using `/complain … /submit`.
**Access:** HR has **read-only** dashboard (no actions/updates).
**Note:** **No organization layer** (single tenant; no `org_*` fields).
**Design choice:** Embed all chat logs **inside** a complaint session doc for fast reads.

---

## 1) Scope & Assumptions

* Employees submit complaints through LINE OA:

  * `/complain` starts a session → free-form chat → `/submit` finalizes.
* System stores **all chat logs inside a single complaint session document**.
* HR dashboard is **read-only**: list complaints, view details, run reports.
* Authentication via **SSO/OIDC**; authorization via **HR allowlist** in DB.
* Optimize for **read performance** of a single conversation.

---

## 2) Collections Overview

| Collection             | Purpose                                            | Key Fields                                                                                                                  | Typical Indexes                                                                     | Retention          |
| ---------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| `employees`            | Employee registry by LINE `userId` and metadata    | `_id`(=line\_user\_id), `display_name`, `department`, `active`                                                              | `{ department:1 }`, `{ active:1 }`                                                  | Keep while active  |
| `complaint_sessions`   | One doc per complaint flow; **embedded chat logs** | `_id`(session\_id), `complaint_id`, `user_id`, `status`, `start_time`, `end_time`, `chat_logs[]`, *(optional)* `department` | `{ status:1, start_time:-1 }`, `{ user_id:1, start_time:-1 }`, `{ complaint_id:1 }` | 3–7 years (policy) |
| `line_events_raw`      | Raw LINE webhook payloads (audit/debug)            | `_id`, `received_at`, `user_id`, `event_type`, `payload`                                                                    | `{ received_at:-1 }` + **TTL**                                                      | 30–90 days (TTL)   |
| `hr_allowlist`         | HR **authorization** (read-only viewers)           | `_id`(IdP subject/OIDC `sub`), `email`, `name`, `roles:["hr_viewer"]`                                                       | `{ roles:1 }`, `{ email:1 }`                                                        | Keep current       |
| `audit_reads` *(opt.)* | Who viewed what (read trace for privacy/audit)     | `_id`, `when`, `hr_subject`, `object_type`, `object_id`, `ip`, `user_agent`                                                 | `{ when:-1 }`, `{ hr_subject:1, when:-1 }`                                          | 1–2 years          |

> If a single conversation could exceed \~500–1000 messages or doc size >2–4 MB, shard logs into a separate `complaint_logs` collection. For typical HR use, **embedded** is fine.

---

## 3) ER Diagram (Mermaid, embedded chat logs)

```mermaid
erDiagram
    EMPLOYEE {
        string user_id PK
        string display_name
        string department
        boolean active
    }

    COMPLAINT_SESSION {
        string session_id PK
        string complaint_id
        string user_id FK
        datetime start_time
        datetime end_time
        string status         // open, submitted
        CHAT_LOG[] chat_logs
        string department     // optional denormalized copy from employee
    }

    CHAT_LOG {
        datetime timestamp
        string direction      // user|bot
        string message_type   // text|image|file|command
        string message
    }

    HR_ALLOWLIST {
        string hr_subject PK  // OIDC sub or stable IdP subject
        string email
        string name
        string[] roles        // ["hr_viewer"]
    }

    LINE_EVENTS_RAW {
        string _id PK
        datetime received_at
        string user_id
        string event_type
        object payload
    }

    EMPLOYEE ||--o{ COMPLAINT_SESSION : "initiates"
    COMPLAINT_SESSION ||--|{ CHAT_LOG : "contains"
```

---

## 4) Canonical Document Schemas (JSON examples)

### 4.1 `employees`

```json
{
  "_id": "Ucb71e2...1234",
  "display_name": "N. Aungsirikul",
  "department": "Operations",
  "active": true,
  "created_at": "2025-09-08T10:00:00Z",
  "updated_at": "2025-09-08T10:00:00Z"
}
```

### 4.2 `complaint_sessions` (embedded chat logs)

```json
{
  "_id": "sess_20250908_XYZ123",
  "complaint_id": "CMP-2025-09-08-0001",
  "user_id": "Ucb71e2...1234",
  "status": "submitted",
  "start_time": "2025-09-08T10:02:34Z",
  "end_time": "2025-09-08T10:15:55Z",
  "department": "Operations",
  "chat_logs": [
    { "timestamp": "2025-09-08T10:02:35Z", "direction": "user", "message_type": "command", "message": "/complain" },
    { "timestamp": "2025-09-08T10:02:37Z", "direction": "bot",  "message_type": "text",    "message": "Please describe your complaint. Type /submit when done." },
    { "timestamp": "2025-09-08T10:06:12Z", "direction": "user", "message_type": "text",    "message": "My manager repeatedly assigns unpaid OT." },
    { "timestamp": "2025-09-08T10:15:10Z", "direction": "user", "message_type": "command", "message": "/submit" },
    { "timestamp": "2025-09-08T10:15:55Z", "direction": "bot",  "message_type": "text",    "message": "Your complaint is submitted. ID: CMP-2025-09-08-0001" }
  ],
  "created_at": "2025-09-08T10:02:34Z",
  "updated_at": "2025-09-08T10:15:55Z"
}
```

### 4.3 `line_events_raw` (short TTL)

```json
{
  "_id": "evt_01J...S8",
  "received_at": "2025-09-08T10:02:34Z",
  "user_id": "Ucb71e2...1234",
  "event_type": "message",
  "payload": { "original_webhook": "..." }
}
```

### 4.4 `hr_allowlist`

```json
{
  "_id": "00u8f9OktaSub",
  "email": "hr@example.com",
  "name": "HR Reviewer",
  "roles": ["hr_viewer"],
  "created_at": "2025-09-08T08:00:00Z"
}
```

### 4.5 `audit_reads` *(optional)*

```json
{
  "_id": "read_01J..",
  "when": "2025-09-08T11:22:11Z",
  "hr_subject": "00u8f9OktaSub",
  "object_type": "complaint_session",
  "object_id": "sess_20250908_XYZ123",
  "ip": "203.0.113.21",
  "user_agent": "Chrome/139"
}
```

---

## 5) JSON Schema Validators (MongoDB)

**`complaint_sessions` validator**

```javascript
{
  $jsonSchema: {
    bsonType: "object",
    required: ["_id","complaint_id","user_id","status","start_time","chat_logs"],
    properties: {
      _id: { bsonType: "string" },
      complaint_id: { bsonType: "string" },
      user_id: { bsonType: "string" },
      status: { enum: ["open","submitted"] },
      start_time: { bsonType: "date" },
      end_time: { bsonType: ["date","null"] },
      department: { bsonType: "string" },
      chat_logs: {
        bsonType: "array",
        minItems: 1,
        items: {
          bsonType: "object",
          required: ["timestamp","direction","message_type","message"],
          properties: {
            timestamp: { bsonType: "date" },
            direction: { enum: ["user","bot"] },
            message_type: { enum: ["text","image","file","command"] },
            message: { bsonType: "string" }
          }
        }
      },
      created_at: { bsonType: "date" },
      updated_at: { bsonType: "date" }
    }
  }
}
```

**`employees` validator**

```javascript
{
  $jsonSchema: {
    bsonType: "object",
    required: ["_id","display_name","active"],
    properties: {
      _id: { bsonType: "string" },
      display_name: { bsonType: "string" },
      department: { bsonType: "string" },
      active: { bsonType: "bool" },
      created_at: { bsonType: "date" },
      updated_at: { bsonType: "date" }
    }
  }
}
```

**`hr_allowlist` validator**

```javascript
{
  $jsonSchema: {
    bsonType: "object",
    required: ["_id","email","roles"],
    properties: {
      _id: { bsonType: "string" },
      email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
      name: { bsonType: "string" },
      roles: { bsonType: "array", items: { enum: ["hr_viewer"] }, minItems: 1 }
    }
  }
}
```

---

## 6) Indexing Strategy (critical queries)

```javascript
// complaint_sessions
db.complaint_sessions.createIndex({ status: 1, start_time: -1 });
db.complaint_sessions.createIndex({ user_id: 1, start_time: -1 });
db.complaint_sessions.createIndex({ complaint_id: 1 }, { unique: true });
// (optional if department denormalized on session)
db.complaint_sessions.createIndex({ department: 1, start_time: -1 });

// employees
db.employees.createIndex({ department: 1 });
db.employees.createIndex({ active: 1 });

// line_events_raw (TTL ~ 60 days)
db.line_events_raw.createIndex({ received_at: 1 }, { expireAfterSeconds: 60*60*24*60 });

// hr_allowlist
db.hr_allowlist.createIndex({ email: 1 });
db.hr_allowlist.createIndex({ roles: 1 });

// audit_reads (optional)
db.audit_reads.createIndex({ when: -1 });
db.audit_reads.createIndex({ hr_subject: 1, when: -1 });
```

---

## 7) Read Patterns (HR read-only)

**Dashboard list (paginated):**

```javascript
db.complaint_sessions
  .find({})
  .project({ complaint_id:1, user_id:1, department:1, status:1, start_time:1, end_time:1 })
  .sort({ start_time: -1 })
  .limit(50);
```

**Complaint detail (with embedded logs):**

```javascript
db.complaint_sessions.findOne({ complaint_id: "CMP-2025-09-08-0001" });
```

**Reports — count by month:**

```javascript
db.complaint_sessions.aggregate([
  { $match: { start_time: { $gte: ISODate("2025-06-01") } } },
  { $group: {
      _id: { y: { $year: "$start_time" }, m: { $month: "$start_time" } },
      count: { $sum: 1 }
  }},
  { $sort: { "_id.y": 1, "_id.m": 1 } }
]);
```

**Reports — by department (if denormalized on session):**

```javascript
db.complaint_sessions.aggregate([
  { $match: { start_time: { $gte: ISODate("2025-06-01") } } },
  { $group: { _id: "$department", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

---

## 8) Security & Privacy (DB layer best practices)

* **Authentication:** SSO/OIDC (e.g., Azure AD/Okta/Google); accept only allowed subjects/emails.
* **Authorization:** Gate access by comparing OIDC `sub`/email to `hr_allowlist`; require role `hr_viewer`.
* **Data minimization:** Store only necessary PII (LINE `userId`, display name, department).
* **Encryption:** Enable Atlas encryption at rest; consider **field-level encryption** for `chat_logs.message`.
* **Network:** Private networking/VPC peering; TLS enforced for all connections.
* **Audit (optional):** Log HR reads to `audit_reads`.
* **Retention:** TTL for `line_events_raw`; archive/partition old `complaint_sessions` annually if desired.

---

## 9) Denormalization Option (Department)

To filter by department without joining:

* At session creation, copy `department` from `employees` into `complaint_sessions.department`.
* If employees move departments, run a lightweight periodic re-sync job (optional).

---

## 10) Guardrails (Document Growth)

* Cap `chat_logs` per session (e.g., ≤500 entries or ≤2–4 MB).
* If exceeded:

  * Start a **new session**, **or**
  * Move to an external `complaint_logs` collection (1 doc per message) and keep the last N embedded for quick preview.

---

## 11) “Create Collections” Checklist

1. `employees` with validator + indexes
2. `complaint_sessions` with validator + indexes
3. `line_events_raw` with TTL index
4. `hr_allowlist` with validator + indexes
5. `audit_reads` *(optional)* with indexes

---

## 12) Optional: Mongoose Models (TypeScript)

```ts
// employees.model.ts
import { Schema, model } from "mongoose";
const EmployeeSchema = new Schema({
  _id: { type: String, required: true },            // LINE userId
  display_name: { type: String, required: true },
  department: { type: String },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
export default model("employees", EmployeeSchema);

// complaint_sessions.model.ts
import { Schema, model } from "mongoose";
const ChatLogSchema = new Schema({
  timestamp: { type: Date, required: true },
  direction: { type: String, enum: ["user","bot"], required: true },
  message_type: { type: String, enum: ["text","image","file","command"], required: true },
  message: { type: String, required: true }
},{ _id:false });

const ComplaintSessionSchema = new Schema({
  _id: { type: String, required: true },            // session_id
  complaint_id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  status: { type: String, enum: ["open","submitted"], default: "open", index: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date },
  department: { type: String },                     // optional denormalized
  chat_logs: { type: [ChatLogSchema], required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
ComplaintSessionSchema.index({ status: 1, start_time: -1 });
ComplaintSessionSchema.index({ user_id: 1, start_time: -1 });

export default model("complaint_sessions", ComplaintSessionSchema);

// hr_allowlist.model.ts
import { Schema, model } from "mongoose";
const HrAllowlistSchema = new Schema({
  _id: { type: String, required: true },            // OIDC sub
  email: { type: String, required: true, index: true },
  name: { type: String },
  roles: { type: [String], enum: ["hr_viewer"], default: ["hr_viewer"], index: true },
  created_at: { type: Date, default: Date.now }
});
export default model("hr_allowlist", HrAllowlistSchema);
```

---

### Implementation Notes

* Generate `complaint_id` as a human-friendly sequential string (e.g., `CMP-YYYY-MM-DD-####`) alongside `_id`.
* Prefer **UTC** timestamps; convert in UI.
* Consider **soft-delete flags** over hard deletions for auditability.

---
