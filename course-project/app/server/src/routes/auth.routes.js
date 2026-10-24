const { Router } = require('express');
const { validateRegistration, validateLogin } = require('../middleware/validate-auth');
const { allowMethods } = require('../middleware/http');

// The limiters run before validation, so requests with bad data count too.
const createAuthRouter = (controller, { registerLimiter, loginLimiter }) => {
  const router = Router();
  router
    .route('/register')
    .post(registerLimiter, validateRegistration, controller.register)
    .all(allowMethods(['POST']));
  router
    .route('/login')
    .post(loginLimiter, validateLogin, controller.login)
    .all(allowMethods(['POST']));
  return router;
};

module.exports = { createAuthRouter };
