# Practical 2: how PATCH and DELETE work (cheat sheet and walkthrough)

Russian version: `36-PZ2-PATCH-DELETE.md`. Code: `part-2/pz-02-rest-api/src/resource.js` (`createResourceRouter`), checks in `src/validation.js`, relations in `src/app.js`. Listings for the report appendix (hand to T38): the `router.patch` and `router.delete` handlers, `requireFresh` and `etagOf`.

## PATCH `/api/{resource}/:id`

Handler steps:

1. `load(req)`: `parseId` (not a positive integer: 400 `invalid_id`), lookup (missing: 404 `not_found`).
2. `requireFresh`: if `If-Match` came and its tag differs from the record's current state, 412 `precondition_failed`; without the header the step is skipped.
3. `body(req, true, item)`: trim whitespace (`trimStrings`), `validate` in `partial` mode (required fields not needed, sent ones checked, an empty object or unknown fields give 400), then `hooks.check`: email uniqueness (409 `conflict`) or parent existence (409 `parent_missing`).
4. `collection.update(item, data)` changes only the sent fields; `id` and `createdAt` stay.
5. Answer 200 with the record and a new `ETag`.

Everything before step 4 only checks, so on any error the record is **unchanged** (no rollback needed). The handler is synchronous: no other request can slip in between the check and the write.

## PUT differs

`validate` without `partial`: required fields are needed; an omitted optional field keeps its current value (`applyDefaults` with `current`) instead of resetting.

## DELETE `/api/{resource}/:id`

1. `load` (400 or 404), 2. `requireFresh` (412), 3. `hooks.beforeRemove`: a user with projects or a project with diagrams gives 409 `conflict` (**no cascade**, a refusal), 4. `collection.remove`, answer 204 without a body.

A repeated DELETE: first 204, second 404. The server state after both is the same (no record), so the method is idempotent by effect; the status code differs, which is fine.

## Races and "impossible" scenarios (tests in `test/consistency.test.js`)

| Scenario | Result |
| --- | --- |
| Creating a project or diagram for a deleted parent | 409 `parent_missing`, nothing stored |
| PATCH, PUT, DELETE, publish, duplicate of a deleted record | 404 in the one format |
| PATCH and DELETE of one record at once | DELETE 204, PATCH 200 or 404, record gone |
| Two DELETEs at once | 204 and 404 |
| Creating a child and deleting the parent at once | exactly one wins, no orphan |
| Two writers with the same `ETag` | 200 and 412 |
| Deleting a parent that has children | 409, no cascade |

Why races are safe: Node runs JavaScript on one thread and the handlers have no `await` between check and change. With a real database this spot would need a transaction (`SELECT ... FOR UPDATE` or a foreign key constraint).

## Likely questions

- PATCH vs PUT? See above; PATCH needs no full body, PUT replaces the whole record.
- What does PATCH with an empty body return? 400 `validation_failed` "send at least one field to change".
- Why `If-Match`? So a form opened long ago cannot overwrite someone else's change; without it the write is unconditional.
- Why 404 and not 204 on a repeated DELETE? There is no record, it is the honest answer; idempotency is about state, not the code.
- Write it live: `PATCH` refusing to set `role` to `owner` (throw `ApiError(403, ...)` in the users `hooks.check`), or `DELETE` as a soft delete (a `deletedAt` field instead of `collection.remove`).
