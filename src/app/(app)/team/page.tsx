"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { useTeam } from "@/lib/hooks/useTeam";
import { useMessagesBetween, useSendMessage } from "@/lib/hooks/useMessages";

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-gray-600",
};

export default function TeamPage() {
  const { data: session } = useSession();
  const { data: team } = useTeam();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [tab, setTab] = useState<"team" | "messages">("team");
  const [msgText, setMsgText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = session?.user?.name ?? "User";
  const { data: messages } = useMessagesBetween(currentUser, selectedMember ?? "");
  const sendMessage = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!msgText.trim() || !selectedMember) return;
    sendMessage.mutate(
      { fromUser: currentUser, toUser: selectedMember, text: msgText.trim() },
      { onSuccess: () => setMsgText("") }
    );
  }

  return (
    <div>
      <Header title="Team Hub" icon="👥" subtitle="Team Directory & Messaging" gradient="from-indigo-600 to-purple-500" />

      {/* Tab Toggle */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit mb-6">
        {(["team", "messages"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === t ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
            {t === "team" ? "Team" : "Messages"}
          </button>
        ))}
      </div>

      {tab === "team" ? (
        /* Team Directory */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team?.map((member) => (
            <div key={member.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: member.color ?? "#6B7280" }}>
                    {member.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${STATUS_DOT[member.status]}`} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{member.name}</p>
                  <p className="text-gray-400 text-sm">{member.role}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{member.city}</span>
                <span>{member.tz}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setSelectedMember(member.name); setTab("messages"); }} className="flex-1 text-xs py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors">
                  Message
                </button>
                <a href={`mailto:${member.email}`} className="flex-1 text-xs py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-center transition-colors">
                  Email
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Messages */
        <div className="flex gap-4 h-[calc(100vh-280px)]">
          {/* Member List */}
          <div className="w-[240px] bg-gray-900 border border-gray-800 rounded-xl overflow-y-auto flex-shrink-0">
            {team?.filter((m) => m.name !== currentUser).map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member.name)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                  selectedMember === member.name ? "bg-gray-800" : "hover:bg-gray-800/50"
                }`}
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: member.color ?? "#6B7280" }}>
                    {member.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${STATUS_DOT[member.status]}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{member.name}</p>
                  <p className="text-[10px] text-gray-500">{member.role}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Chat Area */}
          <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl flex flex-col">
            {selectedMember ? (
              <>
                <div className="px-4 py-3 border-b border-gray-800">
                  <p className="text-white font-semibold text-sm">{selectedMember}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages?.map((msg) => {
                    const isMe = msg.fromUser === currentUser;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                          isMe ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-200"
                        }`}>
                          <p>{msg.text}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? "text-purple-300" : "text-gray-500"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-800 flex gap-2">
                  <input
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button type="submit" disabled={!msgText.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg">
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                Select a team member to start messaging
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
