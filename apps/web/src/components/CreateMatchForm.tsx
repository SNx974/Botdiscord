"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface TeamOption {
  id: string;
  name: string;
}

export function CreateMatchForm({ teams }: { teams: TeamOption[] }) {
  const router = useRouter();
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamAId, teamBId }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erreur lors de la création du match");
      return;
    }

    const match = await res.json();
    router.push(`/matches/${match.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-sm text-slate-400">Équipe A</label>
        <select
          value={teamAId}
          onChange={(e) => setTeamAId(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
          required
        >
          <option value="">Sélectionner...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Équipe B</label>
        <select
          value={teamBId}
          onChange={(e) => setTeamBId(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
          required
        >
          <option value="">Sélectionner...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={loading}
        className="rounded bg-indigo-600 px-4 py-1.5 hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? "Création..." : "Créer le match"}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
