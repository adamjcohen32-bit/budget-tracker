import { Router } from 'express';
import 'dotenv/config';

const router = Router();

// Is a password required at all? (lets the frontend skip the login screen
// when running locally with no APP_PASSWORD set)
router.get('/status', (req, res) => {
  res.json({ auth_required: !!process.env.APP_PASSWORD });
});

// Exchange the password for the session token
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!process.env.APP_PASSWORD) {
    // Auth disabled — hand back the token anyway so the client flow is uniform
    return res.json({ token: process.env.SESSION_SECRET || 'local' });
  }

  if (password && password === process.env.APP_PASSWORD) {
    return res.json({ token: process.env.SESSION_SECRET });
  }

  return res.status(401).json({ error: 'Incorrect password' });
});

export default router;
