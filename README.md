# Nudge: AI-Powered MSME Payment Compliance Copilot

**Nudge** is an enterprise-grade, multi-tenant compliance web application built for Indian SME and mid-market finance teams. It continuously monitors vendor payables under **Section 43B(h) of the Income Tax Act, 1961** and the **Micro, Small and Medium Enterprises Development (MSMED) Act, 2006**, flagging exposure **before** statutory deadlines breach rather than at retrospective year-end audit time.

> **Current Status**: Working MVP / Functional Prototype  


## 1. Project Overview & Current MVP

**Nudge** is currently implemented as a functional, multi-tenant compliance web application built for Indian SME and mid-market finance teams. 

This working MVP validates the core legal engine, multimodal AI invoice parsing, and statutory calculations needed to stay compliant with Section 43B(h):
- **Multimodal AI Extraction**: Drag-and-drop PDF/image invoice upload powered by Google Gemini Flash, automatically extracting vendor names, Udyam registration numbers, invoice dates, delivery dates, and amounts with real-time preview.
- **Deterministic Legal Math Engine**: Strict backend computation of Section 15 payment deadlines (15-day default, 45-day hard statutory cap) and Section 16 penal compound interest (3x RBI bank rate with monthly rests).
- **Proactive Deadline Tracking**: Configurable alert scanner categorizing payables into `Compliant`, `At Risk`, and `Breached`.
- **Form 3CD Clause 22 Tax Audit Reports**: Instant generation and CSV export of statutory disclosure schedules for auditors and CAs.
- **Vendor Directory & Declarations**: Vendor Udyam status management with AI-assisted MSME declaration email drafting.
- **Natural Language Assistant**: Context-aware compliance assistant answering queries across tenant payables.

---

## 2. The Vision: Solving "Portal Fatigue" in Enterprise Compliance

### The Limitation of Standalone Portals
While this current web app MVP proves the statutory compliance engine and AI extraction pipeline, **standalone websites often introduce friction for busy accounts payable (AP) teams**:
1. **Double Data Entry**: Accountants already spend their workdays inside ERPs (Tally Prime, Zoho Books, SAP, Busy). Asking them to log into another separate web portal, re-upload invoices, and manage two disconnected systems leads to operational drop-off.
2. **Siloed Awareness**: When compliance alerts live inside an isolated website, deadlines still get missed unless someone actively remembers to open the dashboard.
3. **Vendor Resistance**: Suppliers do not want to register on yet another portal just to confirm their Udyam status.

### The Strategic Goal: From Standalone Portal to Embedded Workflow Mesh
The long-term objective of Nudge is to evolve this standalone MVP into an **invisible, embedded compliance layer** that integrates directly into existing enterprise systems and workflows:

```
+-----------------------------------------------------------------------------------+
|                           CURRENT MVP (Working Today)                             |
|                                                                                   |
|  [React 18 Dashboard] ---> [Node.js + Express API] ---> [Gemini Flash OCR]       |
|  - Manual Uploads          - Deterministic Sec 15/16     - Vendor & Udyam parsing |
|  - Web UI Alerts           - Supabase PostgreSQL (RLS)   - Form 3CD Clause 22 CSV |
+-----------------------------------------------------------------------------------+
                                         |
                                         |  Evolving into
                                         v
+-----------------------------------------------------------------------------------+
|                        FUTURE ROADMAP: EMBEDDED ENGINE                            |
|                                                                                   |
|  [Inbound Pipelines]       [Embedded Actions]            [Outbound Rails]         |
|  - Email Inbox Forwarding  - Two-way ERP sync            - Slack / Teams alerts   |
|  - Cloud Drive Watchers      (Tally, Zoho, SAP)          - WhatsApp CFO reminders |
|  - Headless Webhooks       - Override ERP due dates      - Bank CMS batch files   |
+-----------------------------------------------------------------------------------+
```

---

## 3. Product Roadmap

To eliminate portal fatigue and make compliance zero-friction, Nudge is moving through the following phases:

### Phase 1: Core Statutory Copilot (Current Working MVP - Delivered)
- [x] Multimodal document parsing with Gemini Flash (PDF, JPEG, PNG).
- [x] Deterministic Section 15 payment deadline calculation (15 days / 45-day statutory cap).
- [x] Section 16 compound 3x RBI bank rate interest calculation with monthly rests.
- [x] Tax audit Form 3CD Clause 22 report generation and CSV export.
- [x] Multi-tenant organization isolation with Supabase Row Level Security (RLS).
- [x] Conversational AI compliance assistant (`/assistant`) and AI declaration email generator.

