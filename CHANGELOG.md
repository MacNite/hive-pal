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

#### Frontend
- **`queen-information.tsx`** (Hive Detail) — added "Transfer Queen" menu action that opens `QueenTransferDialog` inline
- **`hive-detail-page/page.tsx`** — added "Queen History" tab rendering `<QueenHistoryTab />`
- **`routes/index.tsx`** — registered all new queen routes (`/queens`, `/queens/create`, `/queens/:id`, `/queens/:id/edit`, `/hives/:hiveId/queens/create`)
- **`useQueens.ts`** — added new query keys (`history`, `hiveHistory`) and three new hooks alongside existing ones
- **`register-page.tsx`** — fixed "something went wrong" error screen appearing during signup; removed conflicting `navigate('/login')` after successful registration (auth provider already redirects to `/onboarding`); moved `isLoggedIn` redirect into a `useEffect` to prevent illegal render-phase navigation

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
