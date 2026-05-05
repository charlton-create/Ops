# CAT-I OPS

Internal operations and CRM platform for CAT-I.AI — a food safety and manufacturing compliance SaaS company.

## Architecture

```
                    ┌──────────────────────────────────┐
                    │        https://ops.cat-i.ai       │
                    └───────────────┬──────────────────┘
                                    │
                    ┌───────────────▼──────────────────┐
                    │         AWS CloudFront            │
                    │        (CDN + Router)             │
                    │   Distribution: EA4SSM9VZLTKF     │
                    └──────┬─────────────────┬─────────┘
                           │                 │
                      /*   │                 │  /api/*
                           │                 │
              ┌────────────▼───┐    ┌────────▼──────────┐
              │  S3 Bucket     │    │  ALB               │
              │  (Angular SPA) │    │  cat-i-ops-alb     │
              │  cat-i-ops-    │    └────────┬───────────┘
              │  frontend      │             │
              └────────────────┘    ┌────────▼───────────┐
                                    │  ECS Fargate       │
                                    │  (Next.js API)     │
                                    │  0.25 vCPU / 512MB │
                                    └────────┬───────────┘
                                             │
                                    ┌────────▼───────────┐
                                    │  RDS PostgreSQL    │
                                    │  db.t4g.micro      │
                                    │  cat-i-ops-db      │
                                    └────────────────────┘
```

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | Angular 17 | Standalone components, signals, Tailwind CSS |
| **Backend** | Next.js 16 (API Routes) | JWT auth, role-based permissions |
| **ORM** | Prisma 7 | 19 models, PostgreSQL adapter |
| **Database** | PostgreSQL 16 | RDS db.t4g.micro, 20GB |
| **Auth** | JWT (jose) | HS256, 7-day expiry, 4 roles |
| **CDN** | CloudFront | S3 origin (SPA) + ALB origin (/api) |
| **Compute** | ECS Fargate | Docker container, standalone Next.js |
| **CI/CD** | GitHub Actions | Lint/build on PR, manual deploy workflow |

## Repository Structure

```
cat-i-ops/
├── frontend/                          # Angular 17 SPA
│   ├── src/app/
│   │   ├── core/
│   │   │   ├── models/index.ts        # 19 TypeScript interfaces
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts     # HTTP client → backend API
│   │   │   │   ├── auth.service.ts    # JWT login/logout
│   │   │   │   └── auth.interceptor.ts
│   │   │   ├── guards/auth.guard.ts
│   │   │   └── constants/seed.data.ts # Static reference constants only
│   │   ├── features/
│   │   │   ├── dashboard/             # KPI overview, activity feed
│   │   │   ├── pipeline/              # Kanban board, lead detail panel
│   │   │   ├── leads/                 # Lead table, CRUD, contact logging
│   │   │   ├── web-leads/             # Demo requests from website
│   │   │   ├── customers/             # Accounts, Zoho invoices
│   │   │   ├── projects/              # Project cards, task management
│   │   │   ├── calendar/              # Events, scheduling
│   │   │   ├── team/                  # Directory, messaging
│   │   │   ├── kb/                    # Knowledge base documents
│   │   │   ├── content/               # Content pipeline, campaigns
│   │   │   ├── intake/                # Customer intake, MES interview
│   │   │   ├── admin/                 # User management, roles, settings
│   │   │   └── login/                 # Login page
│   │   ├── layout/
│   │   │   ├── sidebar.component.ts   # Navigation, user info, logout
│   │   │   └── header.component.ts    # Reusable page header
│   │   └── shared/                    # Icons, filter-bar, detail-panel
│   ├── src/environments/
│   │   ├── environment.ts             # Dev: localhost:3000
│   │   └── environment.prod.ts        # Prod: ops.cat-i.ai
│   ├── angular.json
│   ├── proxy.conf.json                # Dev proxy /api → localhost:3000
│   └── package.json
│
├── backend/                           # Next.js API Server
│   ├── src/app/api/
│   │   ├── auth/login/route.ts        # POST: JWT login
│   │   ├── users/route.ts             # GET/POST: user management
│   │   ├── users/[id]/route.ts        # PATCH/DELETE: user CRUD
│   │   ├── team/route.ts              # GET: team members
│   │   ├── leads/route.ts             # GET/POST: leads
│   │   ├── leads/[id]/route.ts        # PATCH/DELETE: lead CRUD
│   │   ├── leads/[id]/move-stage/     # POST: pipeline stage change
│   │   ├── customers/route.ts         # GET: customers
│   │   ├── customers/[id]/route.ts    # PATCH: customer update
│   │   ├── customers/[id]/invoices/   # POST: create invoice
│   │   ├── customers/[id]/invoices/[invId]/pay/  # POST: mark paid
│   │   ├── projects/route.ts          # GET/POST: projects
│   │   ├── projects/[id]/route.ts     # PATCH/DELETE
│   │   ├── projects/[id]/tasks/[idx]/ # PATCH: toggle task
│   │   ├── activities/route.ts        # GET/POST: activity log
│   │   ├── messages/route.ts          # GET/POST: team messages
│   │   ├── calendar/route.ts          # GET/POST: events
│   │   ├── calendar/[id]/route.ts     # PATCH/DELETE
│   │   ├── kb/route.ts               # GET/POST: documents
│   │   ├── kb/[id]/route.ts          # PATCH/DELETE
│   │   ├── demos/route.ts            # GET/POST: demo requests
│   │   ├── demos/[id]/route.ts       # PATCH
│   │   ├── content/route.ts          # GET/POST: content pieces
│   │   ├── content/[id]/route.ts     # PATCH/DELETE
│   │   ├── campaigns/route.ts        # GET/POST: email campaigns
│   │   ├── dashboard/stats/route.ts  # GET: aggregated KPIs
│   │   ├── intake-submissions/       # GET/POST: intake forms
│   │   ├── mes/interviews/           # GET/POST: MES interviews
│   │   └── webhooks/demo-form/       # POST: public webhook
│   ├── src/lib/
│   │   ├── auth/
│   │   │   ├── api.ts                # JWT verification middleware
│   │   │   └── types.ts              # Roles, permissions (23 perms)
│   │   └── db/index.ts               # Prisma client singleton
│   ├── prisma/
│   │   ├── schema.prisma             # 19 models
│   │   ├── migrations/               # 3 migrations
│   │   └── seed.ts                   # Seed data from Angular constants
│   ├── Dockerfile                    # Multi-stage, standalone output
│   ├── docker-compose.yml            # Local PostgreSQL (port 5434)
│   ├── next.config.ts                # Standalone + CORS headers
│   └── package.json
│
├── .github/workflows/
│   ├── ci.yml                        # Lint, typecheck, build, Docker
│   └── deploy.yml                    # ECR push, migrate, ECS deploy
│
├── docker-compose.yml                # Root shortcut for DB
├── .env.example                      # Environment template
└── README.md
```