### Phase 2: Inbound Headless Ingestion & Notifications (In Progress / Next)
- [ ] **Headless Email Ingestion**: Dedicated email forwarding address (`invoices@company.nudge.in`). Invoices emailed by vendors to accounts payable are extracted and registered automatically without visiting the web UI.
- [ ] **Proactive Chat Alerts**: Push deadline warnings and breach notices directly into Slack channels (`#finance-ap`) and Microsoft Teams webhooks.
- [ ] **WhatsApp Escalations**: Critical reminders sent via WhatsApp Business API to CFOs and promoters 48 hours before Section 43B(h) tax disallowances take effect.

### Phase 3: Bi-Directional ERP Integrations (Planned)
- [ ] **Tally Prime & Busy Connectors**: Two-way XML/ODBC sync to import purchase vouchers and sync back statutory due dates.
- [ ] **Zoho Books & SAP B1 API Sync**: Automatically validate credit terms against Section 15 caps and override the payment terms in the ERP bill so payment runs cannot accidentally default.
- [ ] **Vendor Self-Service Links**: Lightweight, tokenized 1-click links for vendors to submit Udyam certificates without logging into any portal.

### Phase 4: Banking Rails & Automated Cash Management (Future)
- [ ] **Bank CMS Priority Export**: Generate payment batch files formatted for Indian corporate banking portals (HDFC CMS, ICICI Bulk Pay, Kotak CMS) pre-sorted by statutory deadline urgency to preserve tax deductions.

---

## 4. Statutory Context & Legal Engine

### A. Section 43B(h) of the Income Tax Act, 1961
Enacted via Finance Act 2023, Section 43B(h) mandates that any sum payable by an assessee to a registered **Micro or Small Enterprise** beyond the statutory time limit specified in Section 15 of the MSMED Act, 2006 shall be allowed as a tax deduction **only in the previous year in which such sum is actually paid**.
- **Scope**: Applies strictly to Udyam-registered **Micro** and **Small** enterprises. Medium enterprises and unregistered entities are exempt from 43B(h).
- **Consequence of Default**: Loss of expenditure deduction in the financial year of accrual, significantly inflating taxable business profits.

### B. Section 15 of the MSMED Act, 2006 (Payment Deadlines)
- **No Written Agreement**: Payment must be settled within **15 calendar days** from the day of acceptance (or deemed acceptance).
- **Written Agreement**: Payment must be settled as per the agreed period, but this contractual window is strictly **capped at 45 calendar days** from the day of acceptance. (Contractual credit terms exceeding 45 days are legally overridden by the 45-day cap).

### C. Section 16 & Section 23 of the MSMED Act, 2006 (Penal Interest)
- **Mandatory Penal Interest**: Any buyer failing to pay within the statutory window is liable to pay compound interest with **monthly rests** at **three times (3x) the RBI notified bank rate** from the appointed day (day following the deadline) until actual payment.
- **Section 23 Non-Deductibility**: Interest payable under Section 16 is strictly **non-deductible** as a business expenditure for income tax computation.

---

## 5. Current Architecture & Strict AI Boundary

```
                     +---------------------------------------+
                     |    React 18 + Vite + Tailwind Client  |
                     +---------------------------------------+
                                         |
                                         | HTTPS + Supabase JWT Bearer
                                         v
                     +---------------------------------------+
                     |       Express.js API Gateway          |
                     |  (Helmet, CORS, Rate Limiters, Zod)   |
                     +---------------------------------------+
                                  /            \
           (Server-Side Only)    /              \   (User JWT Context)
                                v                v
     +------------------------------+     +-------------------------------+
     |   Google Gemini Flash        |     |  Supabase PostgreSQL & Auth   |
     | - Document OCR Extraction    |     | - Row Level Security (RLS)    |
     | - Udyam Classification       |     | - Tenant-Isolated DB Tables   |
     | - Declaration Email Drafting |     | - Private Storage Bucket      |
     | - Inbound Reply Parsing      |     +-------------------------------+
     | - Natural-Language Assistant |                    |
     +------------------------------+                    |
                                                         v
                                          +-------------------------------+
                                          | Deterministic Compliance Math |
                                          | - Sec 15 Deadlines (15/45 d)  |
                                          | - Sec 16 Compound 3x Interest |
                                          | - Form 3CD Clause 22 Reports  |
                                          +-------------------------------+
```

> [!IMPORTANT]
> **Deterministic Math Guarantee**: Deadlines and interest figures are **never** calculated or stated by the LLM. Those legal calculations are performed deterministically in backend business logic (`server/src/services/compliance.service.js`) and verified against statutory test cases. The AI's role is restricted to document extraction, classification, and drafting.

---

## 6. Technology Stack

