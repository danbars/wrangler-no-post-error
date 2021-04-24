/**
 * This the entrypoint for the cloudflare workers
 */

// import { handler } from './handler';

async function fetchAndApply(event) {
  try {
    // return await handler(event);
    return new Response("hello world");
  } catch (err) {
    console.log('Global catch caught', err);
    // eslint-disable-next-line no-undef
    return new Response(err.message);
  }
}

// eslint-disable-next-line no-undef,no-restricted-globals
addEventListener('fetch', (event) => {
  event.respondWith(fetchAndApply(event));
});
