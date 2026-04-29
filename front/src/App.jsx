import { useEffect, useMemo, useRef, useState } from "react";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [text, setText] = useState("");
  const [hasNew, setHasNew] = useState(false);

  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const messagesRef = useRef(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    const ws = new WebSocket("ws://192.168.1.185:3000");
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === "init") {
        setMessages(dedupe(msg.data || []));
      }

      if (msg.type === "message-new") {
        if (!isAtBottomRef.current) setHasNew(true);
        setMessages((p) => dedupe([msg.data, ...p]));
      }

      if (msg.type === "message-updated") {
        setMessages((p) =>
          p.map((m) =>
            getKey(m) === getKey(msg.data)
              ? { ...m, ...msg.data }
              : m
          )
        );
      }

      if (msg.type === "message-batch") {
        setMessages((p) => dedupe(msg.data));
      }
    };

    return () => ws.close();
  }, []);

  const getKey = (m) =>
    m.clientId ||
    m._id ||
    `${m.threadId}:${m.body}:${Math.floor((m.ts || 0) / 10000)}`;

  const dedupe = (arr) => {
    const map = new Map();
    for (const m of arr) {
      const key = getKey(m);
      map.set(key, { ...map.get(key), ...m });
    }
    return Array.from(map.values());
  };

  const conversations = useMemo(() => {
    const map = new Map();

    messages.forEach((m) => {
      const key = m.threadId;
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          contact: key,
          messages: [],
          lastTs: 0
        });
      }

      const c = map.get(key);
      c.messages.push(m);
      c.lastTs = Math.max(c.lastTs, m.ts || 0);
    });

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        messages: dedupe(c.messages)
      }))
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [messages]);

  const activeMessages = useMemo(() => {
    const msgs =
      conversations.find((c) => c.contact === activeChat)
        ?.messages || [];

    return msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }, [activeChat, conversations]);

  // 🔽 scroll intelligent
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages]);

  // 🔄 scroll au changement de chat
  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView();
    }, 50);
  }, [activeChat]);

  const send = () => {
    if (!activeChat || !text.trim()) return;

    const clientId = "c-" + Date.now();

    const msg = {
      clientId,
      threadId: activeChat,
      body: text,
      type: "sent",
      status: "pending",
      ts: Date.now()
    };

    setMessages((p) => dedupe([msg, ...p]));

    wsRef.current?.send(
      JSON.stringify({
        clientId,
        to: activeChat,
        text
      })
    );

    setText("");
  };

  return (
    <div style={styles.app}>

      {/* CONTACTS */}
      <div style={styles.sidebar}>
        <div style={styles.header}>📱 Contacts</div>

        {conversations.map((c) => (
          <div
            key={c.contact}
            onClick={() => setActiveChat(c.contact)}
            style={{
              ...styles.contact,
              background:
                activeChat === c.contact
                  ? "#334155"
                  : "transparent"
            }}
          >
            📞 {c.contact}
          </div>
        ))}
      </div>

      {/* CHAT */}
      <div style={styles.chat}>
        {!activeChat ? (
          <div style={styles.empty}>Select chat</div>
        ) : (
          <>
            <div style={styles.chatHeader}>
              💬 {activeChat}
            </div>

            <div
              style={styles.messages}
              ref={messagesRef}
              onScroll={() => {
                const el = messagesRef.current;
                if (!el) return;

                const threshold = 100;
                const isBottom =
                  el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

                isAtBottomRef.current = isBottom;

                if (isBottom) setHasNew(false);
              }}
            >
              {activeMessages.map((m) => (
                <div
                  key={getKey(m)}
                  style={{
                    ...styles.bubble,
                    alignSelf:
                      m.type === "sent"
                        ? "flex-end"
                        : "flex-start",
                    background:
                      m.status === "pending"
                        ? "#64748b"
                        : m.type === "sent"
                          ? "#2563eb"
                          : "#1e293b"
                  }}
                >
                  {m.body}

                  <div style={styles.meta}>
                    {new Date(m.ts).toLocaleString()}
                  </div>

                  <div style={styles.meta}>
                    {m.status}
                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>

            {/* bouton nouveaux messages */}
            {hasNew && (
              <div
                style={styles.newMsgBtn}
                onClick={() => {
                  bottomRef.current?.scrollIntoView({
                    behavior: "smooth"
                  });
                  setHasNew(false);
                }}
              >
                ↓ New messages
              </div>
            )}

            {/* INPUT */}
            <div style={styles.inputBar}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={styles.input}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />

              <button onClick={send} style={styles.send}>
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", height: "100vh", background: "#0f172a", color: "white" },

  sidebar: { width: "30%", borderRight: "1px solid #1e293b", overflowY: "auto" },
  header: { padding: 10, fontWeight: "bold" },
  contact: { padding: 10, cursor: "pointer", borderBottom: "1px solid #1e293b" },

  chat: { flex: 1, display: "flex", flexDirection: "column", position: "relative" },
  chatHeader: { padding: 10, borderBottom: "1px solid #1e293b" },

  messages: {
    flex: 1,
    padding: 10,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  bubble: { padding: 10, borderRadius: 10, maxWidth: "70%" },
  meta: { fontSize: 10, opacity: 0.6 },

  inputBar: { display: "flex", padding: 10 },
  input: { flex: 1, padding: 10 },
  send: { marginLeft: 10, padding: "0 14px" },

  empty: { margin: "auto", opacity: 0.5 },

  newMsgBtn: {
    position: "absolute",
    bottom: 70,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#2563eb",
    padding: "6px 12px",
    borderRadius: 20,
    cursor: "pointer"
  }
};
