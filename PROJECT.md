# Project: SerStorm Conversational AI Agent & CRM Monorepo

## Architecture

SerStorm is a production-grade, multi-service monorepo built for digital marketing agency operations specialized in the Latin American tourism industry. The architecture guarantees high-availability WhatsApp coexistence, an autonomous B2B tourism sales agent equipped with Pablo Diz's 15+ years of domain knowledge, a real-time Next.js 14 CRM panel with AI/Human control switches, and event-driven n8n webhook automations.

```
                              ┌─────────────────────────────────────────┐
                              │            WhatsApp Network             │
                              └────────────────────┬────────────────────┘
                                                   │
                                      WebSocket connection (Baileys v6+)
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ packages/whatsapp-worker (Node.js Service)                                                             │
│  - Session Auth (useMultiFileAuthState persistent volume)                                              │
│  - QR Code generator (Terminal ASCII + Data URI for API /api/status)                                  │
│  - Inbound Message Deduplication (LRU Cache, 15-min TTL)                                               │
│  - Multi-Bubble Burst Debouncer (3.5s sliding window per remoteJid)                                     │
│  - Audio Voice-Note Transcriber (Whisper API / fallback bridge)                                        │
│  - Operator Override Interceptor (m.key.fromMe === true -> AI pause & Supabase toggle)                 │
│  - Outbound Dispatcher (POST /api/send with human-like typing simulation)                              │
└───────────────┬───────────────────────────────┬──────────────────────────────────────────┬─────────────┘
                │ Inbound Burst Payload         │ Raw Message Sync                         │ Outbound
                ▼                               ▼                                          │
┌───────────────────────────────┐ ┌──────────────────────────────────────┐                 │
│ packages/agent-brain          │ │ packages/database (Supabase PG + RLS)│                 │
│  - Pablo Diz Tourism Brain    │ │  - tables: contacts, conversations,  │                 │
│  - 4-Tier Qualification Engine│ │            messages, audits, metrics │                 │
│  - Audit Booking Flow (Cal.com│ │  - real-time publications            │                 │
│  - Human Handoff Triggers     │ │  - triggers: operator override sync  │                 │
│  - Modular Prompt/YAML loader │ └──────────────────┬───────────────────┘                 │
└───────────────┬───────────────┘                    │ Supabase Realtime                   │
                │ Webhook: High-Value / Call Request │ WebSocket Subscriptions             │
                ▼                                    ▼                                     │
┌───────────────────────────────┐ ┌──────────────────────────────────────┐                 │
│ workflows/n8n                 │ │ apps/crm (Next.js 14 App Router)     │                 │
│  - high-value-lead-alert.json │ │  - Live WhatsApp Inbox (Chat Stream) │                 │
│  - human-assistance-call.json │ │  - Visual AI / Human Toggle Switch   ├─────────────────┘
│  - audit-booked-confirm.json  │ │  - Tourism Lead Pipeline Kanban      │  POST /api/send
│  (Slack & WhatsApp alerts)    │ │  - Agent Performance Analytics Dash  │
└───────────────────────────────┘ └──────────────────────────────────────┘
```

---

## Feature Inventory

