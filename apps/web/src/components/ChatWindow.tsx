"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  source: "WEB" | "DISCORD";
  content: string;
  attachmentUrl: string | null;
  authorName: string;
  createdAt: string;
}

export function ChatWindow({
  matchId,
  currentUserId,
  initialMessages,
}: {
  matchId: string;
  currentUserId: string | null;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL!, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("match:join", matchId);

    socket.on(
      "message:new",
      (payload: {
        source: "web" | "discord";
        content: string;
        attachmentUrl: string | null;
        authorName: string;
        createdAt: string;
        discordMsgId: string | null;
      }) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `${payload.discordMsgId ?? payload.createdAt}-${prev.length}`,
            source: payload.source === "discord" ? "DISCORD" : "WEB",
            content: payload.content,
            attachmentUrl: payload.attachmentUrl,
            authorName: payload.authorName,
            createdAt: payload.createdAt,
          },
        ]);
      }
    );

    return () => {
      socket.emit("match:leave", matchId);
      socket.disconnect();
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || !currentUserId || !socketRef.current) return;
    socketRef.current.emit("message:send", { matchId, userId: currentUserId, content: input });
    setInput("");
  }

  async function uploadScreenshot(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentUserId) return;

    const body = new FormData();
    body.append("file", file);
    await fetch(`/api/matches/${matchId}/screenshot`, { method: "POST", body });
  }

  return (
    <div className="rounded border border-slate-800">
      <div className="h-80 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className={m.source === "DISCORD" ? "text-indigo-400" : "text-emerald-400"}>
              {m.source === "DISCORD" ? "🎮" : "🌐"} {m.authorName}
            </span>
            <span className="text-slate-200">: {m.content}</span>
            {m.attachmentUrl && (
              <a
                href={m.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-indigo-400 underline"
              >
                pièce jointe
              </a>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="flex border-t border-slate-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={currentUserId ? "Écrire un message..." : "Connectez-vous pour écrire"}
          disabled={!currentUserId}
          className="flex-1 bg-slate-900 px-3 py-2 text-sm outline-none disabled:opacity-50"
        />
        <button
          disabled={!currentUserId}
          className="px-4 text-sm text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
        >
          Envoyer
        </button>
        <label className="flex cursor-pointer items-center px-3 text-sm text-slate-400 hover:text-slate-200">
          📸
          <input type="file" accept="image/*" onChange={uploadScreenshot} disabled={!currentUserId} hidden />
        </label>
      </form>
    </div>
  );
}
