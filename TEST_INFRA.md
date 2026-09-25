# E2E Test Infra: SerStorm Monorepo

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation internal tricks.
- Derived directly from `ORIGINAL_REQUEST.md` and user-facing specifications.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Tourism Workload Testing.
- Progressive testability: verification checks run against public workspace APIs, exported contracts, and simulated WhatsApp/CRM flows.

## Feature Inventory Coverage Matrix
| # | Feature | Requirement Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|-------------------|:------:|:------:|:------:|:------:|
| 1 | Monorepo Workspace & Type Safety | ORIGINAL_REQUEST §Acceptance Criteria | 5 | 5 | ✓ | ✓ |
| 2 | Shared Domain Contracts & Types | ORIGINAL_REQUEST §R1-R4 | 5 | 5 | ✓ | ✓ |
| 3 | Supabase Schema, Enums & RLS | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 4 | DB Triggers (Override & Message Sync) | ORIGINAL_REQUEST §R1, R3 | 5 | 5 | ✓ | ✓ |
| 5 | Baileys Worker Connection & Auth | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 6 | QR Code Generation API | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 7 | Inbound Message Deduplication | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 8 | Multi-Bubble Burst Debouncer | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 9 | Operator Override (`fromMe`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 10 | Voice Note Audio Transcription | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 11 | Outbound Dispatch REST API | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 12 | Pablo Diz Tourism Brain & Knowledge | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 13 | 4-Tier Tourism Lead Qualification | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 14 | Strategic Marketing Audit Booking | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 15 | Human Handoff Escalation Triggers | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 16 | Modular Brain Prompts & File Loader | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 17 | Next.js 14 CRM Architecture & Layout | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 18 | Real-Time WhatsApp Live Inbox | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 19 | Visual AI / Human Toggle Switch | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 20 | Tourism Pipeline Kanban Board | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 21 | n8n Webhook Automations (Alerts) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 22 | Docker Multi-Service Containerization | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 23 | Hostinger Coolify Deployment Guide | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: `tsx tests/run-tests.ts`
- Pass/Fail semantics: Exit code 0 on all suites passing, non-zero with detailed failure diagnostics.
- Directory layout:
  - `tests/tier1-features/`: Unit and contract checks for all 23 core features.
  - `tests/tier2-boundaries/`: Boundary conditions, empty strings, rapid spam bursts, invalid payloads, timeouts.
  - `tests/tier3-combinations/`: Integration pairwise flows (e.g. burst debouncing + operator override + CRM toggle sync).
  - `tests/tier4-workloads/`: End-to-end simulated B2B tourism prospect conversations (Boutique hotel in Bariloche, Resort in Cancun, Tour operator in Cusco).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| S1 | Boutique Hotel direct booking boost | F8, F9, F12, F13, F14, F17, F18 | High |
| S2 | Large Luxury Resort with high OTA costs | F8, F12, F13, F14, F20 (n8n VIP alert) | High |
| S3 | Operator manual takeover (`fromMe` WhatsApp Web) | F8, F9, F11, F18, F19 | Critical |
| S4 | Frustrated Tour Operator human handoff | F12, F15, F18, F20 (urgent call alert) | Medium |
| S5 | Multi-bubble audio voice-note lead | F8, F10, F12, F13, F14 | High |

## Coverage Thresholds
- Tier 1: ≥ 5 test cases per feature category
- Tier 2: ≥ 5 boundary test cases per feature category
- Tier 3: Pairwise coverage across major cross-service boundaries
- Tier 4: ≥ 5 realistic end-to-end tourism business workloads
- Total minimum test cases: > 100 tests
