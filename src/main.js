const Hapi = require("@hapi/hapi");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const channelRoutes = require("./routes/channel");
const videoRoutes = require("./routes/video");
const commentRoutes = require("./routes/comment");
const reportRoutes = require("./routes/report");
const { authMiddleware } = require("./middleware/auth");

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: "localhost",
    routes: {
      cors: {
        origin: ["*"], 
        headers: ["Authorization", "Content-Type"], 
        additionalHeaders: ["cache-control", "x-requested-with"],
        credentials: true, 
      },
    },
  });

  // Register routes
  server.route([
    ...authRoutes.map((route) => ({ ...route, options: { auth: false } })), 
    ...channelRoutes,
    ...videoRoutes,
    ...commentRoutes,
    ...reportRoutes,
  ]);

  // Register middleware for protected routes
  server.ext("onPreAuth", async (request, h) => {
    return authMiddleware(request, h);
  });

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection:", err);
  process.exit(1);
});

init();
