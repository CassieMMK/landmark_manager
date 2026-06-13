import { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, GEO_KEY } from './lib/redis.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, id, latitude, longitude } = req.body || {};

  if (!action || !id) {
    return res.status(400).json({ error: 'Missing action or id' });
  }

  try {
    const redis = await getRedis();

    if (action === 'add') {
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: 'Missing latitude or longitude for add action' });
      }
      await redis.geoadd(GEO_KEY, longitude, latitude, id);
      return res.status(200).json({ message: 'Added to geo index', id });
    }

    if (action === 'remove') {
      await redis.zrem(GEO_KEY, id);
      return res.status(200).json({ message: 'Removed from geo index', id });
    }

    return res.status(400).json({ error: 'Invalid action. Use "add" or "remove".' });
  } catch (e: any) {
    return res.status(500).json({ error: 'Update failed', detail: e?.message });
  }
}
