"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, FolderKanban, House, ListTodo, LogOut, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, Settings, ShoppingBag, UsersRound, Video, Wallet, X } from "lucide-react";
import styles from "./AdminWorkspace.module.css";

export const ADMIN_NAVIGATION = [
  { label: "Dashboard", icon: House },
  { label: "Orders", icon: ShoppingBag },
  { label: "Projects", icon: FolderKanban },
  { label: "Team", icon: UsersRound },
  { label: "Tasks", icon: ListTodo },
  { label: "Messages", icon: MessageSquare },
  { label: "Meetings", icon: Video },
  { label: "Schedule", icon: CalendarDays },
  { label: "Finance", icon: Wallet },
  { label: "Settings", icon: Settings },
] as const;

export type AdminSection = typeof ADMIN_NAVIGATION[number]["label"];

export function AdminWorkspace({ section, onNavigate, name, onLogout, children }: {
  section: AdminSection;
  onNavigate: (section: AdminSection) => void;
  name: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLElement>(null);

  useEffect(() => { content.current?.scrollTo({ top: 0 }); }, [section]);
  useEffect(() => {
    if (!mobileOpen) return;
    const panel = sidebar.current;
    const focusPanel = () => {
      if (!panel?.contains(document.activeElement)) panel?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    };
    const frame = requestAnimationFrame(focusPanel);
    panel?.addEventListener("transitionend", focusPanel);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const buttons = sidebar.current?.querySelectorAll<HTMLButtonElement>("button");
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const resize = () => { if (window.innerWidth > 767) setMobileOpen(false); };
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      panel?.removeEventListener("transitionend", focusPanel);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", resize);
      menu.current?.focus();
    };
  }, [mobileOpen]);

  return (
    <div className={styles.shell} data-collapsed={collapsed} data-mobile-open={mobileOpen}>
      {mobileOpen && <button className={styles.scrim} aria-label="Close navigation" onClick={() => setMobileOpen(false)} tabIndex={-1} />}
      <aside ref={sidebar} id="admin-sidebar" className={styles.sidebar} aria-label="Administrator sidebar" role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined}>
        <div className={styles.brand}>
          <Image src="/images/brand/bluemind-original-logo-transparent.png" alt="BlueMind" width={42} height={48} priority />
          <strong className={styles.label}>BlueMind<span>Workspace</span></strong>
          <button className={styles.mobileClose} aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        <button className={styles.collapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          <span className={styles.label}>Collapse sidebar</span>
        </button>
        <nav className={styles.navigation} aria-label="Admin navigation">
          {ADMIN_NAVIGATION.map(({ label, icon: Icon }) => (
            <button key={label} type="button" title={label} aria-label={label} aria-current={section === label ? "page" : undefined} onClick={() => { onNavigate(label); setMobileOpen(false); }}>
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" /><span className={styles.label}>{label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.label}>{name}</span>
          <button onClick={onLogout} title="Logout" aria-label="Logout"><LogOut size={20} /><span className={styles.label}>Logout</span></button>
        </div>
      </aside>
      <div className={styles.body} inert={mobileOpen || undefined}>
        <header className={styles.topbar}>
          <button ref={menu} className={styles.mobileMenu} aria-label="Open navigation" aria-controls="admin-sidebar" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
          <span>Administration</span><span className={styles.accountName}>{name}</span>
        </header>
        <main ref={content} className={styles.content}>
          {section !== "Orders" && <header className={styles.pageHeading}><h1>{section}</h1>{section === "Dashboard" && <p>Your company workspace overview.</p>}</header>}
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminPlaceholder({ title }: { title: string }) {
  return <section className={styles.empty}><h2>{title}</h2><p>This section is coming soon.</p></section>;
}

type OverviewOrder = {
  id: string; orderNumber: string; projectStatus: string; reviewStatus?: string;
  isPaidOrder?: boolean; isSandboxTestOrder?: boolean; paymentMode?: string; stripeLivemode?: boolean;
  testMode?: string; isDemo?: boolean; orderDate: string;
  activity?: { action: string; message: string; createdAt: string; displayName?: string }[];
};
type Contact = { employeeId: string; displayName: string; title?: string };

export function AdminOverview({ apiUrl, userId, onNavigate }: {
  apiUrl: string; userId: string;
  onNavigate: (section: AdminSection) => void;
}) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [unread, setUnread] = useState<number | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [orders, setOrders] = useState<OverviewOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const read = async (path: string) => {
      const response = await fetch(`${apiUrl}${path}`, { credentials: "include", signal: controller.signal });
      if (!response.ok) throw new Error("Unavailable");
      return response.json();
    };
    const refresh = async () => {
      const [people, messages, records] = await Promise.allSettled([
        read("/api/workspace/messenger/contacts"), read("/api/workspace/messenger/conversations"), read("/api/admin/orders"),
      ]);
      if (controller.signal.aborted) return;
      const hasOrders = records.status === "fulfilled" && Array.isArray(records.value.orders);
      setOrders(hasOrders && records.status === "fulfilled" ? records.value.orders : []);
      setError(!hasOrders);
      setLoading(false);
      setContacts(people.status === "fulfilled" && Array.isArray(people.value.contacts) ? people.value.contacts : null);
      setUnread(messages.status === "fulfilled" && Array.isArray(messages.value.conversations)
        ? messages.value.conversations.reduce((sum: number, item: { unreadCount?: number }) => sum + (item.unreadCount || 0), 0) : null);
      setLoadingMessages(false);
    };
    void refresh();
    const interval = window.setInterval(refresh, 15000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [apiUrl, userId]);

  // Test records stay in Orders, but never become production dashboard statistics.
  const liveOrders = orders.filter(order => order.isPaidOrder && order.paymentMode === "live" && order.stripeLivemode === true && !order.isSandboxTestOrder && !order.testMode && !order.isDemo);
  const pending = liveOrders.filter(order => order.reviewStatus !== "confirmed" && order.projectStatus === "Pending Review");
  const activity = liveOrders.flatMap(order => (order.activity || []).map(item => ({ ...item, orderNumber: order.orderNumber, orderId: order.id })))
    .filter(item => Number.isFinite(Date.parse(item.createdAt)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 8);
  const count = (value: number) => loading ? "Loading..." : error ? "No data available" : String(value);
  return (
    <div className={styles.overview}>
      <div className={styles.metrics}>
        <section><ShoppingBag size={21} /><h2>New Orders</h2><strong>{count(liveOrders.filter(order => ["New", "Pending Review"].includes(order.projectStatus)).length)}</strong><p>Paid live orders awaiting initial review</p><button onClick={() => onNavigate("Orders")}>View orders</button></section>
        <section><FolderKanban size={21} /><h2>Active Projects</h2><strong>No data available</strong><p>Project tracking is not configured.</p><button onClick={() => onNavigate("Projects")}>View projects</button></section>
        <section><ListTodo size={21} /><h2>Pending Reviews</h2><strong>{count(pending.length)}</strong><p>Paid live orders pending review</p><button onClick={() => onNavigate("Orders")}>Review orders</button></section>
        <section><MessageSquare size={21} /><h2>Unread Messages</h2><strong>{loadingMessages ? "Loading..." : unread ?? "No data available"}</strong><p>Your private conversations</p><button onClick={() => onNavigate("Messages")}>Open messages</button></section>
      </div>
      <div className={styles.details}>
        <section><h2>Team Overview</h2><p>People available in your Workspace contacts</p>
          {loadingMessages ? <p role="status">Loading...</p> : contacts?.length ? <ul>{contacts.map(contact => <li key={contact.employeeId}><strong>{contact.displayName}</strong><span>{contact.title || "Role not available"}</span></li>)}</ul> : <p>No data available</p>}
        </section>
        <section><h2>Recent Activity</h2><p>Latest activity on paid live orders</p>
          {loading ? <p role="status">Loading...</p> : !error && activity.length ? <ul>{activity.map((item, index) => <li key={`${item.orderId}-${item.createdAt}-${index}`}><strong>{item.orderNumber} · {item.message || item.action}</strong><span>{item.displayName || "System"} · <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("en-GB")}</time></span></li>)}</ul> : <p>No data available</p>}
        </section>
      </div>
      {error && <p role="alert">Order overview is unavailable. Open Orders to retry.</p>}
    </div>
  );
}
