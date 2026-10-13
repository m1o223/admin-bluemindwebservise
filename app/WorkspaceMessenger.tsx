"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { type WorkspaceNotification } from "./WorkspaceNotificationCenter";

type WorkspaceUser = {
  employeeId: string;
  displayName: string;
  title?: string;
  access?: "admin" | "employee";
};

type MessengerContact = {
  employeeId: string;
  displayName: string;
  title: string;
  initials: string;
};

type MessengerConversation = {
  id: string;
  conversationId: string;
  participantIds: string[];
  contact: MessengerContact;
  lastMessage: { fromId: string; body: string; createdAt: string | null } | null;
  unreadCount: number;
  updatedAt: string | null;
};

type MessengerMessage = {
  id: string;
  conversationId: string;
  fromId: string;
  body: string;
  readBy: string[];
  createdAt: string | null;
  sendingState?: "sending" | "sent" | "failed";
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://bluemind-web-service-backend.onrender.com";

function formatMessageTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" }).format(date);
}

function formatConversationTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" }).format(date);
}

async function messengerFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json", ...(init.headers || {}) } : init?.headers,
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Messenger request failed.");
  return data;
}

export function WorkspaceMessenger({
  user,
  onUnreadChange,
  onNotify,
}: {
  user: WorkspaceUser;
  onUnreadChange?: () => void;
  onNotify?: (notification: Omit<WorkspaceNotification, "id">) => void;
}) {
  const [contacts, setContacts] = useState<MessengerContact[]>([]);
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<MessengerConversation | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const unreadCountsRef = useRef<Map<string, number> | null>(null);

  const filteredContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const conversationContacts = new Set(conversations.map(item => item.contact.employeeId));
    const rows = contacts.filter(contact => !conversationContacts.has(contact.employeeId));
    if (!normalized) return rows;
    return rows.filter(contact => `${contact.displayName} ${contact.title}`.toLowerCase().includes(normalized));
  }, [contacts, conversations, query]);

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter(conversation => `${conversation.contact.displayName} ${conversation.contact.title} ${conversation.lastMessage?.body || ""}`.toLowerCase().includes(normalized));
  }, [conversations, query]);

  async function refreshConversations({ notify = false } = {}) {
    const [contactsData, conversationsData] = await Promise.all([
      messengerFetch<{ contacts: MessengerContact[] }>("/api/workspace/messenger/contacts"),
      messengerFetch<{ conversations: MessengerConversation[] }>("/api/workspace/messenger/conversations"),
    ]);
    const nextConversations = conversationsData.conversations || [];
    setContacts(contactsData.contacts || []);
    setConversations(nextConversations);

    const previousCounts = unreadCountsRef.current;
    const nextCounts = new Map(nextConversations.map(conversation => [conversation.conversationId, conversation.unreadCount || 0]));
    unreadCountsRef.current = nextCounts;
    if (notify && previousCounts) {
      const changed = nextConversations.find(conversation => (conversation.unreadCount || 0) > (previousCounts.get(conversation.conversationId) || 0));
      if (changed?.lastMessage && changed.lastMessage.fromId !== user.employeeId) {
        onNotify?.({
          title: `New message from ${changed.contact.displayName}`,
          message: changed.lastMessage.body,
          actionLabel: "Open Messenger",
          onClick: () => void openConversation(changed),
        });
      }
    }
    setSelectedConversation((current) => {
      if (!current) return conversationsData.conversations?.[0] || null;
      return conversationsData.conversations?.find(item => item.conversationId === current.conversationId) || current;
    });
  }

  async function loadInitial() {
    setLoading(true);
    setError("");
    try {
      await refreshConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Messenger unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(conversation: MessengerConversation) {
    setSelectedConversation(conversation);
    setMobileChatOpen(true);
    setLoadingMessages(true);
    setError("");
    try {
      const data = await messengerFetch<{ messages: MessengerMessage[] }>(`/api/workspace/messenger/conversations/${encodeURIComponent(conversation.conversationId)}/messages`);
      setMessages(data.messages || []);
      await messengerFetch(`/api/workspace/messenger/conversations/${encodeURIComponent(conversation.conversationId)}/read`, { method: "POST" });
      await refreshConversations();
      onUnreadChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open conversation.");
    } finally {
      setLoadingMessages(false);
    }
  }

  async function startConversation(contact: MessengerContact) {
    setError("");
    try {
      const data = await messengerFetch<{ conversation: MessengerConversation }>("/api/workspace/messenger/conversations", {
        method: "POST",
        body: JSON.stringify({ contactId: contact.employeeId }),
      });
      await refreshConversations();
      await openConversation(data.conversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start conversation.");
    }
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    if (!selectedConversation || !draft.trim() || sending) return;
    const body = draft.trim();
    const clientMessageId = `${user.employeeId}-${Date.now()}`;
    const pendingMessage: MessengerMessage = {
      id: clientMessageId,
      conversationId: selectedConversation.conversationId,
      fromId: user.employeeId,
      body,
      readBy: [user.employeeId],
      createdAt: new Date().toISOString(),
      sendingState: "sending",
    };
    setDraft("");
    setSending(true);
    setMessages((current) => [...current, pendingMessage]);
    try {
      const data = await messengerFetch<{ message: MessengerMessage }>(`/api/workspace/messenger/conversations/${encodeURIComponent(selectedConversation.conversationId)}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, clientMessageId }),
      });
      setMessages((current) => current.map(item => item.id === clientMessageId ? data.message : item));
      await refreshConversations();
      onUnreadChange?.();
    } catch (err) {
      setMessages((current) => current.map(item => item.id === clientMessageId ? { ...item, sendingState: "failed" } : item));
      setError(err instanceof Error ? err.message : "Message failed to send.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshConversations({ notify: true });
      if (selectedConversation) {
        void messengerFetch<{ messages: MessengerMessage[] }>(`/api/workspace/messenger/conversations/${encodeURIComponent(selectedConversation.conversationId)}/messages`)
          .then((data) => {
            setMessages(data.messages || []);
            return messengerFetch(`/api/workspace/messenger/conversations/${encodeURIComponent(selectedConversation.conversationId)}/read`, { method: "POST" });
          })
          .then(() => onUnreadChange?.())
          .catch(() => undefined);
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [selectedConversation?.conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <section className="messengerShell" data-chat-open={mobileChatOpen} aria-label="BlueMind Messenger">
      <aside className="messengerSidebar">
        <div className="messengerTitle">
          <div>
            <p>BlueMind Messenger</p>
            <h2>Messages</h2>
          </div>
          <span>{conversations.reduce((total, item) => total + item.unreadCount, 0) || ""}</span>
        </div>
        <label className="messengerSearch">
          <span className="srOnly">Search conversations</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" />
        </label>
        {error && <p className="messengerError" role="alert">{error}</p>}
        <div className="messengerConversationList">
          {loading && <p className="messengerEmpty">Loading Messenger...</p>}
          {!loading && filteredConversations.map((conversation) => (
            <button
              type="button"
              className="messengerConversationButton"
              data-active={selectedConversation?.conversationId === conversation.conversationId}
              key={conversation.conversationId}
              onClick={() => openConversation(conversation)}
            >
              <span className="messengerAvatar">{conversation.contact.initials}</span>
              <span className="messengerConversationText">
                <strong>{conversation.contact.displayName}</strong>
                <small>{conversation.contact.title}</small>
                <em>{conversation.lastMessage?.body || "No messages yet"}</em>
              </span>
              <span className="messengerConversationMeta">
                <small>{formatConversationTime(conversation.updatedAt || conversation.lastMessage?.createdAt)}</small>
                {conversation.unreadCount > 0 && <b>{conversation.unreadCount}</b>}
              </span>
            </button>
          ))}
          {!loading && filteredContacts.length > 0 && <p className="messengerListLabel">Start a conversation</p>}
          {!loading && filteredContacts.map((contact) => (
            <button type="button" className="messengerConversationButton" key={contact.employeeId} onClick={() => startConversation(contact)}>
              <span className="messengerAvatar">{contact.initials}</span>
              <span className="messengerConversationText">
                <strong>{contact.displayName}</strong>
                <small>{contact.title}</small>
                <em>Start private chat</em>
              </span>
            </button>
          ))}
          {!loading && !filteredConversations.length && !filteredContacts.length && <p className="messengerEmpty">No matching conversations.</p>}
        </div>
      </aside>

      <section className="messengerChatPane">
        {selectedConversation ? (
          <>
            <header className="messengerChatHeader">
              <button type="button" className="messengerBackButton" onClick={() => setMobileChatOpen(false)}>Back</button>
              <span className="messengerAvatar">{selectedConversation.contact.initials}</span>
              <div>
                <strong>{selectedConversation.contact.displayName}</strong>
                <small>{selectedConversation.contact.title}</small>
              </div>
            </header>
            <div className="messengerMessages" aria-live="polite">
              {loadingMessages && <p className="messengerEmpty">Loading messages...</p>}
              {!loadingMessages && messages.length === 0 && <p className="messengerEmpty">No messages yet. Send the first message.</p>}
              {messages.map((message) => {
                const mine = message.fromId === user.employeeId;
                return (
                  <article className="messengerBubbleRow" data-mine={mine} key={message.id}>
                    <div className="messengerBubble">
                      <p>{message.body}</p>
                      <span>{message.sendingState === "sending" ? "Sending..." : message.sendingState === "failed" ? "Failed" : formatMessageTime(message.createdAt)}</span>
                    </div>
                  </article>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form className="messengerComposer" onSubmit={sendMessage}>
              <button type="button" aria-label="Attach file" disabled>+</button>
              <button type="button" aria-label="Record voice message" disabled>Voice</button>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={1}
                placeholder="Write a message..."
              />
              <button type="submit" disabled={!draft.trim() || sending}>Send</button>
            </form>
          </>
        ) : (
          <div className="messengerNoChat">
            <h2>BlueMind Messenger</h2>
            <p>Select a colleague to open a private conversation.</p>
          </div>
        )}
      </section>
    </section>
  );
}