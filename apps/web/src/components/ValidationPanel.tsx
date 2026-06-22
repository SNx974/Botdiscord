"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

interface ValidationEntry {
  teamId: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
}

interface ResultData {
  id: string;
  screenshotUrl: string;
  extractedScoreA: number | null;
  extractedScoreB: number | null;
  presumedWinnerId: string | null;
  validations: ValidationEntry[];
}

export function ValidationPanel({
  matchId,
  matchStatus,
  teamAName,
  teamBName,
  teamAId,
  teamBId,
  winnerName,
  result,
  currentUserId,
  isAdmin,
}: {
  matchId: string;
  matchStatus: string;
  teamAName: string;
  teamBName: string;
  teamAId: string;
  teamBId: string;
  winnerName: string | null;
  result: ResultData | null;
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL!, { transports: ["websocket"] });
    socket.emit("match:join", matchId);
    socket.on("validation:update", () => router.refresh());
    return () => {
      socket.disconnect();
    };
  }, [matchId, router]);

  if (matchStatus === "COMPLETED") {
    return (
      <div className="rounded border border-emerald-900 bg-emerald-950/40 p-4">
        <h2 className="font-semibold text-emerald-400">✅ Match terminé</h2>
        <p className="mt-1 text-sm text-slate-300">
          Vainqueur : <span className="font-medium">{winnerName ?? "—"}</span>
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <p className="text-sm text-slate-400">
        Aucun résultat scanné pour l&apos;instant — postez un screenshot de fin de partie dans le chat ou sur
        Discord.
      </p>
    );
  }

  const teamAVote = result.validations.find((v) => v.teamId === teamAId)?.status ?? "PENDING";
  const teamBVote = result.validations.find((v) => v.teamId === teamBId)?.status ?? "PENDING";

  async function vote(status: "CONFIRMED" | "REJECTED") {
    setSubmitting(true);
    await fetch(`/api/matches/${matchId}/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSubmitting(false);
    router.refresh();
  }

  async function adminResolve(winnerTeamId: string) {
    if (!confirm("Clôturer le match avec cette équipe comme vainqueur ? Action immédiate, sans validation des équipes."))
      return;
    setSubmitting(true);
    await fetch(`/api/matches/${matchId}/admin-resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ winnerTeamId }),
    });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded border border-slate-800 p-4">
      <h2 className="font-semibold">Résultat scanné</h2>

      <img
        src={result.screenshotUrl}
        alt="Screenshot du résultat"
        className="max-h-80 w-full rounded border border-slate-800 object-contain"
      />

      <p className="text-lg">
        {teamAName} <span className="font-mono">{result.extractedScoreA ?? "?"}</span> -{" "}
        <span className="font-mono">{result.extractedScoreB ?? "?"}</span> {teamBName}
      </p>
      <div className="flex gap-6 text-sm">
        <span>
          {teamAName}: <VoteBadge status={teamAVote} />
        </span>
        <span>
          {teamBName}: <VoteBadge status={teamBVote} />
        </span>
      </div>
      {currentUserId && (
        <div className="flex gap-3">
          <button
            disabled={submitting}
            onClick={() => vote("CONFIRMED")}
            className="rounded bg-emerald-600 px-4 py-1.5 text-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            ✅ Valider
          </button>
          <button
            disabled={submitting}
            onClick={() => vote("REJECTED")}
            className="rounded bg-red-600 px-4 py-1.5 text-sm hover:bg-red-500 disabled:opacity-50"
          >
            ❌ Contester
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="rounded border border-amber-900 bg-amber-950/30 p-3">
          <p className="mb-2 text-xs uppercase text-amber-400">Statuer en tant qu&apos;admin (clôture immédiate)</p>
          <div className="flex gap-3">
            <button
              disabled={submitting}
              onClick={() => adminResolve(teamAId)}
              className="rounded bg-amber-700 px-3 py-1.5 text-sm hover:bg-amber-600 disabled:opacity-50"
            >
              Victoire {teamAName}
            </button>
            <button
              disabled={submitting}
              onClick={() => adminResolve(teamBId)}
              className="rounded bg-amber-700 px-3 py-1.5 text-sm hover:bg-amber-600 disabled:opacity-50"
            >
              Victoire {teamBName}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VoteBadge({ status }: { status: string }) {
  const color =
    status === "CONFIRMED" ? "text-emerald-400" : status === "REJECTED" ? "text-red-400" : "text-slate-400";
  return <span className={color}>{status}</span>;
}
