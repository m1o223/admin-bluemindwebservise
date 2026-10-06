"use client";

import { useMemo, useState } from "react";

type OrderStatus = "New" | "In Progress" | "Waiting for Client" | "Completed";
type PaymentStatus = "Paid" | "Unpaid";

type Order = {
  orderNumber: string;
  project: string;
  customer: string;
  company: string;
  email: string;
  phone?: string;
  service: string;
  packageName: string;
  orderDate: string;
  deliveryDate: string;
  timeRemaining: string;
  paymentStatus: PaymentStatus;
  projectStatus: OrderStatus;
  price: string;
  description: string;
  notes: string;
};

const orders: Order[] = [
  {
    orderNumber: "#515",
    project: "E-commerce Website",
    customer: "Ahmed Example",
    company: "Example Company",
    email: "customer@example.com",
    phone: "+46 70 000 00 15",
    service: "Online Store",
    packageName: "Business / Store package",
    orderDate: "Oct 3, 2026",
    deliveryDate: "Oct 24, 2026",
    timeRemaining: "18 days",
    paymentStatus: "Paid",
    projectStatus: "In Progress",
    price: "$1,850",
    description:
      "Build a polished online store with product pages, checkout-ready structure, and clear product category navigation.",
    notes: "Waiting for final product photos and preferred payment provider.",
  },
  {
    orderNumber: "#516",
    project: "Landing Page",
    customer: "Sara Demo",
    company: "Northline Studio",
    email: "sara.demo@example.com",
    phone: "+46 70 000 00 16",
    service: "Landing Page",
    packageName: "Launch package",
    orderDate: "Oct 4, 2026",
    deliveryDate: "Oct 12, 2026",
    timeRemaining: "6 days",
    paymentStatus: "Paid",
    projectStatus: "New",
    price: "$690",
    description:
      "Create a focused campaign landing page for a service launch with inquiry CTA and mobile-first layout.",
    notes: "Prepare first visual direction before internal review.",
  },
  {
    orderNumber: "#517",
    project: "Custom Website",
    customer: "Maya Example",
    company: "Atlas Clinic",
    email: "maya.example@example.com",
    service: "Custom Website",
    packageName: "Professional package",
    orderDate: "Oct 1, 2026",
    deliveryDate: "Oct 28, 2026",
    timeRemaining: "22 days",
    paymentStatus: "Unpaid",
    projectStatus: "Waiting for Client",
    price: "$2,400",
    description:
      "Design and build a custom informational website with service pages, contact flow, and refined brand presentation.",
    notes: "Client needs to confirm scope and send brand assets.",
  },
  {
    orderNumber: "#518",
    project: "Portfolio Website",
    customer: "Omar Demo",
    company: "Independent Creator",
    email: "omar.demo@example.com",
    phone: "+46 70 000 00 18",
    service: "Portfolio",
    packageName: "Starter package",
    orderDate: "Sep 22, 2026",
    deliveryDate: "Oct 7, 2026",
    timeRemaining: "1 day",
    paymentStatus: "Paid",
    projectStatus: "Completed",
    price: "$840",
    description:
      "Create a minimal portfolio with project gallery, about section, and direct contact CTA.",
    notes: "Ready for final delivery handoff.",
  },
];

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
    value === "Paid" || value === "Completed"
      ? "positive"
      : value === "Unpaid" || value === "Waiting for Client"
        ? "attention"
        : "neutral";

  return (
    <span className="statusPill" data-tone={tone}>
      {value}
    </span>
  );
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
          <span className="orderNumber">{order.orderNumber}</span>
          <h3>{order.project}</h3>
        </div>
        <StatusPill value={order.projectStatus} />
      </div>
      <div className="orderMeta">
        <span>Customer</span>
        <strong>{order.customer}</strong>
        <span>Company</span>
        <strong>{order.company}</strong>
        <span>Email</span>
        <strong>{order.email}</strong>
        <span>Service</span>
        <strong>{order.service}</strong>
      </div>
      <div className="orderSummary">
        <div>
          <span>Package</span>
          <strong>{order.packageName}</strong>
        </div>
        <div>
          <span>Delivery</span>
          <strong>{order.deliveryDate}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>{order.timeRemaining}</strong>
        </div>
      </div>
      <div className="orderFooter">
        <div>
          <span>Price</span>
          <strong>{order.price}</strong>
        </div>
        <StatusPill value={order.paymentStatus} />
        <button type="button" onClick={() => onViewDetails(order)}>
          View Details
        </button>
      </div>
    </article>
  );
}

function DetailsDrawer({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  if (!order) return null;

  const detailRows = [
    ["Order number", order.orderNumber],
    ["Customer", order.customer],
    ["Company", order.company],
    ["Email", order.email],
    ["Phone", order.phone || "Not provided"],
    ["Service type", order.service],
    ["Package", order.packageName],
    ["Price", order.price],
    ["Payment status", order.paymentStatus],
    ["Order status", order.projectStatus],
    ["Order date", order.orderDate],
    ["Delivery date", order.deliveryDate],
  ];

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
          <span>Project description</span>
          <p>{order.description}</p>
        </section>
        <section className="drawerSection">
          <span>Internal notes</span>
          <p>{order.notes}</p>
        </section>
      </aside>
    </div>
  );
}

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) =>
      [
        order.orderNumber,
        order.customer,
        order.company,
        order.email,
        order.project,
        order.service,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search]);

  if (!signedIn) {
    return (
      <main className="loginPage">
        <section className="loginCard" aria-labelledby="login-title">
          <div className="brandLockup">
            <BlueMindMark />
            <div>
              <strong>BlueMind Web Service</strong>
              <span>Admin or Employee Access</span>
            </div>
          </div>
          <div className="loginIntro">
            <p>Internal dashboard</p>
            <h1 id="login-title">Sign in to manage orders</h1>
          </div>
          <form
            className="loginForm"
            onSubmit={(event) => {
              event.preventDefault();
              setSignedIn(true);
            }}
          >
            <label>
              <span>Username</span>
              <input type="text" placeholder="employee@bluemind" autoComplete="username" />
            </label>
            <label>
              <span>Password</span>
              <div className="passwordField">
                <input
                  type={passwordVisible ? "text" : "password"}
                  placeholder="Enter password"
                  autoComplete="current-password"
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
            <div className="loginActions">
              <a href="#orders">Forgot password?</a>
              <button type="submit">Sign In</button>
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
          <button type="button" aria-label="Notifications" className="iconButton">
            bell
          </button>
          <div className="profileBadge" aria-label="Signed in employee">
            BM
          </div>
          <button type="button" className="logoutButton" onClick={() => setSignedIn(false)}>
            Logout
          </button>
        </div>
      </header>

      <section className="dashboardHero">
        <div>
          <p>Orders workspace</p>
          <h1>Orders</h1>
        </div>
        <div className="dashboardStats" aria-label="Demo order summary">
          <span>{orders.length} demo orders</span>
          <span>Frontend-only preview</span>
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

      <section className="ordersGrid" aria-label="Demo orders">
        {filteredOrders.map((order) => (
          <OrderCard key={order.orderNumber} order={order} onViewDetails={setSelectedOrder} />
        ))}
      </section>

      {filteredOrders.length === 0 && (
        <section className="emptyState">
          <h2>No demo orders found</h2>
          <p>Try another order number, customer name, email, or company.</p>
        </section>
      )}

      <DetailsDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </main>
  );
}
