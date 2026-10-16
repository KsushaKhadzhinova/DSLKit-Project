const { Router } = require('express');
const { validateRegistration, validateLogin } = require('../middleware/validate-auth');

const createAuthRouter = (controller) => {
  const router = Router();
  router.post('/register', validateRegistration, controller.register);
  router.post('/login', validateLogin, controller.login);
  return router;
};

module.exports = { createAuthRouter };
