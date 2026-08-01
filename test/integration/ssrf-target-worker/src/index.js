const routes = Object.freeze({
  '/redirect-loopback': 'http://127.0.0.1/',
  '/redirect-metadata': 'http://169.254.169.254/latest/meta-data/',
  '/redirect-private-dns': 'http://127.0.0.1.sslip.io/',
});

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/public') {
      return new Response('controlled-public-target', {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-store',
        },
      });
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
