# Changelog

## [Unreleased]

### Added
- **Dashboard – Apiary Statistics card**: Added an "Apiary Details" link with arrow icon in the top-right corner of the card header that navigates to the Apiary Details page (`/apiaries/:id`).
- **Dashboard – Hive Layout card**: Added an "Edit Hive Layout" link with arrow icon in the top-right corner of the card header that navigates directly to the Hives tab on the Apiary Details page (`/apiaries/:id?tab=hives`).
- **Apiary Details page**: Added URL-based tab navigation via `?tab=` query parameter, allowing direct linking to a specific tab (e.g. `?tab=hives`, `?tab=location`).
- **GitHub Copilot**: Added `.github/copilot-instructions.md` with project architecture, commands, and conventions to assist future Copilot sessions.

### Fixed
- **Apiary Details page – Map overflow**: Removed redundant outer `Card` wrappers and fixed-height constraints (`h-[200px]`, `h-[400px]`) around the map on both the Overview and Location tabs. The `MapPicker` component now renders at its natural height without overlapping other UI elements.
- **Apiary Details page – Hive count**: Fixed hardcoded `0` hive count on the Apiary Information card. Now fetches and displays the actual hive count for the apiary using the `useHives` hook.
