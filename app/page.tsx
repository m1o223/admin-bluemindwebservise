"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type OrderStatus =
  | "Pending Review"
  | "Awaiting Clarification"
  | "Confirmed"
  | "New"
  | "In Progress"
  | "Design Preview"
  | "Revisions"
  | "Final Review"
  | "Awaiting Final Payment"
  | "Waiting for Client"
  | "Ready"
  | "Completed"
  | "Cancelled";
type PaymentStatus =
  | "Pending"
  | "Paid"
  | "Deposit Paid"
  | "Partially Paid"
  | "Final Balance Due"
  | "Refunded"
  | "Unpaid";

type EmployeeId = "M" | "R";

type AdminUser = {
  email: string;
  employeeId: EmployeeId;
  displayName: string;
};

type EmployeePresence = {
  employeeId: EmployeeId;
  displayName: string;
  online: boolean;
  lastSeenAt: string | null;
};

type OrderActivity = {
  employeeId: EmployeeId | "system";
  displayName?: string;
  action: string;
  message: string;
  createdAt: string;
};

type NotificationState = {
  type?: string;
  status: "queued" | "pending" | "sent" | "delivered" | "failed";
  reason?: string;
  error?: string;
  sentAt?: string;
  updatedAt?: string;
};

type ClarificationRequest = {
  requestId: string;
  message: string;
  employeeId: EmployeeId;
  displayName: string;
  status: string;
  createdAt: string;
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  companyName?: string;
  email: string;
  phone?: string;
  projectType: string;
  service: string;
  package: string;
  price: string;
  totalAmountOre?: number;
  amountPaidOre?: number;
  remainingBalanceOre?: number;
  paymentOption?: "full" | "deposit";
  paymentProvider?: string;
  paymentReference?: string;
  paymentStatus: PaymentStatus;
  projectStatus: OrderStatus;
  reviewStatus?: "pending_review" | "confirmed";
  reviewedAt?: string | null;
  reviewedBy?: { employeeId: EmployeeId; displayName: string } | null;
  orderDate: string;
  deliveryDate: string;
  projectDescription: string;
  requestedFeatures?: string[];
  websiteDetails?: Record<string, string>;
  internalNotes?: string;
  notificationStatus?: Record<string, NotificationState>;
  clarificationRequests?: ClarificationRequest[];
  activity?: OrderActivity[];
  isPaidOrder?: boolean;
  isDemo?: boolean;
};

type CareSubscription = {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerEmail: string;
  planName: string;
  billingInterval: "monthly" | "yearly";
  price: string;
  status: string;
  paidThroughDate?: string;
  nextRenewalDate?: string | null;
  cancelAtPeriodEnd: boolean;
  cancellation?: { reason?: string; reasonText?: string; requestedAt?: string; effectiveAt?: string };
  testMode?: boolean;
};

const PROJECT_STATUSES: OrderStatus[] = [
  "Pending Review",
  "Awaiting Clarification",
  "Confirmed",
  "In Progress",
  "Design Preview",
  "Revisions",
  "Final Review",
  "Awaiting Final Payment",
  "Completed",
  "Cancelled",
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://bluemind-web-service-backend.onrender.com";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getTimeRemaining(deliveryDate: string) {
  const delivery = new Date(deliveryDate);
  if (Number.isNaN(delivery.getTime())) return "Not scheduled";

  const today = new Date();
  delivery.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((delivery.getTime() - today.getTime()) / 86400000);

  if (days > 1) return `${days} days`;
  if (days === 1) return "1 day";
  if (days === 0) return "Due today";
  return `${Math.abs(days)} days overdue`;
}

function formatSekFromOre(value?: number) {
  if (!Number.isInteger(value)) return "";
  return `${new Intl.NumberFormat("sv-SE").format((value || 0) / 100)} SEK`;
}

function BlueMindMark() {
  return (
    <span className="brandMark" aria-hidden="true">
      <span className="planet">
        <span className="planetBand planetBandTop" />
        <span className="planetBand planetBandMid" />
        <span className="orbit" />
      </span>
    </span>
  );
}

