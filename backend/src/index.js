import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import plaidRoutes from './routes/plaid.js';
import transactionRoutes from './routes/transactions.js';
import categoryRoutes from './routes/categories.js';
import settingsRoutes from './routes/settings.js';
import goalRoutes from './routes/goals.js';
import summaryRoutes from './routes/summary.js';
import authRoutes from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

// Public endpoints (no auth)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);

// Everything else requires the session token
app.use('/api', requireAuth);
app.use('/api/plaid', plaidRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/summary', summaryRoutes);

// In production, serve the built frontend from this same service so the
// whole app lives at one URL (no CORS, one thing to deploy).
const distPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`Budget Tracker running on http://localhost:${PORT}`);
});
