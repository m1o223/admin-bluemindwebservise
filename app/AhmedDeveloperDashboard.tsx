"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

type WorkspaceUser = {
  access?: "admin" | "employee";
  email: string;
  employeeId: string;
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

const TABS = ["Dashboard", "My Tasks", "My Projects", "Messages", "Meetings", "My Files", "My Tools", "Schedule", "Work Session", "Profile"] as const;
type Tab = (typeof TABS)[number];

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

export function AhmedDeveloperDashboard({ user, onLogout }: { user: WorkspaceUser; onLogout: () => void }) {
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
      setNotice("Message sent to Mohammed.");
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
            <span>Developer</span>
          </div>
        </div>
        <nav className="developerNav" aria-label="Ahmed workspace sections">
          {TABS.map((tab) => (
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
            <p>{user.title || "Developer"}</p>
            <h1>Welcome back, Ahmed</h1>
          </div>
          <span>Europe/Stockholm</span>
        </header>

        {notice && <p className="workspaceNotice">{notice}</p>}
        {error && <p className="workspaceError" role="alert">{error}</p>}
        {loading && <EmptyState title="Loading workspace" text="Fetching Ahmed's assigned workspace data." />}

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
              <h2>Current focus</h2>
              {selectedTask ? <TaskSummary task={selectedTask} /> : <EmptyState title="No task selected" text="Ahmed has no assigned tasks yet." />}
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
              )) : <EmptyState title="No assigned tasks" text="Tasks assigned by management will appear here." />}
            </div>
            <div className="developerPanel">
              <h2>Task Details</h2>
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
                  <p className="workspaceHelp">Ahmed can submit work for review, but cannot approve his own task.</p>
                </div>
              ) : <EmptyState title="No task open" text="Choose an assigned task to read instructions and submit work." />}
            </div>
          </section>
        )}

        {!loading && activeTab === "My Projects" && (
          <section className="developerPanel">
            <h2>My Projects</h2>
            {overview?.projects.length ? overview.projects.map((project) => <ProjectCard project={project} key={project.id} />) : <EmptyState title="No assigned projects" text="Only projects assigned to Ahmed will appear here." />}
          </section>
        )}

        {!loading && activeTab === "Messages" && (
          <section className="developerPanel">
            <h2>Messages</h2>
            <form className="workspaceForm" onSubmit={sendMessage}>
              <label>Message Mohammed<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="Write a project question or update..." /></label>
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

        {!loading && activeTab === "My Files" && (
          <section className="developerPanel">
            <h2>My Files</h2>
            {overview?.files.length ? overview.files.map((file) => <FileRow file={file} key={file.id} />) : <EmptyState title="No workspace files" text="Approved design files and submitted work files will appear here after secure file storage is connected." />}
            <p className="workspaceHelp">File upload storage is not connected yet. Use the task GitHub link field for review submissions for now.</p>
          </section>
        )}

        {!loading && activeTab === "My Tools" && <ToolsPanel />}
        {!loading && activeTab === "Schedule" && <SchedulePanel meetings={overview?.meetings || []} tasks={overview?.tasks || []} />}
        {!loading && activeTab === "Work Session" && (
          <section className="developerPanel">
            <h2>Work Session</h2>
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

        {!loading && activeTab === "Profile" && (
          <section className="developerPanel">
            <h2>My Profile</h2>
            <dl className="profileGrid">
              <div><dt>Full name</dt><dd>Ahmed</dd></div>
              <div><dt>Job role</dt><dd>Developer</dd></div>
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

function FileRow({ file }: { file: WorkspaceFile }) {
  return <article className="fileRow"><strong>{file.fileName}</strong><span>{file.projectName || "General"}</span><span>{formatDate(file.uploadedAt)}</span>{file.downloadUrl ? <a href={file.downloadUrl}>Download</a> : <em>No download link</em>}</article>;
}

function ToolsPanel() {
  const tools = [
    ["GitHub", "Repository access for approved development work.", "https://github.com/"],
    ["VS Code", "Recommended code editor for local development.", "https://code.visualstudio.com/"],
    ["Vercel", "Frontend deployment visibility when authorized.", "https://vercel.com/"],
    ["Render", "Backend deployment visibility when authorized.", "https://render.com/"],
    ["Figma", "Approved design files and developer handoff.", "https://figma.com/"],
  ];
  return <section className="developerPanel"><h2>My Tools</h2><div className="toolsGrid">{tools.map(([name, description, href]) => <a href={href} target="_blank" rel="noreferrer" key={name}><strong>{name}</strong><span>{description}</span></a>)}</div><p className="workspaceHelp">No API keys, passwords, or administrator credentials are shown here.</p></section>;
}

function SchedulePanel({ meetings, tasks }: { meetings: WorkspaceMeeting[]; tasks: WorkspaceTask[] }) {
  const deadlines = tasks.filter((task) => task.deadline).slice(0, 5);
  return <section className="developerPanel"><h2>Schedule</h2><p className="workspaceHelp">Assigned hours use Europe/Stockholm unless management configures a different timezone.</p>{deadlines.length || meetings.length ? <div className="scheduleList">{deadlines.map((task) => <p key={task.taskId}><strong>{task.title}</strong><span>{formatDate(task.deadline)}</span></p>)}{meetings.map((meeting) => <p key={meeting.id}><strong>{meeting.purpose}</strong><span>{formatDate(meeting.startsAt)}</span></p>)}</div> : <EmptyState title="No scheduled work" text="Deadlines, planned work sessions, approved breaks, leave, and meetings will appear here when assigned." />}</section>;
}
