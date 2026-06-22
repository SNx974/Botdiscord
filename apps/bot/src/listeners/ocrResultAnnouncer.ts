import { prisma } from "@akd/db";
import type { OcrScanResult } from "@akd/shared";
import { redisSub } from "../lib/redis.js";
import { discordClient } from "../lib/discordClient.js";

const OCR_RESULT_PATTERN = "match:*:ocr-result";
const CONFIRM = "✅";
const REJECT = "❌";

export function registerOcrResultAnnouncer() {
  redisSub.psubscribe(OCR_RESULT_PATTERN);

  redisSub.on("pmessage", async (pattern, _channel, raw) => {
    if (pattern !== OCR_RESULT_PATTERN) return;

    let payload: OcrScanResult;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    const discordChannel = await prisma.discordChannel.findUnique({ where: { matchId: payload.matchId } });
    if (!discordChannel) return;

    const match = await prisma.match.findUnique({
      where: { id: payload.matchId },
      include: { teamA: true, teamB: true },
    });
    if (!match) return;

    const channel = await discordClient.channels.fetch(discordChannel.channelId);
    if (!channel || !channel.isTextBased() || !("send" in channel)) return;

    const winnerName =
      payload.presumedWinnerTeamId === match.teamAId
        ? match.teamA.name
        : payload.presumedWinnerTeamId === match.teamBId
          ? match.teamB.name
          : "indéterminé";

    const confidenceNote =
      payload.confidence === "unparsed"
        ? "\n⚠️ Score non détecté automatiquement — vérifiez manuellement avant de valider."
        : "";

    const sent = await channel.send(
      `📊 **Résultat scanné** : ${match.teamA.name} ${payload.extractedScoreA ?? "?"} - ${
        payload.extractedScoreB ?? "?"
      } ${match.teamB.name}\n🏆 Gagnant présumé : **${winnerName}**${confidenceNote}\n\n` +
        `Les deux équipes doivent valider avec ${CONFIRM} ou contester avec ${REJECT}.`
    );

    await sent.react(CONFIRM);
    await sent.react(REJECT);

    await prisma.matchResult.update({
      where: { id: payload.resultId },
      data: { announcementMsgId: sent.id },
    });
  });
}
