/**
 * WAKE App tile-cache Service Worker.
 *
 * @fileoverview Caches OSM, OpenSeaMap, NOAA, and depth tile responses
 * with a stale-while-revalidate strategy so previously-viewed map area
 * keeps working when the boat is out of cell range. Only intercepts
 * GET requests to known tile hosts — everything else passes through.
 *
 * @author David Seguin
 */

/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'wake-tiles-v1';

// Hosts whose responses we cache. Anything else passes through untouched.
const TILE_HOSTS = [
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
  'tiles.openseamap.org',
  't1.openseamap.org',
  't2.openseamap.org',
  't3.openseamap.org',
  'tileservice.charts.noaa.gov',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  let url;
  try { url = new URL(event.request.url); } catch (e) { return; }
  if (!TILE_HOSTS.includes(url.hostname)) return;

  event.respondWith(staleWhileRevalidate(event.request));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Background refresh — best effort; failures are silent so cached tiles
  // still serve when the user is offline.
  const networkPromise = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => null);

  if (cached) return cached;
  const fresh = await networkPromise;
  if (fresh) return fresh;
  return new Response('', { status: 504, statusText: 'Tile unavailable offline' });
}
