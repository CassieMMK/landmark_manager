import { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, GEO_KEY } from './lib/redis.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat(req.query.radius as string);

  if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius <= 0) {
    return res.status(400).json({ error: 'Invalid lat, lng, or radius' });
  }

  try {
    const redis = await getRedis();

    const results = await redis.call(
      'GEOSEARCH',
      GEO_KEY,
      'FROMLONLAT', lng, lat,
      'BYRADIUS', radius, 'km',
      'ASC',
      'COUNT', 100,
      'WITHDIST'
    ) as [string, string][];

    const nearby = results.map(([id, dist]) => ({
      id,
      distanceKm: parseFloat(dist),
    }));

    return res.status(200).json({ results: nearby });
  } catch (e: any) {
    return res.status(500).json({ error: 'Nearby search failed', detail: e?.message });
  }
}
