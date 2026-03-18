require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

const app = express();
connectDB();

app.use(helmet());
app.use(cors({ origin: ['http://localhost:3000','http://127.0.0.1:3000'], credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.use('/api', require('./routes'));

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date() }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 FlowForge API → http://localhost:${PORT}`));
module.exports = app;
