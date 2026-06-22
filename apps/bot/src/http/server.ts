import express from "express";
import { INTERNAL_API_KEY_HEADER, type CreateMatchChannelRequest } from "@akd/shared";
import { env } from "../env.js";
import { createMatchChannel } from "../services/channelManager.js";

export function startHttpServer() {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (req.headers[INTERNAL_API_KEY_HEADER] !== env.INTERNAL_API_KEY) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  });

  app.post("/internal/matches/:matchId/channel", async (req, res) => {
    try {
      const body = req.body as Omit<CreateMatchChannelRequest, "matchId">;
      const result = await createMatchChannel({ matchId: req.params.matchId, ...body });
      res.json(result);
    } catch (err) {
      console.error("Failed to create match channel", err);
      res.status(500).json({ error: "channel_creation_failed" });
    }
  });

  app.listen(env.BOT_HTTP_PORT, () => {
    console.log(`[bot] internal API listening on :${env.BOT_HTTP_PORT}`);
  });
}
