# Oxana - Project Progress

- [x] **Project Foundation**
    - [x] Project Scaffolding (Next.js 15+, Tailwind, TS)
    - [x] Database Schema (SQLite + Prisma)
    - [x] Authentication (NextAuth.js with Credentials)

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
    - [x] Task Creation Modal (with column-specific status)
    - [x] Task Detail Panel (Inline editing)
    - [x] Subtasks (Nested task management)
    - [x] Task & Subtask Deletion (with confirmation)

- [x] **Collaboration & Features**
    - [x] Task Comments
    - [x] Real-time Activity Log (with timestamps and state tracking)
    - [x] Profile Management (Name editing & Manual Avatar Upload)
    - [x] Task Attachments (Local storage system)
    - [x] Real-time updates (Pusher integration)
    - [x] Interactive Timeline (Gantt Chart) with dependencies
    - [x] Project Leader assignment and display
    - [x] Project Settings & Archiving
        - [x] Rename project & update description
        - [x] Change Project Leader
        - [x] Custom Project Colors & Icons
        - [x] Archive/Restore functionality
        - [x] Strict Read-Only mode for archived projects
        - [x] Permanent Project Deletion (Danger Zone)
    - [x] Project Templates
        - [x] Deep cloning engine (Tasks & Subtasks)
        - [x] Template library in creation UI
        - [x] Save existing project as template
        - [x] Delete templates from library
        - [x] Sanitized templates (removes dates and assignees)
    - [x] Workspace Settings
        - [x] General: Rename workspace & manage invite links
        - [x] Members: Role management (Owner, Admin, Member) and removal
        - [x] Archive: Library of archived projects for easy restoration
        - [x] Danger Zone: Full workspace deletion with confirmation

- [x] **Maintenance & Bug Fixes**
    - [x] Fixed missing task list on project pages
    - [x] Resolved Prisma client out-of-sync issues with dependencies
    - [x] Improved API error logging
    - [x] Timeline View: Highlighted weekends and the current day
    - [x] UI Refinement: Improved spacing and layout for Project & Workspace creation
    - [x] Optimized Settings page loading speed (Single project API)
    - [x] Task Pane Housekeeping: Moved name to top, unified selector styles, hidden dependencies
    - [x] Task Sorting: New tasks now appear at the bottom of the list (Ascending order)

- [ ] **Next Steps**
    - [ ] Global Search (Quick navigation across workspace)
    - [ ] Notifications system
    - [ ] Manual Task Sorting (Drag & Drop reordering in List and Kanban)
    - [ ] User Roles & Permissions (Strict enforcement of Owner, Admin, Member)
    - [ ] Multi-Assignees (Assign multiple members to a task)
    - [ ] Task Tags/Labels (Colored categories for tasks)
    - [x] Workspace Settings
        - [x] General: Rename workspace & manage invite links
        - [x] Members: Role management (Owner, Admin, Member) and removal
        - [x] Archive: Library of archived projects for easy restoration
        - [x] Danger Zone: Full workspace deletion with confirmation
        - [x] Streamlined navigation (Removed redundant sidebar links)
    - [ ] Activity Export (Export project data to CSV/PDF)

## How to Test
1. Access the app at [http://localhost:3000](http://localhost:3000)
2. Register a new account.
3. Create a workspace.
4. Go to **Members** to copy an invite link.
5. Create a project and add tasks.
6. Open a task to test **Comments**, **Activity**, **Attachments**, and **Subtasks**.
7. Go to **Profile** (bottom-left dropdown) to change your name or avatar.
