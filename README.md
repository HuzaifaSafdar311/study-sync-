# StudySync AI — Complete System Architecture & Technical Specification

> **Target Audience**: AI Agents (Claude, Gemini, GPT-4), Systems Engineers, and Full-Stack Developers.
> **Scope**: Exhaustive technical documentation covering data flow, AI agent orchestration, vector RAG engine, background queues, WhatsApp multi-device integration, REST API specification, and deployment topology.

---

## Table of Contents

1. [System Identity & Vision](#1-system-identity--vision)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Repository Topology & Monorepo Structure](#3-repository-topology--monorepo-structure)
4. [Data Models & Persistence Strategy](#4-data-models--persistence-strategy)
   - [Relational Database Schema (Prisma)](#relational-database-schema-prisma)
   - [Dual-Layer Persistence & Disk Fallback](#dual-layer-persistence--disk-fallback)
5. [Core Subsystems & Technical Deep Dive](#5-core-subsystems--technical-deep-dive)
   - [5.1 Voice-First Multilingual Task Capture](#51-voice-first-multilingual-task-capture)
   - [5.2 Autonomous Academic Study Agent (`agent.service.ts`)](#52-autonomous-academic-study-agent-agentservicets)
   - [5.3 Interactive Chat Widget Subsystem](#53-interactive-chat-widget-subsystem)
   - [5.4 Course Workspace & FAISS Vector RAG Engine](#54-course-workspace--faiss-vector-rag-engine)
   - [5.5 WhatsApp Multi-Device Study Assistant (Baileys)](#55-whatsapp-multi-device-study-assistant-baileys)
   - [5.6 Notification Engine & Daily Task Digest](#56-notification-engine--daily-task-digest)
   - [5.7 Academic Document Tools Hub](#57-academic-document-tools-hub)
   - [5.8 Authentication, BYOK Encryption & Admin Operations](#58-authentication-byok-encryption--admin-operations)
6. [Exhaustive REST API Reference](#6-exhaustive-rest-api-reference)
7. [Frontend Architecture & Component Guide](#7-frontend-architecture--component-guide)
8. [Environment Variables Matrix](#8-environment-variables-matrix)
9. [Development, Docker & Deployment Guide](#9-development-docker--deployment-guide)
10. [Resilience Patterns & Edge Case Handling](#10-resilience-patterns--edge-case-handling)

---

## 1. System Identity & Vision

**StudySync AI** is an intelligent academic task, deadline, and study management ecosystem built for university students. 

Traditional productivity tools fail students because of high manual entry friction, disconnected lecture materials, and robotic notifications. StudySync AI bridges these gaps by combining:
1. **Multilingual Voice-First Capture**: Speak naturally in English, Urdu, or Roman Urdu to create structured tasks with AI-calculated deadlines.
2. **Autonomous Course-Grounded Copilot**: An interactive AI agent that has access to lecture slides, a FAISS vector index, file creation tools, live web search, and rich interactive chat widgets.
3. **WhatsApp Multi-Device Study Companion**: An integrated WhatsApp bot providing continuous mobile interaction without requiring app installation.
4. **Intelligent Notification Loops**: Automated deadline alerts and empathetic, conversational daily pending task digests powered by Gemini.
5. **Academic Utilities**: Document conversion (DOCX/PPTX to PDF via headless LibreOffice), compression (Ghostscript), and perspective-corrected document scanning (HTML5 Canvas CamScanner).

---

## 2. High-Level Architecture

The platform follows a modular client-server architecture with background workers and external binary execution:

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client (React 19 + Vite)"]
        UI["Web App (Vite + React Router v7)"]
        Widgets["Interactive UI Widgets (KaTeX, Mermaid, Charts)"]
        CamScan["Client CamScanner (HTML5 Canvas + jsPDF)"]
    end

    subgraph APILayer["API Gateway & Controllers (Express 5 / Node.js)"]
        Server["Express HTTP Server / Vercel Serverless Function"]
        AuthGuard["JWT Rotation & Argon2id Auth Guard"]
        RateLimiter["Redis Distributed Rate Limiter"]
    end

    subgraph ServiceLayer["Core Application Modules"]
        TaskEngine["Tasks & Calendar Module"]
        VoiceEngine["Voice Capture (Groq Whisper STT)"]
        AgentEngine["Autonomous Study Agent (Gemini Function Calling)"]
        CourseRAG["Course Workspaces & Document Ingestion"]
        ToolsEngine["Document Converter & Compressor Workers"]
        WhatsAppModule["WhatsApp Baileys Multi-Device Service"]
        NotificationModule["Deadline Reminders & Daily Digest Engine"]
        AdminModule["Superadmin Portal & Usage Analytics"]
    end

    subgraph PersistenceLayer["Data & Search Infrastructure"]
        PostgreSQL[("PostgreSQL 16 via Prisma ORM")]
        SupabaseFallback[("Supabase Direct HTTP Client")]
        DiskFallback[("Local JSON Fallback Store")]
        RedisQueue[("Redis 7 + BullMQ Job Queue")]
        FAISSEngine[("FAISS Python Engine (768-dim IndexFlatIP)")]
        StorageBinaries["LibreOffice (soffice) & Ghostscript (gs)"]
    end

    UI -->|REST API with Axios & Auto-Refresh| Server
    Server --> AuthGuard
    AuthGuard --> RateLimiter
    RateLimiter --> ServiceLayer

    TaskEngine --> PostgreSQL
    CourseRAG --> FAISSEngine
    CourseRAG --> PostgreSQL
    VoiceEngine --> AgentEngine
    AgentEngine --> CourseRAG
    ToolsEngine --> StorageBinaries
    ToolsEngine --> RedisQueue
    NotificationModule --> RedisQueue
    NotificationModule --> PostgreSQL
    WhatsAppModule --> PostgreSQL
    WhatsAppModule --> CourseRAG

    PostgreSQL -.->|Fallback if DB unlinked| SupabaseFallback
    SupabaseFallback -.->|Fallback if offline| DiskFallback
```

---

## 3. Repository Topology & Monorepo Structure

```
studysync/
├── api/
│   └── index.ts                 # Vercel Serverless Function entrypoint wrapping Express app
├── backend/
│   ├── Dockerfile               # Container definition for backend server + binaries
│   ├── package.json             # Backend dependencies (Express 5, Prisma 7, Baileys, BullMQ)
│   ├── tsconfig.json            # Node/CommonJS compilation configuration
│   ├── prisma/
│   │   └── schema.prisma        # Canonical relational data models and enums
│   └── src/
│       ├── server.ts            # Server bootstrap, middleware, error handlers, socket traps
│       ├── config/              # Central configuration, Redis ping, DB client, plans
│       │   ├── database.ts      # Prisma client with resilience wrapper & JSON fallback
│       │   ├── index.ts         # Environment variable schema and validator
│       │   ├── plans.ts         # SaaS subscription plan definitions and limits
│       │   ├── redis.ts         # Redis connection pool and health checks
│       │   ├── supabase.ts      # Supabase client instantiation
│       │   └── supabaseRepo.ts  # Direct REST repository for Supabase database access
│       ├── middleware/          # Express middleware
│       │   ├── auth.middleware.ts    # JWT verification, refresh rotation, role guards
│       │   ├── errorHandler.ts       # Global centralized error handler
│       │   ├── rateLimiter.ts        # Redis-backed & in-memory sliding window limiters
│       │   └── validation.ts         # Zod request payload validation schemas
│       ├── modules/             # Domain-driven functional modules
│       │   ├── admin/           # Admin authentication, user management, telemetry
│       │   ├── ai/              # Groq & Gemini clients, tool definitions, agent service
│       │   │   ├── agent.service.ts       # Core autonomous agent with function calling
│       │   │   ├── ai.service.ts          # STT, intent classification, task extraction
│       │   │   ├── keyResolver.ts         # User BYOK key resolution & decryption
│       │   │   ├── systemQuota.service.ts # Token & daily request quota enforcement
│       │   │   └── tools/                 # Agent function tools (file, web, memory, widget)
│       │   ├── auth/            # Register, OTP verify, login, password reset, BYOK keys
│       │   ├── courses/         # Course workspaces, document upload & parser
│       │   ├── notifications/   # BullMQ queues, Nodemailer service, standalone worker
│       │   ├── tasks/           # Task CRUD, dynamic priority, calendar views
│       │   ├── tools/           # File conversion (soffice) & compression (gs) workers
│       │   ├── vector/          # FAISS Python engine, cosine similarity vector search
│       │   ├── voice/           # Audio upload handling and Whisper STT integration
│       │   └── whatsapp/        # WhatsApp Baileys multi-device client & message router
│       └── utils/
│           ├── encryption.ts    # AES-256-GCM encryption/decryption for BYOK keys
│           └── systemDateTime.ts# Academic calendar calculations and deadline resolver
├── frontend/
│   ├── index.html               # Main SPA HTML container
│   ├── package.json             # Frontend dependencies (React 19, Lucide, KaTeX, Mermaid)
│   ├── vite.config.ts           # Vite bundler configuration
│   └── src/
│       ├── App.tsx              # Root component, router setup, and route guards
│       ├── main.tsx             # React DOM root initialization
│       ├── index.css            # Design system, CSS variables, academic styling tokens
│       ├── components/          # Reusable UI components
│       │   ├── ArtifactPanel.tsx      # Slide-out drawer for generated documents & code
│       │   ├── BookAuth.tsx           # Interactive 3D book-flip auth interface
│       │   ├── Layout.tsx             # Authenticated workspace layout with navigation
│       │   ├── MarkdownView.tsx       # Markdown parser with KaTeX math & Mermaid charts
│       │   ├── MermaidRenderer.tsx    # Mermaid flowchart & sequence diagram renderer
│       │   ├── TaskModal.tsx          # Task creation and editing modal
│       │   ├── ThinkingBlock.tsx      # Collapsible reasoning block (<thought> display)
│       │   ├── VoiceModal.tsx         # Voice recording, audio waveform, and review modal
│       │   └── widgets/               # Chat-streamed interactive components
│       │       ├── ChartWidget.tsx        # Bar, line, and pie charts
│       │       ├── ComparisonWidget.tsx   # Side-by-side concept comparison card
│       │       ├── DraftComposerWidget.tsx# Email / message draft with 1-click copy
│       │       ├── FileDeliveryWidget.tsx # Downloadable file presentation card
│       │       ├── QuizWidget.tsx         # Interactive multiple-choice quiz
│       │       ├── StepCardWidget.tsx     # Step-by-step tutorial checklist
│       │       └── WidgetRenderer.tsx     # Dynamic widget dispatcher
│       ├── pages/               # Route pages
│       │   ├── AdminPortal.tsx  # Superadmin control center
│       │   ├── Calendar.tsx     # Academic monthly grid and deadline filter
│       │   ├── Chatbot.tsx      # Autonomous agent chat interface with attachments
│       │   ├── Courses.tsx      # Course workspaces and slide deck upload hub
│       │   ├── Dashboard.tsx    # Statistics, urgent deadlines, and progress bars
│       │   ├── Landing.tsx      # Marketing page with interactive feature demos
│       │   ├── Onboarding.tsx   # University, major, semester, and plan selection
│       │   ├── Settings.tsx     # Reminders, BYOK keys, WhatsApp QR code, digest preview
│       │   └── Tools/           # Academic tools suite
│       │       ├── CamScanner.tsx    # In-browser edge detection & PDF export
│       │       ├── Compressor.tsx    # Ghostscript document/image size compressor
│       │       ├── PdfConverter.tsx  # LibreOffice document to PDF converter
│       │       └── ToolsHub.tsx      # Utilities launcher dashboard
│       └── services/
│           └── api.ts           # Centralized Axios client with automatic 401 refresh
├── docker-compose.yml           # PostgreSQL 16 + Redis 7 local development services
└── vercel.json                  # Unified cloud build and routing configuration
```

---

## 4. Data Models & Persistence Strategy

### Relational Database Schema (Prisma)

The canonical database runs on **PostgreSQL 16** managed via Prisma ORM ([schema.prisma](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/prisma/schema.prisma)):

```prisma
enum UserRole { student, admin }
enum UserPlan { free, pro, campus }
enum AiProviderPreference { system, byok }
enum ApiKeyProvider { gemini, openai, groq }
enum TaskType { quiz, assignment, project, exam, personal, other }
enum TaskPriority { low, medium, high }
enum TaskStatus { pending, done, missed }
enum TaskSource { voice, email, manual }
enum ReminderChannel { email, whatsapp }
enum ReminderStatus { pending, sent, failed }
enum PrioritySource { user_set, ai_suggested }
```

#### Core Relational Models:
1. **`User`**: Core student profile, academic credentials (university, major, semester), subscription plan (`free`, `pro`, `campus`), system quota counters, and notification preferences.
2. **`UserApiKey`**: BYOK encrypted credentials storing `encryptedData`, `iv`, `authTag`, and `maskedKey` using AES-256-GCM.
3. **`Subscription`**: Stripe subscription mapping, billing period boundaries, and status.
4. **`Task`**: Academic deliverables tied to deadlines, priority ranking, completion status, and optional course linkage.
5. **`Reminder`**: Timed triggers for tasks over `email` or `whatsapp` with lead times (e.g., 60 minutes or 24 hours prior).
6. **`Course`**: Academic subject containers tracking materials, chat logs, and custom color tags.
7. **`CourseMaterial`**: Parsed document content (PDF, DOCX, TXT) associated with a course for RAG queries.
8. **`ChatMessage`**: History of conversational turns with the study agent, including attached images, tool calls, thinking traces, and rendered widget payloads.
9. **`PasswordReset`**: 6-digit OTP verification records with expiration timestamps.
10. **`EmailIngestionLog`**: Deduplication log tracking processed Gmail messages to prevent duplicate task creation.
11. **`AuditLog`**: Security tracking recording IP addresses, actions, and metadata payloads.
12. **`AdminAccount`**: Dedicated superadmin accounts with hashed credentials and security passphrases.

### Dual-Layer Persistence & Disk Fallback

To support varied operational environments (local development without Docker, ephemeral Vercel serverless environments, and hosted cloud PostgreSQL), [database.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/config/database.ts) implements a tiered persistence architecture:
1. **Primary**: PostgreSQL connection pool via `@prisma/client` and `@prisma/adapter-pg`.
2. **Secondary (Cloud Fallback)**: Direct Supabase REST repository ([supabaseRepo.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/config/supabaseRepo.ts)) executed over HTTPS.
3. **Tertiary (Local Offline Fallback)**: Disk-based JSON files (`user_settings.json`, `courses.json`, `tasks.json`, `user_api_keys.json`) kept in the application root or `/tmp` when running under serverless constraints.

---

## 5. Core Subsystems & Technical Deep Dive

### 5.1 Voice-First Multilingual Task Capture

The voice subsystem allows students to speak naturally in **English, Urdu, or Roman Urdu** (e.g., *"Kal shaam 5 baje OS ka assignment submit karna hai"*).

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Mic as Frontend VoiceModal
    participant VoiceRoute as /api/voice/capture
    participant Whisper as Groq Whisper-large-v3
    participant NLP as Dual-AI Extractor (Groq / Gemini)
    participant DateTime as systemDateTime Engine
    participant DB as Tasks Database

    Student->>Mic: Speaks audio command
    Mic->>VoiceRoute: Multipart POST (audio/webm blob)
    VoiceRoute->>Whisper: Speech-to-Text Transcription
    Whisper-->>VoiceRoute: Multilingual Text Transcript
    VoiceRoute->>NLP: Extract Academic Entity & Intent
    NLP->>DateTime: Parse relative expression ("kal", "next Monday")
    DateTime-->>NLP: ISO 8601 Timestamp (e.g. 2026-09-29T17:00:00Z)
    NLP-->>VoiceRoute: Structured JSON { title, type, deadline, priority }
    VoiceRoute-->>Mic: Preview Modal with extracted details
    Student->>Mic: Confirms task
    Mic->>DB: Persists Task & Enqueues Reminders
```

- **Transcription**: Powered by Groq's Whisper-large-v3 API (<400ms turnaround).
- **Date & Deadline Resolution**: [systemDateTime.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/utils/systemDateTime.ts) calculates deadlines against the active semester calendar and system clock. A spoken reference like *"20 September"* automatically binds to the current academic calendar year with end-of-day defaults (23:59:59.000Z).
- **Intent Extraction**: Employs a dual-pipeline: Groq Llama 3.3 for sub-second intent classification paired with Google Gemini for structured JSON schema extraction.

---

### 5.2 Autonomous Academic Study Agent (`agent.service.ts`)

The conversational study agent located in [agent.service.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/ai/agent.service.ts) is a tool-augmented reasoning engine using Google Gemini's native Function Calling API.

#### Agent Tool Registry:

| Tool Category | Function Name | Purpose |
| :--- | :--- | :--- |
| **Workspace File Ops** | `create_file` | Creates study guides, Python scripts, or notes in the course workspace. |
| | `str_replace` | Surgically edits code or text within existing course workspace files. |
| | `view` | Inspects directory files or reads file line ranges. |
| | `bash_tool` | Executes sandboxed terminal commands (e.g., running Python scripts). |
| | `present_files` | Renders file download cards directly in the chat interface. |
| | `generate_downloadable_file` | Creates `.docx`, `.pdf`, `.py`, `.md` files and provides a 1-click download card. |
| **Research & Web** | `web_search` | Performs live academic web searches for papers, formulas, and references. |
| | `web_fetch` | Fetches clean markdown text from a specific URL. |
| | `image_search` | Finds educational diagrams and scientific reference graphics. |
| **Course Memory** | `memory_read` | Retrieves persistent memory items (e.g., student weaknesses, exam targets). |
| | `memory_write` | Saves or updates long-term memory notes for the course. |
| | `memory_append` | Appends dated insights to persistent course memory. |
| | `memory_list` | Lists all active memory records for a student's course. |
| **Interactive UI** | `quiz_display` | Streams interactive multi-choice quizzes with explanations into the chat. |
| | `chart_display` | Displays dynamic bar, line, or pie charts. |
| | `comparison_card` | Emits side-by-side concept comparison tables. |
| | `step_card` | Displays structured milestone guides and procedural steps. |
| | `message_compose` | Emits email/message draft cards with tone switchers and 1-click copy. |

#### Reasoning & Thought Extraction:
The agent outputs its internal deliberation inside `<thought>...</thought>` tags. The backend's `extractThoughtAndCleanAnswer()` splits this stream into two fields:
- `thought`: Rendered in the frontend via a collapsible [ThinkingBlock.tsx](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/frontend/src/components/ThinkingBlock.tsx) component.
- `cleanAnswer`: Rendered as clean academic markdown with KaTeX math and Mermaid diagrams.

---

### 5.3 Interactive Chat Widget Subsystem

When the agent invokes a widget tool, it returns a structured JSON payload that the frontend parses and mounts as an interactive component ([WidgetRenderer.tsx](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/frontend/src/components/widgets/WidgetRenderer.tsx)):

- **`QuizWidget`**: Renders 4-option questions with click-to-reveal answers, score tracking, and reasoning explanations.
- **`ChartWidget`**: Renders SVG/Canvas charts (bar, line, pie) with custom units.
- **`ComparisonWidget`**: Formats multi-column feature-by-feature comparisons with highlighted recommendation rows.
- **`DraftComposerWidget`**: Displays email templates (e.g., emailing a professor for assignment extensions) with formal/academic tone toggles.
- **`FileDeliveryWidget`**: Displays generated files with file-type badges, file size metadata, and direct download links.

---

### 5.4 Course Workspace & FAISS Vector RAG Engine

Each course functions as an isolated knowledge base.

```mermaid
flowchart LR
    Upload["Course Slides / PDF / DOCX / PPTX"] --> Parser["Document Parser (pdf-parse / mammoth)"]
    Parser --> Chunker["Semantic Text Chunker"]
    Chunker --> Embedder["Gemini Embedding Engine (768-dim)"]
    Embedder --> FAISS["Python FAISS Engine (IndexFlatIP)"]
    
    StudentQuestion["Student Query in Chat"] --> QEmbed["Query Embedding"]
    QEmbed --> Search["Cosine Similarity Search (k=4)"]
    FAISS --> Search
    Search --> Context["Retrieved Document Context"]
    Context --> Agent["Agent System Prompt + Response"]
```

1. **Document Ingestion**: Lecture slides, syllabi, and notes (PDF, DOCX, PPTX, TXT) are uploaded via `/api/courses/:id/upload`.
2. **Parsing**: [documentParser.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/courses/documentParser.ts) extracts text using `pdf-parse-fork` and `mammoth`.
3. **Embedding**: Text chunks are embedded into 768-dimensional vectors using Google Gemini's embedding model.
4. **Vector Search Engine** ([faiss_engine.py](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/vector/faiss_engine.py)):
   - Implemented in Python using Facebook AI Similarity Search (`faiss`).
   - Uses `IndexFlatIP` (Inner Product) on L2-normalized vectors to achieve exact cosine similarity.
   - Serializes index and document store to `index.faiss` and `index.pkl`.
   - Node.js invokes the engine via sub-process execution ([vector.service.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/vector/vector.service.ts)).

---

### 5.5 WhatsApp Multi-Device Study Assistant (Baileys)

StudySync integrates WhatsApp through `@whiskeysockets/baileys` ([whatsapp.service.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/whatsapp/whatsapp.service.ts)):

1. **Authentication**: Uses Multi-Device QR code generation. The QR code is rendered in the terminal during startup and displayed as a Data URL in the frontend Settings page.
2. **Session Storage**: Credential state keys are persisted in `storage/whatsapp_auth/` across restarts.
3. **Message Routing** ([whatsapp.handler.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/whatsapp/whatsapp.handler.ts)):
   - **Task Commands**: *"Add assignment Calculus on Friday 5pm"* creates tasks with automated deadline resolution.
   - **Deadlines Query**: *"Show deadlines"* or *"What is due this week"* generates formatted markdown summaries.
   - **Course Assistance**: Natural language queries route through the course's RAG context, formatting responses for WhatsApp readability.
4. **Crash Isolation**: Unhandled socket timeouts (`stream end`, `connection closed`, `ECONNRESET`) are intercepted in [server.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/server.ts) to prevent server crashes.

---

### 5.6 Notification Engine & Daily Task Digest

The notification subsystem ensures students keep track of upcoming deadlines:

1. **BullMQ Queue & Job Scheduler** ([notification.queue.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/notifications/notification.queue.ts)):
   - Automatically enqueues reminder jobs based on user-configured lead times (e.g., 24 hours and 1 hour before deadlines).
   - If Redis is unavailable, degrades to an in-memory interval loop (`startStandaloneReminderEngine`).
2. **Daily Pending Task Digest ("Yeh tasks abhi baqi hain")**:
   - Runs on a daily cron schedule.
   - Collects all uncompleted tasks for each student.
   - Passes task summaries through the **Gemini Tone Engine** to generate supportive, natural academic digests without repetitive robotic phrasing.
3. **Dispatch Channels**:
   - **Email**: Dispatched via Nodemailer (supporting SMTP, Gmail app passwords, and SendGrid).
   - **WhatsApp**: Dispatched via the active Baileys socket connection.

---

### 5.7 Academic Document Tools Hub

The platform includes background document-processing tools:

1. **Document Converter** ([convert.worker.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/tools/workers/convert.worker.ts)):
   - Converts DOCX, PPTX, DOC, PPT, ODT, RTF into PDF.
   - Executes headless LibreOffice (`soffice --headless --convert-to pdf`).
2. **Document Compressor** ([compress.worker.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/tools/workers/compress.worker.ts)):
   - Compresses PDF files using Ghostscript (`gs`) with presets: `screen` (72 dpi), `ebook` (150 dpi), or `prepress` (300 dpi).
   - Compresses images (JPEG, PNG, WebP) using `sharp`.
3. **Client-Side CamScanner** ([CamScanner.tsx](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/frontend/src/pages/Tools/CamScanner.tsx)):
   - Runs client-side in the browser using HTML5 Canvas.
   - Provides quadrilateral corner detection and perspective transformation.
   - Applies image enhancement filters (adaptive binarization, high-contrast monochrome, magic color).
   - Bundles scanned pages into searchable multi-page PDFs using `jspdf`.

---

### 5.8 Authentication, BYOK Encryption & Admin Operations

1. **User Authentication**:
   - Passwords hashed using Argon2id.
   - Short-lived JWT Access Tokens (15 min) + Refresh Tokens (7 days) stored in HTTP-only cookies.
   - Refresh token rotation with reuse detection to mitigate token theft.
   - 6-digit OTP codes sent via email for registration verification and password resets.
2. **Bring Your Own Key (BYOK) Encryption**:
   - Students on applicable tiers can provide personal OpenAI, Gemini, or Groq API keys.
   - Keys are encrypted with **AES-256-GCM** using a master secret ([encryption.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/utils/encryption.ts)).
   - Each key stores its encrypted payload, initialization vector (`iv`), and authentication tag (`authTag`).
3. **Superadmin Portal** ([AdminPortal.tsx](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/frontend/src/pages/AdminPortal.tsx)):
   - Accessible via isolated admin credentials and a security passphrase.
   - Manages user tiers (`free`, `pro`, `campus`), course quotas, account suspensions, and AI token consumption metrics.

---

## 6. Exhaustive REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Create student account and dispatch email OTP | No |
| `POST` | `/verify-otp` | Verify 6-digit registration OTP code | No |
| `POST` | `/resend-otp` | Resend verification OTP code | No |
| `POST` | `/login` | Authenticate with email/password; returns JWT pair | No |
| `POST` | `/refresh` | Rotate refresh token and issue new access token | Cookie |
| `POST` | `/logout` | Invalidate active refresh token | Yes |
| `POST` | `/forgot-password` | Request password reset OTP | No |
| `POST` | `/reset-password` | Set new password using reset OTP | No |
| `GET` | `/me` | Retrieve authenticated user profile | Yes |
| `PATCH`| `/profile` | Update user personal details and preferences | Yes |
| `POST` | `/onboarding/complete` | Finalize academic details (university, major) | Yes |

### BYOK API Keys (`/api/user/keys`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List masked BYOK keys and active preferences | Yes |
| `POST` | `/` | Store encrypted API key (gemini, openai, groq) | Yes |
| `POST` | `/test` | Test connectivity of candidate API key | Yes |
| `PATCH`| `/preference` | Switch between platform system quota and BYOK | Yes |
| `DELETE`| `/:provider` | Remove stored BYOK credentials | Yes |

### Tasks & Deadlines (`/api/tasks`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List tasks with filters (type, status, priority) | Yes |
| `POST` | `/` | Create a new academic task | Yes |
| `GET` | `/dashboard` | Retrieve task metrics, urgent items, progress | Yes |
| `GET` | `/calendar` | Retrieve tasks within date ranges (start, end) | Yes |
| `GET` | `/:id` | Fetch detailed task record | Yes |
| `PATCH`| `/:id` | Update task details or mark complete/missed | Yes |
| `DELETE`| `/:id` | Remove task record | Yes |

### Voice & Natural Language (`/api/voice`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/transcribe` | Transcribe audio stream to text (Groq Whisper) | Yes |
| `POST` | `/capture` | Transcribe and extract structured task schema | Yes |
| `POST` | `/text-command` | Process typed natural language task command | Yes |

### Courses & AI Study Agent (`/api/courses`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List student courses with material counts | Yes |
| `POST` | `/` | Create a new course workspace | Yes |
| `DELETE`| `/:id` | Delete course and associated materials | Yes |
| `POST` | `/:id/upload` | Upload lecture slides/notes (multipart files) | Yes |
| `POST` | `/:id/chat` | Send message to AI Agent (supports attachments) | Yes |
| `GET` | `/:id/chat/history` | Retrieve course conversational history | Yes |
| `DELETE`| `/:id/chat/history`| Clear course conversational history | Yes |
| `GET` | `/ai-quota` | Check current student AI token/request usage | Yes |
| `GET` | `/faiss/info` | Diagnostic vector store statistics | Yes |

### Notifications & Reminders (`/api/notifications`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/digest/trigger` | Trigger immediate daily digest compilation | Yes |
| `GET` | `/digest/preview` | Preview daily digest email HTML & task items | Yes |
| `POST` | `/test-email` | Send test verification email to user address | Yes |

### WhatsApp Companion (`/api/whatsapp`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/status` | Connection state, QR string, and linked phone | Yes |
| `POST` | `/connect` | Initiate Baileys socket client connection | Yes |
| `POST` | `/disconnect` | Terminate session and clear authentication keys | Yes |
| `POST` | `/send-test` | Dispatch test message to linked phone number | Yes |

### Document Processing Tools (`/api/tools`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Check availability of LibreOffice and Ghostscript | No |
| `POST` | `/convert` | Queue document conversion job to PDF | Yes |
| `POST` | `/compress` | Queue document or image compression job | Yes |
| `GET` | `/jobs/:id` | Poll processing status of queued tool job | Yes |
| `GET` | `/jobs/:id/download` | Download processed file result | Token Param |

### Administrative Portal (`/api/admin`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate admin with identifier & passphrase | Admin Auth |
| `GET` | `/overview` | Platform KPI metrics, user counts, queue health | Admin Token |
| `GET` | `/users` | Paginated user directory with plan filters | Admin Token |
| `PATCH`| `/users/:id/plan` | Update user subscription plan tier | Admin Token |
| `POST` | `/users/:id/bonus-courses` | Grant bonus course workspace quota | Admin Token |
| `PATCH`| `/users/:id/status`| Suspend or unblock user access | Admin Token |
| `GET` | `/ai-usage` | Telemetry logs of Groq and Gemini API calls | Admin Token |

---

## 7. Frontend Architecture & Component Guide

The frontend is built on **React 19**, **TypeScript**, and **Vite**.

### Routing & Route Protection Strategy ([App.tsx](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/frontend/src/App.tsx))
1. **`PublicAuthRoute`**: Guards `/login` and `/register`. Redirects authenticated students directly to `/dashboard`.
2. **`ProtectedRoute`**: Protects core workspaces (`/dashboard`, `/calendar`, `/my-courses`, `/chatbot`, `/settings`). Verifies JWT authentication state and redirects users who have not completed initial onboarding to `/onboarding`.
3. **`ToolAuthGuard`**: Protects CPU-intensive utilities (`/tools/compressor`, `/tools/pdf-converter`). If unauthenticated, displays an informative login prompt while allowing guest access to client-side utilities like CamScanner.

### Component Design System:
- **Typography & Theme**: Defined in [index.css](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/frontend/src/index.css) using CSS custom properties (`--color-primary`, `--color-surface`, `--color-text`).
- **Markdown & Math Typesetting**: [MarkdownView.tsx](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/frontend/src/components/MarkdownView.tsx) renders LaTeX equations via **KaTeX** (`$inline$` and `$$block$$`), diagrams via **Mermaid.js**, and code blocks with syntax highlighting.
- **Axios HTTP Client**: [api.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/frontend/src/services/api.ts) maintains a singleton refresh promise to resolve 401 token expiration errors automatically across concurrent API requests.

---

## 8. Environment Variables Matrix

Copy `backend/.env.example` to `backend/.env` and supply the required values:

```env
# ─── Server Configuration ──────────────────────────────────────────────
PORT=5000
NODE_ENV=development                      # 'development' | 'production'
FRONTEND_URL=http://localhost:5173        # Comma-separated allowed CORS origins

# ─── Database & Storage ───────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/studysync?schema=public"
SUPABASE_URL="https://your-project.supabase.co"     # Optional cloud fallback
SUPABASE_ANON_KEY="your-supabase-anon-key"

# ─── Redis & Queue ────────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ─── JWT Authentication Secrets ────────────────────────────────────────
JWT_ACCESS_SECRET="generate-a-strong-random-secret"
JWT_REFRESH_SECRET="generate-another-strong-random-secret"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ADMIN_JWT_SECRET="generate-a-dedicated-admin-secret"
ADMIN_JWT_EXPIRES_IN=12h
BYOK_ENCRYPTION_SECRET="generate-a-32-byte-master-key"   # AES-256-GCM master key for BYOK user API keys

# ─── AI API Keys & Rotation Pools ─────────────────────────────────────
GROQ_API_KEY="gsk_..."                    # Single primary Groq key
GROQ_API_KEYS="gsk_1,gsk_2"              # Optional comma-separated rotation pool
GEMINI_API_KEY="AIzaSy..."                # Single primary Gemini key
GEMINI_API_KEYS="key_1,key_2"            # Optional comma-separated rotation pool
TAVILY_API_KEY="tvly-..."                 # Required for agent web searches

# ─── Email Dispatch (SMTP / Gmail / SendGrid) ─────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_specific_password"
SMTP_FROM="StudySync AI <reminders@studysync.ai>"
SENDGRID_API_KEY=""

# ─── WhatsApp Service ─────────────────────────────────────────────────
WHATSAPP_TOKEN=""                         # Optional Meta Cloud API fallback
WHATSAPP_PHONE_NUMBER_ID=""
```

---

## 9. Development, Docker & Deployment Guide

### Local Development Setup

#### 1. Start Infrastructure Containers:
```bash
docker-compose up -d
```
Starts PostgreSQL 16 on `localhost:5432` and Redis 7 on `localhost:6379`.

#### 2. Start Backend API:
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
Backend runs at `http://localhost:5000`.

#### 3. Start Frontend Client:
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

### Cloud Deployment

#### Vercel Serverless (Frontend + API):
The repository includes a root [vercel.json](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/vercel.json) orchestrating a unified monorepo build:
- Builds the Vite frontend bundle to `frontend/dist`.
- Routes all `/api/*` requests to the serverless function wrapper in [api/index.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/api/index.ts).
- Routes all web traffic to `index.html`.

#### Render / Railway / Docker Deployment:
Use `backend/Dockerfile` to deploy a containerized Linux instance containing Node.js, Python 3, LibreOffice, and Ghostscript.

---

## 10. Resilience Patterns & Edge Case Handling

1. **AI API Rate Limit Protection (Multi-Key Rotation)**:
   [ai.service.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/ai/ai.service.ts) and [agent.service.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/modules/ai/agent.service.ts) support comma-separated API key pools. If an upstream call returns HTTP 429 or 503, the client rotates to the next available key and retries the request.
2. **Process-Level WhatsApp Socket Error Suppression**:
   Baileys multi-device socket connections can emit intermittent TCP reset or timeout errors. [server.ts](file:///c:/Users/Huzaifa%20Ali/Desktop/study%20final/studysync/backend/src/server.ts) intercepts known connection strings (`timed out`, `connection closed`, `stream end`, `ECONNRESET`) in `unhandledRejection` and `uncaughtException` handlers, preventing unexpected server termination.
3. **Queue Fallback Mechanism**:
   Both the notification engine and document processing services check Redis connectivity on startup. If Redis is down, jobs fall back to in-memory event queues and interval-based polling.
4. **Vercel Ephemeral Environment Detection**:
   When `process.env.VERCEL` is detected, long-lived background daemons, persistent socket listeners, and BullMQ worker initialization are bypassed to ensure serverless compatibility.
"# study-sync-" 
