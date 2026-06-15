# Operations Dashboard

[![CI](https://github.com/AlexHorodnic/operations-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexHorodnic/operations-dashboard/actions/workflows/ci.yml)

A production-inspired Angular operations platform for monitoring account health, coordinating implementation work, resolving blockers, and reviewing revenue performance.

[Live app](https://operations.alexhorodnic.com/) |
[Portfolio case study](https://alexhorodnic.com/projects/operations-dashboard)

## Product Overview

Operations Dashboard models the internal workspace an operations, customer success, or revenue operations team might use to manage account records, implementation queues, activity, and reporting in one coherent interface.

The frontend uses realistic demo data and complete interaction states to demonstrate enterprise UI architecture without pretending to be a production SaaS backend.

## Key Capabilities

- Operating snapshot with account, revenue, workflow, and launch KPIs
- Account search, filtering, sorting, pagination, selection, and CSV export
- Desktop account tables with responsive mobile card views
- Account and task detail drawers with activity and related context
- Kanban workflow with Angular CDK drag-and-drop on desktop
- Explicit task movement controls for narrow touch screens
- Task creation, comments, status changes, and undoable deletion
- Revenue and workload analytics with responsive visualizations
- Loading, error, empty, filtered, selection, and feedback states

## Engineering Decisions

### Feature-first architecture

Overview, accounts, workflow, and analytics own their route behavior. Shared drawers, badges, KPI cards, command controls, and empty states remain reusable without introducing unnecessary enterprise layering.

### Predictable state

Angular signals and computed values manage local view state, while RxJS models delayed data flows. Shared services own the realistic demo data and browser-managed workflow state.

### Device-aware workflows

Desktop users receive direct drag-and-drop with visible drop targets. On smaller screens, dragging is disabled and the same workflow becomes a stacked layout with explicit movement controls.

### Structured styling

SCSS is separated into base, layout, component, page, and utility layers so global design decisions do not leak into feature logic.

## Responsive & Accessible UX

- Desktop sidebar and sticky mobile app bar
- Mobile navigation sheet and responsive drawers
- Tables that become cards on narrow screens
- Safe-area spacing and touch-friendly controls
- Mobile input sizing that reduces browser zoom issues
- Keyboard-accessible controls with visible focus states
- Horizontal overflow prevention across major layouts

## Tech Stack

- Angular 21
- TypeScript
- Angular Signals
- RxJS
- Angular CDK
- Angular Forms
- SCSS
- Lucide Angular
- Vitest
- Vercel Analytics

## Screenshots

### Operational overview

![Operations Dashboard overview page](docs/screenshots/overview.png)

### Account operations

![Accounts page with account operations table and controls](docs/screenshots/accounts.png)

### Workflow queue

![Workflow queue Kanban board](docs/screenshots/workflow.png)

### Analytics

![Analytics page with revenue and operational charts](docs/screenshots/analytics.png)

### Mobile experience

![Operations Dashboard mobile layout](docs/screenshots/mobile.png)

## Local Development

Requirements:

- Node.js 24
- npm 10.9.7

```bash
npm ci
npm start
```

Open `http://localhost:4200`.

## Verification

```bash
npm run typecheck
npm run test:ci
npm run build
npm audit --omit=dev
```

The focused test suite covers data persistence and CRUD behavior, account filtering and pagination, workflow transitions and undo restoration, analytics ranges, CSV escaping, browser downloads, the application shell, and route rendering.

GitHub Actions installs dependencies, type-checks the application, runs the complete test suite, and creates a production build on pushes and pull requests to `master`.

## Project Boundaries

Operations Dashboard is a frontend portfolio project. It uses mock data and browser-managed state; there is no authentication, backend, production customer data, or server persistence.

A production system would require API contracts, identity and permissions, server-side validation, observability, audit history, and durable storage.

## Security & Privacy

The demo does not request credentials or process customer data. User-provided workflow changes remain in the browser, exported CSV files are generated locally, and rendered demo content is controlled application data rather than trusted external HTML.
