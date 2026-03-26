const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
// Strip trailing /api from the origin so withApiOrigin('/api/auth/…') never produces /api/api/…
const rawOrigin = import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_API_URL || '';
const apiOriginFromEnv = trimTrailingSlash(rawOrigin).replace(/\/api$/, '');
export const API_ORIGIN = apiOriginFromEnv;

export const API_V1_BASE = import.meta.env.VITE_API_V1_BASE
  ? trimTrailingSlash(import.meta.env.VITE_API_V1_BASE)
  : (API_ORIGIN ? `${API_ORIGIN}/api` : '/api');

export const withApiOrigin = (path: string) => {
  if (!API_ORIGIN || /^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};
