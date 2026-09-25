import http from 'node:http';

process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';

async function runSimulation() {
  const m = await import('../../api/index.ts');
  const app = m.default;
  const server = http.createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', async () => {
      try {
        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Unable to bind server address');
        }
        const port = address.port;
        console.log(`[Simulation] Serverless Express bound to temporary port ${port}`);

        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        const data = await res.json();
        console.log('[Simulation] /api/health HTTP status:', res.status);
        console.log('[Simulation] /api/health body:', JSON.stringify(data));

        if (res.status === 200 && data.status === 'ok' && data.database === 'supabase') {
          console.log('✅ SERVERLESS SIMULATION SUCCESS: /api/health returned HTTP 200 with database: supabase');
          server.close(() => resolve());
        } else {
          server.close(() => reject(new Error(`Unexpected response: ${JSON.stringify(data)}`)));
        }
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

runSimulation()
  .then(() => {
    console.log('[Simulation] Finished successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Simulation Error]:', err);
    process.exit(1);
  });