function StatusPill({ value }: { value: PaymentStatus | OrderStatus }) {
  const tone =
    value === "Paid" || value === "Completed" || value === "Ready" || value === "Confirmed"
      ? "positive"
      : value === "Pending Review" ||
          value === "Awaiting Clarification" ||
          value === "Deposit Paid" ||
          value === "Unpaid" ||
          value === "Waiting for Client" ||
          value === "Awaiting Final Payment" ||
          value === "Cancelled"
        ? "attention"
        : "neutral";

  return (
    <span className="statusPill" data-tone={tone}>
      {value}
    </span>
  );
}

const DEFAULT_PRESENCE: EmployeePresence[] = [
  { employeeId: "M", displayName: "Mohmed", online: false, lastSeenAt: null },
  { employeeId: "R", displayName: "Rokaia", online: false, lastSeenAt: null },
];

function apiErrorMessage(status: number) {
  if (status === 401) return "Please sign in again to view admin orders.";
  if (status === 403) return "This admin site is not allowed to access the backend yet.";
  return "Something went wrong. Please try again.";
}

function OrderCard({
  order,
  onViewDetails,
}: {
  order: Order;
  onViewDetails: (order: Order) => void;
}) {
  return (
    <article className="orderCard">
      <div className="orderCardTop">
        <div>
          <span className="orderNumber">
            {order.orderNumber}
            {order.reviewStatus !== "confirmed" && order.projectStatus === "Pending Review" && (
              <em>NEW</em>
            )}
          </span>
          <h3>{order.projectType}</h3>
        </div>
        <StatusPill value={order.projectStatus} />
      </div>
      <div className="orderMeta">
        <span>Customer</span>
        <strong>{order.customerName}</strong>
        <span>Company</span>
        <strong>{order.companyName || "Not provided"}</strong>
        <span>Email</span>
        <strong>{order.email}</strong>
        <span>Service</span>
        <strong>{order.service}</strong>
      </div>
      <div className="orderSummary">
        <div>
          <span>Package</span>
          <strong>{order.package}</strong>
        </div>
        <div>
          <span>Delivery</span>
          <strong>{formatDate(order.deliveryDate)}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>{getTimeRemaining(order.deliveryDate)}</strong>
        </div>
      </div>
      <div className="orderFooter">
        <div>
          <span>Price</span>
          <strong>{formatSekFromOre(order.totalAmountOre) || order.price}</strong>
        </div>
        <StatusPill value={order.paymentStatus} />
        <button type="button" onClick={() => onViewDetails(order)}>
          View Details
        </button>
      </div>
    </article>
  );
}

function CareSubscriptionCard({ subscription }: { subscription: CareSubscription }) {
  return (
    <article className="careCard">
      <div className="orderCardTop">
        <div>
          <span className="orderNumber">
            {subscription.orderNumber}
            {subscription.testMode && <em>TEST</em>}
          </span>
          <h3>{subscription.planName}</h3>
        </div>
        <StatusPill value={(subscription.cancelAtPeriodEnd ? "Awaiting Final Payment" : "Confirmed") as OrderStatus} />
      </div>
      <div className="orderMeta">
        <span>Customer</span>
        <strong>{subscription.customerName || "Not provided"}</strong>
        <span>Email</span>
        <strong>{subscription.customerEmail}</strong>
        <span>Billing</span>
        <strong>{subscription.billingInterval}</strong>
        <span>Status</span>
        <strong>{subscription.cancelAtPeriodEnd ? "Renewal cancelled" : subscription.status}</strong>
      </div>
      <div className="orderSummary">
        <div>
          <span>Price</span>
          <strong>{subscription.price}</strong>
        </div>
        <div>
          <span>Next renewal</span>
          <strong>{subscription.cancelAtPeriodEnd ? "Disabled" : formatDate(subscription.nextRenewalDate || "")}</strong>
        </div>
        <div>
          <span>Paid through</span>
          <strong>{formatDate(subscription.paidThroughDate || "")}</strong>
        </div>
      </div>
      {subscription.cancellation?.reason && (
        <p className="careCancellation">Cancellation reason: {subscription.cancellation.reason.replace(/_/g, " ")}</p>
      )}
    </article>
  );
}

