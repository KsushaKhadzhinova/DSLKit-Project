import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, fetchProfile, getToken, isCanceled } from './api';
import { kindOfFailure } from './errorCatalog';

const AuthContext = createContext(null);

// The session of the signed-in user. api.js sends the event "auth:logout" when the server answers 401 for the saved token.
// The role is read from the server (GET /profile), not from the token: the server decides, the client only hides what is not available.
// profile: idle (nobody signed in), loading, ready, error (the server could not be asked, profileKind says why).
export function AuthProvider({ children }) {
  const [signedIn, setSignedIn] = useState(() => Boolean(getToken()));
  const [expired, setExpired] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => (getToken() ? 'loading' : 'idle'));
  const [profileKind, setProfileKind] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const onLogout = () => {
      setSignedIn(false);
      setExpired(true);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setUser(null);
      setProfile('idle');
      return undefined;
    }
    const controller = new AbortController();
    setProfile('loading');
    fetchProfile()
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setUser(data && typeof data === 'object' ? data : null);
        setProfile(data && typeof data === 'object' ? 'ready' : 'error');
        setProfileKind(data && typeof data === 'object' ? null : 'network');
      })
      .catch((failure) => {
        if (controller.signal.aborted || isCanceled(failure)) return;
        setProfile('error');
        setProfileKind(kindOfFailure(failure) ?? '500');
      });
    return () => controller.abort();
  }, [signedIn, attempt]);

  const logout = useCallback(() => {
    clearToken();
    setExpired(false);
    setSignedIn(false);
  }, []);

  const loggedIn = useCallback(() => {
    setExpired(false);
    setSignedIn(true);
  }, []);

  const retryProfile = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo(
    () => ({ signedIn, expired, user, role: user?.role ?? null, profile, profileKind, logout, loggedIn, retryProfile }),
    [signedIn, expired, user, profile, profileKind, logout, loggedIn, retryProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
