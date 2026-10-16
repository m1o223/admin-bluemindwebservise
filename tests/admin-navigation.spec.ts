import { expect, test, type Page } from "@playwright/test";

const sections = ["Dashboard", "Orders", "Projects", "Team", "Tasks", "Messages", "Meetings", "Schedule", "Finance", "Settings"];
const order = { id: "fixture-order", orderNumber: "#TEST-001", customerName: "Test Customer", email: "customer@example.test", projectType: "Website", service: "Web development", package: "Showcase Website", price: "4,990 SEK", paymentStatus: "Test Paid", paymentMode: "test", projectStatus: "Pending Review", reviewStatus: "pending_review", isPaidOrder: true, isSandboxTestOrder: true, orderDate: "2026-10-01", deliveryDate: "2026-11-01", projectDescription: "Test fixture only" };

// These are isolated browser fixtures, never real sessions or production records.
async function mockApi(page: Page, id: string, name: string, employee = false, loggedIn = true) {
  const user = { employeeId: id, displayName: name, email: `${id}@example.test`, access: employee ? "employee" : "admin" };
  const calls: string[] = [];
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    calls.push(url.pathname);
    let data: unknown = {};
    if (url.pathname.endsWith("/session")) data = { authenticated: loggedIn, employee: loggedIn ? user : null };
    else if (url.pathname.endsWith("/login")) { loggedIn = true; data = { employee: user }; }
    else if (url.pathname.endsWith("/logout")) loggedIn = false;
    else if (url.pathname.endsWith("/heartbeat")) data = { employee: user, employees: [] };
    else if (url.pathname === "/api/admin/orders") data = { orders: url.searchParams.get("search") === "missing" ? [] : [order] };
    else if (decodeURIComponent(url.pathname) === `/api/admin/orders/${order.orderNumber}`) data = { order };
    else if (url.pathname.endsWith("/care-subscriptions")) data = { subscriptions: [] };
    else if (url.pathname.endsWith("/contacts")) data = { contacts: [] };
    else if (url.pathname.endsWith("/conversations")) data = { conversations: [] };
    else if (url.pathname.endsWith("/overview")) data = { summary: { todayAssignedTasks: 0, tasksInProgress: 0, waitingForReview: 0, activeProjects: 0, upcomingDeadlines: [], unreadMessages: 0, nextMeeting: null }, tasks: [], projects: [], messages: [], meetings: [], files: [] };
    else if (url.pathname.endsWith("/messages")) data = { messages: [] };
    await route.fulfill({ json: data });
  });
  return calls;
}

for (const [id, name] of [["M", "Mohammed"], ["R", "Rokaia"]]) {
  test(`${name}: login defaults to Dashboard and all navigation works`, async ({ page }) => {
    await mockApi(page, id, name, false, false);
    await page.goto("/");
    await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
    await page.getByPlaceholder("Enter password").fill("isolated-test-fixture");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Admin navigation" });
    await expect(nav.getByRole("button")).toHaveText(sections);
    await expect(page.getByRole("heading", { name: "New Orders" }).locator("..").getByText("0", { exact: true })).toBeVisible();
    for (const section of sections) {
      await nav.getByRole("button", { name: section, exact: true }).click();
      await expect(nav.getByRole("button", { name: section, exact: true })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("heading", { name: section === "Orders" ? "Orders Workspace" : section, exact: true }).first()).toBeVisible();
    }
    await nav.getByRole("button", { name: "Orders", exact: true }).click();
    await expect(page.getByText("Test Customer", { exact: true })).toBeVisible();
    await page.getByRole("searchbox").fill("missing");
    await expect(page.getByRole("heading", { name: "No orders found" })).toBeVisible();
    await page.getByRole("searchbox").fill("");
    await page.getByRole("button", { name: "View Details" }).click();
    await expect(page.locator(".detailsDrawer")).toBeVisible();
  });
}

for (const width of [320, 375, 768, 1024, 1440, 1920]) {
  test(`admin responsive navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mockApi(page, "M", "Mohammed");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/admin-dashboard-${width}.png`, fullPage: true });
    if (width < 768) {
      await expect(page.getByRole("navigation", { name: "Admin navigation" })).not.toBeVisible();
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.getByRole("dialog", { name: "Administrator sidebar" })).toBeVisible();
      await page.screenshot({ path: `test-results/admin-drawer-${width}.png` });
      await page.getByRole("navigation").getByRole("button", { name: "Orders", exact: true }).click();
      await expect(page.getByRole("navigation")).not.toBeVisible();
    } else {
      await page.getByRole("button", { name: "Collapse sidebar" }).click();
      const buttons = page.getByRole("navigation").getByRole("button");
      await expect(buttons.first()).toHaveCSS("width", "42px");
      await page.screenshot({ path: `test-results/admin-collapsed-${width}.png` });
      await buttons.filter({ hasText: "Orders" }).click();
      await page.getByRole("button", { name: "Expand sidebar" }).click();
    }
    await expect(page.getByRole("heading", { name: "Orders Workspace" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: `test-results/admin-orders-${width}.png`, fullPage: true });
  });
}

for (const [id, name] of [["AHMED", "Ahmed"], ["AMMAR", "Ammar"], ["PATRICK", "Patrick Jane"]]) {
  test(`${name}: employee route stays separate from admin`, async ({ page }) => {
    const calls = await mockApi(page, id, name, true);
    await page.goto("/?order=TEST-001");
    await expect(page.locator(".developerWorkspacePage")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Admin navigation" })).toHaveCount(0);
    expect(calls.some(path => path.startsWith("/api/admin/orders"))).toBeFalsy();
  });
}

test("dashboard reports unavailable data honestly", async ({ page }) => {
  await mockApi(page, "M", "Mohammed");
  await page.route("**/api/workspace/messenger/**", route => route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Unread Messages" }).locator("..").getByText("No data available")).toBeVisible();
});

test("sidebar and main content scroll independently; logout returns to login", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 450 });
  await mockApi(page, "M", "Mohammed");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Admin navigation" });
  const main = page.getByRole("main");
  await nav.evaluate(element => { element.scrollTop = 150; });
  await expect.poll(() => nav.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await main.evaluate(element => element.scrollTop)).toBe(0);
  const sidebarTop = await nav.evaluate(element => element.scrollTop);
  await main.evaluate(element => { element.scrollTop = 200; });
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await nav.evaluate(element => element.scrollTop)).toBe(sidebarTop);
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
  await expect(nav).toHaveCount(0);
});

test("mobile drawer traps focus and closes on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await mockApi(page, "R", "Rokaia");
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Close navigation" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Logout", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.getByRole("navigation")).not.toBeVisible();
});

test("existing direct order links still open Orders and details", async ({ page }) => {
  await mockApi(page, "M", "Mohammed");
  await page.goto("/?order=TEST-001");
  await expect(page.getByRole("heading", { name: "Orders Workspace" })).toBeVisible();
  await expect(page.locator(".detailsDrawer")).toBeVisible();
});
