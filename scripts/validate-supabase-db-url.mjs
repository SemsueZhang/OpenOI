const fail = (reason) => {
  console.error(`SUPABASE_DB_URL: ${reason}`);
  process.exit(1);
};

const raw = process.env.SUPABASE_DB_URL ?? '';
if (!raw) fail('secret is missing or empty');
if (raw !== raw.trim()) fail('remove leading or trailing whitespace from the secret');
if (/\s/.test(raw)) fail('URI contains unencoded whitespace');

let url;
try {
  url = new URL(raw);
} catch {
  fail('URI cannot be parsed; percent-encode reserved password characters');
}

if (!['postgres:', 'postgresql:'].includes(url.protocol)) fail('scheme must be postgres:// or postgresql://');
if (url.username !== 'postgres.rnwojkpmsmypeaetxknr') fail('username must be postgres.rnwojkpmsmypeaetxknr');
if (!url.password) fail('database password is missing');
let password;
try {
  password = decodeURIComponent(url.password);
} catch {
  fail('password contains an invalid percent escape');
}
if (/^(?:\[YOUR-PASSWORD\]|YOUR-PASSWORD|URL_ENCODED_PASSWORD)$/i.test(password)) {
  fail('database password is a placeholder');
}
if (!/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname)) fail('host must be a Supabase session-pooler host');
if (url.port !== '5432') fail('port must be 5432 for the session pooler');
if (url.pathname !== '/postgres') fail('database path must be /postgres');
if ([...url.searchParams.keys()].length !== 1 || url.searchParams.get('sslmode') !== 'require') {
  fail('query must contain only sslmode=require');
}
if (url.hash) fail('URI fragment is not allowed; percent-encode # in the password');

console.log('OpenOI production database URI target and TLS settings validated');
