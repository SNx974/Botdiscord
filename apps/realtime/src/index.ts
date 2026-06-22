import { env } from "./env.js";
import { createServer } from "./server.js";
import { registerSocketHandlers } from "./socketHandlers.js";
import { registerRedisToSocketBridge } from "./bridges/redisToSocket.js";

const { httpServer, io } = createServer();

registerSocketHandlers(io);
registerRedisToSocketBridge(io);

httpServer.listen(env.REALTIME_PORT, () => {
  console.log(`[realtime] listening on :${env.REALTIME_PORT}`);
});
