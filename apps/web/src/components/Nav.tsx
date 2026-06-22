"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";

interface NavUser {
  name?: string | null;
  image?: string | null;
}

export function Nav({ user }: { user: NavUser | null }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Matchmaking AKD
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/teams" className="text-slate-300 hover:text-white">
            Équipes
          </Link>
          {user ? (
            <button onClick={() => signOut()} className="rounded bg-slate-800 px-3 py-1.5 hover:bg-slate-700">
              Déconnexion ({user.name})
            </button>
          ) : (
            <button
              onClick={() => signIn("discord")}
              className="rounded bg-indigo-600 px-3 py-1.5 hover:bg-indigo-500"
            >
              Connexion Discord
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
