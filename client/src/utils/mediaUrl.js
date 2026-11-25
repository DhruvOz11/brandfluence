import { API_ORIGIN } from './apiUrl';

export const getMediaUrl = mediaPath => {
  if (!mediaPath) return '';
  if (/^https?:\/\//i.test(mediaPath)) return mediaPath;
  if (mediaPath.startsWith('/')) return mediaPath;

  const normalizedPath = mediaPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const assetPath = normalizedPath.startsWith('uploads/')
    ? normalizedPath
    : `uploads/${normalizedPath}`;

  return `${API_ORIGIN}/${assetPath.split('/').map(encodeURIComponent).join('/')}`;
};
