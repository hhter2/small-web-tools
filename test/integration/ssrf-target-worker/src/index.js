const routes = Object.freeze({
  '/redirect-loopback': 'http://127.0.0.1/',
  '/redirect-metadata': 'http://169.254.169.254/latest/meta-data/',
  '/redirect-private-dns': 'http://127.0.0.1.sslip.io/',
});

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/public') {
      return new Response('controlled-public-target', {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-store',
        },
      });
    }
    if (url.pathname === '/slow') {
      await new Promise((resolve) => setTimeout(resolve, 7000));
      return new Response('late-response', { headers: { 'Content-Type': 'text/plain' } });
    }
    const location = routes[url.pathname];
    if (location) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: location,
          'Cache-Control': 'no-store',
        },
      });
    }
    return new Response('Not found', { status: 404 });
  },
};
