"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Supprimer ce match ? Le salon Discord associé sera aussi supprimé.")) return;

    setDeleting(true);
    const res = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      alert("Échec de la suppression du match.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={onDelete}
      disabled={deleting}
      className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950 disabled:opacity-50"
    >
      {deleting ? "Suppression..." : "Supprimer"}
    </button>
  );
}
