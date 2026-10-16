import { useState } from 'react';
import { errorMessage, login, register, TOKEN_KEY } from '../api';
import { validateCredentials } from '../utils/validation';

// Sign in or register; after a successful login the JWT is saved and the interceptor in api.js sends it.
export default function AuthForm({ onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const found = validateCredentials({ email, password });
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      if (mode === 'register') await register(email.trim(), password);
      const { data } = await login(email.trim(), password);
      localStorage.setItem(TOKEN_KEY, data.token);
      onLoggedIn();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-label={mode === 'login' ? 'Вход' : 'Регистрация'}>
      <label className="field">
        Электронная почта
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errors.email ? 'true' : undefined} />
        {errors.email && <span className="error">{errors.email}</span>}
      </label>
      <label className="field">
        Пароль
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={errors.password ? 'true' : undefined} />
        {errors.password && <span className="error">{errors.password}</span>}
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
      </button>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Нужна регистрация' : 'Уже есть аккаунт'}
      </button>
      {failure && (
        <p className="error" role="alert">
          {failure}
        </p>
      )}
    </form>
  );
}
