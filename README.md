# Budget Tracker

Personal budget tracker with Plaid bank sync, real-time budget vs. actual tracking, and overspend email alerts.

## Structure

- `backend/` — Node.js + Express API, Supabase DB, Plaid integration, Resend email alerts
- `frontend/` — React (Vite) dashboard, transactions, budget settings, and goals pages

## Setup

### 1. Database (Supabase)

1. Create a project at supabase.com
2. Open the SQL editor and run `backend/src/db/schema.sql` — this creates all tables and seeds the 9 default budget categories
3. Copy your Project URL and `service_role` key (Settings → API)

### 2. Backend

```
cd backend
cp .env.example .env   # fill in Supabase, Plaid, Resend keys
npm install
npm run dev            # runs on :3001
```

### 3. Frontend

```
cd frontend
cp .env.example .env   # points at backend URL
npm install
npm run dev            # runs on :5173
```

### 4. Plaid

- Sign up at plaid.com, create an app, get sandbox `client_id` + `secret`
- In sandbox mode, use Plaid's test credentials (`user_good` / `pass_good`) to link a fake account
- Switch `PLAID_ENV` to `development` or `production` later for real Chase/bank accounts

### 5. Resend (email alerts)

- Sign up at resend.com, get an API key, verify a sending domain (or use their test domain for dev)
- Update the `from` address in `backend/src/services/alertService.js`

## Required API keys

You'll need to provide:
- Supabase: project URL + service role key
- Plaid: client ID + secret (sandbox tier is free)
- Resend: API key (free tier is fine for low volume)
