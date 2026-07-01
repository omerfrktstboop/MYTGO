import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageCircle } from "lucide-react";

import { useDashboard } from "../../state/dashboard.jsx";
import { apiRequest } from "../../services/apiClient";
import { createRealtimeSocket } from "../../services/realtime.js";
import { Panel, EmptyState } from "../../dashboard/shared.jsx";

export default function ChatPanel() {
  const { token, user, conversations } = useDashboard();
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const socketRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === Number(selectedId)),
    [selectedId, conversations],
  );

  useEffect(() => {
    if (!activeConversation && conversations[0]) {
      setSelectedId(conversations[0].id);
    }
  }, [activeConversation, conversations]);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return undefined;
    }

    apiRequest(`/api/v1/conversations/${activeConversation.id}/messages`, { token }).then(setMessages);
    const socket = createRealtimeSocket(`/ws/chat/${activeConversation.id}`, token);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "chat_message") {
        setMessages((current) => [...current, payload.message]);
      }
    };
    return () => socket.close();
  }, [activeConversation?.id, token]);

  function send(event) {
    event.preventDefault();
    const text = content.trim();
    if (!text || socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    socketRef.current.send(JSON.stringify({ content: text }));
    setContent("");
  }

  return (
    <Panel title="Chat" icon={MessageCircle}>
      {!activeConversation ? (
        <EmptyState title="Görüşme yok" description="Yeni sohbetler ve operasyon mesajları burada görünür." />
      ) : (
        <>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Görüşme</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {conversations.map((conversation) => (
                <option key={conversation.id} value={conversation.id}>
                  #{conversation.id} Müşteri {conversation.customer_id} / Usta {conversation.mechanic_id}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid h-[420px] content-end gap-2 overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                  message.sender_id === user.id
                    ? "ml-auto bg-gradient-to-r from-red-600 to-red-700 text-white"
                    : "mr-auto bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={send}>
            <input
              className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-white transition hover:-translate-y-0.5 dark:bg-slate-100 dark:text-slate-950"
              type="submit"
              title="Gönder"
            >
              <Send size={19} />
            </button>
          </form>
        </>
      )}
    </Panel>
  );
}