## Database Schema (19 Tables)

| Table | Records | Description |
|-------|---------|-------------|
| `team_members` | 9 | Staff directory (name, role, color, timezone) |
| `app_users` | 9 | Auth accounts (email, bcrypt password, role) |
| `leads` | 9 | Sales pipeline deals with stage, value, probability |
| `deal_expansions` | — | Module add-on tracking per lead |
| `customers` | 1 | Converted leads with contracts |
| `zoho_invoices` | 2 | Invoices linked to customers |
| `projects` | 4 | Projects with status, type, progress |
| `project_tasks` | 19 | Task checklists per project |
| `activities` | 16+ | Audit log (who did what, when) |
| `messages` | 6 | Team member conversations |
| `calendar_events` | 10 | Meetings, reminders, deadlines |
| `kb_documents` | 11 | Playbooks, documents, templates |
| `demo_requests` | 6 | Website form submissions |
| `content_pieces` | 6 | Blog posts, videos, newsletters |
| `email_campaigns` | 2 | Marketing campaigns |
| `intake_submissions` | 1 | Customer intake form responses |
| `mes_interviews` | 1 | MES discovery interviews |
| `mes_config` | — | MES section/module config (JSONB) |
| `email_templates` | — | HTML email templates |

## Authentication

**JWT-based auth** with 4 roles and 23 granular permissions.

| Role | Users | Permissions |
|------|-------|-------------|
| `admin` | Aisha, Suresh | Full access (23/23) |
| `manager` | Artem, Charlton, Tiffini | Edit + publish (17/23) |
| `user` | David, Igor, Ahilan, Yael | Standard access (13/23) |
| `viewer` | — | Read-only (7/23) |

**Login flow:**
```
POST /api/auth/login { email, password }
  → bcrypt verify against app_users table
  → Return JWT (HS256, 7-day expiry) + user object
  → Angular stores token in localStorage
  → Auth interceptor attaches Bearer token to all /api/* requests
  → Backend validates JWT on every route via requireAuth()
```

## Local Development

### Prerequisites
- Node.js 22+
- Docker (for PostgreSQL)

### Setup

```bash
# 1. Clone and checkout
git clone git@github.com:CAT-I-AI/cat-i-ops.git
cd cat-i-ops
git checkout angular-api-clean

# 2. Start database
docker compose up -d          # PostgreSQL on port 5434

# 3. Backend
cd backend
npm install
cp ../.env.example .env       # Edit DATABASE_URL if needed
npx prisma generate
npx prisma migrate dev
npx prisma db seed            # Seeds 69 records
npm run dev                   # API on http://localhost:3000

# 4. Frontend (new terminal)
cd frontend
npm install
ng serve --port 4201          # SPA on http://localhost:4201
                              # Proxy: /api → localhost:3000
```

