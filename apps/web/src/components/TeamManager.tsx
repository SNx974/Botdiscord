"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface TeamWithMembers {
  id: string;
  name: string;
  tag: string | null;
  members: { user: { id: string; username: string; discordId: string | null } }[];
}

export function TeamManager({ teams }: { teams: TeamWithMembers[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");

  async function createTeam(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, tag }),
    });
    setName("");
    setTag("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createTeam} className="flex items-end gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Nom de l&apos;équipe</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Tag</label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
          />
        </div>
        <button className="rounded bg-indigo-600 px-4 py-1.5 hover:bg-indigo-500">Créer</button>
      </form>

      <div className="space-y-4">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} onChanged={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function TeamCard({ team, onChanged }: { team: TeamWithMembers; onChanged: () => void }) {
  const [discordId, setDiscordId] = useState("");
  const [username, setUsername] = useState("");

  async function addMember(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/teams/${team.id}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ discordId, username }),
    });
    setDiscordId("");
    setUsername("");
    onChanged();
  }

  return (
    <div className="rounded border border-slate-800 p-4">
      <h3 className="font-semibold">
        {team.name} {team.tag && <span className="text-slate-400">[{team.tag}]</span>}
      </h3>
      <ul className="mt-2 space-y-1 text-sm text-slate-300">
        {team.members.map((m) => (
          <li key={m.user.id}>
            {m.user.username}{" "}
            {!m.user.discordId && <span className="text-amber-400">(pas de Discord lié)</span>}
          </li>
        ))}
      </ul>
      <form onSubmit={addMember} className="mt-3 flex gap-2">
        <input
          placeholder="Discord ID"
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          required
        />
        <input
          placeholder="Pseudo"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          required
        />
        <button className="rounded bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600">Ajouter</button>
      </form>
    </div>
  );
}
