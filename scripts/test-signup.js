const fs = require('fs');
const path = require('path');

function readEnvFile(file) {
  try {
    const txt = fs.readFileSync(file, 'utf8');
    const lines = txt.split(/\r?\n/);
    const env = {};
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
    return env;
  } catch (e) {
    console.error('Could not read', file, e.message);
    process.exit(1);
  }
}

async function main() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  const env = readEnvFile(envPath);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const endpoint = `${url.replace(/\/$/, '')}/auth/v1/signup`;
  const body = { email: 'debug+test@example.com', password: 'Pass1234!' };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

main();
