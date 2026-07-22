# UX specification

## 1. Visual direction

Professional desktop business software: warm off-white canvas, white work surfaces, deep navy navigation, restrained teal actions, amber warnings, compact Noto Sans Hebrew typography, 1 px borders, and minimal shadow. No marketing hero, oversized cards, glass effects, decorative gradients, or hidden hover-only commands.

Default density targets 36 px controls and 40–44 px table rows while retaining 44 px touch targets for primary toolbar actions.

## 2. Global RTL rules

- Root: `<html lang="he" dir="rtl">`, UTF-8.
- Use logical CSS properties and DOM order matching reading/visual order.
- Hebrew/free text inherits RTL or uses `dir="auto"`.
- Codes, document numbers, phones, emails, numeric inputs, and money inputs are locally `dir="ltr"` with readable alignment.
- Use `<bdi>` for mixed dynamic tokens in sentences.
- Mirror only spatial direction icons; do not mirror search, save, print, calendar, or status icons.

## 3. Application shell

- Right navigation rail, 220 px expanded / 68 px compact.
- App identity at top; routes: dashboard, projects, templates, catalog, settings.
- Bottom: storage health, last backup, help/about.
- Top command bar is route-specific and sticky. It contains the page title/breadcrumb, primary action, search, and save/health state.
- Content area uses a maximum useful width rather than centering a narrow marketing column.

## 4. Screen specifications

### Dashboard

- First viewport prioritizes `פרויקט חדש`, search, recent projects, and status counts.
- Recent row is directly openable and exposes duplicate/export/archive in a menu.
- Backup reminder becomes persistent after 14 days or after material changes since last backup.

### Projects

- Compact semantic table; sticky header; status chips use text plus color.
- Search updates after 150 ms; filters are visible removable chips.
- Archive is reversible. Delete first moves to trash and announces Undo.

### Project editor

- Header card shows document/project/client essentials; advanced fields collapse below.
- Chapter sections remain visually independent. Each heading includes drag handle, title, subtotal, optional/hidden indicators, and actions.
- Line-item table columns: description, unit, quantity, unit price, discount, total, state/actions.
- Notes open as an inline secondary row, not a modal.
- Sticky totals panel on the inline-end side at desktop; bottom sheet at tablet.
- Save state is always visible: `שומר…`, `נשמר בשעה …`, or persistent error.
- Validation summary links to exact fields and blocks Ready/Sent when required.

### Catalog picker

- Opens as a large dialog/side panel with search focused.
- Search name, description, code, and tags. Filters do not alter canonical order.
- Insert snapshots current values and returns focus to the new project description cell.

### Templates/catalog/settings

- List-and-detail layout at desktop; stacked at tablet.
- Imports require map → preview → validate → commit. No file writes on selection.
- Settings exposes persistence grant, estimated usage, last backup, export, and restore.

## 5. Inline editing keyboard model

- Native Tab/Shift+Tab traverses controls in logical DOM order.
- Enter commits a single-line value and may move to the same field in the next row; Shift+Enter moves upward.
- Textarea Enter inserts a newline.
- Escape restores the value present when edit began and keeps focus in the same cell.
- Arrow keys remain owned by text, number, and select controls.
- Duplicate inserts immediately after the source with a new ID and focuses description.
- Delete uses Undo when feasible and restores focus to the nearest logical row.
- Do not declare ARIA `grid` until the complete roving-focus/edit-mode pattern is built and tested.

## 6. Reordering

- Dedicated labeled handle supports pointer, touch, and keyboard sensors.
- Hebrew live announcements identify pickup, position, drop, and cancellation.
- Each action menu includes `העבר למעלה`, `העבר למטה`, and `העבר למיקום…`; drag is never the only method.
- Reordering is disabled while a non-canonical sort/filter is active, with a clear reason.
- Escape restores exact original order and focus.

## 7. Feedback and recovery

- Toasts are supplementary; save/import/restore failures remain on screen.
- Destructive actions explain scope and whether recovery is available.
- Revision creation previews number, totals, status effect, and artifact behavior.
- Stale-tab state is explicit and blocks writes rather than silently merging.
- Quota/migration failure switches to a recovery surface with export options; never an empty reset screen.

## 8. Responsive behavior

- 1440×900: expanded rail, sticky side totals, full table.
- 1024 px: compact rail, bottom totals, selected less-frequent columns hidden behind item details.
- Below 768 px is supported for viewing/basic edits only; the UI may use stacked item cards but retains data and commands.
- At 200% zoom, focused controls remain visible and sticky regions do not obscure content.

## 9. Accessibility acceptance

- All icon buttons have Hebrew accessible names and tooltips.
- Visible focus ring meets WCAG contrast; no keyboard traps.
- Tables expose captions, headers, scopes, and labeled controls.
- Status is not color-only; validation errors use text and `aria-describedby`.
- Drag alternatives satisfy WCAG 2.2 dragging movement.
- Automated axe has no serious/critical violations; manual NVDA/Chrome pass covers editor and PDF preview.
