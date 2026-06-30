import 'dotenv/config';

// Simple single-user auth. The client logs in once with APP_PASSWORD and
// receives SESSION_SECRET as a bearer token, which it sends on every request.
// Over HTTPS this is plenty for a personal, single-user app.
const SESSION_SECRET = process.env.SESSION_SECRET || '';

export function requireAuth(req, res, next) {
  // No password configured = auth disabled (e.g. pure local dev)
  if (!process.env.APP_PASSWORD) return next();

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (SESSION_SECRET && token === SESSION_SECRET) return next();

  return res.status(401).json({ error: 'Unauthorized' });
}
