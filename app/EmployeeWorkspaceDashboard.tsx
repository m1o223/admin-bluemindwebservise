"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

type WorkspaceUser = {
  access?: "admin" | "employee";
  email: string;
  employeeId: "AHMED" | "AMMAR" | "PATRICK" | string;
  displayName: string;
  title?: string;
};

type WorkspaceTask = {
  id: string;
  taskId: string;
  title: string;
  description: string;
  projectName: string;
  assignedBy: string;
  assignedAt: string | null;
  deadline: string | null;
  priority: string;
  attachedFiles: { name?: string; url?: string }[];
  referenceDesigns: { name?: string; url?: string }[];
  status: "To Do" | "In Progress" | "Waiting for Review" | "Changes Requested" | "Completed";
  progress: number;
  githubLink: string;
  comments: { authorName: string; message: string; createdAt: string | null }[];
};

type WorkspaceProject = {
  id: string;
  name: string;
  description: string;
  developmentStatus: string;
  managerNotes: string;
  githubLinks: string[];
};

type WorkspaceMessage = {
  id: string;
  fromId: string;
  toId: string;
  body: string;
  createdAt: string | null;
};

type WorkspaceMeeting = {
  id: string;
  purpose: string;
  startsAt: string | null;
  participants: string[];
  joinUrl: string;
  notes: string;
};

type WorkspaceFile = {
  id: string;
  fileName: string;
  projectName: string;
  downloadUrl: string;
  uploadedAt: string | null;
};

type WorkSession = {
  id: string;
  status: "active" | "paused" | "ended";
  currentTaskId: string;
  startedAt: string | null;
  activeMilliseconds: number;
  breakMilliseconds: number;
} | null;

