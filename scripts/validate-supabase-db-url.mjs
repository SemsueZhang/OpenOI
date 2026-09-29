const fail = () => {
  console.error('SUPABASE_DB_URL must be a TLS-enabled session-pooler PostgreSQL URI for the OpenOI project');
  process.exit(1);
};

const raw = process.env.SUPABASE_DB_URL ?? '';
if (/\s/.test(raw)) fail();

let url;
try {
  url = new URL(raw);
} catch {
  fail();
}

if (
  !['postgres:', 'postgresql:'].includes(url.protocol) ||
  url.username !== 'postgres.rnwojkpmsmypeaetxknr' ||
  !url.password ||
  !/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) ||
  url.port !== '5432' ||
  url.pathname !== '/postgres' ||
  [...url.searchParams.keys()].length !== 1 ||
  url.searchParams.get('sslmode') !== 'require' ||
  url.hash
) fail();

console.log('OpenOI production database URI target and TLS settings validated');
