import { redis } from '../lib/redis';

const ADMIN_STATS_CACHE_PREFIX = 'admin:stats';
const ADMIN_STATS_CACHE_TTL_SECONDS = 15 * 60;

function getAdminStatsCacheKey(semester: string) {
  return `${ADMIN_STATS_CACHE_PREFIX}:${encodeURIComponent(semester.trim())}`;
}

export async function getCachedAdminStats<T>(semester: string) {
  const cacheValue = await redis.get(getAdminStatsCacheKey(semester));
  if (!cacheValue) {
    return null;
  }

  try {
    return JSON.parse(cacheValue) as T;
  } catch {
    return null;
  }
}

export async function setCachedAdminStats(semester: string, value: unknown) {
  await redis.set(
    getAdminStatsCacheKey(semester),
    JSON.stringify(value),
    'EX',
    ADMIN_STATS_CACHE_TTL_SECONDS,
  );
}

export async function clearCachedAdminStats(semester: string) {
  await redis.del(getAdminStatsCacheKey(semester));
}
