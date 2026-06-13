import type { Plugin } from 'vite';
import { config } from 'dotenv';

config();

export function viteApiPlugin(): Plugin {
  return {
    name: 'vite-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost');
        const route = url.pathname;

        // Dynamically import handlers
        try {
          if (route === '/api/geo-test') {
            const { getRedis, GEO_KEY } = await import('./api/lib/redis');
            try {
              const redis = await getRedis();
              const pong = await redis.ping();
              const geoCount = await redis.zcard(GEO_KEY);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'connected', ping: pong, geoKeyCount: geoCount, timestamp: new Date().toISOString() }));
            } catch (e: any) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'error', error: e?.message }));
            }
          } else if (route === '/api/geo-nearby') {
            const lat = parseFloat(url.searchParams.get('lat') || '');
            const lng = parseFloat(url.searchParams.get('lng') || '');
            const radius = parseFloat(url.searchParams.get('radius') || '');

            if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius <= 0) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid lat, lng, or radius' }));
              return;
            }

            const { getRedis, GEO_KEY } = await import('./api/lib/redis');
            try {
              const redis = await getRedis();
              const results = await redis.call(
                'GEOSEARCH', GEO_KEY,
                'FROMLONLAT', lng, lat,
                'BYRADIUS', radius, 'km',
                'ASC', 'COUNT', 100, 'WITHDIST'
              ) as [string, string][];
              const nearby = results.map(([id, dist]) => ({ id, distanceKm: parseFloat(dist) }));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ results: nearby }));
            } catch (e: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Nearby search failed', detail: e?.message }));
            }
          } else if (route === '/api/geo-update') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              try {
                const { action, id, latitude, longitude } = JSON.parse(body);
                const { getRedis, GEO_KEY } = await import('./api/lib/redis');
                const redis = await getRedis();
                if (action === 'add') {
                  await redis.geoadd(GEO_KEY, longitude, latitude, id);
                } else if (action === 'remove') {
                  await redis.zrem(GEO_KEY, id);
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e?.message }));
              }
            });
          } else if (route === '/api/geo-sync') {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }
            const { createClient } = await import('@supabase/supabase-js');
            const { getRedis, GEO_KEY } = await import('./api/lib/redis');
            const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
            const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { data: landmarks, error } = await supabase.from('landmarks').select('id, latitude, longitude');
            if (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to fetch landmarks', detail: error.message }));
              return;
            }
            if (!landmarks || landmarks.length === 0) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ message: 'No landmarks to sync', count: 0 }));
              return;
            }
            const redis = await getRedis();
            await redis.del(GEO_KEY);
            const pipeline = redis.pipeline();
            for (const lm of landmarks) {
              pipeline.geoadd(GEO_KEY, lm.longitude, lm.latitude, lm.id);
            }
            await pipeline.exec();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Sync complete', count: landmarks.length }));
          } else {
            next();
          }
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal error', detail: e?.message }));
        }
      });
    },
  };
}
