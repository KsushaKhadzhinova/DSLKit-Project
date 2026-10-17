import { useState } from 'react';
import { errorMessage, login, register, saveToken } from '../api';
import limits from '../limits.json';
import { validateCredentials } from '../utils/validation';

// Sign in or register; after a successful login the JWT is saved and the interceptor in api.js sends it.
export default function AuthForm({ onLoggedIn, notice }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const found = validateCredentials({ email, password });
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      if (mode === 'register') await register(email.trim(), password);
      const { data } = await login(email.trim(), password);
      saveToken(data.token);
      onLoggedIn();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form form--center" onSubmit={submit} noValidate aria-label={isLogin ? 'Вход' : 'Регистрация'}>
      <h2 className="form__legend">{isLogin ? 'Вход по адресу почты' : 'Новый аккаунт'}</h2>
      {notice && (
        <p className="alert" role="status">
          <span className="alert__text">{notice}</span>
        </p>
      )}
      <div className="form__field">
        <label className="form__label" htmlFor="auth-email">
          Электронная почта
        </label>
        <input
          id="auth-email"
          className="form__input"
          type="email"
          autoComplete="username"
          maxLength={limits.email.maxLength}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? 'true' : undefined}
          aria-describedby={errors.email ? 'auth-email-error' : undefined}
        />
        {errors.email && (
          <span className="form__error" id="auth-email-error">
            {errors.email}
          </span>
        )}
      </div>
      <div className="form__field">
        <label className="form__label" htmlFor="auth-password">
          Пароль
        </label>
        <input
          id="auth-password"
          className="form__input"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={errors.password ? 'true' : undefined}
          aria-describedby={errors.password ? 'auth-password-error' : 'auth-password-hint'}
        />
        {errors.password ? (
          <span className="form__error" id="auth-password-error">
            {errors.password}
          </span>
        ) : (
          <span className="form__hint" id="auth-password-hint">
            От {limits.password.minLength} до {limits.password.maxBytes} байт
          </span>
        )}
      </div>
      {failure && (
        <p className="form__error" role="alert">
          {failure}
        </p>
      )}
      <div className="form__actions">
        <button type="submit" className="button button--primary" disabled={busy}>
          {busy ? 'Подождите…' : isLogin ? 'Войти' : 'Зарегистрироваться'}
        </button>
        <button type="button" className="button button--quiet" onClick={() => setMode(isLogin ? 'register' : 'login')}>
          {isLogin ? 'Нужна регистрация' : 'Уже есть аккаунт'}
        </button>
      </div>
    </form>
  );
}