### Login
Any team member email with password `catops2026`:
- `suresh@cat-i.ai` (admin)
- `aisha@cat-i.ai` (admin)
- `david@cat-i.ai` (user)
- `charlton@cat-i.ai` (manager)

## AWS Deployment

### Resources

| Resource | Service | ID/Name | Region |
|----------|---------|---------|--------|
| **Frontend** | S3 | `cat-i-ops-frontend` | us-west-2 |
| **CDN** | CloudFront | `EA4SSM9VZLTKF` | Global |
| **API** | ECS Fargate | Cluster: `cat-i-ops`, Service: `api` | us-west-2 |
| **Database** | RDS PostgreSQL | `cat-i-ops-db` (db.t4g.micro) | us-west-2 |
| **Load Balancer** | ALB | `cat-i-ops-alb` | us-west-2 |
| **Container Registry** | ECR | `cat-i-ops` | us-west-2 |
| **SSL (ALB)** | ACM | `52f3de8c-...` | us-west-2 |
| **SSL (CloudFront)** | ACM | `2e585578-...` | us-east-1 |
| **Secrets** | SSM Parameter Store | `/cat-i-ops/*` | us-west-2 |
| **Logs** | CloudWatch | `/ecs/cat-i-ops` | us-west-2 |
| **Security** | Security Group | `sg-0c9a890caa99b0e30` | us-west-2 |
| **DNS** | GoDaddy | `ops.cat-i.ai` → CloudFront | External |

### SSM Parameters

```
/cat-i-ops/DATABASE_URL     # PostgreSQL connection string (sslmode=no-verify)
/cat-i-ops/AUTH_SECRET       # JWT signing secret (HS256)
/cat-i-ops/AUTH_URL          # https://ops.cat-i.ai
```

### Deploy Backend (API)

```bash
cd backend

# Build and push Docker image
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 240947437542.dkr.ecr.us-west-2.amazonaws.com
docker build --platform linux/amd64 -t 240947437542.dkr.ecr.us-west-2.amazonaws.com/cat-i-ops:latest .
docker push 240947437542.dkr.ecr.us-west-2.amazonaws.com/cat-i-ops:latest

# Run migrations (requires temp SG rule for your IP)
export DATABASE_URL="postgresql://catops:<PASSWORD>@cat-i-ops-db.cdm248q64fo7.us-west-2.rds.amazonaws.com:5432/catops?sslmode=no-verify"
npx prisma migrate deploy

# Deploy to ECS
aws ecs update-service --cluster cat-i-ops --service api --force-new-deployment --region us-west-2
```

### Deploy Frontend (Angular)

```bash
cd frontend

# Build for production
ng build --configuration production

# Upload to S3
aws s3 sync dist/cat-i-ops/browser/ s3://cat-i-ops-frontend/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id EA4SSM9VZLTKF --paths "/*"
```

### Estimated Monthly Cost

| Service | Cost |
|---------|------|
| ECS Fargate (0.25 vCPU, 512MB) | ~$9 |
| RDS db.t4g.micro (single AZ) | ~$13 |
| ALB | ~$16 |
| CloudFront + S3 | ~$3 |
| NAT Gateway | ~$3 |
| **Total** | **~$44/month** |

## Modules

| Module | Features |
|--------|----------|
| **Dashboard** | KPI cards (4 role-based views), activity feed, team status, business model canvas |
| **Pipeline** | Kanban board with drag-drop, lead detail panel, stage probability, SLA tracking |
| **Leads** | Data table, CRUD, contact logging, notes, file attachments, card scanning |
| **Web Leads** | Demo request management, assign/schedule/convert/decline workflow |
| **Customers** | Account management, Zoho invoice creation, payment tracking |
| **Projects** | Card grid, task checklists, progress tracking, templates |
| **Calendar** | Mini calendar, event CRUD, reminders, Google sync (placeholder) |
| **Team Hub** | Directory with timezone/status, real-time messaging |
| **Knowledge Base** | Documents/playbooks/templates, category tiles, search, share |
| **Content** | Content pipeline (kanban + list), scheduling, platform targeting |
| **Campaigns** | Email campaigns, audience targeting, send tracking |
| **MES Intake** | 7 industry modules, 10-section interview, timer, export, admin config |
| **Customer Intake** | 4-step wizard, converts to lead + intake submission |
| **Admin** | User CRUD, role/permission matrix, integrations panel |
