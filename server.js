#!/usr/bin/env node

const http = require("http");

const app = require("./src/app");
const env = require("./src/config/env");
const { connectDatabase } = require("./src/config/database");

const normalizePort = (value) => {
  const port = parseInt(value, 10);
  if (Number.isNaN(port)) return value;
  return port >= 0 ? port : false;
};

const port = normalizePort(env.port);
app.set("port", port);

const server = http.createServer(app);

const onError = (error) => {
  if (error.syscall !== "listen") throw error;

  const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`;

  switch (error.code) {
    case "EACCES":
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListening = () => {
  const address = server.address();
  const bind =
    typeof address === "string" ? `pipe ${address}` : `port ${address.port}`;
  console.log(`Listening on ${bind}`);
};

// Connect to the database first, then start listening
connectDatabase()
  .then(() => {
    console.log("****************************");
    console.log("*    Starting Server");
    console.log(`*    Port: ${port}`);
    console.log("*    Database: MongoDB");
    console.log("*    DB Connection: OK");
    console.log("****************************");

    server.listen(port);
    server.on("error", onError);
    server.on("listening", onListening);
  })
  .catch((error) => {
    console.error(`Could not connect to MongoDB: ${error.message}`);
    process.exit(1);
  });
