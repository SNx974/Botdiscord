import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import {
  INTERNAL_API_KEY_HEADER,
  matchRoom,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@akd/shared";
import { env } from "./env.js";

export function createServer() {
  const app = express();
  app.use(cors({ origin: env.NEXTAUTH_URL }));
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true }));

  const httpServer = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: env.NEXTAUTH_URL },
  });

  // Lets other backend services (e.g. the web app's HTTP-only upload route,
  // which isn't a connected socket client) push an event into a match room.
  app.post("/internal/broadcast", (req, res) => {
    if (req.headers[INTERNAL_API_KEY_HEADER] !== env.INTERNAL_API_KEY) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const { matchId, event, payload } = req.body ?? {};
    if (!matchId || !event) {
      res.status(400).json({ error: "matchId_and_event_required" });
      return;
    }
    io.to(matchRoom(matchId)).emit(event, payload);
    res.json({ ok: true });
  });

  return { httpServer, io };
}