type WorkspaceOverview = {
  summary: {
    todayAssignedTasks: number;
    tasksInProgress: number;
    waitingForReview: number;
    activeProjects: number;
    upcomingDeadlines: WorkspaceTask[];
    unreadMessages: number;
    nextMeeting: WorkspaceMeeting | null;
    todayWork: { activeMilliseconds: number; breakMilliseconds: number };
  };
  tasks: WorkspaceTask[];
  projects: WorkspaceProject[];
  messages: WorkspaceMessage[];
  meetings: WorkspaceMeeting[];
  files: WorkspaceFile[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://bluemind-web-service-backend.onrender.com";

type EmployeeWorkspaceConfig = {
  role: string;
  sidebarLabel: string;
  dashboardFocus: string;
  taskLabel: string;
  taskEmpty: string;
  projectLabel: string;
  projectEmpty: string;
  designsTitle?: string;
  designsText?: string;
  codeTitle?: string;
  codeText?: string;
  buildsTitle?: string;
  buildsText?: string;
  feedbackTitle?: string;
  feedbackText?: string;
  submitTitle?: string;
  submitText?: string;
  tools: [string, string, string][];
  tabs: readonly string[];
};

const EMPLOYEE_WORKSPACES: Record<string, EmployeeWorkspaceConfig> = {
  AHMED: {
    role: "iOS Developer",
    sidebarLabel: "iOS Workspace",
    dashboardFocus: "Assigned iOS work",
    taskLabel: "iOS development tasks",
    taskEmpty: "iOS development tasks assigned by management will appear here.",
    projectLabel: "Assigned iOS applications",
    projectEmpty: "Only iOS applications assigned to Ahmed will appear here.",
    designsTitle: "Approved App Designs",
    designsText: "Approved iPhone app designs, screen specifications, assets, and developer handoff notes will appear here when management assigns them.",
    codeTitle: "Code & Repositories",
    codeText: "Authorized iOS GitHub repositories will appear here. Repository access is managed by BlueMind Workspace.",
    buildsTitle: "App Builds",
    buildsText: "Development builds, TestFlight links, and testing instructions will appear here when configured.",
    tools: [
      ["GitHub", "Repository access for approved iOS development work.", "https://github.com/"],
      ["VS Code", "Recommended editor for code review and shared project work.", "https://code.visualstudio.com/"],
      ["Xcode", "Apple's iOS development environment.", "https://developer.apple.com/xcode/"],
      ["Apple Developer", "iOS certificates, profiles, and app distribution when authorized.", "https://developer.apple.com/"],
      ["Figma", "Approved iPhone app design handoff.", "https://figma.com/"],
    ],
    tabs: ["Dashboard", "My Tasks", "My Projects", "Designs", "Code & Repositories", "App Builds", "Messages", "Meetings", "Work Time", "My Tools", "My Profile"],
  },
  PATRICK: {
    role: "Android Developer",
    sidebarLabel: "Android Workspace",
    dashboardFocus: "Assigned Android work",
    taskLabel: "Android development tasks",
    taskEmpty: "Android development tasks assigned by management will appear here.",
    projectLabel: "Assigned Android applications",
    projectEmpty: "Only Android applications assigned to Patrick Jane will appear here.",
    designsTitle: "Approved Android Designs",
    designsText: "Approved Android designs, screen specifications, assets, and developer handoff notes will appear here when management assigns them.",
    codeTitle: "Code & Repositories",
    codeText: "Authorized Android GitHub repositories will appear here. Repository access is managed by BlueMind Workspace.",
    buildsTitle: "App Builds",
    buildsText: "Android testing builds, internal testing links, and QA notes will appear here when configured.",
    tools: [
      ["GitHub", "Repository access for approved Android development work.", "https://github.com/"],
      ["Android Studio", "Primary Android development environment.", "https://developer.android.com/studio"],
      ["Google Play Console", "App testing and release management when authorized.", "https://play.google.com/console/"],
      ["Firebase", "Approved Android testing and diagnostics tools when configured.", "https://firebase.google.com/"],
      ["Figma", "Approved Android design handoff.", "https://figma.com/"],
    ],
    tabs: ["Dashboard", "My Tasks", "My Projects", "Designs", "Code & Repositories", "App Builds", "Messages", "Meetings", "Work Time", "My Tools", "My Profile"],
  },
  AMMAR: {
    role: "UI/UX Designer",
    sidebarLabel: "Design Workspace",
    dashboardFocus: "Assigned design work",
    taskLabel: "Assigned design tasks",
    taskEmpty: "Website, iOS, and Android design tasks assigned by management will appear here.",
    projectLabel: "Website, iOS, and Android design projects",
    projectEmpty: "Only design projects assigned to Ammar will appear here.",
    designsTitle: "Design Studio",
    designsText: "Design files, Figma links, colors, typography notes, components, and approved brand assets will appear here when configured.",
    feedbackTitle: "Design Feedback",
    feedbackText: "Management feedback, requested changes, and review notes will appear here when a design is reviewed.",
    submitTitle: "Submit Designs",
    submitText: "Submit completed design work through an assigned task or approved Figma link. Secure file upload will be connected in a later step.",
    tools: [
      ["Figma", "Primary design workspace for approved website, iOS, and Android interfaces.", "https://figma.com/"],
      ["FigJam", "Workshops, user flows, and design planning.", "https://figma.com/figjam/"],
      ["Adobe Creative Cloud", "Visual assets when authorized by management.", "https://www.adobe.com/creativecloud.html"],
      ["GitHub", "Design handoff references and issue links when authorized.", "https://github.com/"],
      ["Google Fonts", "Typography references for approved design systems.", "https://fonts.google.com/"],
    ],
    tabs: ["Dashboard", "My Tasks", "My Projects", "Design Studio", "Design Feedback", "Submit Designs", "Messages", "Meetings", "Work Time", "My Tools", "My Profile"],
  },
};

type Tab = string;

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(date);
}

function formatDuration(ms = 0) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours <= 0) return `${remaining} min`;
  return `${hours}h ${remaining}m`;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="workspaceEmpty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function WorkspaceLogo() {
  return <img className="workspaceLogo" src="/images/brand/bluemind-original-logo-transparent.png" alt="" />;
}

