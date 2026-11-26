'use strict';

// Single source of the role x action matrix. ROLES.md / ROLES.en.md mirror it and a test keeps them equal.
// "Guest" is not a server role: a guest works in the browser without the server.
const ROLES = ['user', 'editor', 'admin'];
const ALL = ['user', 'editor', 'admin'];

const ACTIONS = {
  'me.read': ALL,
  'project.create': ALL,
  'project.read.own': ALL,
  'project.update.own': ALL,
  'project.delete.own': ALL,
  'project.members.manage.own': ALL,
  'project.read.member': ALL,
  'project.write.member': ALL,
  'project.read.shared': ALL,
  'project.write.shared': ['editor', 'admin'],
  'project.delete.shared': ['admin'],
  'project.read.foreign': ['admin'],
  'project.write.foreign': ['admin'],
  'project.delete.foreign': ['admin'],
  'project.members.manage.foreign': ['admin'],
  'users.list': ['admin'],
  'users.setRole': ['admin'],
  'users.unlock': ['admin'],
  'log.read': ['admin'],
};

const can = (role, action) => Object.hasOwn(ACTIONS, action) && ACTIONS[action].includes(role);

// What `user` may do with `project`; `member` is their project_members row or null.
function projectAccess(user, project, member) {
  const owner = project.ownerId === user.id;
  const admin = user.role === 'admin';
  const shared = project.visibility === 'shared';
  const read = owner || admin || Boolean(member) || shared;
  const write = owner || admin || member?.access === 'write' || (shared && can(user.role, 'project.write.shared'));
  const manage = owner || admin;
  let level = null;
  if (owner) level = 'owner';
  else if (admin) level = 'admin';
  else if (write) level = 'write';
  else if (read) level = 'read';
  return { read, write, delete: manage, manage, level };
}

module.exports = { ROLES, ACTIONS, can, projectAccess };
