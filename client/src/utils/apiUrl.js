export const API_ORIGIN = (
  process.env.REACT_APP_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

export const API_BASE_URL = `${API_ORIGIN}/api`;
