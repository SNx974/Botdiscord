import Link from "next/link";
import { prisma } from "@/lib/db";
import { CreateMatchForm } from "@/components/CreateMatchForm";
import { DeleteMatchButton } from "@/components/DeleteMatchButton";

export default async function DashboardPage() {
  const [matches, teams] = await Promise.all([
    prisma.match.findMany({ include: { teamA: true, teamB: true }, orderBy: { createdAt: "desc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 text-2xl font-bold">Créer un match</h1>
        {teams.length < 2 ? (
          <p className="text-sm text-slate-400">
            Créez au moins deux équipes dans la page{" "}
            <Link href="/teams" className="text-indigo-400 underline">
              Équipes
            </Link>{" "}
            avant de lancer un match.
          </p>
        ) : (
          <CreateMatchForm teams={teams} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Matchs</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun match pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-2">
            {matches.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded border border-slate-800 p-3 hover:border-slate-600"
              >
                <Link href={`/matches/${m.id}`} className="flex-1">
                  <span className="font-medium">{m.teamA.name}</span> vs{" "}
                  <span className="font-medium">{m.teamB.name}</span>
                  <span className="ml-3 text-xs uppercase text-slate-400">{m.status}</span>
                </Link>
                <DeleteMatchButton matchId={m.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
