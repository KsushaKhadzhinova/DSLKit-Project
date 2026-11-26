'use strict';
const express = require('express');
const { Op } = require('sequelize');
const { validateBody, parseListQuery, isUuid } = require('./schema');
const { conflict, notFound } = require('./errors');
const { requireAction } = require('./middleware');
const { containsText } = require('./search');
const limits = require('../limits.json');

function adminRoutes({ db, authenticate, now }) {
  const router = express.Router();
  const { User, RequestLog, sequelize } = db;
  const view = (u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    locked: Boolean(u.lockedUntil && u.lockedUntil.getTime() > now()),
    createdAt: u.createdAt,
  });

  async function target(req) {
    const user = isUuid(req.params.id) ? await User.findByPk(req.params.id) : null;
    if (!user) throw notFound();
    return user;
  }

  router.get('/users', authenticate, requireAction('users.list'), async (req, res) => {
    const { page, pageSize, q, sort, order, offset } = parseListQuery(req.query, { sorts: ['createdAt', 'displayName'] });
    const where = q ? { [Op.and]: [containsText(sequelize, '"User"."searchText"', q)] } : {};
    const { rows, count } = await User.findAndCountAll({
      where,
      order: [
        [sort, order.toUpperCase()],
        ['id', 'ASC'],
      ],
      limit: pageSize,
      offset,
    });
    res.json({ items: rows.map(view), page, pageSize, total: count });
  });

  router.patch('/users/:id', authenticate, requireAction('users.setRole'), async (req, res) => {
    const input = validateBody(req.body, 'role');
    const user = await target(req);
    if (user.id === req.user.id) throw conflict('own_role_locked', 'Admins cannot change their own role');
    await user.update({ role: input.role });
    res.json({ user: view(user) });
  });

  router.post('/users/:id/unlock', authenticate, requireAction('users.unlock'), async (req, res) => {
    const user = await target(req);
    await user.update({ failedAttempts: 0, lockedUntil: null });
    res.json({ user: view(user) });
  });

  router.get('/logs', authenticate, requireAction('log.read'), async (req, res) => {
    const { page, pageSize, offset } = parseListQuery(req.query, { pageSizeMax: limits.logPageMax });
    const { rows, count } = await RequestLog.findAndCountAll({ order: [['id', 'DESC']], limit: pageSize, offset });
    const items = rows.map((r) => ({
      id: r.id,
      method: r.method,
      path: r.path,
      status: r.status,
      userId: r.userId,
      ip: r.ip,
      durationMs: r.durationMs,
      createdAt: r.createdAt,
    }));
    res.json({ items, page, pageSize, total: count });
  });

  return router;
}

module.exports = { adminRoutes };
