# ⚡ How to Run FlowForge in 4 Steps

## Prerequisites (install once)
- **Node.js v18+** → https://nodejs.org
- **MongoDB** → https://www.mongodb.com/try/download/community

---

## Step 1 — Start MongoDB

**Windows:**
```
net start MongoDB
```
**Mac:**
```
brew services start mongodb-community
```
**Linux:**
```
sudo systemctl start mongod
```

---

## Step 2 — Install all packages
```bash
cd flowforge-react
npm run install:all
```
This installs packages for root + backend + frontend automatically.

---

## Step 3 — Seed the database
```bash
npm run seed
```
Creates 2 sample workflows + 3 users. Output:
```
admin@flowforge.io   / Admin@1234
manager@flowforge.io / Manager@1234
user@flowforge.io    / User@1234
```

---

## Step 4 — Start the app
```bash
npm run dev
```
- Backend runs on → http://localhost:5000
- Frontend runs on → http://localhost:3000

Open **http://localhost:3000** in your browser and login!

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `MongoDB connection error` | Make sure mongod is running (Step 1) |
| `Port 5000 in use` | Change `PORT=5001` in `backend/.env` |
| `Port 3000 in use` | React will auto-ask to use port 3001 — press Y |
| `npm not found` | Install Node.js from nodejs.org |
| `Cannot find module` | Run `npm run install:all` again |

