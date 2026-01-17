// Supabase REST API helpers (no npm dependencies)
// Works reliably in Cloudflare Workers

export function getSupabaseConfig(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }
  return { url: url.replace(/\/+$/, ''), key };
}

function sbHeaders(env, extra = {}) {
  const { key } = getSupabaseConfig(env);
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// SELECT query
export async function sbSelect(env, table, query = '', columns = '*') {
  const { url } = getSupabaseConfig(env);
  const queryStr = query ? `${query}&` : '';
  const res = await fetch(
    `${url}/rest/v1/${table}?${queryStr}select=${encodeURIComponent(columns)}`,
    { headers: sbHeaders(env) }
  );
  if (!res.ok) {
    const text = await res.text();
    console.error(`Supabase select ${table} error`, res.status, text);
    throw new Error(`Supabase error: ${text}`);
  }
  return res.json();
}

// SELECT single row
export async function sbSelectOne(env, table, filterQuery, columns = '*') {
  const { url } = getSupabaseConfig(env);
  const res = await fetch(
    `${url}/rest/v1/${table}?${filterQuery}&select=${encodeURIComponent(columns)}&limit=1`,
    { headers: sbHeaders(env) }
  );
  if (!res.ok) {
    const text = await res.text();
    console.error(`Supabase selectOne ${table} error`, res.status, text);
    return null;
  }
  const data = await res.json();
  return data[0] || null;
}

// INSERT
export async function sbInsert(env, table, rows, returning = false) {
  const { url } = getSupabaseConfig(env);
  const prefer = returning ? 'return=representation' : 'return=minimal';
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders(env, { Prefer: prefer }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Supabase insert ${table} error`, res.status, text);
    throw new Error(`Supabase error: ${text}`);
  }
  if (returning) {
    return res.json();
  }
  return null;
}

// UPDATE
export async function sbUpdate(env, table, filterQuery, patch, returning = false) {
  const { url } = getSupabaseConfig(env);
  const prefer = returning ? 'return=representation' : 'return=minimal';
  const res = await fetch(`${url}/rest/v1/${table}?${filterQuery}`, {
    method: 'PATCH',
    headers: sbHeaders(env, { Prefer: prefer }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Supabase update ${table} error`, res.status, text);
    throw new Error(`Supabase error: ${text}`);
  }
  if (returning) {
    return res.json();
  }
  return null;
}

// DELETE
export async function sbDelete(env, table, filterQuery) {
  const { url } = getSupabaseConfig(env);
  const res = await fetch(`${url}/rest/v1/${table}?${filterQuery}`, {
    method: 'DELETE',
    headers: sbHeaders(env, { Prefer: 'return=minimal' }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Supabase delete ${table} error`, res.status, text);
    throw new Error(`Supabase error: ${text}`);
  }
  return true;
}

// UPSERT
export async function sbUpsert(env, table, rows, keyCols, returning = false) {
  const { url } = getSupabaseConfig(env);
  const onConflict = Array.isArray(keyCols) ? keyCols.join(',') : keyCols;
  const prefer = returning
    ? 'resolution=merge-duplicates,return=representation'
    : 'resolution=merge-duplicates';
  const res = await fetch(
    `${url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: 'POST',
      headers: sbHeaders(env, { Prefer: prefer }),
      body: JSON.stringify(rows),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    console.error(`Supabase upsert ${table} error`, res.status, text);
    throw new Error(`Supabase error: ${text}`);
  }
  if (returning) {
    return res.json();
  }
  return null;
}

// RPC (call database function)
export async function sbRpc(env, functionName, params = {}) {
  const { url } = getSupabaseConfig(env);
  const res = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: sbHeaders(env),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Supabase RPC ${functionName} error`, res.status, text);
    throw new Error(`Supabase RPC error: ${text}`);
  }
  return res.json();
}
