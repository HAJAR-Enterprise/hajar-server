require('dotenv').config();
const Hapi = require('@hapi/hapi');
const routes = require('./routes/routes.js');

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: 'localhost',
    routes: {
      cors: {
        origin: ['*'], // atau ['http://localhost:3000']
        headers: ['Accept', 'Content-Type', 'Authorization', 'X-Custom-Header'],
        additionalHeaders: ['Access-Control-Allow-Origin'],
        credentials: true,
      },
    },
  });

  server.route(routes);

  await server.start();
  console.log(`Server berjalan pada: ${server.info.uri}`);
  console.log(
    '[🧾 ROUTES]',
    server.table().map((r) => `${r.method.toUpperCase()} ${r.path}`)
  );
  server.events.on('response', (request) => {
    const { method, path, info, response } = request;
    const statusCode = response?.statusCode || 0;

    console.log(
      `[${new Date().toISOString()}] ${
        info.remoteAddress
      } → ${method.toUpperCase()} ${path} → ${statusCode}`
    );
  });
};

init();
