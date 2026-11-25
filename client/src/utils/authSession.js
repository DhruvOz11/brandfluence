const SESSION_KEYS = [
  'token',
  'userRole',
  'creatorId',
  'brandId',
  'userName',
  'userEmail'
];

export const getAuthValue = key => (
  localStorage.getItem(key) || sessionStorage.getItem(key)
);

export const saveAuthSession = (values, rememberMe) => {
  clearAuthSession();
  const storage = rememberMe ? localStorage : sessionStorage;

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      storage.setItem(key, String(value));
    }
  });
};

export const clearAuthSession = () => {
  SESSION_KEYS.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};
