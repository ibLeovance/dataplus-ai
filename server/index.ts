import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { router as authRouter } from './routers/auth';
import { router as taskRouter } from './routers/tasks';
import { router as referralRouter } from './routers/referral';
import { router as adminRouter } from './routers/admin';
import { router as settingsRouter } from './routers/settings';
import { router as shareRouter } from './routers/share';
import { runStartupCheck } from './migrate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Serve static files
if (process.env.NODE_ENV === 'production') {
  // Try multiple possible locations for the client build
  const possiblePaths = [
    path.join(__dirname, '..', 'client', 'dist'),     // dev mode: server/index.ts -> project root -> client/dist
    path.join(__dirname, '..', 'dist', 'client'),      // Koyeb: dist/server/index.js -> dist -> client (via build:full)
    path.join(process.cwd(), 'client', 'dist'),        // fallback: cwd/client/dist
  ];
  const clientDist = possiblePaths.find(p => {
    try { return fs.existsSync(path.join(p, 'index.html')); } catch { return false; }
  }) || possiblePaths[0];
  app.use(express.static(clientDist));
}

// Auth middleware
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dataplus-ai-secret');
      (req as any).user = decoded;
    } catch {}
  }
  next();
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/referral', referralRouter);
app.use('/api/admin', adminRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/withdrawals', settingsRouter);
app.use('/api/share', shareRouter);

// SPA fallback
if (process.env.NODE_ENV === 'production') {
  const possiblePaths = [
    path.join(__dirname, '..', 'client', 'dist'),
    path.join(__dirname, '..', 'dist', 'client'),
    path.join(process.cwd(), 'client', 'dist'),
  ];
  const clientDist = possiblePaths.find(p => {
    try { return fs.existsSync(path.join(p, 'index.html')); } catch { return false; }
  }) || possiblePaths[0];
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

async function startServer() {
  try {
    await runStartupCheck();
  } catch (err) {
    console.error('❌ Startup schema check failed:', (err as Error).message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database: Supabase (${process.env.SUPABASE_URL || 'not configured'})`);
  });
}

startServer();
