import { config } from './index';

export const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
];

export function getAllowedOrigins(): Set<string> {
  const envOrigins = [
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : []),
    ...(config.frontendUrl ? config.frontendUrl.split(',').map((s) => s.trim()) : []),
  ];
  return new Set([...defaultAllowedOrigins, ...envOrigins].filter(Boolean));
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = getAllowedOrigins();
  return allowed.has(origin);
}
