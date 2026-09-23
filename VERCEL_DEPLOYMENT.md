# Deploying Nudge Frontend to Vercel: Step-by-Step Guide

This guide walks you through deploying the **Nudge React 18 + Vite Frontend** to **[Vercel](https://vercel.com/)** (Free Tier with Global Edge CDN).

---

## Architecture Overview

```
   [User Browser]
         |
         +-----> https://nudge.vercel.app (Vercel Edge CDN - React 18 Frontend)
         |              |
         |              | Axios HTTP (Bearer Supabase JWT)
         |              v
         +-----> https://nudge-api.onrender.com (Render Web Service - Node.js API)
                        |
                        +-----> Google Gemini API (Multimodal OCR & Assistant)
                        +-----> Supabase Cloud (PostgreSQL with RLS, Auth, Storage)
```

- **Frontend (`client`)**: Hosted on Vercel Edge Network (Instant builds, global CDN, automatic SSL).
- **Backend (`server`)**: Hosted on Render as a Web Service (`nudge-api`).
- **Database & Auth**: Hosted on Supabase Cloud.

---

## Step-by-Step Deployment Instructions

### Step 1: Open Vercel & Import Your Repository
1. Log in to **[vercel.com](https://vercel.com/)**.
2. On your Vercel Dashboard, click **Add New...** (top right) $\rightarrow$ select **Project**.
3. Locate your GitHub repository: **`hriishi5/Nudge`** and click **Import**.

---

### Step 2: Configure Project Settings (Crucial Monorepo Setting)

Because this repository contains both `client` and `server`, you **must** tell Vercel to build the `client` directory:

1. **Project Name**: `nudge` (or any name you prefer).
2. **Framework Preset**: **`Vite`** (Vercel will auto-detect Vite once you select the root directory).
3. **Root Directory**:
   - Click **Edit** next to Root Directory.
   - Select or type: **`client`**
   - Click **Continue**.
4. **Build and Output Settings** (Defaults are pre-filled):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

---

### Step 3: Add Environment Variables

Expand the **Environment Variables** section on Vercel and add these 3 variables:

| Variable Name | Value | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Your Supabase Project URL *(from Supabase Dashboard $\rightarrow$ Settings $\rightarrow$ API)* |
| `VITE_SUPABASE_ANON_KEY` | `eyJh...` | Your Supabase `anon` `public` key |
| `VITE_API_BASE_URL` | `https://nudge-api.onrender.com/api` | Your live backend API URL on Render |

> [!TIP]
> In `client/src/lib/apiClient.js`, the code automatically normalizes the URL—so whether you include or omit the trailing slash or `/api`, it will correctly resolve to `/api` without 404s!

---

### Step 4: Click Deploy

1. Click **Deploy**.
2. Vercel will install dependencies, run `vite build`, and publish your app to the global Edge Network in under 30 seconds.
3. You will receive a live URL: e.g. `https://nudge-xyz.vercel.app`.

---

## Single Page App (SPA) Routing Handled Automatically

We have added [`client/vercel.json`](file:///c:/Users/DELL/Downloads/Nudge/client/vercel.json) to the repository:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
This ensures that refreshing pages on deep routes like `/dashboard`, `/invoices`, `/vendors`, or `/reports/form-3cd` will route directly to `index.html` without returning a 404 error.

---

## Automatic CORS Whitelisting

The backend in `server/src/app.js` is already pre-configured to automatically allow:
- All `*.vercel.app` subdomains
- All `*.onrender.com` subdomains
- Any custom domain configured in `CORS_ORIGIN`

You do **not** need to reconfigure CORS on Render for standard Vercel deployments!

---

## Verifying Your Vercel Deployment

1. Open your live Vercel URL (e.g., `https://nudge-hriishi5.vercel.app`).
2. Log in using your Supabase credentials or the instant demo credentials.
3. Navigate to **Upload Invoice** (`/invoices/upload`), upload a test invoice, and verify that Gemini Flash real-time preview extracts correctly.
4. Check **Form 3CD** (`/reports/form-3cd`) to verify CSV generation.
