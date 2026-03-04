# Oxana - Project Progress

- [x] **Project Foundation**
    - [x] Project Scaffolding (Next.js 15+, Tailwind, TS)
    - [x] Database Schema (SQLite + Prisma)
    - [x] Authentication (NextAuth.js with Credentials only)
    - [x] **Rebranded platform from "Asana" to "Oxana"**

- [x] **Workspace & Members**
    - [x] Multi-workspace support
    - [x] Workspace creation & switching
    - [x] Member Invite system (Link-based)
    - [x] **Consolidated Workspace Settings Hub**
        - [x] General: Rename workspace & manage invite links
        - [x] Members: Role management (Owner, Admin, Member) and removal
        - [x] Archive: Library of archived projects for easy restoration
        - [x] Danger Zone: Full workspace deletion with confirmation
    - [x] **Streamlined Sidebar**: Removed redundant links; consolidated administration into Settings

- [x] **Project & Task Management**
    - [x] Project creation (Scratch vs Template)
    - [x] **Project Sections** (Grouping tasks into milestones/categories)
        - [x] Section Management (Renaming and deleting sections)
        - [x] Promotion logic: Renaming "Uncategorized" converts it to a real section
        - [x] Template support: Sections are preserved when cloning projects
    - [x] List View (Grouped by sections with collapsible headers)
    - [x] Kanban Board (Optimized Drag & Drop)
    - [x] Calendar View
    - [x] **Interactive Timeline (Gantt Chart)**
        - [x] Grouped by sections (Swimlanes)
        - [x] Task dependencies visualization
        - [x] **Multi-resolution Zoom** (Days/Weeks view)
        - [x] Weekend and Today highlighting
    - [x] Task Detail Panel (Inline editing)
    - [x] Subtasks (Nested task management)
    - [x] Task & Subtask Deletion (with confirmation)
    - [x] **Project Templates**
        - [x] Deep cloning engine (Tasks, Subtasks, and Sections)
        - [x] Template library in creation UI
        - [x] Save existing project as template
        - [x] Sanitized templates (removes dates and assignees)

- [x] **Collaboration & Features**
    - [x] Task Comments
    - [x] **Real-time Activity Log** (with state tracking and relative timestamps)
    - [x] Profile Management (Name editing & Manual Avatar Upload)
    - [x] Task Attachments (Local storage system)
    - [x] Real-time updates (Pusher integration)
    - [x] Project Leader assignment and display
    - [x] Project Settings (Color, Icon, Leader, Archiving)
    - [x] **Strict Read-Only mode for archived projects**
    - [x] **Keyboard Shortcut 't'** for instant task creation in List View
    - [x] **Grouped "My Tasks"** view by project for cross-workspace clarity

- [x] **Maintenance & Bug Fixes**
    - [x] Resolved Prisma client synchronization issues with Turbopack
    - [x] **API Security**: Replaced detailed error responses with generic "Internal Error" for production
    - [x] UI Refinement: Improved spacing and layout for Project, Workspace, and Login pages
    - [x] **Compact UI**: Reduced row height across all task lists (List, My Tasks, Subtasks)
    - [x] Optimized Settings page loading speed via targeted API calls
    - [x] Task Pane Housekeeping: Moved name to top, unified selector styles
    - [x] Task Sorting: Fixed order to ensure new tasks appear at the bottom
    - [x] **Fixed P2003 Foreign Key error** in project creation
    - [x] **Fixed Workspace deletion "Cancel" button** using `DialogClose`
    - [x] **Improved contrast** for Timeline zoom toggle and active states

- [ ] **Next Steps**
    - [ ] Global Search (Quick navigation across workspace)
    - [ ] Notifications system
    - [x] Manual Task Sorting (Drag & Drop reordering in List and Kanban)
    - [ ] User Roles & Permissions (Strict cross-workspace enforcement)
    - [ ] Multi-Assignees (Assign multiple members to a task)
    - [ ] Activity Export (Export project data to CSV/PDF)

- [ ] **Colleague Feedback (Backlog)**
    - [x] **Inline Task Addition**: Add tasks directly in the list row without a modal
    - [ ] **Status Management**: Custom statuses or faster status switching
    - [ ] **Visibility Filters**: Toggle to "Hide Done" tasks in all views
    - [ ] **Timeline Export**: Export project timeline to external formats
    - [ ] **List View Sorting**: Clickable column headers to sort by name, date, priority, etc.
    - [ ] **Enhanced "My Tasks"**: Add advanced filtering, custom grouping, and sorting
    - [ ] **Team Visibility**: "Tasks by others" view to see teammate workloads
    - [ ] **Project Roles**: Define specific roles within a project (not just workspace)
    - [ ] **Email Verification**: Formalize account creation with email confirmation

- [x] **Infrastructure & Deployment (Ref: [DEPLOYMENT.md](DEPLOYMENT.md))**
    - [x] **Railway Setup (Faza 1)**
        - [x] Verify `.env` variables consistency
        - [x] Configure Railway project and GitHub connection
        - [x] Set up **Railway Volumes** for SQLite and uploads
        - [x] First deployment and production testing
    - [ ] **Future Optimization (Faza 2)**
        - [ ] Migrate to VPS (DigitalOcean/Hetzner)
        - [ ] Evaluate migration to PostgreSQL based on load

Cum putem schimba statuturile?
Filtru pentru a ascunde cele done
Export la timeline
Sortare campuri in list view
My tasks:
 ———Filtre
 ———Grupari
 ———Sortari
Tasks by others
Roluri in proiect
Notificari
Dependente intre taskuri
Email verification