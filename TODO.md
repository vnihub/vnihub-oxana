# Asana Clone - Project Progress

- [x] **Project Foundation**
    - [x] Project Scaffolding (Next.js 15+, Tailwind, TS)
    - [x] Database Schema (SQLite + Prisma)
    - [x] Authentication (NextAuth.js with Credentials & Google)

- [x] **Workspace & Members**
    - [x] Multi-workspace support
    - [x] Workspace creation & switching
    - [x] Member Invite system (Link-based)
    - [x] Members management page

- [x] **Project & Task Management**
    - [x] Project creation
    - [x] List View
    - [x] Kanban Board (Optimized Drag & Drop)
    - [x] Calendar View
    - [x] Task Creation Modal
    - [x] Task Detail Panel (Inline editing)
    - [x] Subtasks (Nested task management)

- [x] **Collaboration & Features**
    - [x] Task Comments
    - [x] Real-time Activity Log (with timestamps and state tracking)
    - [x] Profile Management (Name editing & Manual Avatar Upload)
    - [x] Task Attachments (Local storage system)
    - [x] Real-time updates (Pusher integration)
    - [x] Interactive Timeline (Gantt Chart) with dependencies

- [x] **Maintenance & Bug Fixes**
    - [x] Fixed missing task list on project pages
    - [x] Resolved Prisma client out-of-sync issues with dependencies
    - [x] Improved API error logging

- [ ] **Next Steps**
    - [ ] Global Search (Quick navigation across workspace)
    - [ ] Notifications system
    - [ ] Project Settings & Archiving

## How to Test
1. Access the app at [http://localhost:3000](http://localhost:3000)
2. Register a new account.
3. Create a workspace.
4. Go to **Members** to copy an invite link.
5. Create a project and add tasks.
6. Open a task to test **Comments**, **Activity**, **Attachments**, and **Subtasks**.
7. Go to **Profile** (bottom-left dropdown) to change your name or avatar.