Every feature surveyed across R1, R2, R3, R4, and the acceptance criteria is cataloged and assigned to a milestone below.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Monorepo Workspace Scaffolding | npm workspaces setup, TypeScript base configs (`tsconfig.base.json`), root build/typecheck scripts | M0 | Survey 1 |
| 2 | Shared Domain Contracts & Types | TypeScript interfaces, Zod schemas, enums for contacts, messages, conversations, and audits | M0 | Survey 1 |
| 3 | Supabase PostgreSQL Schema & Enums | DDL script for 6 tables (`pipeline_stages`, `contacts`, `conversations`, `messages`, `audits`, `agent_metrics`) with 8 custom enums | M0 | Survey 3 |
| 4 | Row Level Security (RLS) Policies | Strict security isolating `anon`, `authenticated` operators, and `service_role` | M0 | Survey 3 |
| 5 | Supabase Realtime & DB Triggers | Publication configuration and triggers (`trg_operator_override`, `trg_sync_conversation_on_message`) | M0 | Survey 3 |
| 6 | Database Migration & Seed Fixtures | Initial migration runner and realistic tourism agency seed data | M0 | Survey 3 |
| 7 | Baileys v6+ Lifecycle & Auth Store | Resilient connection manager with `useMultiFileAuthState`, auto-reconnect backoff, and volume persistence | M1 | Survey 2 |
| 8 | QR Code Pairing Service | Dual QR rendering (terminal ASCII + Base64 PNG API endpoint `GET /api/status`) | M1 | Survey 2 |
| 9 | Inbound Message Deduplication | In-memory LRU cache of `baileys_message_id` with 15-minute TTL preventing message duplicates on reconnection | M1 | Survey 2 |
| 10 | Multi-Bubble Burst Debouncer | Sliding window buffer (3.5s per `remoteJid`) aggregating fragmented incoming texts into unified context | M1 | Survey 2 |
| 11 | Operator Override Interception | Detection of `fromMe === true` from operator device, immediately disabling `ai_enabled` and killing pending buffers | M1 | Survey 2 |
| 12 | Voice Note Media Transcription | Downloading encrypted audio buffers (`downloadMediaMessage`) and transcribing to text via Whisper API bridge | M1 | Survey 2 |
| 13 | Outbound Dispatch REST API | HTTP API (`POST /api/send`) with realistic typing presence simulation (`composing`) and message logging | M1 | Survey 2 |
| 14 | Pablo Diz Domain Knowledge Base | Curated tourism digital marketing brain (FIT/EPTU speaker background, Ladevi case study, OTA reduction strategies) | M2 | Survey 2 |
| 15 | Tourism Agency Service Catalog | Modular structured definitions for Meta/Google Ads, Tourism SEO, Booking Web Design, and AI Concierges | M2 | Survey 2 |
| 16 | 4-Tier Tourism Lead Qualification | Conversational assessment of Entity Type (Hotel/Resort/Agency/Operator), Capacity/Rooms, Monthly Ad Budget, Bottlenecks | M2 | Survey 2 |
| 17 | Strategic Audit Booking Engine | Automated scheduling flow proposing slots, offering booking links, and recording appointments in Supabase | M2 | Survey 2 |
| 18 | Multi-Trigger Human Handoff | Escalation logic for explicit operator requests, enterprise contracts, negative sentiment, or operator takeover | M2 | Survey 2 |
| 19 | Modular & Editable Brain Loader | External Markdown/YAML files (`system_prompt.md`, `agency_profile.json`, `services_catalog.json`) loaded dynamically | M2 | Survey 2 |
| 20 | Next.js 14 CRM Architecture & Shell | App Router layout with navigation sidebar, responsive Tailwind UI, and Supabase SSR integration | M3 | Survey 3 |
| 21 | Real-Time WhatsApp Live Inbox | Split-view conversation list with live message bubble stream, unread badges, and optimistic message delivery | M3 | Survey 3 |
| 22 | Visual AI / Human Coexistence Toggle | Two-way toggle switch updating Supabase `conversations.ai_enabled` and notifying Baileys worker control API | M3 | Survey 3 |
| 23 | Tourism Pipeline Kanban Board | Visual lead board with stages (New, Qualified, Audit Scheduled, Proposal Sent, Won, Lost) and stage updating | M3 | Survey 3 |
| 24 | Lead Profile & Audit Details Inspector| Sidebar view displaying lead metadata, ad budget, entity type, and scheduled audit records | M3 | Survey 3 |
| 25 | Agent Performance & Funnel Analytics | Visual KPI dashboard tracking total conversations, AI qualification rate, audit conversion rate, and response times | M3 | Survey 3 |
| 26 | n8n High-Value Lead Alert Workflow | Importable workflow JSON: triggers on lead qualification (> $1,500/mo) -> Slack `#leads-vip` + WhatsApp to Pablo Diz | M4 | Survey 3 |
| 27 | n8n Human Assistance Call Workflow | Importable workflow JSON: triggers on human handoff -> immediate multi-channel alert to human team | M4 | Survey 3 |
| 28 | n8n Audit Booking Sync Workflow | Importable workflow JSON: triggers on audit booking -> calendar sync & client confirmation notification | M4 | Survey 3 |
| 29 | Multi-Container Production Dockerfiles| Multi-stage Dockerfiles for Next.js CRM (`apps/crm`) and Baileys worker (`packages/whatsapp-worker` with ffmpeg) | M4 | Survey 1,3 |
| 30 | Production `docker-compose.yml` | Full service stack with volume persistence for auth state, network bridge, and healthchecks | M4 | Survey 1,3 |
| 31 | Environment Configuration Templates | Comprehensive `.env.example` documenting all Supabase, OpenAI, Baileys, and webhook variables | M4 | Survey 1,3 |
| 32 | Hostinger VPS Coolify Deployment Guide| Production guide covering Ubuntu 22.04 LTS setup, Docker rootless, Coolify project config, and Traefik SSL | M4 | Survey 1,3 |
| 33 | Monorepo Typecheck & Build Pipeline | Root `npm run typecheck` and `npm run build` validating all workspaces with zero TypeScript errors | M5 | AC 1 |
| 34 | E2E Testing Suite (Tiers 1-4) | Comprehensive test suite covering feature tests, boundaries, cross-feature flows, and real-world tourism scenarios | M5 | AC 2-4 |
| 35 | Adversarial Hardening (Tier 5) | Challenger stress testing: rapid message bursts, malformed payloads, concurrent operator overrides, session drops | M5 | Robustness |
| 36 | Forensic Integrity Audit | Systematic checks ensuring genuine Baileys, LangChain, and Supabase implementations without facade mocking | M5 | Audit |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Foundation & Shared Database | Root workspace scaffolding, TypeScript base configs, shared types (`packages/shared`), Supabase SQL migrations, RLS, and seed data (`packages/database`) | none | PLANNED |
| M1 | WhatsApp Gateway Worker | Direct Baileys v6+ Node.js worker, auth persistence, QR code API, burst debouncer (3.5s), deduplication, operator override detection (`fromMe`), audio transcription bridge, outbound REST API (`packages/whatsapp-worker`) | M0 | PLANNED |
| M2 | Conversational B2B Tourism Brain | Pablo Diz 15+ years agency knowledge base, tourism qualification flow (hotel/agency/operator, ad budget, bottlenecks), free marketing audit scheduling, human handoff, modular editable brain files (`packages/agent-brain`) | M0 | PLANNED |
| M3 | CRM Panel & Real-Time Inbox | Next.js 14 App Router dashboard with Tailwind CSS, Supabase SSR & Realtime subscriptions, live chat stream, visual AI/Human toggle, lead Kanban board, audit details inspector, agent metrics (`apps/crm`) | M0, M1, M2 | PLANNED |
| M4 | n8n Workflows & Production Packaging | 3 importable n8n workflow definitions (high-value lead alert, human call request, audit booking confirmation), production Dockerfiles, `docker-compose.yml`, `.env.example`, and Hostinger Coolify deployment guide (`workflows/n8n`, `deploy/`) | M0, M1, M2, M3 | PLANNED |
| M5 | E2E Verification, Adversarial Hardening & Forensic Audit | Monorepo typecheck validation, 4-tier E2E testing suite, Challenger stress tests, Forensic Auditor integrity verification, final victory claim | M0, M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### 1. `packages/shared` ↔ All Workspaces
Exported TypeScript interfaces and enums:
```typescript
export type LeadStage = 'new' | 'qualified' | 'audit_scheduled' | 'proposal_sent' | 'won' | 'lost';
export type EntityType = 'boutique_hotel' | 'resort' | 'travel_agency' | 'tour_operator' | 'other';
export type AdBudgetRange = 'under_500' | '500_1500' | '1500_5000' | 'over_5000';
export type MessageSender = 'lead' | 'ai' | 'operator' | 'system';

export interface Contact {
  id: string;
  phone_number: string;
  name?: string;
  entity_type?: EntityType;
  entity_name?: string;
  monthly_ad_budget?: AdBudgetRange;
  primary_bottleneck?: string;
  stage: LeadStage;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  channel: 'whatsapp';
  remote_jid: string;
  ai_enabled: boolean;
  unread_count: number;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  content: string;
  media_type?: 'text' | 'audio' | 'image' | 'document';
  media_url?: string;
  baileys_message_id?: string;
  created_at: string;
}
```

