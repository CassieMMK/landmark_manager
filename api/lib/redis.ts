import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';

<<<<<<< HEAD
=======
const useTls = REDIS_URL.startsWith('rediss://') || process.env.REDIS_TLS === '1';

>>>>>>> 979bd6411cc2aee0d47a2e7dc56e7a7fd957e607
let redis: Redis | null = null;

export async function getRedis(): Promise<Redis> {
  if (!redis) {
<<<<<<< HEAD
    const url = new URL(REDIS_URL);
    redis = new Redis({
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      username: url.username || 'default',
      password: decodeURIComponent(url.password),
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
    });
=======
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 5000,
      ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
    });
    redis.on('error', () => {});
    await redis.connect();
>>>>>>> 979bd6411cc2aee0d47a2e7dc56e7a7fd957e607
  }
  return redis;
}

export const GEO_KEY = 'landmarks:geo';
