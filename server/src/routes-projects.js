'use strict';
const express = require('express');
const { Op } = require('sequelize');
const { validateBody, parseListQuery, isUuid } = require('./schema');
const { badRequest, forbidden, notFound } = require('./errors');
const { projectAccess } = require('./permissions');
const { containsText } = require('./search');

const serialize = (p, access, { source = true } = {}) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  notation: p.notation,
  ...(source ? { source: p.source } : {}),
  visibility: p.visibility,
  owner: { id: p.owner.id, displayName: p.owner.displayName },
  access,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

function projectRoutes({ db, authenticate }) {
  const router = express.Router();
  const { sequelize, Project, ProjectMember, User } = db;
  const ownerInclude = { model: User, as: 'owner', attributes: ['id', 'displayName'] };
  router.use('/projects', authenticate);

  // A bad id, a missing project and a project the caller may not see all end in the same 404.
  async function load(req) {
    if (!isUuid(req.params.id)) throw notFound();
    const project = await Project.findByPk(req.params.id, { include: ownerInclude });
    if (!project) throw notFound();
    const member = await ProjectMember.findOne({ where: { projectId: project.id, userId: req.user.id } });
    const access = projectAccess(req.user, project, member);
    if (!access.read) throw notFound();
    return { project, access };
  }
  const need = (access, right) => {
    if (!access[right]) throw forbidden();
  };

  router.get('/projects', async (req, res) => {
    const { page, pageSize, q, sort, order, offset } = parseListQuery(req.query, { sorts: ['updatedAt', 'createdAt', 'title'], extra: ['mine', 'visibility'] });
    const { mine, visibility } = req.query;
    if (mine !== undefined && !['true', 'false'].includes(mine))
      throw badRequest('validation_failed', 'Invalid query', [{ field: 'mine', message: 'true or false' }]);
    if (visibility !== undefined && !['private', 'shared'].includes(visibility))
      throw badRequest('validation_failed', 'Invalid query', [{ field: 'visibility', message: 'private or shared' }]);

    const and = [];
    if (req.user.role !== 'admin') {
      const memberIds = (await ProjectMember.findAll({ where: { userId: req.user.id }, attributes: ['projectId'] })).map((m) => m.projectId);
      and.push({ [Op.or]: [{ ownerId: req.user.id }, { visibility: 'shared' }, { id: { [Op.in]: memberIds } }] });
    }
    if (mine === 'true') and.push({ ownerId: req.user.id });
    if (visibility) and.push({ visibility });
    if (q) and.push(containsText(sequelize, '"Project"."searchText"', q));

    const { rows, count } = await Project.findAndCountAll({
      where: { [Op.and]: and },
      include: ownerInclude,
      order: [
        [sort, order.toUpperCase()],
        ['id', 'ASC'],
      ],
      limit: pageSize,
      offset,
    });
    const members = await ProjectMember.findAll({ where: { userId: req.user.id, projectId: { [Op.in]: rows.map((p) => p.id) } } });
    const items = rows.map((p) =>
      serialize(
        p,
        projectAccess(
          req.user,
          p,
          members.find((m) => m.projectId === p.id),
        ).level,
        { source: false },
      ),
    );
    res.json({ items, page, pageSize, total: count });
  });

  router.post('/projects', async (req, res) => {
    const input = validateBody(req.body, 'projectCreate');
    const project = await Project.create({ ...input, ownerId: req.user.id });
    project.owner = req.user;
    res.status(201).json({ project: serialize(project, 'owner') });
  });

  router.get('/projects/:id', async (req, res) => {
    const { project, access } = await load(req);
    res.json({ project: serialize(project, access.level) });
  });

  router.patch('/projects/:id', async (req, res) => {
    const { project, access } = await load(req);
    need(access, 'write');
    const input = validateBody(req.body, 'projectUpdate', { requireAny: true });
    // Writers of a shared project may edit content, but only the owner or an admin decides who can see it.
    if (input.visibility !== undefined) need(access, 'manage');
    await project.update(input);
    res.json({ project: serialize(project, access.level) });
  });

  router.delete('/projects/:id', async (req, res) => {
    const { project, access } = await load(req);
    need(access, 'delete');
    await project.destroy();
    res.status(204).end();
  });

  router.get('/projects/:id/members', async (req, res) => {
    const { project, access } = await load(req);
    need(access, 'manage');
    const rows = await ProjectMember.findAll({
      where: { projectId: project.id },
      include: { model: User, as: 'user', attributes: ['displayName'] },
      order: [['userId', 'ASC']],
    });
    res.json({ items: rows.map((m) => ({ userId: m.userId, displayName: m.user.displayName, access: m.access })) });
  });

  router.put('/projects/:id/members/:userId', async (req, res) => {
    const { project, access } = await load(req);
    need(access, 'manage');
    const input = validateBody(req.body, 'member');
    if (!isUuid(req.params.userId) || !(await User.findByPk(req.params.userId))) throw notFound();
    if (req.params.userId === project.ownerId)
      throw badRequest('validation_failed', 'The owner is already a member', [{ field: 'userId', message: 'is the owner' }]);
    await ProjectMember.upsert({ projectId: project.id, userId: req.params.userId, access: input.access });
    res.json({ member: { userId: req.params.userId, access: input.access } });
  });

  router.delete('/projects/:id/members/:userId', async (req, res) => {
    const { project, access } = await load(req);
    need(access, 'manage');
    const removed = isUuid(req.params.userId) ? await ProjectMember.destroy({ where: { projectId: project.id, userId: req.params.userId } }) : 0;
    if (!removed) throw notFound();
    res.status(204).end();
  });

  return router;
}

module.exports = { projectRoutes };
