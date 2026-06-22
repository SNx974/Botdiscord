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
  extractedScoreA: number | null;
  extractedScoreB: number | null;
  presumedWinnerId: string | null;
  validations: ValidationEntry[];
}

export function ValidationPanel({
  matchId,
  teamAName,
  teamBName,
  teamAId,
  teamBId,
  result,
  currentUserId,
}: {
  matchId: string;
  teamAName: string;
  teamBName: string;
  teamAId: string;
  teamBId: string;
  result: ResultData | null;
  currentUserId: string | null;
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

  return (
    <div className="space-y-3 rounded border border-slate-800 p-4">
      <h2 className="font-semibold">Résultat scanné</h2>
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
    </div>
  );
}

function VoteBadge({ status }: { status: string }) {
  const color =
    status === "CONFIRMED" ? "text-emerald-400" : status === "REJECTED" ? "text-red-400" : "text-slate-400";
  return <span className={color}>{status}</span>;
}
