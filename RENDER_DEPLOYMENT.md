# Deploying Nudge to Render: Complete Step-by-Step Guide

This guide walks you through deploying the **Nudge Compliance Engine** (React 18 Frontend + Express.js Node Backend) to **[Render](https://render.com/)** on the **Free Tier**.

---

## Architecture on Render

```
   [User Browser]
         |
         +-----> https://nudge-web.onrender.com (Render Static Site - React 18 / Vite CDN)
         |              |
         |              | Axios HTTP (Bearer Supabase JWT)
         |              v
         +-----> https://nudge-api.onrender.com (Render Web Service - Node.js API)
                        |
                        +-----> Google Gemini API (Multimodal OCR & Assistant)
                        +-----> Supabase Cloud (PostgreSQL with RLS, Auth, Storage)
```

- **Frontend (`nudge-web`)**: Deployed as a **Static Site** (Fast global CDN, free SSL, zero monthly cost).
- **Backend (`nudge-api`)**: Deployed as a **Web Service** (Node.js runtime, free tier).
- **Database & Storage**: Already hosted on your cloud **Supabase** instance.

---

## Prerequisites (Checklist Before Deploying)

Before deploying, ensure you have:
1. A free account on [Render.com](https://render.com/).
2. Your GitHub repository connected to Render ([`https://github.com/hriishi5/Nudge.git`](https://github.com/hriishi5/Nudge.git)).
3. Your Supabase project credentials (from your Supabase Dashboard -> **Project Settings -> API**):
   - `Project URL`
   - `anon public key`
   - `service_role secret key` (Keep this confidential; only added to the backend)
4. A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
5. Database migrations executed in Supabase:
   - Run [`supabase/migrations/001_initial_schema.sql`](file:///c:/Users/DELL/Downloads/Nudge/supabase/migrations/001_initial_schema.sql) in your Supabase SQL Editor.
   - Verify a private storage bucket named `nudge-documents` exists.

---

## Method 1: 1-Click Setup with Render Blueprint (`render.yaml`)

We have pre-configured a `render.yaml` Blueprint in the repository.

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** (top right) $\rightarrow$ **Blueprint**.
3. Select your repository: **`hriishi5/Nudge`** (or connect your GitHub account if not already connected).
4. Render will read `render.yaml` and discover two services:
   - `nudge-api` (Node Web Service)
   - `nudge-web` (Static Site)
5. Fill in the prompted secret environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (Set this to `https://nudge-api.onrender.com/api`)
6. Click **Apply**.
7. *Crucial*: Follow the **SPA Rewrite Rule** in Step 3 of Method 2 below so React Router navigation doesn't 404 on page reload.

---

## Method 2: Manual Dashboard Setup (Recommended for Full Control)

If you prefer setting up the services step-by-step in the Render Dashboard, follow these exact instructions:

### Step 1: Deploy the Backend Web Service (`nudge-api`)

1. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** $\rightarrow$ **Web Service**.
2. Select your repository: **`hriishi5/Nudge`**.
3. Fill in the service configuration:
   - **Name**: `nudge-api`
   - **Region**: Choose closest to you (e.g., `Singapore` or `Oregon`).
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Expand **Advanced** $\rightarrow$ Click **Add Environment Variable** and add the following:

   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production security & logging |
   | `PORT` | `10000` | (Render provides this, but setting is safe) |
   | `SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase API settings |
   | `SUPABASE_ANON_KEY` | `eyJh...` | Supabase Anon Public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` | Supabase Service Role key |
   | `GEMINI_API_KEY` | `AIzaSy...` | From Google AI Studio |
   | `CORS_ORIGIN` | `*` | Or set to your frontend URL later |
   | `SCHEDULED_JOB_SECRET` | Any random string | e.g. `nudge_sec_2026_prod` |

5. Under **Health Check Path**, enter: `/health`.
6. Click **Create Web Service**.
7. Wait 2–3 minutes until the logs show:
   ```
   🚀 NUDGE COMPLIANCE SERVER ACTIVE
   📡 Listening on port: 10000
   ```
8. **Copy your backend URL**: It will look like `https://nudge-api.onrender.com`.

---

### Step 2: Deploy the Frontend Static Site (`nudge-web`)

1. In the Render Dashboard, click **New +** $\rightarrow$ **Static Site**.
2. Select the same repository: **`hriishi5/Nudge`**.
3. Fill in the frontend configuration:
   - **Name**: `nudge-web`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Expand **Advanced** $\rightarrow$ Add Environment Variables:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Your Supabase Project URL (`https://xxxx.supabase.co`) |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key (`eyJh...`) |
   | `VITE_API_BASE_URL` | `https://nudge-api.onrender.com/api` *(replace with your backend URL from Step 1)* |

5. Click **Create Static Site**.
6. Render will build the Vite React application and deploy it to a global CDN.

---

### Step 3: CRITICAL — Configure SPA Rewrite Rule (Avoid 404s on Refresh)

Because Nudge is a Single Page Application (SPA) using React Router (`/dashboard`, `/invoices`, `/vendors`, etc.), you **must** instruct Render to route all URLs back to `index.html`. Otherwise, refreshing a page will return a 404 error.

1. In the Render Dashboard, open your **`nudge-web`** Static Site.
2. In the left sidebar, click **Redirects/Rewrites**.
3. Click **Add Rule** and enter:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
4. Click **Save Changes**.

---

### Step 4: Update Backend CORS with Frontend Domain (Best Practice)

1. Open your **`nudge-api`** Web Service in Render.
2. In the left sidebar, click **Environment**.
3. Edit `CORS_ORIGIN` to your live frontend URL (e.g., `https://nudge-web.onrender.com`).
   *(Note: The server automatically supports `*.onrender.com` domains and strips trailing slashes, but locking it down to your specific URL is recommended for production).*
4. Click **Save Changes** (Render will trigger a quick zero-downtime redeploy).

---

## Testing Your Live Deployment

1. Visit your live site at `https://nudge-web.onrender.com`.
2. **Login / Register**:
   - Register a new organization or log in with your configured Supabase credentials.
3. **Upload an Invoice**:
   - Navigate to `/invoices/upload`.
   - Drag & drop any sample PDF invoice.
   - Watch Gemini Flash extract the vendor name, Udyam number, invoice date, and amounts in real time.
4. **Inspect Statutory Math**:
   - Click **Save Invoice** and open the invoice detail page.
   - Verify that Section 15 deadlines (15 days or capped at 45 days) and Section 16 penal interest are computed deterministically.
5. **Test Form 3CD Export**:
   - Navigate to `/reports/form-3cd` and click **Export CSV**.
6. **Test AI Assistant**:
   - Navigate to `/assistant` and ask compliance questions like:
     *"Which invoices are currently at risk of breaching Section 43B(h)?"*

---

## Free Tier Notes & Cold Starts

Render's free web services automatically spin down after 15 minutes of inactivity:
- When you make a request to `nudge-api` after it was sleeping, the first request may take 30–50 seconds to wake up (spin-up time). Subsequent requests will be fast.
- The static frontend (`nudge-web`) never sleeps and is always served instantly from the CDN.
- To keep the backend awake during working hours, you can set up a free uptime monitor (such as [UptimeRobot](https://uptimerobot.com/)) pinging `https://nudge-api.onrender.com/health` every 10 minutes.
