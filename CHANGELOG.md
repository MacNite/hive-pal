# Changelog

## [Unreleased] — feature/queen-history-tracking

> Branch diff against `main` · Commit [`713295e`](../../commit/713295ec9d20db7fc31886b845505525a0c7d83c) · 2026-03-19

### Overview

Implements full queen lifecycle management for Hive Pal (issue #29). Beekeepers can now track individual queens across hives, record transfers with dates and reasons, and view the complete history of queens in any hive.

---

### Added

#### Database
- **`QueenMovement` model** — new Prisma model tracking every queen transfer between hives
  - Fields: `id`, `queenId`, `fromHiveId` (nullable), `toHiveId` (nullable), `movedAt`, `reason`, `notes`, `createdAt`
  - Cascade-deletes with parent `Queen`; indexed on `queenId`, `fromHiveId`, `toHiveId`
- **`Queen.installedAt`** and **`Queen.replacedAt`** — nullable `DateTime` fields added to existing `Queen` model
- **`Hive.queenMovementsFrom` / `Hive.queenMovementsTo`** — inverse relations on `Hive` for movement history queries

#### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/queens/hive/:hiveId/history` | All queens (current + historical) for a hive |
| `GET` | `/api/queens/:id/history` | Full movement history for a specific queen |
| `POST` | `/api/queens/:id/transfer` | Record a queen transfer between hives |

#### Frontend Pages
- **Queen List Page** (`/queens`) — table of all queens with filtering by status (ACTIVE, REPLACED, DEAD, UNKNOWN) and hive assignment
- **Queen Detail Page** (`/queens/:queenId`) — individual queen info, current hive, full movement history table, and Transfer/Edit actions
- **Create Queen Page** (`/queens/create`, `/hives/:hiveId/queens/create`) — routed to existing create form (now wired in router)
- **Edit Queen Page** (`/queens/:queenId/edit`) — routed to existing edit form (now wired in router)

#### Frontend Components
- **`QueenTransferDialog`** — modal for recording a queen transfer; fields: destination hive (or "Remove from hive"), transfer date, reason, notes
- **`QueenHistoryTab`** — new tab in Hive Detail page listing all queens ever assigned to that hive with color-coded status badges

#### React Query Hooks
- `useQueenHistory(queenId)` — fetches `QueenDetail` (queen + movements)
- `useHiveQueenHistory(hiveId)` — fetches all queens ever in a hive
- `useRecordQueenTransfer()` — mutation for the transfer endpoint

#### Shared Schemas / Types
- `queenMovementSchema` — Zod schema for a single movement record
- `recordQueenTransferSchema` — Zod schema for the transfer request DTO
- `queenDetailSchema` — extends `queenResponseSchema` with `movements[]`
- Exported TypeScript types: `QueenMovement`, `RecordQueenTransfer`, `QueenDetail`

---

### Changed

#### Backend
- **`queens.service.ts`** — major refactor; new `recordTransfer()` logic automatically marks any ACTIVE queen in the destination hive as `REPLACED` before assigning the transferred queen
- **`queens.controller.ts`** — added three new route handlers; existing endpoints unchanged
- **`hive.service.ts`** — fixed `findAll()` to respect an explicit `status` filter parameter; previously ignored in favour of the `includeInactive` flag only

#### Frontend
- **`queen-information.tsx`** (Hive Detail) — added "Transfer Queen" menu action that opens `QueenTransferDialog` inline
- **`hive-detail-page/page.tsx`** — added "Queen History" tab rendering `<QueenHistoryTab />`; replaced static status badge with interactive `HiveStatusButton`
- **`routes/index.tsx`** — registered all new queen routes (`/queens`, `/queens/create`, `/queens/:id`, `/queens/:id/edit`, `/hives/:hiveId/queens/create`)
- **`useQueens.ts`** — added new query keys (`history`, `hiveHistory`) and three new hooks alongside existing ones
- **`register-page.tsx`** — fixed "something went wrong" error screen appearing during signup; removed conflicting `navigate('/login')` after successful registration (auth provider already redirects to `/onboarding`); moved `isLoggedIn` redirect into a `useEffect` to prevent illegal render-phase navigation
- **`hive-list-page.tsx`** — status filter now fetches all hive statuses (`includeInactive: true`) so client-side filtering works across all statuses
- **`hives-layout.tsx`** (Apiary detail grid) — now fetches all statuses and filters out only `ARCHIVED` hives; Dead, Inactive, Sold and Unknown hives remain visible and placeable in the grid
- **`hive-minimap.tsx`** (Dashboard hive layout card) — same rule as apiary grid: all statuses except `ARCHIVED` are shown

---

### Added (post-review fixes)

#### Backend
- **`queens.service.ts`** — `recordTransfer()` wrapped in a Prisma `$transaction` to prevent partial writes on failure
- **`queens.service.ts`** — `findAll()` includes unassigned queens (hiveId = null) with ownership verified via movement history
- **`queens.service.ts`** — `getQueenHistory()` can now find queens that have been removed from all hives
- **`queens.service.ts`** — `getHiveQueenHistory()` uses movement-derived installed/replaced dates per hive, and sorts by most recent movement
- **`hive.service.ts`** — `findAll()` now correctly applies an explicit `status` query parameter

#### Frontend
- **`HiveStatusButton`** component — inline dropdown on Hive Detail page to change hive status (Active / Inactive / Dead / Sold / Unknown / Archived) with instant save via `PATCH /hives/:id`
- **`QueenColorBadge`** component — shared colour swatch + label used across queen list and history views
- **`app-sidebar.tsx`** — Queens nav item (Crown icon) added to the left sidebar linking to `/queens`
- **`queen-utils.ts`** — shared constants and helpers (`QUEEN_STATUS_VARIANTS`, `QUEEN_COLOR_CLASSES`, `getQueenColorClass`, `getQueenDisplayName`) extracted to eliminate duplication across queen pages

#### i18n
- `queen.json` — added `actions.transferQueen` key
- `common.json` — added `navigation.allQueens` key

---

### Files Changed (14)

```
apps/backend/prisma/schema.prisma
apps/backend/src/queens/queens.controller.ts
apps/backend/src/queens/queens.service.ts
apps/frontend/src/api/hooks/useQueens.ts
apps/frontend/src/pages/hive/hive-detail-page/page.tsx
apps/frontend/src/pages/hive/hive-detail-page/queen-history-tab.tsx        (new)
apps/frontend/src/pages/hive/hive-detail-page/queen-information.tsx
apps/frontend/src/pages/queen/components/queen-transfer-dialog.tsx          (new)
apps/frontend/src/pages/queen/index.ts
apps/frontend/src/pages/queen/queen-detail-page.tsx                         (new)
apps/frontend/src/pages/queen/queen-list-page.tsx                           (new)
apps/frontend/src/routes/index.tsx
apps/frontend/src/pages/register-page.tsx
packages/shared-schemas/src/queens/queen.schema.ts
```
