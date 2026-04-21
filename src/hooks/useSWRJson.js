import useSWR from "swr";

const abortableFetcher = (url) => {
  const controller = new AbortController();
  const signal = controller.signal;
  const p = fetch(url, { headers: { accept: "application/json" }, signal }).then(async (r) => {
    const etag = r.headers.get("etag") || null;
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(json?.error || `HTTP ${r.status}`);
      err.status = r.status;
      throw err;
    }
    return Object.assign(json, { __etag: etag });
  });
  p.cancel = () => controller.abort();
  return p;
};

export function useSWRJson(key, opts = {}) {
  return useSWR(key, abortableFetcher, { revalidateOnFocus: false, ...opts });
}

export default useSWRJson;