### 2. `packages/whatsapp-worker` ↔ `packages/agent-brain`
- **Inbound Debounced Burst**:
  When a burst settles (3.5s silence), the worker invokes the agent brain:
  ```typescript
  export interface InboundBurstPayload {
    conversationId: string;
    contactPhone: string;
    contactName?: string;
    messages: Array<{
      content: string;
      mediaType: 'text' | 'audio';
      timestamp: number;
    }>;
  }
  
  export interface AgentBrainResponse {
    replyText?: string;
    action?: 'none' | 'schedule_audit' | 'request_human_handoff' | 'qualify_lead';
    leadData?: Partial<Contact>;
    auditData?: {
      preferredDate?: string;
      notes?: string;
    };
  }
  ```

### 3. `apps/crm` ↔ `packages/whatsapp-worker`
- **Outbound Manual Message (`POST /api/send`)**:
  Request: `{ remoteJid: string, text: string }`
  Response: `{ success: boolean, messageId: string }`
- **AI Control Toggle (`POST /api/control/toggle-ai`)**:
  Request: `{ remoteJid: string, aiEnabled: boolean }`
  Response: `{ success: boolean, aiEnabled: boolean }`
- **Status & QR Endpoint (`GET /api/status`)**:
  Response: `{ status: 'connected' | 'qr_ready' | 'disconnected', qrCodeDataUrl?: string }`

