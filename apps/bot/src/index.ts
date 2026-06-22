import { env } from "./env.js";
import { discordClient } from "./lib/discordClient.js";
import { startHttpServer } from "./http/server.js";
import { registerMessageRelay } from "./listeners/messageRelay.js";
import { registerWebToDiscordBridge } from "./listeners/webToDiscordBridge.js";
import { registerOcrResultAnnouncer } from "./listeners/ocrResultAnnouncer.js";
import { registerValidationReactions } from "./listeners/validationReactions.js";
import { registerMatchLockListener } from "./listeners/matchLockListener.js";

async function main() {
  registerMessageRelay();
  registerWebToDiscordBridge();
  registerOcrResultAnnouncer();
  registerValidationReactions();
  registerMatchLockListener();

  discordClient.once("ready", (c) => {
    console.log(`[bot] logged in as ${c.user.tag}`);
  });

  await discordClient.login(env.DISCORD_BOT_TOKEN);
  startHttpServer();
}

main().catch((err) => {
  console.error("[bot] fatal error during startup", err);
  process.exit(1);
});
