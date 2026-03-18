# ⚡ FlowForge — Workflow Automation Engine
### React + Node.js + Express + MongoDB

> **Halleyx Full Stack Challenge 2026** — React Stack

---

## 🚀 Run in 4 Commands

```bash
# 1. Install everything
npm run install:all

# 2. Start MongoDB (must be running)
mongod

# 3. Seed database with sample data
npm run seed

# 4. Start both servers
npm run dev
```

Open → **http://localhost:3000**

Login: `admin@flowforge.io` / `Admin@1234`

---

## 📁 Project Structure

```
FlowForge/
├── backend/
│   └── src/
│       ├── config/database.js         # MongoDB connection
│       ├── models/index.js            # All Mongoose schemas
│       ├── middleware/auth.js         # JWT protect middleware
│       ├── services/
│       │   ├── ruleEngine.js          # ⭐ Core rule evaluator
│       │   └── execution.js           # ⭐ Async execution processor
│       ├── controllers/index.js       # All route handlers
│       ├── routes/index.js            # All API routes
│       ├── utils/seed.js              # Database seeder
│       └── server.js                  # Express entry point
│
├── frontend/
│   └── src/
│       ├── services/api.js            # Axios API wrapper
│       ├── context.js                 # AuthContext + ToastContext
│       ├── utils.js                   # Format helpers
│       ├── components/Layout.js       # Sidebar + shell
│       └── pages/
│           ├── Login.js
│           ├── Register.js
│           ├── Dashboard.js
│           ├── WorkflowList.js
│           ├── WorkflowEditor.js      # 3-tab editor
│           ├── ExecuteWorkflow.js     # Live execution with polling
│           ├── AuditLog.js
│           ├── ExecutionDetail.js
│           └── RuleTester.js          # ⭐ Unique feature
│
└── package.json                       # Root scripts
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/auth/register` | Register |
| GET | `/api/workflows` | List (search + paginate) |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/:id` | Get with steps & rules |
| PUT | `/api/workflows/:id` | Update (bumps version) |
| DELETE | `/api/workflows/:id` | Cascade delete |
| POST | `/api/workflows/:id/execute` | Start execution |
| GET | `/api/workflows/:id/steps` | List steps |
| POST | `/api/workflows/:id/steps` | Add step |
| PUT | `/api/steps/:id` | Update step |
| DELETE | `/api/steps/:id` | Delete step + rules |
| GET | `/api/steps/:id/rules` | List rules |
| POST | `/api/steps/:id/rules` | Add rule |
| PUT | `/api/rules/:id` | Update rule |
| DELETE | `/api/rules/:id` | Delete rule |
| POST | `/api/rules/validate` | ⭐ Validate condition |
| GET | `/api/executions` | List all executions |
| GET | `/api/executions/stats` | Dashboard stats |
| GET | `/api/executions/:id` | Full detail + logs |
| POST | `/api/executions/:id/cancel` | Cancel |
| POST | `/api/executions/:id/retry` | Retry from failed step |

---

## 🔧 Rule Engine

Rules are evaluated in **priority order** (lowest = first). First match wins.

```
Operators:  ==  !=  <  >  <=  >=  &&  ||
Functions:  contains(field, "val")
            startsWith(field, "prefix")
            endsWith(field, "suffix")
Special:    DEFAULT  →  always matches (fallback)
```

**Loop Detection:** Steps track visit counts. If a step is visited more than `MAX_LOOP_ITERATIONS` times (default: 10, configurable via `.env`), execution fails with a clear error message.

---

## 🌟 Unique Features

| Feature | Where |
|---------|-------|
| 🧪 Rule Condition Tester | `/rule-tester` — live sandbox |
| 📊 Workflow health score | Dashboard + workflow list |
| 🔄 Loop detection | Execution service (configurable) |
| 📈 Rule hit analytics | `hit_count` + `last_triggered` per rule |
| ⚡ Live execution polling | Execute page auto-refreshes |
| 🏷️ SLA + escalation per step | Step metadata |
| 🎯 Execution priority | low / medium / high / critical |

---

## 🗝️ Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@flowforge.io | Admin@1234 |
| Manager | manager@flowforge.io | Manager@1234 |
| User | user@flowforge.io | User@1234 |

---

## ⚙️ Environment (backend/.env)

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/flowforge
JWT_SECRET=flowforge_react_secret_2026
JWT_EXPIRES_IN=7d
MAX_LOOP_ITERATIONS=10
```
