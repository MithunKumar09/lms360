/**
 * Fetcher utility for SWR
 * Standard fetch wrapper for API calls
 */

export async function fetcher(url) {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.info = await res.json().catch(() => ({}));
    error.status = res.status;
    throw error;
  }
  
  return res.json();
}
