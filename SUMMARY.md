# Submission Summary

## Task 1: Inline Editing

I chose **single click** on the title text to activate edit mode. This matches the interaction pattern users expect from tools like Linear, Notion, and Airtable. It's immediate, requires no extra UI chrome (hover icons, edit buttons), and the `cursor: text` style makes it discoverable. Double-click was considered but rejected because it conflicts with text selection. The edit input renders in place with ✓ / ✕ buttons, and supports Enter to save, Escape to cancel, and blur (click away) to save. I also added **optimistic updates** such that the new title appears in the table immediately on save, with a silent rollback if the API fails; the editor re-opens with the attempted value and an inline error so the user can retry without retyping.

## Task 2: Batch Updates

I added `updateTasksBatch(taskIds, updates)` to `MockAPI`, which validates that **all** task IDs exist before modifying any of them (all-or-nothing semantics), then applies the update and returns the changed tasks. The frontend shows a contextual action bar whenever one or more tasks are selected: `[✓ N tasks selected] [Change Status ▼] [Apply] [Cancel]`. The table body gets a `.loading` class (dimmed, pointer-events disabled) during the request, and any API error is surfaced inline in the bar. Selecting tasks also supports **Shift+Click range selection** such that clicking a checkbox sets an anchor index, and Shift+clicking another selects every row in between.

## Bonus Items Completed

- **Shift+Click range selection** : fixed a subtle bug where `on:change` on a checkbox carries no `shiftKey` (it's a plain `Event`, not a `MouseEvent`); the fix captures `shiftKey` from the preceding `on:click` into a `pendingShiftKey` variable.
- **Optimistic updates** : title, status, and due date edits all update the UI instantly and roll back silently on failure.
- **Edit other fields** : clicking the status icon opens an inline `<select>`; clicking the due date opens an `<input type="date">`. Both use the same optimistic-update pattern.
- **Unit tests** : 24 tests across `mockApi.test.ts` (15) and `utils.test.ts` (9), covering success paths, validation errors, network failures, all-or-nothing batch semantics, and utility formatting functions. Run with `npm test`.

## Challenges & Trade-offs

The trickiest part was coordinating blur and button-click events on the title editor: clicking the ✓ Save button would fire `blur` on the input first, triggering a save, and then the button's `click` would fire a second save. The fix was `on:mousedown|preventDefault` on the Save/Cancel buttons, which prevents the input from losing focus so blur never fires during a button click. A similar issue affected the optimistic rollback after `isEditing = false` is set synchronously in `cancelEdit()`, any subsequent blur event correctly no-ops because the guard `if (!isEditing) return` catches it before reaching the API.