### 4. `packages/agent-brain` ↔ `workflows/n8n`
- **High-Value Lead Webhook (`POST /webhook/serstorm-high-value-lead`)**:
  Payload: `{ contactId: string, name: string, phone: string, entityType: string, budget: string, bottleneck: string }`
- **Human Assistance Webhook (`POST /webhook/serstorm-human-call`)**:
  Payload: `{ conversationId: string, contactPhone: string, reason: string, summary: string }`
- **Audit Booking Webhook (`POST /webhook/serstorm-audit-booked`)**:
  Payload: `{ contactId: string, phone: string, email?: string, scheduledAt: string, auditNotes: string }`

---

## Code Layout

```
SERSTORM-AG/
├── package.json                         # Monorepo root workspace configuration
├── tsconfig.base.json                   # Shared TypeScript compiler options
├── .gitignore                           # Git ignore rules
├── ORIGINAL_REQUEST.md                  # Authoritative user requirements
├── PROJECT.md                           # Master specification and milestone index
├── TEST_INFRA.md                        # E2E test suite blueprint
│
├── packages/
│   ├── shared/                          # Domain contracts, interfaces, and schemas
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts                 # Contact, Conversation, Message, Audit interfaces
│   │       └── contracts.ts             # REST API & Webhook payload schemas
│   │
│   ├── database/                        # Supabase PostgreSQL schema, migrations, RLS
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql   # DDL for tables, enums, triggers, and RLS policies
│   │   ├── seed/
│   │   │   └── seed_data.sql            # Realistic tourism agency demo data
│   │   └── src/
│   │       ├── index.ts                 # Database client helpers and Supabase admin
│   │       └── schema.ts                # TypeScript table types generated from schema
│   │
│   ├── whatsapp-worker/                 # Resilient Baileys v6+ WhatsApp Gateway
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                 # Service entry point & HTTP control server
│   │       ├── connection.ts            # Baileys socket lifecycle & auth persistence
│   │       ├── qr.ts                    # Terminal ASCII & Data URI QR generators
│   │       ├── deduplication.ts         # In-memory LRU message deduplicator
│   │       ├── debouncer.ts             # 3.5s multi-bubble burst buffering manager
│   │       ├── override.ts              # Operator fromMe interception logic
│   │       ├── media.ts                 # Audio media download & Whisper transcription
│   │       └── outbound.ts              # Outbound message sender with typing presence
│   │
│   └── agent-brain/                     # Conversational B2B Tourism AI Engine
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                 # Brain engine entry point
│           ├── engine.ts                # Dialogue processing & LangChain / LLM pipeline
│           ├── qualification.ts         # 4-tier tourism lead qualification state machine
│           ├── audit.ts                 # Free marketing audit booking logic
│           ├── handoff.ts               # Multi-trigger human handoff controller
│           ├── loader.ts                # Modular prompt & knowledge loader
│           ├── prompts/
│           │   └── system_prompt.md     # Production SerStorm system prompt
│           ├── knowledge/
│           │   ├── agency_profile.json  # Pablo Diz 15+ years experience & credentials
│           │   └── services_catalog.json# Meta/Google Ads, SEO, Web, Chatbots catalog
│           └── flows/
│               └── qualification.yaml   # Declarative qualification questions & criteria
│
├── apps/
│   └── crm/                             # Next.js 14 App Router CRM Dashboard
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       ├── next.config.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx           # Global shell with navigation sidebar
│       │   │   ├── page.tsx             # Overview KPI metrics & quick actions
│       │   │   ├── inbox/
│       │   │   │   └── page.tsx         # Live WhatsApp inbox with chat & AI toggle
│       │   │   ├── pipeline/
│       │   │   │   └── page.tsx         # Tourism lead pipeline Kanban board
│       │   │   ├── audits/
│       │   │   │   └── page.tsx         # Scheduled marketing audits calendar/list
│       │   │   └── settings/
│       │   │       └── page.tsx         # WhatsApp QR pairing & system status
│       │   ├── components/
│       │   │   ├── ChatStream.tsx       # Live chat bubble view with auto-scroll
│       │   │   ├── AiToggleSwitch.tsx   # Instant visual AI/Human toggle
│       │   │   ├── KanbanBoard.tsx      # Lead stages drag/stage update columns
│       │   │   ├── LeadDrawer.tsx       # Lead profile & audit inspector sidebar
│       │   │   └── QrDisplay.tsx        # Dynamic Baileys QR code pairing display
│       │   └── lib/
│       │       ├── supabase.ts          # Supabase browser & server clients
│       │       └── api.ts               # Worker REST API client
│
├── workflows/
│   └── n8n/                             # Production-ready importable n8n workflows
│       ├── high-value-lead-alert.json   # Leads > $1,500/mo -> Slack/WhatsApp alert
│       ├── human-assistance-call.json   # Urgent human handoff broadcast
│       └── audit-booked-confirm.json    # Audit booking confirmation & calendar sync
│
├── deploy/                              # Containerization & VPS Deployment
│   ├── Dockerfile.worker                # Multi-stage Baileys worker with ffmpeg
│   ├── Dockerfile.crm                   # Next.js standalone production build
│   ├── docker-compose.yml               # Service orchestration with persistent volumes
│   ├── .env.example                     # Comprehensive environment variable template
│   └── COOLIFY_HOSTINGER_GUIDE.md       # Step-by-step Coolify deployment documentation
│
└── tests/                               # Comprehensive E2E Test Suite (Tiers 1-4)
    ├── tier1-features/                  # Feature coverage tests
    ├── tier2-boundaries/                # Corner cases & input boundary tests
    ├── tier3-combinations/              # Cross-module interaction tests
    ├── tier4-workloads/                 # Real-world tourism agency simulation
    └── run-tests.ts                     # Automated test runner
```
