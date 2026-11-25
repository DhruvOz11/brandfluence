import { clearAuthSession, getAuthValue, saveAuthSession } from './authSession';

beforeEach(() => {
  clearAuthSession();
});

test('stores a remembered session persistently', () => {
  saveAuthSession({ token: 'token-1', userRole: 'brand' }, true);

  expect(localStorage.getItem('token')).toBe('token-1');
  expect(sessionStorage.getItem('token')).toBeNull();
  expect(getAuthValue('userRole')).toBe('brand');
});

test('stores a non-remembered session for this tab only', () => {
  saveAuthSession({ token: 'token-2', userRole: 'creator' }, false);

  expect(sessionStorage.getItem('token')).toBe('token-2');
  expect(localStorage.getItem('token')).toBeNull();
  expect(getAuthValue('userRole')).toBe('creator');
});

test('clears session data from both storage locations', () => {
  localStorage.setItem('token', 'old-token');
  sessionStorage.setItem('userRole', 'brand');

  clearAuthSession();

  expect(getAuthValue('token')).toBeNull();
  expect(getAuthValue('userRole')).toBeNull();
});
