import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getRedis, GEO_KEY } from './lib/redis.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase env vars', supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
    }

    const redisUrl = process.env.REDIS_URL || '';
    if (!redisUrl) {
      return res.status(500).json({ error: 'Missing REDIS_URL env var' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: landmarks, error } = await supabase
      .from('landmarks')
      .select('id, latitude, longitude');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch landmarks from Supabase', detail: error.message });
    }

    if (!landmarks || landmarks.length === 0) {
      return res.status(200).json({ message: 'No landmarks to sync', count: 0 });
    }

    const redis = await getRedis();
    await redis.del(GEO_KEY);

    const pipeline = redis.pipeline();
    for (const lm of landmarks) {
      pipeline.geoadd(GEO_KEY, lm.longitude, lm.latitude, lm.id);
    }
    await pipeline.exec();

    return res.status(200).json({ message: 'Sync complete', count: landmarks.length });
  } catch (e: any) {
    return res.status(500).json({ error: 'Sync failed', detail: e?.message, stack: e?.stack?.split('\n').slice(0, 5) });
  }
}