function DetailsDrawer({
  order,
  busy,
  onClose,
  onConfirmOrder,
  onRequestClarification,
  onUpdateStatus,
}: {
  order: Order | null;
  busy: boolean;
  onClose: () => void;
  onConfirmOrder: (order: Order) => void;
  onRequestClarification: (order: Order, message: string) => void;
  onUpdateStatus: (order: Order, status: OrderStatus) => void;
}) {
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [clarificationMessage, setClarificationMessage] = useState("");
  const [clarificationConfirmed, setClarificationConfirmed] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus>("Pending Review");

  useEffect(() => {
    if (order) {
      setClarificationOpen(false);
      setClarificationMessage("");
      setClarificationConfirmed(false);
      setNextStatus(order.projectStatus);
    }
  }, [order]);

  if (!order) return null;

  const isReviewPending = order.isPaidOrder && order.reviewStatus !== "confirmed";
  const notificationRows = Object.entries(order.notificationStatus || {});
  const clarificationRows = order.clarificationRequests || [];

  const detailRows = [
    ["Order number", order.orderNumber],
    ["Customer", order.customerName],
    ["Company", order.companyName || "Not provided"],
    ["Email", order.email],
    ["Phone", order.phone || "Not provided"],
    ["Service type", order.service],
    ["Package", order.package],
    ["Total", formatSekFromOre(order.totalAmountOre) || order.price],
    ["Paid", formatSekFromOre(order.amountPaidOre)],
    ["Remaining", formatSekFromOre(order.remainingBalanceOre)],
    ["Payment type", order.paymentOption === "deposit" ? "50% Deposit" : "Full"],
    ["Stripe reference", order.paymentReference || "Not provided"],
    ["Payment status", order.paymentStatus],
    ["Project status", order.projectStatus],
    ["Review status", order.reviewStatus === "confirmed" ? "Confirmed" : "Pending Review"],
    ["Order date", formatDate(order.orderDate)],
    ["Delivery date", formatDate(order.deliveryDate)],
    ["Time remaining", getTimeRemaining(order.deliveryDate)],
  ];
  const latestActivity = order.activity?.slice().reverse().slice(0, 8) || [];

  return (
    <div className="drawerOverlay" role="presentation" onClick={onClose}>
      <aside
        className="detailsDrawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawerHeader">
          <div>
            <span>{order.orderNumber}</span>
            <h2 id="details-title">Order Details</h2>
          </div>
          <button type="button" aria-label="Close order details" onClick={onClose}>
            X
          </button>
        </div>
        <div className="detailsGrid">
          {detailRows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <section className="drawerSection">
          <span>Requested features</span>
          <p>{order.requestedFeatures?.length ? order.requestedFeatures.join(", ") : "No features listed."}</p>
        </section>
        <section className="drawerSection">
          <span>Project description</span>
          <p>{order.projectDescription}</p>
        </section>
        <section className="drawerSection">
          <span>Review</span>
          {order.reviewStatus === "confirmed" ? (
            <p>
              Confirmed by {order.reviewedBy?.displayName || "BlueMind"} on{" "}
              {order.reviewedAt ? formatDate(order.reviewedAt) : "a previous date"}.
            </p>
          ) : (
            <p>This paid order is waiting for an employee to review the requirements.</p>
          )}
        </section>
        <section className="drawerSection">
          <span>Notification delivery</span>
          {notificationRows.length ? (
            <ul className="activityList">
              {notificationRows.map(([type, state]) => (
                <li key={type}>
                  <strong>{state.status[0]?.toUpperCase() || "N"}</strong>
                  <span>{type.replace(/_/g, " ")}: {state.status}</span>
                  <small>{state.sentAt || state.updatedAt ? formatDate(state.sentAt || state.updatedAt || "") : "No timestamp"}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No notification status recorded yet.</p>
          )}
        </section>
        {clarificationRows.length > 0 && (
          <section className="drawerSection">
            <span>Clarification requests</span>
            <ul className="activityList">
              {clarificationRows.slice().reverse().map((item) => (
                <li key={item.requestId}>
                  <strong>{item.employeeId}</strong>
                  <span>{item.message}</span>
                  <small>{formatDate(item.createdAt)}</small>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="drawerSection">
          <span>Internal notes</span>
          <p>{order.internalNotes || "No internal notes yet."}</p>
        </section>
        <section className="drawerSection">
          <span>Order activity</span>
          {latestActivity.length ? (
            <ul className="activityList">
              {latestActivity.map((item) => (
                <li key={`${item.createdAt}-${item.action}`}>
                  <strong>{item.employeeId}</strong>
                  <span>{item.message}</span>
                  <small>{formatDate(item.createdAt)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No activity recorded yet.</p>
          )}
        </section>
        <section className="drawerSection actionPanel">
          <span>Project tracking</span>
          <div className="statusUpdateRow">
            <select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
              aria-label="Project status"
            >
              {PROJECT_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || nextStatus === order.projectStatus}
              onClick={() => onUpdateStatus(order, nextStatus)}
            >
              {busy ? "Updating..." : "Update Status"}
            </button>
          </div>
        </section>
        <div className="drawerActions stacked">
          <button
            type="button"
            disabled={busy || !isReviewPending}
            onClick={() => onConfirmOrder(order)}
          >
            {busy ? "Sending..." : order.reviewStatus === "confirmed" ? "Order Confirmed" : "Confirm Order & Notify Customer"}
          </button>
          <button
            type="button"
            className="secondaryAction"
            disabled={busy || !order.isPaidOrder}
            onClick={() => setClarificationOpen((open) => !open)}
          >
            Request Clarification
          </button>
        </div>
        {clarificationOpen && (
          <section className="clarificationBox">
            <label>
              <span>Message to {order.email}</span>
              <textarea
                value={clarificationMessage}
                onChange={(event) => setClarificationMessage(event.target.value)}
                placeholder="Write the specific details you need from the customer..."
                rows={5}
              />
            </label>
            <div className="clarificationPreview">
              <span>Preview</span>
              <p>{clarificationMessage || "Your message preview will appear here."}</p>
            </div>
            <label className="confirmSendRow">
              <input
                type="checkbox"
                checked={clarificationConfirmed}
                onChange={(event) => setClarificationConfirmed(event.target.checked)}
              />
              <span>I reviewed this message and want to send it to the customer.</span>
            </label>
            <button
              type="button"
              disabled={busy || clarificationMessage.trim().length < 5 || !clarificationConfirmed}
              onClick={() => onRequestClarification(order, clarificationMessage)}
            >
              {busy ? "Sending..." : "Send Clarification Request"}
            </button>
          </section>
        )}
      </aside>
    </div>
  );
}

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [presence, setPresence] = useState<EmployeePresence[]>(DEFAULT_PRESENCE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [careSubscriptions, setCareSubscriptions] = useState<CareSubscription[]>([]);
  const [ordersError, setOrdersError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [directOrderOpened, setDirectOrderOpened] = useState(false);
  const [events, setEvents] = useState<string[]>([
    "New order received",
    "Payment received",
    "Delivery date approaching",
  ]);



  const sendHeartbeat = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/presence/heartbeat`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) setSignedIn(false);
        return;
      }
      const data = (await response.json()) as { employees?: EmployeePresence[]; employee?: AdminUser };
      if (data.employee) setAdmin(data.employee);
      if (data.employees?.length) setPresence(data.employees);
    } catch {
      // Presence refresh will retry on the next heartbeat.
    }
  }, []);
  const fetchOrders = useCallback(async (query = "") => {
    setLoadingOrders(true);
    setOrdersError("");
    try {
      const params = query.trim()
        ? `?search=${encodeURIComponent(query.trim())}`
        : "";
      const response = await fetch(`${API_URL}/api/admin/orders${params}`, {
        credentials: "include",
      });
      if (response.status === 401) {
        setSignedIn(false);
        setOrders([]);
        throw new Error(apiErrorMessage(response.status));
      }
      if (!response.ok) throw new Error(apiErrorMessage(response.status));
      const data = (await response.json()) as { orders: Order[] };
      setOrders(data.orders || []);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : apiErrorMessage(500));
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchCareSubscriptions = useCallback(async (query = "") => {
    try {
      const params = query.trim()
        ? `?search=${encodeURIComponent(query.trim())}`
        : "";
      const response = await fetch(`${API_URL}/api/admin/care-subscriptions${params}`, {
        credentials: "include",
      });
      if (response.status === 401) {
        setSignedIn(false);
        setCareSubscriptions([]);
        return;
      }
      if (!response.ok) return;
      const data = (await response.json()) as { subscriptions: CareSubscription[] };
      setCareSubscriptions(data.subscriptions || []);
    } catch {
      // Orders remain the primary dashboard; subscription refresh retries with the next search/heartbeat cycle.
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/api/admin/session`, {
          credentials: "include",
        });
        if (!mounted) return;
        const data = response.ok
          ? ((await response.json()) as { authenticated?: boolean; admin?: AdminUser | null; employee?: AdminUser | null })
          : null;
        setSignedIn(Boolean(data?.authenticated));
        setAdmin(data?.employee || data?.admin || null);
        if (data?.authenticated) {
          void fetchOrders("");
          void fetchCareSubscriptions("");
          void sendHeartbeat();
        }
      } catch {
        if (mounted) {
          setSignedIn(false);
          setAdmin(null);
        }
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    void checkSession();
    return () => {
      mounted = false;
    };
  }, [fetchCareSubscriptions, fetchOrders, sendHeartbeat]);


  useEffect(() => {
    if (!signedIn || !admin) return;
    void sendHeartbeat();
    const interval = window.setInterval(() => {
      void sendHeartbeat();
    }, 30000);
    const handlePageHide = () => {
      navigator.sendBeacon?.(`${API_URL}/api/admin/presence/heartbeat`);
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [admin, sendHeartbeat, signedIn]);
  useEffect(() => {
    if (!signedIn || !authChecked) return;
    const timeout = window.setTimeout(() => {
      void fetchOrders(search);
      void fetchCareSubscriptions(search);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [authChecked, fetchCareSubscriptions, fetchOrders, search, signedIn]);

  useEffect(() => {
    if (!signedIn || directOrderOpened) return;
    const orderParam = new URLSearchParams(window.location.search).get("order");
    if (!orderParam) return;
    setSearch(orderParam);
    const match = orders.find((order) => order.orderNumber === orderParam || order.orderNumber === `#${orderParam.replace(/^#/, "")}`);
    if (match) {
      setDirectOrderOpened(true);
      void openOrderDetails(match);
    }
  }, [directOrderOpened, orders, signedIn]);

  const orderCountLabel = useMemo(() => {
    if (orders.length === 1) return "1 database order";
    return `${orders.length} database orders`;
  }, [orders.length]);

  const pendingReviewCount = useMemo(
    () => orders.filter((order) => order.isPaidOrder && order.reviewStatus !== "confirmed").length,
    [orders],
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingLogin(true);
    setLoginError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Invalid admin email or password."
            : apiErrorMessage(response.status),
        );
      }
      const data = (await response.json()) as { admin?: AdminUser; employee?: AdminUser };
      setAdmin(data.employee || data.admin || null);
      await sendHeartbeat();
      setSignedIn(true);
      setPassword("");
      await fetchOrders("");
      await fetchCareSubscriptions("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : apiErrorMessage(500));
    } finally {
      setSubmittingLogin(false);
    }
  }

  async function handleLogout() {
    await fetch(`${API_URL}/api/admin/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    setSignedIn(false);
    setAdmin(null);
    setSelectedOrder(null);
    setOrders([]);
    setCareSubscriptions([]);
    setSearch("");
    setPresence(DEFAULT_PRESENCE);
  }

  async function openOrderDetails(order: Order) {
    setUpdatingStatus(true);
    setOrdersError("");
    try {
      const response = await fetch(
        `${API_URL}/api/admin/orders/${encodeURIComponent(order.orderNumber)}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error(apiErrorMessage(response.status));
      const data = (await response.json()) as { order: Order };
      setSelectedOrder(data.order);
      setOrders((current) =>
        current.map((item) =>
          item.orderNumber === data.order.orderNumber ? data.order : item,
        ),
      );
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : apiErrorMessage(500));
    } finally {
      setUpdatingStatus(false);
    }
  }

  function mergeUpdatedOrder(order: Order) {
    setOrders((current) =>
      current.map((item) =>
        item.orderNumber === order.orderNumber ? order : item,
      ),
    );
    setSelectedOrder(order);
  }

  async function handleUpdateStatus(order: Order, projectStatus: OrderStatus) {
    setUpdatingStatus(true);
    try {
      const response = await fetch(
        `${API_URL}/api/admin/orders/${encodeURIComponent(order.orderNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ projectStatus }),
        },
      );
      if (!response.ok) throw new Error(apiErrorMessage(response.status));
      const data = (await response.json()) as {
        order: Order;
        notification?: { attempted?: boolean; sent?: boolean };
      };
      mergeUpdatedOrder(data.order);
      setEvents((current) => [
        `${admin?.displayName || "Admin"} changed ${data.order.orderNumber} to ${data.order.projectStatus}`,
        ...current,
      ]);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : apiErrorMessage(500));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleConfirmOrder(order: Order) {
    setUpdatingStatus(true);
    try {
      const response = await fetch(
        `${API_URL}/api/admin/orders/${encodeURIComponent(order.orderNumber)}/confirm`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error(apiErrorMessage(response.status));
      const data = (await response.json()) as {
        order: Order;
        notification?: { sent?: boolean; skipped?: boolean };
      };
      mergeUpdatedOrder(data.order);
      setEvents((current) => [
        data.notification?.sent
          ? `${admin?.displayName || "Admin"} confirmed ${data.order.orderNumber} and notified the customer`
          : `${data.order.orderNumber} is already confirmed or notification is pending`,
        ...current,
      ]);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : apiErrorMessage(500));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleRequestClarification(order: Order, message: string) {
    setUpdatingStatus(true);
    try {
      const response = await fetch(
        `${API_URL}/api/admin/orders/${encodeURIComponent(order.orderNumber)}/clarification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message }),
        },
      );
      if (!response.ok) throw new Error(apiErrorMessage(response.status));
      const data = (await response.json()) as {
        order: Order;
        notification?: { sent?: boolean };
      };
      mergeUpdatedOrder(data.order);
      setEvents((current) => [
        data.notification?.sent
          ? `${admin?.displayName || "Admin"} requested clarification for ${data.order.orderNumber}`
          : `Clarification saved for ${data.order.orderNumber}; email delivery needs attention`,
        ...current,
      ]);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : apiErrorMessage(500));
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (!authChecked) {
    return (
      <main className="loginPage">
        <section className="loginCard" aria-live="polite">
          <div className="brandLockup">
            <BlueMindMark />
            <div>
              <strong>BlueMind Web Service</strong>
              <span>Admin access</span>
            </div>
          </div>
          <p className="loadingText">Checking secure admin session...</p>
        </section>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="loginPage">
        <section className="loginCard" aria-labelledby="login-title">
          <div className="brandLockup">
            <BlueMindMark />
            <div>
              <strong>BlueMind Web Service</strong>
              <span>Admin Access</span>
            </div>
          </div>
          <div className="loginIntro">
            <p>Internal dashboard</p>
            <h1 id="login-title">Sign in to manage orders</h1>
          </div>
          <form className="loginForm" onSubmit={handleLogin}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@bluemindwebservice.com"
                autoComplete="username"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <div className="passwordField">
                <input
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                >
                  {passwordVisible ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {loginError && (
              <p className="formError" role="alert">
                {loginError}
              </p>
            )}
            <div className="loginActions">
              <span>Authorized employees only</span>
              <button type="submit" disabled={submittingLogin}>
                {submittingLogin ? "Signing in..." : "Sign In"}
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboardPage" id="orders">
      <header className="dashboardHeader">
        <div className="brandLockup">
          <BlueMindMark />
          <div>
            <strong>BlueMind Web Service</strong>
            <span>Employee dashboard</span>
          </div>
        </div>
        <div className="headerActions">
          <div className="notificationWrap">
            <button
              type="button"
              aria-label="Notifications"
              className="iconButton"
              onClick={() => setNotificationOpen((open) => !open)}
            >
              Bell
            </button>
            {notificationOpen && (
              <div className="notificationPanel">
                {events.slice(0, 4).map((event) => (
                  <p key={event}>{event}</p>
                ))}
              </div>
            )}
          </div>
          <section className="presenceBlock" aria-label="Employee presence">
            <span className="presenceTitle">Employees</span>
            <div className="presenceList">
              {presence.map((employee) => (
                <div
                  className="presenceEmployee"
                  data-online={employee.online}
                  data-current={admin?.employeeId === employee.employeeId}
                  key={employee.employeeId}
                >
                  <span className="presenceAvatar">{employee.employeeId}</span>
                  <span className="presenceName">{employee.displayName}</span>
                  <span className="presenceStatus">
                    <span aria-hidden="true" />
                    {employee.online ? "Online" : "Offline"}
                  </span>
                  {admin?.employeeId === employee.employeeId && <em>You</em>}
                </div>
              ))}
            </div>
          </section>
          <button type="button" className="logoutButton" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="dashboardHero">
        <div>
          <p>Orders workspace</p>
          <h1>{admin ? `Welcome back, ${admin.displayName}` : "Orders"}</h1>
        </div>
        <div className="dashboardStats" aria-label="Order summary">
          <span>{orderCountLabel}</span>
          <span>{pendingReviewCount} pending review</span>
          <span>MongoDB connected</span>
        </div>
      </section>

      <section className="ordersToolbar" aria-label="Order search">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by order number, customer name, email, or company..."
        />
      </section>

      {careSubscriptions.length > 0 && (
        <section className="careSubscriptionsSection" aria-labelledby="care-subscriptions-title">
          <div className="sectionHeader">
            <p>BlueMind Care</p>
            <h2 id="care-subscriptions-title">Active subscriptions</h2>
          </div>
          <div className="careGrid">
            {careSubscriptions.map((subscription) => (
              <CareSubscriptionCard key={subscription.id} subscription={subscription} />
            ))}
          </div>
        </section>
      )}

      {ordersError && (
        <section className="emptyState" role="alert">
          <h2>Orders unavailable</h2>
          <p>{ordersError}</p>
        </section>
      )}

      {!ordersError && loadingOrders && (
        <section className="emptyState" aria-live="polite">
          <h2>Loading orders</h2>
          <p>Fetching the latest database records.</p>
        </section>
      )}

      {!ordersError && !loadingOrders && (
        <section className="ordersGrid" aria-label="Orders from MongoDB">
          {orders.map((order) => (
            <OrderCard
              key={order.orderNumber}
              order={order}
              onViewDetails={openOrderDetails}
            />
          ))}
        </section>
      )}

      {!ordersError && !loadingOrders && orders.length === 0 && (
        <section className="emptyState">
          <h2>No orders found</h2>
          <p>Try another order number, customer name, email, or company.</p>
        </section>
      )}

      <DetailsDrawer
        order={selectedOrder}
        busy={updatingStatus}
        onClose={() => setSelectedOrder(null)}
        onConfirmOrder={handleConfirmOrder}
        onRequestClarification={handleRequestClarification}
        onUpdateStatus={handleUpdateStatus}
      />
    </main>
  );
}
