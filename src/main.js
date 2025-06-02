require('dotenv').config();
const Hapi = require('@hapi/hapi');
const routes = require('./routes/authRoutes.js');

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 5000,
    host: 'localhost',
    routes: {
      cors: { origin: ['*'] },
    },
  });

  server.route(routes);

  await server.start();
  console.log(`Server berjalan pada: ${server.info.uri}`);
};

init();
