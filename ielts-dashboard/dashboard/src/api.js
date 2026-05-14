import { useEffect, useState } from 'react';

const BASE = '/api';

export async function fetchJSON(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchJSON(path)
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => { if (alive) setError(e); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path]);

  return { data, error, loading };
}