- **Frontend**: React.js 18 (Vite), React Router v6, Tailwind CSS, Lucide Icons, Axios.
- **Backend**: Node.js v24 (ES Modules), Express.js, Helmet, Express-Rate-Limit, Multer, Nodemailer.
- **Database, Auth & Storage**: Supabase PostgreSQL (Postgres with RLS on all 9 tables), Supabase Auth (JWT-based multi-tenant sessions), Supabase Storage (`nudge-documents` private bucket with signed URLs).
- **AI**: Google Gemini Flash (`@google/genai` SDK) called server-side only with prompt-injection defense (`<untrusted_content>` delimiters) and Zod schema validation.
- **Validation**: Zod across all HTTP boundaries and AI response payloads.

---

## 7. Application Routes & Navigation

| Route | Description |
|---|---|
| `/login` | Supabase Auth login with instant demo organization switcher |
| `/register` | Organization tenant onboarding + admin user provisioning |
| `/dashboard` | Live ageing visualizer, Section 43B(h) exposure, and active alerts |
| `/invoices` | Filterable invoice register with deadline badges and payment recording |
| `/invoices/upload` | Drag-and-drop document upload with AI extraction & live deadline preview |
| `/invoices/:id` | Statutory timeline audit, MSMED interest breakdown, and manual field editing |
| `/vendors` | Vendor directory with Udyam classification badges and exposure metrics |
| `/vendors/:id` | Vendor profile, Udyam certificate verification, and AI declaration history |
| `/alerts` | Proactive upcoming deadline alerts and statutory breach notifications |
| `/assistant` | Natural-language query copilot over org-scoped compliance data |
| `/reports/form-3cd` | Tax Audit Form 3CD Clause 22 disclosure report with CSV export |
| `/settings` | Configurable RBI bank rate (default 6.50%), alert lead time, and auto-send policy |
| `/audit-log` | Tamper-evident read-only audit log with metadata JSON inspector |

---

## 8. Getting Started (Setup & Execution)

### Step 1: Database Setup (Supabase)
1. In your Supabase PostgreSQL project, execute the SQL migration script:
   [`supabase/migrations/001_initial_schema.sql`](file:///c:/Users/DELL/Downloads/Nudge/supabase/migrations/001_initial_schema.sql)
2. Create a private Storage bucket named `nudge-documents`.

### Step 2: Backend Configuration & Startup
```powershell
cd server
cp .env.example .env
# Edit server/.env with your SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
npm install
npm run dev
```

### Step 3: Frontend Configuration & Startup
```powershell
cd client
cp .env.example .env
# Edit client/.env with your VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```
Access the client dashboard at `http://localhost:5173`.

---

## 9. Automated Test Suites

Nudge includes automated unit tests covering statutory deadlines, compound interest math, schema validation, and security invariants:

```powershell
cd server
npm test
```

### Verified Test Cases:
1. **Section 15 Deadlines**:
   - Case 1: No written agreement -> Exactly 15 calendar days from acceptance date.
   - Case 2: Written agreement (30 days) -> Honors 30 days.
   - Case 3: Written agreement (45 days) -> Honors 45 days.
   - Case 4: Written agreement (60 days) -> **Strictly capped at statutory max 45 days**.
   - Case 5: Month-end boundary across February in non-leap year.
2. **Section 16 MSMED Compound Interest**:
   - Case 1: Principal ₹100,000, 30 days overdue (1 monthly rest), RBI rate 6.50% (applicable 19.50% p.a.) -> Interest = ₹1,625.00.
   - Case 2: Principal ₹500,000, 60 days overdue (2 monthly rests), RBI rate 6.50% -> Compounded interest = ₹16,382.03.
   - Case 3: Principal ₹200,000, 45 days overdue (1 monthly rest + 15 prorated days), RBI rate 6.75% (applicable 20.25% p.a.) -> Interest = ₹5,067.47.
3. **Security & Boundaries**:
   - Prompt-injection defense: Wrapping untrusted content in `<untrusted_content>` tags and stripping closing delimiters.
   - Unauthenticated 401 rejections across all protected API routes.
   - Signed secret header verification on scheduled background scanner (`/api/jobs/scan-deadlines`).

---

## 10. Security Hardening Checklist

- [x] **Row Level Security (RLS)**: Enforced on all tables with `is_org_member(org_id)`.
- [x] **Zero Frontend Secrets**: Gemini API keys and Supabase service role keys reside server-side only.
- [x] **Rate Limiting**: Express rate limiters protect standard routes and enforce strict quotas on AI endpoints.
- [x] **Prompt-Injection Mitigation**: All untrusted invoice/email text is isolated with strict system prompts.
- [x] **Human Approval Gate**: Outbound declaration request emails require user approval unless explicitly configured in settings.
- [x] **Immutable Audit Trail**: All AI extractions, statutory computations, alerts, and user edits produce tamper-evident `audit_log` entries.