export function EmployeeWorkspaceDashboard({ user, onLogout }: { user: WorkspaceUser; onLogout: () => void }) {
  const config = EMPLOYEE_WORKSPACES[user.employeeId] || EMPLOYEE_WORKSPACES.AHMED;
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [checkIn, setCheckIn] = useState({ completed: "", workingOn: "", blockers: "" });
  const [workSession, setWorkSession] = useState<WorkSession>(null);
  const [workSummary, setWorkSummary] = useState({ activeMilliseconds: 0, breakMilliseconds: 0 });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedTask = useMemo(
    () => overview?.tasks.find((task) => task.taskId === selectedTaskId) || overview?.tasks[0] || null,
    [overview?.tasks, selectedTaskId],
  );

  async function workspaceFetch<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: init?.body ? { "Content-Type": "application/json", ...(init.headers || {}) } : init?.headers,
      ...init,
    });
    const data = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new Error(data.error || "Workspace request failed.");
    return data;
  }

  async function refreshWorkspace() {
    setError("");
    try {
      const data = await workspaceFetch<WorkspaceOverview>("/api/workspace/overview");
      setOverview(data);
      const session = await workspaceFetch<{ session: WorkSession; today: { activeMilliseconds: number; breakMilliseconds: number } }>("/api/workspace/work-session");
      setWorkSession(session.session);
      setWorkSummary(session.today);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workspace unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!config.tabs.includes(activeTab)) setActiveTab("Dashboard");
  }, [activeTab, config.tabs]);

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  async function updateTask(action: string, body: Record<string, unknown> = {}) {
    if (!selectedTask) return;
    setNotice("");
    setError("");
    try {
      await workspaceFetch(`/api/workspace/tasks/${encodeURIComponent(selectedTask.taskId)}`, {
        method: "PATCH",
        body: JSON.stringify({ action, ...body }),
      });
      setComment("");
      setGithubLink("");
      setNotice("Task updated.");
      await refreshWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task.");
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setError("");
    try {
      await workspaceFetch("/api/workspace/messages", {
        method: "POST",
        body: JSON.stringify({ toId: "M", message }),
      });
      setMessage("");
      setNotice("Message sent to management.");
      await refreshWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    }
  }

  async function workAction(action: "start" | "pause" | "resume" | "end") {
    setError("");
    try {
      const data = await workspaceFetch<{ session: WorkSession; today: { activeMilliseconds: number; breakMilliseconds: number } }>("/api/workspace/work-session", {
        method: "POST",
        body: JSON.stringify({ action, currentTaskId: selectedTask?.taskId || "" }),
      });
      setWorkSession(data.session);
      setWorkSummary(data.today);
      setNotice(`Work session ${action} saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update work session.");
    }
  }

  async function sendCheckIn(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await workspaceFetch("/api/workspace/check-ins", {
        method: "POST",
        body: JSON.stringify(checkIn),
      });
      setCheckIn({ completed: "", workingOn: "", blockers: "" });
      setNotice("Progress check-in saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save check-in.");
    }
  }

  const summaryCards = [
    ["Today's assigned tasks", overview?.summary.todayAssignedTasks ?? 0],
    ["Tasks in progress", overview?.summary.tasksInProgress ?? 0],
    ["Waiting for review", overview?.summary.waitingForReview ?? 0],
    ["Active projects", overview?.summary.activeProjects ?? 0],
    ["Upcoming deadlines", overview?.summary.upcomingDeadlines.length ?? 0],
    ["Unread messages", overview?.summary.unreadMessages ?? 0],
    ["Next meeting", overview?.summary.nextMeeting ? formatDate(overview.summary.nextMeeting.startsAt) : "None"],
    ["Today's working time", formatDuration(workSummary.activeMilliseconds || overview?.summary.todayWork.activeMilliseconds || 0)],
  ];

  return (
    <main className="developerWorkspacePage">
      <aside className="developerSidebar">
        <div className="developerBrand">
          <WorkspaceLogo />
          <div>
            <strong>BlueMind Workspace</strong>
            <span>{config.sidebarLabel}</span>
          </div>
        </div>
        <nav className="developerNav" aria-label={`${user.displayName} workspace sections`}>
          {config.tabs.map((tab) => (
            <button key={tab} type="button" data-active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </nav>
        <button type="button" className="logoutButton developerLogout" onClick={onLogout}>Logout</button>
      </aside>

      <section className="developerMain">
        <header className="developerHeader">
          <div>
            <p>{config.role}</p>
            <h1>Welcome back, {user.displayName}</h1>
          </div>
          <span>Europe/Stockholm</span>
        </header>

        {notice && <p className="workspaceNotice">{notice}</p>}
        {error && <p className="workspaceError" role="alert">{error}</p>}
        {loading && <EmptyState title="Loading workspace" text={`Fetching ${user.displayName}'s assigned workspace data.`} />}

        {!loading && activeTab === "Dashboard" && (
          <div className="developerSectionStack">
            <div className="developerMetricGrid">
              {summaryCards.map(([label, value]) => (
                <article className="developerMetric" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <section className="developerPanel">
              <h2>{config.dashboardFocus}</h2>
              {selectedTask ? <TaskSummary task={selectedTask} /> : <EmptyState title="No task selected" text={`${user.displayName} has no assigned tasks yet.`} />}
            </section>
          </div>
        )}

        {!loading && activeTab === "My Tasks" && (
          <section className="developerTwoColumn">
            <div className="developerPanel">
              <h2>My Tasks</h2>
              {overview?.tasks.length ? overview.tasks.map((task) => (
                <button type="button" className="taskListItem" data-active={selectedTask?.taskId === task.taskId} key={task.taskId} onClick={() => setSelectedTaskId(task.taskId)}>
                  <strong>{task.title}</strong>
                  <span>{task.projectName} - {task.status}</span>
                </button>
              )) : <EmptyState title="No assigned tasks" text={config.taskEmpty} />}
            </div>
            <div className="developerPanel">
              <h2>{config.taskLabel}</h2>
              {selectedTask ? (
                <div className="taskDetail">
                  <TaskSummary task={selectedTask} />
                  <div className="taskActions">
                    <button type="button" onClick={() => updateTask("start")}>Start Working</button>
                    <button type="button" className="secondaryAction" onClick={() => updateTask("progress", { progress: Math.min(100, selectedTask.progress + 10) })}>Update Progress</button>
                  </div>
                  <label>
                    Add comment
                    <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Write a progress note or blocker..." />
                  </label>
                  <button type="button" className="secondaryAction" onClick={() => updateTask("comment", { message: comment })}>Add Comment</button>
                  <label>
                    GitHub link for review
                    <input value={githubLink} onChange={(event) => setGithubLink(event.target.value)} placeholder="https://github.com/..." />
                  </label>
                  <button type="button" onClick={() => updateTask("submit", { githubLink })}>Submit for Review</button>
                  <p className="workspaceHelp">{user.displayName} can submit work for review, but cannot approve their own task.</p>
                </div>
              ) : <EmptyState title="No task open" text="Choose an assigned task to read instructions and submit work." />}
            </div>
          </section>
        )}

        {!loading && activeTab === "My Projects" && (
          <section className="developerPanel">
            <h2>My Projects</h2>
            <p className="workspaceHelp">{config.projectLabel}</p>
            {overview?.projects.length ? overview.projects.map((project) => <ProjectCard project={project} key={project.id} />) : <EmptyState title="No assigned projects" text={config.projectEmpty} />}
          </section>
        )}

        {!loading && (activeTab === "Designs" || activeTab === "Design Studio") && (
          <WorkspaceInfoPanel title={config.designsTitle || activeTab} text={config.designsText || "Approved design files and specifications will appear here when configured."} />
        )}

        {!loading && activeTab === "Code & Repositories" && (
          <WorkspaceInfoPanel title={config.codeTitle || "Code & Repositories"} text={config.codeText || "Authorized repositories will appear here when configured."} />
        )}

        {!loading && activeTab === "App Builds" && (
          <WorkspaceInfoPanel title={config.buildsTitle || "App Builds"} text={config.buildsText || "Builds and testing links will appear here when configured."} />
        )}

        {!loading && activeTab === "Design Feedback" && (
          <WorkspaceInfoPanel title={config.feedbackTitle || "Design Feedback"} text={config.feedbackText || "Feedback and requested changes will appear here when configured."} />
        )}

        {!loading && activeTab === "Submit Designs" && (
          <WorkspaceInfoPanel title={config.submitTitle || "Submit Designs"} text={config.submitText || "Design submission tools will appear here when configured."} />
        )}

        {!loading && activeTab === "Messages" && (
          <section className="developerPanel">
            <h2>Messages</h2>
            <form className="workspaceForm" onSubmit={sendMessage}>
              <label>Message management<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Write a project question or update..." /></label>
              <button type="submit">Send Message</button>
            </form>
            {overview?.messages.length ? overview.messages.map((item) => <p className="messageRow" key={item.id}><strong>{item.fromId}</strong>{item.body}<span>{formatDate(item.createdAt)}</span></p>) : <EmptyState title="No messages yet" text="Management messages and project conversations will appear here." />}
          </section>
        )}

        {!loading && activeTab === "Meetings" && (
          <section className="developerPanel">
            <h2>Meetings</h2>
            {overview?.meetings.length ? overview.meetings.map((meeting) => <MeetingCard meeting={meeting} key={meeting.id} />) : <EmptyState title="No upcoming meetings" text="Scheduled video check-ins will appear here. Cameras and microphones are never activated automatically." />}
          </section>
        )}

        {!loading && activeTab === "My Tools" && <ToolsPanel tools={config.tools} />}
        {!loading && activeTab === "Work Time" && (
          <section className="developerPanel">
            <h2>Work Time</h2>
            <div className="workSessionControls">
              <button type="button" onClick={() => workAction("start")}>Start Work</button>
              <button type="button" className="secondaryAction" onClick={() => workAction("pause")}>Pause Work</button>
              <button type="button" className="secondaryAction" onClick={() => workAction("resume")}>Resume Work</button>
              <button type="button" className="secondaryAction" onClick={() => workAction("end")}>End Work</button>
            </div>
            <div className="developerMetricGrid compact">
              <article className="developerMetric"><span>Current session</span><strong>{workSession?.status || "Not running"}</strong></article>
              <article className="developerMetric"><span>Total active time today</span><strong>{formatDuration(workSummary.activeMilliseconds)}</strong></article>
              <article className="developerMetric"><span>Break duration</span><strong>{formatDuration(workSummary.breakMilliseconds)}</strong></article>
              <article className="developerMetric"><span>Current task</span><strong>{workSession?.currentTaskId || selectedTask?.title || "Not selected"}</strong></article>
            </div>
            <form className="workspaceForm" onSubmit={sendCheckIn}>
              <h3>Progress check-in</h3>
              <label>What I completed<textarea value={checkIn.completed} onChange={(event) => setCheckIn((current) => ({ ...current, completed: event.target.value }))} rows={2} /></label>
              <label>What I'm working on<textarea value={checkIn.workingOn} onChange={(event) => setCheckIn((current) => ({ ...current, workingOn: event.target.value }))} rows={2} /></label>
              <label>Problems or blockers<textarea value={checkIn.blockers} onChange={(event) => setCheckIn((current) => ({ ...current, blockers: event.target.value }))} rows={2} /></label>
              <button type="submit">Save Check-in</button>
            </form>
          </section>
        )}

        {!loading && activeTab === "My Profile" && (
          <section className="developerPanel">
            <h2>My Profile</h2>
            <dl className="profileGrid">
              <div><dt>Full name</dt><dd>{user.displayName}</dd></div>
              <div><dt>Job role</dt><dd>{config.role}</dd></div>
              <div><dt>Work email</dt><dd>{user.email}</dd></div>
              <div><dt>Preferred language</dt><dd>English</dd></div>
              <div><dt>Account settings</dt><dd>Managed by BlueMind Workspace</dd></div>
              <div><dt>Change password</dt><dd>Password reset is handled securely by management for this test account.</dd></div>
            </dl>
            <button type="button" onClick={onLogout}>Logout</button>
          </section>
        )}
      </section>
    </main>
  );
}

function TaskSummary({ task }: { task: WorkspaceTask }) {
  return (
    <article className="taskSummary">
      <h3>{task.title}</h3>
      <p>{task.description || "No description added yet."}</p>
      <dl>
        <div><dt>Project</dt><dd>{task.projectName}</dd></div>
        <div><dt>Assigned by</dt><dd>{task.assignedBy}</dd></div>
        <div><dt>Date assigned</dt><dd>{formatDate(task.assignedAt)}</dd></div>
        <div><dt>Deadline</dt><dd>{formatDate(task.deadline)}</dd></div>
        <div><dt>Priority</dt><dd>{task.priority}</dd></div>
        <div><dt>Status</dt><dd>{task.status}</dd></div>
        <div><dt>Progress</dt><dd>{task.progress}%</dd></div>
      </dl>
    </article>
  );
}

function ProjectCard({ project }: { project: WorkspaceProject }) {
  return <article className="projectCard"><h3>{project.name}</h3><p>{project.description || "No description added yet."}</p><span>{project.developmentStatus}</span><p>{project.managerNotes || "No manager notes yet."}</p></article>;
}

function MeetingCard({ meeting }: { meeting: WorkspaceMeeting }) {
  return <article className="projectCard"><h3>{meeting.purpose}</h3><p>{formatDate(meeting.startsAt)}</p><p>{meeting.participants.join(", ") || "Participants not listed"}</p>{meeting.joinUrl ? <a href={meeting.joinUrl} target="_blank" rel="noreferrer">Join Meeting</a> : <span>Join link not added yet</span>}</article>;
}

function WorkspaceInfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <section className="developerPanel">
      <h2>{title}</h2>
      <EmptyState title="Not configured yet" text={text} />
      <p className="workspaceHelp">This section is prepared for secure backend data. Nothing private is shown unless it is assigned to this employee.</p>
    </section>
  );
}

function ToolsPanel({ tools }: { tools: [string, string, string][] }) {
  return <section className="developerPanel"><h2>My Tools</h2><div className="toolsGrid">{tools.map(([name, description, href]) => <a href={href} target="_blank" rel="noreferrer" key={name}><strong>{name}</strong><span>{description}</span></a>)}</div><p className="workspaceHelp">No API keys, passwords, or administrator credentials are shown here.</p></section>;
}
