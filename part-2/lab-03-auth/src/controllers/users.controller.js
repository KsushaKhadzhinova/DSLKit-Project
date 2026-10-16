const { notFound, badRequest, conflict } = require('../errors');

const createUsersController = ({ User }) => ({
  profile: async (req, res) => {
    const user = await User.findByPk(req.user.id);
    res.json(user.toPublic());
  },

  list: async (_req, res) => {
    const users = await User.findAll({ order: [['id', 'ASC']] });
    res.json(users.map((user) => user.toPublic()));
  },

  setRole: async (req, res, next) => {
    const user = await User.findByPk(req.userId);
    if (!user) return next(notFound(`User ${req.userId} not found`));
    if (user.id === req.user.id) return next(badRequest('Admins cannot change their own role'));
    await user.update({ role: req.newRole });
    return res.json(user.toPublic());
  },

  remove: async (req, res, next) => {
    if (req.userId === req.user.id) return next(badRequest('Admins cannot delete themselves'));
    try {
      const removed = await User.destroy({ where: { id: req.userId } });
      return removed ? res.status(204).end() : next(notFound(`User ${req.userId} not found`));
    } catch (error) {
      // The foreign key from Diagrams.ownerId is RESTRICT, so a user who still owns diagrams stays.
      if (error.name !== 'SequelizeForeignKeyConstraintError') throw error;
      return next(conflict('The user still owns diagrams, delete or reassign them first'));
    }
  },
});

module.exports = { createUsersController };
