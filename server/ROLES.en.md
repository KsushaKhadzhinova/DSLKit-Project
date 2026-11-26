# Roles and permissions: the role × action matrix (EN)

Source of truth: `src/permissions.js`. This table equals the code; `tests/permissions.test.js` checks it. Russian version: [ROLES.md](ROLES.md).

A guest works only in the browser (local storage) and never calls the server: every server action is "—" for them (a request without a token gets 401). Registration always creates the User role; only an admin raises a role.

| Action                           | Meaning                              | Guest | User | Editor | Admin |
| -------------------------------- | ------------------------------------ | ----- | ---- | ------ | ----- |
| `me.read`                        | Own profile                          | —     | ✓    | ✓      | ✓     |
| `project.create`                 | Create a project                     | —     | ✓    | ✓      | ✓     |
| `project.read.own`               | Read an own project                  | —     | ✓    | ✓      | ✓     |
| `project.update.own`             | Update an own project                | —     | ✓    | ✓      | ✓     |
| `project.delete.own`             | Delete an own project                | —     | ✓    | ✓      | ✓     |
| `project.members.manage.own`     | Manage members of an own project     | —     | ✓    | ✓      | ✓     |
| `project.read.member`            | Read a project where added as member | —     | ✓    | ✓      | ✓     |
| `project.write.member`           | Write to a project with write access | —     | ✓    | ✓      | ✓     |
| `project.read.shared`            | Read a shared project                | —     | ✓    | ✓      | ✓     |
| `project.write.shared`           | Write to a foreign shared project    | —     | —    | ✓      | ✓     |
| `project.delete.shared`          | Delete a foreign shared project      | —     | —    | —      | ✓     |
| `project.read.foreign`           | Read a foreign private project       | —     | —    | —      | ✓     |
| `project.write.foreign`          | Update a foreign private project     | —     | —    | —      | ✓     |
| `project.delete.foreign`         | Delete a foreign private project     | —     | —    | —      | ✓     |
| `project.members.manage.foreign` | Manage members of a foreign project  | —     | —    | —      | ✓     |
| `users.list`                     | List users with emails               | —     | —    | —      | ✓     |
| `users.setRole`                  | Change a user role                   | —     | —    | —      | ✓     |
| `users.unlock`                   | Unlock a locked account              | —     | —    | —      | ✓     |
| `log.read`                       | Read the request log                 | —     | —    | —      | ✓     |

## Response rules

- A foreign private project, a missing project and a malformed id all give the same 404 (existence is not revealed).
- A visible but forbidden step (writing a shared project without the right, deleting, managing members) gives 403.
- Only the owner or an admin changes a project's `visibility`.
- An admin cannot change their own role (409).
- Email is visible only to the account owner (`/api/me`) and to an admin (`/api/users`).
