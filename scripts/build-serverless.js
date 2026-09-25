import esbuild from 'esbuild';

async function buildServerless() {
  console.log('[build-serverless] Bundling serverless entrypoint for Vercel...');
  await esbuild.build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    define: {
      'process.env.VERCEL': '"1"',
    },
    external: [
      'express',
      'cors',
      '@supabase/supabase-js',
      'bcryptjs',
      'jsonwebtoken',
      'node:*',
    ],
    outfile: 'api/index.ts',
  });
  console.log('[build-serverless] Successfully generated standalone api/index.ts');
}

buildServerless().catch((err) => {
  console.error('[build-serverless] Build failed:', err);
  process.exit(1);
});
