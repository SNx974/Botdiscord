import { prisma } from "@/lib/db";
import { TeamManager } from "@/components/TeamManager";

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    include: { members: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Équipes</h1>
      <TeamManager teams={teams} />
    </div>
  );
}
