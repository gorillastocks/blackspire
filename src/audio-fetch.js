// Fetching bundled audio under Capacitor iOS.
// Capacitor's WebViewAssetHandler answers requests for media extensions (mp3, m4a, wav, aac, mp4, ...) with a plain
// URLResponse (not an HTTPURLResponse), so WKWebView's fetch() reports status 0 and ok === false even though the
// body is complete and decodable (ionic-team/capacitor#7794). A plain `if (!r.ok) throw` therefore rejected EVERY
// bundled voice, narrator, music and SFX clip in the TestFlight app while the web build (real HTTP 200) worked.

/** True for a usable audio response: HTTP 2xx, or a Capacitor status-0 response for a bundled file. */
export function audioResponseOk(r) {
  if (!r) return false;
  if (r.ok) return true;
  return r.status === 0 && r.type !== 'opaque' && r.type !== 'opaqueredirect' && r.type !== 'error';
}

/** fetch() a bundled audio file and return its bytes; throws on a real HTTP error (404, 500, ...). */
export async function fetchAudioBytes(url, label = 'audio') {
  const r = await fetch(url);
  if (!audioResponseOk(r)) throw new Error(`${label} ${url} ${r.status}`);
  return r.arrayBuffer();
}
