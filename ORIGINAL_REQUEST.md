# Original User Request

## 2026-09-25T14:17:21Z

Build a production-ready conversational AI agent and CRM monorepo for SerStorm (digital marketing agency specialized in the tourism industry, https://serstorm.com/), featuring native WhatsApp coexistence (direct Baileys worker, no Evolution API), a Next.js 14 CRM panel, Supabase database, and n8n webhook automations, deployable to Hostinger VPS via Coolify. The system must be modular and easily editable for future adjustments.

Working directory: c:\Users\gkar2\Desktop\SERSTORM-AG
Integrity mode: development

## Requirements

### R1. WhatsApp Gateway & Multi-Device Coexistence (Baileys)
A resilient Node.js worker running `@whiskeysockets/baileys` directly (without Evolution API) supporting linked device QR pairing, message deduplication, debouncing for multi-bubble client bursts, audio voice-note transcription, human operator override detection (`fromMe`), and outbound message dispatching.

### R2. Conversational B2B Tourism Agent & Knowledge Brain
An AI agent engine equipped with the complete SerStorm agency brain (Pablo Diz's 15+ years experience, services: Meta/Google Ads, SEO, web design, hotel chatbots), capable of conversational qualification of tourism leads (hotel/agency/operator, ad budget, main bottlenecks) and automated scheduling of free marketing audits, with seamless handoff to human advisors. Prompts and brain files must be clean, modular, and editable at any time.

### R3. CRM Panel & Database Architecture
A Next.js 14 (App Router + Tailwind CSS) CRM dashboard backed by Supabase (PostgreSQL with RLS), providing real-time inbox management, visual toggle for AI/Human control, pipeline Kanban for tourism leads, conversation history, and agent performance metrics.

### R4. n8n Automation Workflows & Production Packaging
Ready-to-import n8n workflow definitions for external alert routing (Slack/WhatsApp notifications when high-value leads are qualified or request calls) and complete containerization (`Dockerfile`, `docker-compose.yml`, environment templates, and Coolify deployment documentation).

## Acceptance Criteria

### Core Functionality & Type Safety
- [ ] Monorepo passes typecheck (`npm run typecheck` or workspace build) without TypeScript errors.
- [ ] Baileys worker connects, handles QR generation, processes incoming messages, and enforces debounce without duplicate replies.
- [ ] System prompt correctly adheres to SerStorm business rules, never hallucinating false guarantees and actively directing qualified tourism inquiries to the audit booking flow.
- [ ] CRM panel renders conversations in real time, toggles `ai_enabled` per conversation, and updates lead pipeline stages.
- [ ] Docker configuration builds cleanly and runs under Coolify/Docker environments.
- [ ] Clean documentation explaining how to adjust prompts, add team members, and configure environment variables.
