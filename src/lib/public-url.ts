export function requirePublicHttpsBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('PUBLIC_BASE_URL must be an HTTPS origin without a path.');
  return url.origin;
}
