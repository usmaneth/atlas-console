# Atlas Console V2 — Full Redesign Spec

_2026-03-05 — captured from Usman's feedback session_

## Core Philosophy
Atlas Console is a **self-improving AI command center**. It doesn't just display data — it thinks about data, learns from context, and evolves its own UI. Atlas should be its own harshest critic.

## The 5 Pillars

### 1. INTELLIGENT ACTIVITY FEED (Dashboard Hero)
Not raw system events. Human-readable, contextual intelligence:
- "Peter merged UX improvements on anuma-ai/text (#23) — read receipts + reply threading"
- "Stefan added webhook handler to ai-portal — affects your SMS integration work"
- "atlas-zeta-dev pushed 3 commits to fix CI on agent marketplace PR"
- "You have 2 failing E2E tests on PR #1525 — click to investigate"
- "atlas-platform-eng rebuilt the WS protocol layer — dashboard now shows live data"

Sources: GitHub events (commits, PRs, reviews across ALL repos user has access to, not just their own), Slack messages, gateway events, agent actions.

Each activity item is actionable — click to drill in, reply, dispatch agent, etc.

### 2. GITHUB MODULE (Full Page)
Dedicated page, not a dashboard card. Sections:
- **Open PRs** — with inline CI status, failure details, "Fix with Agent" button
- **Agent Task Runner** — when "Fix with Agent" is clicked:
  - Navigate to GitHub module
  - Show task breakdown UI (NOT a chat)
  - Step-by-step progress: "Analyzing CI logs... Found 2 failures... E2E Critical: investigating... Creating fix... Pushing commit..."
  - Cool animations as each step completes (checkmarks, progress rings, step transitions)
  - Real-time updates as agent works
  - THEN you can chat with the agent if needed (secondary, below the task UI)
- **Commit Timeline** — across all repos, not just atlas-console
- **Repo Health** — CI status, open issues, PR velocity
- **Team Activity** — what Peter, Stefan, others are doing across repos

### 3. KANBAN / TASK BOARD (Dashboard)
Render `master-task-breakdown.md` as a visual board:
- Columns: Backlog, In Progress, Blocked, Done
- Cards with status, assignee (which agent or person), priority
- Auto-updates as tasks change
- This is the HERO of the dashboard, not agent status cards

### 4. DEEP MEMORY & CONTEXT INGESTION
Current: 21 memory files isn't enough.
Vision:
- **Context deposit** — paste/upload massive context (Slack exports, docs, meeting notes)
- **Processing animation** — spinning wheel, "Understanding... Extracting insights... Building connections..."
- **Learning pipeline** — when context is deposited:
  1. Ingest and parse
  2. Extract key facts, decisions, people, relationships
  3. Connect to existing knowledge graph
  4. Write to structured memory files
  5. Show what was learned: "Learned 47 new facts, 12 people references, 3 architectural decisions"
- **Memory isn't just storage — it's understanding**
- Chat history, agent conversations, task logs — all stored and searchable
- Where things are stored: memory files, but with better organization (by topic, by person, by project)

### 5. SELF-EVOLUTION ENGINE
The killer feature. When Atlas learns enough new context that changes the picture:
- **Threshold trigger** — "I've learned 100+ new things that significantly change the work landscape"
- **Design update notification** — popup: "🔄 New context triggered a workflow redesign"
- **Auto-spawn platform agent** — atlas-platform-eng automatically:
  - Analyzes what changed
  - Designs new UI components or rearranges existing ones
  - Builds and deploys the update
  - Shows before/after comparison
- Example: "After ingesting your Slack workspace export, I now understand 4 team workflows that should be visible. Spawning platform agent to add a Team Activity panel..."
- This is the loop: learn → realize → design → build → deploy → learn more

## Module Structure (Updated)

### Dashboard (/)
- Kanban task board (hero)
- Intelligent activity feed (real sentences, not system events)
- Quick stats bar (sessions, agents, integrations — compact)
- Notification center (Peter made a change, agent completed a task, etc.)

### GitHub (/github)
- Open PRs with CI status
- Agent task runner UI (step-by-step, animated)
- Commit timeline (all repos)
- Team activity
- Repo health

### Chat (/chat)
- Talk to Atlas or any agent
- Context-aware (knows what you're working on)
- Agent conversations stored in memory

### Memory (/memory)
- All memory files, searchable
- Context deposit UI (paste/upload → processing animation → learning report)
- Knowledge graph visualization (stretch)
- "What Atlas knows" summary

### Activity (/activity)
- Full activity log with filters
- Integration-specific views (GitHub, Slack, Discord)
- Timeline view

### Settings (/settings)
- Integration configuration
- Agent management
- Theme/preferences

## Design Principles
- Dark theme, clean, modern — not a dev debugging panel
- Every piece of data should answer "so what?" — raw system events are useless
- Animations and transitions should feel alive but not distracting
- Mobile/responsive is secondary — this is a desktop command center
- The UI should feel like it's THINKING, not just displaying

## Immediate Build Priority
1. Dashboard redesign — kanban board + intelligent activity feed
2. GitHub module — full page with CI status + agent task runner
3. Memory module — context deposit + processing pipeline
4. Self-evolution engine — notification + auto-spawn

## Technical Notes
- GitHub data: use `gh` CLI for user's repos, `gh api` for org repos (zeta-chain, anuma-ai)
- Activity feed: combine gateway events + GitHub webhooks + (future) Slack
- Agent task runner: use sessions_spawn + poll for progress
- Memory deposit: API route that writes to workspace memory files
- Self-evolution: cron job that monitors memory growth, triggers when threshold hit
