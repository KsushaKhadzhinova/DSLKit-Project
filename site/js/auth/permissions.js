// One table of what every role may do. Code asks "can this user do X", never "is this user a developer".
// Adding a role or moving a right is a change of this table only.
export const ROLES = ['user', 'developer', 'admin'];

export const PERMISSIONS = Object.freeze({
  // Any signed-in account creates diagrams; the daily limit of the project store applies unless the next right is given.
  'diagram.create': ['user', 'developer', 'admin'],
  // No daily limit of new diagrams.
  'diagram.unlimited': ['developer', 'admin'],
  // Editing the documentation and the rules of the expert system. The admin has the role, not this right.
  'docs.developer': ['developer'],
  // The list of local accounts, the change of roles and the audit log of all accounts.
  'admin.users': ['admin'],
});

export const roleOf = (user) => (ROLES.includes(user?.role) ? user.role : 'user');

// A guest (null) has no permission at all.
export const can = (user, permission) => (user ? (PERMISSIONS[permission] ?? []).includes(roleOf(user)) : false);
