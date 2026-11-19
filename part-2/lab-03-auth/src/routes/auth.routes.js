const { Router } = require('express');
const {
  validateRegistration,
  validateLogin,
  validateRefreshToken,
  validateChangePassword,
  validateResetRequest,
  validateResetConfirm,
  validateCode,
  validatePasswordField,
  validateChallenge,
} = require('../middleware/validate-auth');
const { allowMethods } = require('../middleware/http');

// The limiters run before validation, so requests with bad data count too.
// Routes that act on the caller's own account need the Bearer token; the refresh, logout and reset routes are called
// without one (the access token may be expired), so they are protected by the secret in the body and their own limits.
const createAuthRouter = (controller, twoFactor, { registerLimiter, loginLimiter, refreshLimiter, resetLimiter }, authenticate) => {
  const router = Router();
  router
    .route('/register')
    .post(registerLimiter, validateRegistration, controller.register)
    .all(allowMethods(['POST']));
  router
    .route('/login')
    .post(loginLimiter, validateLogin, controller.login)
    .all(allowMethods(['POST']));
  router
    .route('/2fa/verify')
    .post(loginLimiter, validateChallenge, controller.verifyTwoFactor)
    .all(allowMethods(['POST']));
  router
    .route('/refresh')
    .post(refreshLimiter, validateRefreshToken, controller.refresh)
    .all(allowMethods(['POST']));
  router
    .route('/logout')
    .post(refreshLimiter, validateRefreshToken, controller.logout)
    .all(allowMethods(['POST']));
  router
    .route('/logout-all')
    .post(authenticate, controller.logoutAll)
    .all(allowMethods(['POST']));
  router
    .route('/sessions')
    .get(authenticate, controller.sessions)
    .all(allowMethods(['GET']));
  router
    .route('/sessions/:id')
    .delete(authenticate, controller.revokeSession)
    .all(allowMethods(['DELETE']));
  router
    .route('/change-password')
    .post(authenticate, validateChangePassword, controller.changePassword)
    .all(allowMethods(['POST']));
  router
    .route('/password-reset/request')
    .post(resetLimiter, validateResetRequest, controller.requestPasswordReset)
    .all(allowMethods(['POST']));
  router
    .route('/password-reset/confirm')
    .post(resetLimiter, validateResetConfirm, controller.confirmPasswordReset)
    .all(allowMethods(['POST']));
  router
    .route('/2fa')
    .get(authenticate, twoFactor.status)
    .all(allowMethods(['GET']));
  router
    .route('/2fa/setup')
    .post(authenticate, validatePasswordField, twoFactor.setup)
    .all(allowMethods(['POST']));
  router
    .route('/2fa/enable')
    .post(authenticate, validateCode, twoFactor.enable)
    .all(allowMethods(['POST']));
  router
    .route('/2fa/disable')
    .post(authenticate, validatePasswordField, validateCode, twoFactor.disable)
    .all(allowMethods(['POST']));
  return router;
};

module.exports = { createAuthRouter };
