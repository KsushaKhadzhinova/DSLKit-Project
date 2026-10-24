import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import * as api from './api';
import App from './App';

// The profile every test user has unless a test says otherwise (the role decides what the header and /admin show).
export const PROFILE = { id: 1, email: 'me@example.test', role: 'user' };
export const mockProfile = (profile = PROFILE) => vi.mocked(api.fetchProfile).mockResolvedValue({ data: profile });

// Renders the whole application at an address in an in-memory router, as the browser router would at that address.
export const renderApp = (path = '/', state) => render(<MemoryRouter initialEntries={[state ? { pathname: path, state } : path]}><App /></MemoryRouter>);
