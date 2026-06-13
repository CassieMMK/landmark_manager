import { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, GEO_KEY } from './lib/redis.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const redisUrl = process.env.REDIS_URL || '';
    if (!redisUrl) {
      return res.status(200).json({ status: 'error', error: 'REDIS_URL not configured' });
    }

    const redis = await getRedis();
    const pong = await redis.ping();
    const geoCount = await redis.zcard(GEO_KEY);

    return res.status(200).json({
      status: 'connected',
      ping: pong,
      geoKeyCount: geoCount,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return res.status(200).json({ status: 'error', error: e?.message });
  }
}
