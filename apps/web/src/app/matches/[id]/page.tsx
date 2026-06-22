import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, Role } from "@akd/db";
import { ChatWindow } from "@/components/ChatWindow";
import { ValidationPanel } from "@/components/ValidationPanel";

export default async function MatchPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      teamA: true,
      teamB: true,
      winner: true,
      messages: { orderBy: { createdAt: "asc" }, take: 200, include: { author: true } },
      results: { orderBy: { createdAt: "desc" }, take: 1, include: { validations: true } },
    },
  });

  if (!match) notFound();

  const latestResult = match.results[0] ?? null;
  const locked = match.status === "COMPLETED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {match.teamA.name} vs {match.teamB.name}
        </h1>
        <p className="text-sm uppercase text-slate-400">{match.status}</p>
      </div>

      <ValidationPanel
        matchId={match.id}
        matchStatus={match.status}
        teamAName={match.teamA.name}
        teamBName={match.teamB.name}
        teamAId={match.teamAId}
        teamBId={match.teamBId}
        winnerName={match.winner?.name ?? null}
        result={latestResult}
        currentUserId={session?.user.id ?? null}
        isAdmin={session?.user.role === Role.ADMIN}
      />

      <ChatWindow
        matchId={match.id}
        currentUserId={session?.user.id ?? null}
        locked={locked}
        initialMessages={match.messages.map((m) => ({
          id: m.id,
          source: m.source,
          content: m.content,
          attachmentUrl: m.attachmentUrl,
          authorName: m.author?.username ?? (m.source === "DISCORD" ? "Discord" : "Web"),
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
