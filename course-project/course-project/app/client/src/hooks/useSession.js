import { useCallback, useEffect, useState } from 'react';
import { clearToken, getToken } from '../api';

// Whether the user is signed in. api.js sends the event "auth:logout" when the server answers 401 for the saved token,
// then the session is over and the login form says that it expired.
export function useSession() {
  const [signedIn, setSignedIn] = useState(() => Boolean(getToken()));
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const handleLogout = () => {
      setSignedIn(false);
      setExpired(true);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setExpired(false);
    setSignedIn(false);
  }, []);

  const loggedIn = useCallback(() => {
    setExpired(false);
    setSignedIn(true);
  }, []);

  return { signedIn, expired, logout, loggedIn };
}
