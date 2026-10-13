"use client";

import {
  CalendarDays,
  Bell,
  Camera,
  ChevronDown,
  Coffee,
  FileText,
  House,
  Laptop,
  Leaf,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Languages,
  LogOut,
  ShieldCheck,
  UserRound,
  UsersRound,
  Utensils,
  Video,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceMessenger } from "./WorkspaceMessenger";
import { type WorkspaceNotification, WorkspaceNotificationCenter } from "./WorkspaceNotificationCenter";

type WorkspaceUser = {
  access?: "admin" | "employee";
  email: string;
  employeeId: "AHMED" | "AMMAR" | "PATRICK" | string;
  displayName: string;
  title?: string;
  requiresPasswordChange?: boolean;
  profilePhotoUrl?: string;
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

type WorkspaceOverview = {
  summary: {
    todayAssignedTasks: number;
    tasksInProgress: number;
    waitingForReview: number;
    activeProjects: number;
    upcomingDeadlines: WorkspaceTask[];
    unreadMessages: number;
    nextMeeting: WorkspaceMeeting | null;
  };
  tasks: WorkspaceTask[];
  projects: WorkspaceProject[];
  messages: WorkspaceMessage[];
  meetings: WorkspaceMeeting[];
  files: WorkspaceFile[];
};

type WorkspaceTool = {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  openUrl: string;
  downloadUrl?: string;
  workAccountEmail?: string;
  enabled?: boolean;
};

type WorkspaceProfile = WorkspaceUser & {
  accountStatus: string;
  preferredLanguage: "English" | "Arabic";
  timezone: string;
  notifications: {
    messages: boolean;
    meetings: boolean;
    security: boolean;
  };
  permissions: string[];
  profilePhotoUrl: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://bluemind-web-service-backend.onrender.com";

type EmployeeWorkspaceConfig = {
  role: string;
  roleKey: "ios" | "android" | "design";
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
  tabs: readonly string[];
};

const EMPLOYEE_WORKSPACES: Record<EmployeeWorkspaceConfig["roleKey"], EmployeeWorkspaceConfig> = {
  ios: {
    role: "iOS Developer",
    roleKey: "ios",
    sidebarLabel: "iOS Workspace",
    dashboardFocus: "Assigned iOS work",
    taskLabel: "iOS development tasks",
    taskEmpty: "iOS development tasks assigned by management will appear here.",
    projectLabel: "Assigned iOS applications",
    projectEmpty: "Only iOS applications assigned to this employee will appear here.",
    designsTitle: "Approved App Designs",
    designsText: "Approved iPhone app designs, screen specifications, assets, and developer handoff notes will appear here when management assigns them.",
    codeTitle: "Code & Repositories",
    codeText: "Authorized iOS GitHub repositories will appear here. Repository access is managed by BlueMind Workspace.",
    buildsTitle: "App Builds",
    buildsText: "Development builds, TestFlight links, and testing instructions will appear here when configured.",
    tabs: ["Dashboard", "Messages", "Meetings", "My Schedule", "My Tools", "My Profile"],
  },
  android: {
    role: "Android Developer",
    roleKey: "android",
    sidebarLabel: "Android Workspace",
    dashboardFocus: "Assigned Android work",
    taskLabel: "Android development tasks",
    taskEmpty: "Android development tasks assigned by management will appear here.",
    projectLabel: "Assigned Android applications",
    projectEmpty: "Only Android applications assigned to this employee will appear here.",
    designsTitle: "Approved Android Designs",
    designsText: "Approved Android designs, screen specifications, assets, and developer handoff notes will appear here when management assigns them.",
    codeTitle: "Code & Repositories",
    codeText: "Authorized Android GitHub repositories will appear here. Repository access is managed by BlueMind Workspace.",
    buildsTitle: "App Builds",
    buildsText: "Android testing builds, internal testing links, and QA notes will appear here when configured.",
    tabs: ["Dashboard", "Messages", "Meetings", "My Schedule", "My Tools", "My Profile"],
  },
  design: {
    role: "UI/UX Designer",
    roleKey: "design",
    sidebarLabel: "Design Workspace",
    dashboardFocus: "Assigned design work",
    taskLabel: "Assigned design tasks",
    taskEmpty: "Website, iOS, and Android design tasks assigned by management will appear here.",
    projectLabel: "Website, iOS, and Android design projects",
    projectEmpty: "Only design projects assigned to this employee will appear here.",
    designsTitle: "Design Studio",
    designsText: "Design files, Figma links, colors, typography notes, components, and approved brand assets will appear here when configured.",
    feedbackTitle: "Design Feedback",
    feedbackText: "Management feedback, requested changes, and review notes will appear here when a design is reviewed.",
    submitTitle: "Submit Designs",
    submitText: "Submit completed design work through an assigned task or approved Figma link. Secure file upload will be connected in a later step.",
    tabs: ["Dashboard", "Messages", "Meetings", "My Schedule", "My Tools", "My Profile"],
  },
};

function getWorkspaceRoleKey(user: WorkspaceUser): EmployeeWorkspaceConfig["roleKey"] {
  const title = String(user.title || "").toLowerCase();
  if (title.includes("android")) return "android";
  if (title.includes("design") || title.includes("ui/ux")) return "design";
  return "ios";
}

type Tab = string;

const WORKSPACE_NAV_ICONS: Record<string, LucideIcon> = {
  Dashboard: House,
  Messages: MessageSquare,
  Meetings: Video,
  "My Schedule": CalendarDays,
  "My Tools": Wrench,
  "My Profile": UserRound,
};

type ScheduleEntryType = "meeting" | "work" | "break" | "lunch" | "review";

const SCHEDULE_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] as const;

const WEEKLY_SCHEDULE_ROWS: { time: string; label: string; type: ScheduleEntryType }[] = [
  { time: "07:30–08:00", label: "Morning Meeting", type: "meeting" },
  { time: "08:00–10:00", label: "Work Session", type: "work" },
  { time: "10:00–10:15", label: "Break", type: "break" },
  { time: "10:15–12:00", label: "Work Session", type: "work" },
  { time: "12:00–12:30", label: "Lunch", type: "lunch" },
  { time: "12:30–14:30", label: "Work Session", type: "work" },
  { time: "14:30–14:45", label: "Break", type: "break" },
  { time: "14:45–15:30", label: "Work Session", type: "work" },
  { time: "15:30–16:00", label: "End of Day Meeting", type: "meeting" },
  { time: "16:00–16:30", label: "Final Work / Review", type: "review" },
];

const SCHEDULE_ENTRY_ICONS: Record<ScheduleEntryType, LucideIcon> = {
  meeting: UsersRound,
  work: Laptop,
  break: Coffee,
  lunch: Utensils,
  review: FileText,
};

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(date);
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
  const config = EMPLOYEE_WORKSPACES[getWorkspaceRoleKey(user)];
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const overviewCountsRef = useRef<{ unreadMessages: number; assignedTasks: number } | null>(null);
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [comment, setComment] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [tools, setTools] = useState<WorkspaceTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsLoaded, setToolsLoaded] = useState(false);
  const [toolsError, setToolsError] = useState("");
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [profilePhotoDraft, setProfilePhotoDraft] = useState<{ imageData: string; mimeType: string; fileName: string } | null>(null);
  const [profileLanguage, setProfileLanguage] = useState<WorkspaceProfile["preferredLanguage"]>("English");
  const [profileNotifications, setProfileNotifications] = useState({ messages: true, meetings: true, security: true });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workspace unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTools() {
    setToolsLoading(true);
    setToolsLoaded(true);
    setToolsError("");
    try {
      const data = await workspaceFetch<{ tools: WorkspaceTool[] }>("/api/workspace/tools");
      setTools(Array.isArray(data.tools) ? data.tools : []);
    } catch {
      setToolsError("Unable to load your tools. Please try again.");
    } finally {
      setToolsLoading(false);
    }
  }

  function applyProfile(nextProfile: WorkspaceProfile) {
    setProfile(nextProfile);
    setProfileLanguage(nextProfile.preferredLanguage || "English");
    setProfileNotifications({
      messages: Boolean(nextProfile.notifications?.messages),
      meetings: Boolean(nextProfile.notifications?.meetings),
      security: true,
    });
  }

  async function loadProfile() {
    setProfileLoading(true);
    setProfileLoaded(true);
    setProfileError("");
    try {
      const data = await workspaceFetch<{ profile: WorkspaceProfile }>("/api/workspace/profile");
      applyProfile(data.profile);
    } catch {
      setProfileError("Unable to load your profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  }

  function handleProfilePhotoSelection(file?: File | null) {
    setProfileError("");
    setProfileNotice("");
    if (!file) {
      setProfilePhotoDraft(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 300 * 1024) {
      setProfileError("Profile photo must be 300 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfilePhotoDraft({ imageData: reader.result, mimeType: file.type, fileName: file.name });
      }
    };
    reader.onerror = () => setProfileError("Could not preview that image.");
    reader.readAsDataURL(file);
  }

  async function saveProfilePhoto() {
    if (!profilePhotoDraft) return;
    setProfileError("");
    setProfileNotice("");
    try {
      const data = await workspaceFetch<{ profile: WorkspaceProfile }>("/api/workspace/profile/photo", {
        method: "POST",
        body: JSON.stringify(profilePhotoDraft),
      });
      applyProfile(data.profile);
      setProfilePhotoDraft(null);
      setProfileNotice("Profile photo updated.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not update profile photo.");
    }
  }

  async function removeProfilePhoto() {
    setProfileError("");
    setProfileNotice("");
    try {
      const data = await workspaceFetch<{ profile: WorkspaceProfile }>("/api/workspace/profile/photo", { method: "DELETE" });
      applyProfile(data.profile);
      setProfilePhotoDraft(null);
      setProfileNotice("Profile photo removed.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not remove profile photo.");
    }
  }

  async function saveProfilePreferences() {
    setProfileError("");
    setProfileNotice("");
    try {
      const data = await workspaceFetch<{ profile: WorkspaceProfile }>("/api/workspace/profile", {
        method: "PATCH",
        body: JSON.stringify({ preferredLanguage: profileLanguage, notifications: profileNotifications }),
      });
      applyProfile(data.profile);
      setProfileNotice("Profile preferences saved.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save profile preferences.");
    }
  }

  useEffect(() => {
    if (!config.tabs.includes(activeTab)) setActiveTab("Dashboard");
  }, [activeTab, config.tabs]);

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  useEffect(() => {
    if (!loading && activeTab === "My Tools" && !toolsLoaded && !toolsLoading) {
      void loadTools();
    }
  }, [activeTab, loading, toolsLoaded, toolsLoading]);

  useEffect(() => {
    if (!loading && activeTab === "My Profile" && !profileLoaded && !profileLoading) {
      void loadProfile();
    }
  }, [activeTab, loading, profileLoaded, profileLoading]);

  function selectWorkspaceTab(tab: Tab) {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  }

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

  const unreadMessageCount = overview?.summary.unreadMessages ?? 0;

  function addWorkspaceNotification(notification: Omit<WorkspaceNotification, "id">) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotifications((current) => [{ id, autoDismissMs: 5000, ...notification }, ...current].slice(0, 5));
  }

  const summaryCards = [
    ["Today's assigned tasks", overview?.summary.todayAssignedTasks ?? 0],
    ["Tasks in progress", overview?.summary.tasksInProgress ?? 0],
    ["Waiting for review", overview?.summary.waitingForReview ?? 0],
    ["Active projects", overview?.summary.activeProjects ?? 0],
    ["Upcoming deadlines", overview?.summary.upcomingDeadlines.length ?? 0],
    ["Unread messages", overview?.summary.unreadMessages ?? 0],
    ["Next meeting", overview?.summary.nextMeeting ? formatDate(overview.summary.nextMeeting.startsAt) : "None"],
  ];

  useEffect(() => {
    addWorkspaceNotification({ title: `Welcome back, ${user.displayName}!` });
  }, [user.displayName]);

  useEffect(() => {
    if (!overview) return;

    const currentCounts = {
      unreadMessages: overview.summary.unreadMessages,
      assignedTasks: overview.summary.todayAssignedTasks,
    };
    const previousCounts = overviewCountsRef.current;
    overviewCountsRef.current = currentCounts;

    if (!previousCounts) return;

    if (currentCounts.unreadMessages > previousCounts.unreadMessages) {
      addWorkspaceNotification({
        title: currentCounts.unreadMessages === 1 ? "New message" : "New messages",
        message: `${currentCounts.unreadMessages} unread message${currentCounts.unreadMessages === 1 ? "" : "s"}`,
        actionLabel: "Open messages",
        onClick: () => selectWorkspaceTab("Messages"),
      });
    }

    if (currentCounts.assignedTasks > previousCounts.assignedTasks) {
      addWorkspaceNotification({
        title: currentCounts.assignedTasks === 1 ? "New assigned task" : "New assigned tasks",
        message: `${currentCounts.assignedTasks} task${currentCounts.assignedTasks === 1 ? "" : "s"} assigned today`,
        actionLabel: "Open dashboard",
        onClick: () => selectWorkspaceTab("Dashboard"),
      });
    }
  }, [overview]);

  return (
    <main className="developerWorkspacePage" data-sidebar-collapsed={isSidebarCollapsed} data-sidebar-open={isMobileSidebarOpen}>
      <WorkspaceNotificationCenter notifications={notifications} onDismiss={(id) => setNotifications((current) => current.filter((item) => item.id !== id))} />
      <button
        type="button"
        className="developerMobileMenu"
        aria-label="Open workspace navigation"
        aria-expanded={isMobileSidebarOpen}
        onClick={() => setIsMobileSidebarOpen(true)}
      >
        <Menu aria-hidden="true" />
        <span>Menu</span>
      </button>
      <button
        type="button"
        className="developerSidebarScrim"
        aria-label="Close workspace navigation"
        tabIndex={isMobileSidebarOpen ? 0 : -1}
        onClick={() => setIsMobileSidebarOpen(false)}
      />
      <aside className="developerSidebar">
        <div className="developerSidebarTop">
          <div className="developerBrand">
            <WorkspaceLogo />
            <div>
              <strong>BlueMind Workspace</strong>
              <span>{config.sidebarLabel}</span>
            </div>
          </div>
          <button
            type="button"
            className="developerSidebarToggle developerDesktopToggle"
            aria-label={isSidebarCollapsed ? "Expand workspace navigation" : "Collapse workspace navigation"}
            aria-expanded={!isSidebarCollapsed}
            onClick={() => setIsSidebarCollapsed((value) => !value)}
          >
            {isSidebarCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="developerSidebarToggle developerMobileClose"
            aria-label="Close workspace navigation"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <nav className="developerNav" aria-label={`${user.displayName} workspace sections`}>
          {config.tabs.map((tab) => {
            const Icon = WORKSPACE_NAV_ICONS[tab] ?? House;

            return (
              <button key={tab} type="button" data-active={activeTab === tab} onClick={() => selectWorkspaceTab(tab)} title={tab}>
                <Icon aria-hidden="true" />
                <span className="developerNavLabel">{tab}</span>
                {tab === "Messages" && unreadMessageCount > 0 && <span className="developerNavBadge">{unreadMessageCount}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="developerMain">
        <header className="developerHeader">
          <div>
            <p>{config.role}</p>
            <h1>{activeTab}</h1>
          </div>
          <span>Europe/Stockholm</span>
        </header>

        {notice && <p className="workspaceNotice">{notice}</p>}
        {user.requiresPasswordChange && <p className="workspaceNotice">Temporary password active. Change the password before this account is used as a real employee account.</p>}
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

        {!loading && activeTab === "Messages" && <WorkspaceMessenger user={user} onUnreadChange={refreshWorkspace} onNotify={addWorkspaceNotification} />}

        {!loading && activeTab === "Meetings" && (
          <section className="developerPanel">
            <h2>Meetings</h2>
            {overview?.meetings.length ? overview.meetings.map((meeting) => <MeetingCard meeting={meeting} key={meeting.id} />) : <EmptyState title="No upcoming meetings" text="Scheduled video check-ins will appear here. Cameras and microphones are never activated automatically." />}
          </section>
        )}

        {!loading && activeTab === "My Schedule" && <MySchedulePanel />}

        {!loading && activeTab === "My Tools" && <ToolsPanel tools={tools} loading={toolsLoading} error={toolsError} onRetry={() => void loadTools()} />}

        {!loading && activeTab === "My Profile" && (
          <ProfilePanel
            fallbackUser={user}
            profile={profile}
            loading={profileLoading}
            error={profileError}
            notice={profileNotice}
            photoDraft={profilePhotoDraft}
            language={profileLanguage}
            notifications={profileNotifications}
            onRetry={() => void loadProfile()}
            onPhotoChange={handleProfilePhotoSelection}
            onPhotoSave={() => void saveProfilePhoto()}
            onPhotoRemove={() => void removeProfilePhoto()}
            onLanguageChange={setProfileLanguage}
            onNotificationsChange={setProfileNotifications}
            onPreferencesSave={() => void saveProfilePreferences()}
            onLogout={onLogout}
          />
        )}
      </section>
    </main>
  );
}

function ProfileAvatar({ profile, draft }: { profile: WorkspaceProfile | WorkspaceUser; draft?: { imageData: string } | null }) {
  const photoUrl = draft?.imageData || profile.profilePhotoUrl || "";
  const initials = String(profile.displayName || "BM")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "BM";

  return (
    <span className="profileAvatarLarge">
      {photoUrl ? <img src={photoUrl} alt="" /> : initials}
    </span>
  );
}

function ProfilePanel({
  fallbackUser,
  profile,
  loading,
  error,
  notice,
  photoDraft,
  language,
  notifications,
  onRetry,
  onPhotoChange,
  onPhotoSave,
  onPhotoRemove,
  onLanguageChange,
  onNotificationsChange,
  onPreferencesSave,
  onLogout,
}: {
  fallbackUser: WorkspaceUser;
  profile: WorkspaceProfile | null;
  loading: boolean;
  error: string;
  notice: string;
  photoDraft: { imageData: string; mimeType: string; fileName: string } | null;
  language: WorkspaceProfile["preferredLanguage"];
  notifications: WorkspaceProfile["notifications"];
  onRetry: () => void;
  onPhotoChange: (file?: File | null) => void;
  onPhotoSave: () => void;
  onPhotoRemove: () => void;
  onLanguageChange: (language: WorkspaceProfile["preferredLanguage"]) => void;
  onNotificationsChange: (next: WorkspaceProfile["notifications"]) => void;
  onPreferencesSave: () => void;
  onLogout: () => void;
}) {
  const [expandedSection, setExpandedSection] = useState<"security" | "notifications" | "language" | null>("security");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const current = profile || {
    ...fallbackUser,
    accountStatus: "Active",
    preferredLanguage: "English" as const,
    timezone: "Europe/Stockholm",
    notifications: { messages: true, meetings: true, security: true },
    permissions: [],
    profilePhotoUrl: fallbackUser.profilePhotoUrl || "",
  };
  const isArabic = language === "Arabic";
  const copy = isArabic ? PROFILE_COPY.ar : PROFILE_COPY.en;

  function toggleSection(section: "security" | "notifications" | "language") {
    setExpandedSection((currentSection) => currentSection === section ? null : section);
  }

  function confirmLogout() {
    const shouldLogout = window.confirm(copy.logoutConfirm);
    if (shouldLogout) onLogout();
  }

  const sections: {
    id: "security" | "notifications" | "language";
    title: string;
    description: string;
    Icon: LucideIcon;
    content: ReactNode;
  }[] = [
    {
      id: "security",
      title: copy.securityTitle,
      description: copy.securityDescription,
      Icon: ShieldCheck,
      content: (
        <dl className="profileAccountList">
          <div><dt>{copy.fullName}</dt><dd>{current.displayName}</dd></div>
          <div><dt>{copy.workEmail}</dt><dd>{current.email}</dd></div>
          <div><dt>{copy.jobRole}</dt><dd>{current.title || "BlueMind Workspace"}</dd></div>
          <div><dt>{copy.password}</dt><dd aria-label={copy.passwordManaged}>••••••••••••</dd></div>
        </dl>
      ),
    },
    {
      id: "notifications",
      title: copy.notificationsTitle,
      description: copy.notificationsDescription,
      Icon: Bell,
      content: (
        <div className="profileSettingStack">
          <ToggleSwitch
            label={copy.messageNotifications}
            checked={notifications.messages}
            onChange={(checked) => onNotificationsChange({ ...notifications, messages: checked, security: true })}
          />
          <ToggleSwitch
            label={copy.meetingNotifications}
            checked={notifications.meetings}
            onChange={(checked) => onNotificationsChange({ ...notifications, meetings: checked, security: true })}
          />
          <p className="profileMuted">{copy.securityNotifications}</p>
          <button type="button" className="secondaryAction" onClick={onPreferencesSave}>{copy.savePreferences}</button>
        </div>
      ),
    },
    {
      id: "language",
      title: copy.languageTitle,
      description: copy.languageDescription,
      Icon: Languages,
      content: (
        <div className="profileSettingStack">
          <div className="profileLanguageOptions" role="radiogroup" aria-label={copy.languageTitle}>
            <button type="button" role="radio" aria-checked={language === "English"} data-active={language === "English"} onClick={() => onLanguageChange("English")}>English</button>
            <button type="button" role="radio" aria-checked={language === "Arabic"} data-active={language === "Arabic"} onClick={() => onLanguageChange("Arabic")}>العربية</button>
          </div>
          <button type="button" className="secondaryAction" onClick={onPreferencesSave}>{copy.savePreferences}</button>
        </div>
      ),
    },
  ];

  return (
    <section className="developerPanel profilePanel" dir={isArabic ? "rtl" : "ltr"}>
      <div className="panelIntro">
        <h2>{copy.pageTitle}</h2>
        <p>{copy.pageDescription}</p>
      </div>

      {loading && <EmptyState title={copy.loadingTitle} text={copy.loadingText} />}
      {error && <p className="workspaceError" role="alert">{error}</p>}
      {notice && <p className="workspaceNotice">{notice}</p>}
      {!loading && !profile && error && <button type="button" className="secondaryAction" onClick={onRetry}>Retry</button>}

      <div className="profileHero">
        <div className="profileAvatarEdit">
          <ProfileAvatar profile={current} draft={photoDraft} />
          <button
            type="button"
            className="profileAvatarCamera"
            aria-label={copy.changePhoto}
            onClick={() => photoInputRef.current?.click()}
          >
            <Camera aria-hidden="true" />
          </button>
          <input
            ref={photoInputRef}
            className="profilePhotoInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => onPhotoChange(event.target.files?.[0])}
          />
        </div>
        <div className="profileHeroDetails">
          <h3>{current.displayName}</h3>
          <p>{current.title || "BlueMind Workspace"}</p>
          <span>{current.email}</span>
          {(photoDraft || current.profilePhotoUrl) && (
            <div className="profilePhotoActions">
              {photoDraft && <button type="button" onClick={onPhotoSave}>{copy.savePhoto}</button>}
              <button type="button" className="secondaryAction" onClick={onPhotoRemove}>{copy.removePhoto}</button>
              {photoDraft && <small>{copy.photoHelp}</small>}
            </div>
          )}
        </div>
      </div>

      <div className="profileSettingsList">
        {sections.map(({ id, title, description, Icon, content }) => {
          const isOpen = expandedSection === id;

          return (
            <article className="profileAccordionItem" data-open={isOpen} key={id}>
              <button type="button" className="profileAccordionButton" aria-expanded={isOpen} onClick={() => toggleSection(id)}>
                <span className="profileAccordionIcon"><Icon aria-hidden="true" /></span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ChevronDown className="profileAccordionChevron" aria-hidden="true" />
              </button>
              <div className="profileAccordionContent" aria-hidden={!isOpen}>
                <div>{content}</div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="profileLogoutRow">
        <button type="button" onClick={confirmLogout}><LogOut aria-hidden="true" /> {copy.logout}</button>
      </div>
    </section>
  );
}

function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="profileSwitch">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="profileSwitchTrack" aria-hidden="true"><span /></span>
    </label>
  );
}

const PROFILE_COPY = {
  en: {
    pageTitle: "My Profile",
    pageDescription: "Manage your BlueMind Workspace account.",
    loadingTitle: "Loading profile",
    loadingText: "Fetching your secure account information.",
    securityTitle: "Account & Security",
    securityDescription: "View protected account details managed by administrators.",
    notificationsTitle: "Notifications",
    notificationsDescription: "Control optional message and meeting alerts.",
    languageTitle: "Language",
    languageDescription: "Choose the Workspace language for supported profile settings.",
    changePhoto: "Upload or replace profile photo",
    fullName: "Full name",
    workEmail: "Work email",
    jobRole: "Job role",
    password: "Password",
    passwordManaged: "Password is hidden and managed by administrators.",
    messageNotifications: "Message Notifications",
    meetingNotifications: "Meeting Notifications",
    securityNotifications: "Essential security notifications remain enabled.",
    savePreferences: "Save Preferences",
    savePhoto: "Save Photo",
    removePhoto: "Remove Photo",
    photoHelp: "JPG, PNG, or WebP. Maximum 300 KB.",
    logout: "Logout",
    logoutConfirm: "Log out of BlueMind Workspace?",
  },
  ar: {
    pageTitle: "ملفي الشخصي",
    pageDescription: "إدارة إعدادات حسابك في BlueMind Workspace.",
    loadingTitle: "جاري تحميل الملف الشخصي",
    loadingText: "يتم جلب معلومات حسابك الآمنة.",
    securityTitle: "الحساب والأمان",
    securityDescription: "عرض بيانات الحساب المحمية التي يديرها المسؤولون.",
    notificationsTitle: "الإشعارات",
    notificationsDescription: "التحكم في تنبيهات الرسائل والاجتماعات الاختيارية.",
    languageTitle: "اللغة",
    languageDescription: "اختر لغة مساحة العمل للإعدادات المدعومة.",
    changePhoto: "\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0634\u062e\u0635\u064a\u0629",
    fullName: "الاسم الكامل",
    workEmail: "بريد العمل",
    jobRole: "الدور الوظيفي",
    password: "كلمة المرور",
    passwordManaged: "كلمة المرور مخفية ويديرها المسؤولون.",
    messageNotifications: "إشعارات الرسائل",
    meetingNotifications: "إشعارات الاجتماعات",
    securityNotifications: "تبقى إشعارات الأمان الأساسية مفعلة.",
    savePreferences: "حفظ الإعدادات",
    savePhoto: "حفظ الصورة",
    removePhoto: "إزالة الصورة",
    photoHelp: "JPG أو PNG أو WebP. الحد الأقصى 300 كيلوبايت.",
    logout: "تسجيل الخروج",
    logoutConfirm: "هل تريد تسجيل الخروج من BlueMind Workspace؟",
  },
} as const;

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

function MySchedulePanel() {
  return (
    <section className="developerPanel schedulePanel">
      <div className="panelIntro">
        <h2>My Schedule</h2>
        <p>Your weekly work schedule</p>
      </div>

      <div className="scheduleTableShell" role="region" aria-label="Weekly work schedule" tabIndex={0}>
        <table className="weeklyScheduleTable">
          <thead>
            <tr>
              <th scope="col" className="scheduleTimeHeader">Time</th>
              {SCHEDULE_DAYS.map((day) => <th scope="col" key={day}>{day}</th>)}
              <th scope="col" className="scheduleDayOffHeader">Friday</th>
            </tr>
          </thead>
          <tbody>
            {WEEKLY_SCHEDULE_ROWS.map((row, rowIndex) => (
              <tr key={row.time}>
                <th scope="row" className="scheduleTimeCell">{row.time}</th>
                {SCHEDULE_DAYS.map((day) => <ScheduleCell entry={row} key={`${day}-${row.time}`} />)}
                {rowIndex === 0 && (
                  <td className="scheduleDayOffCell" rowSpan={WEEKLY_SCHEDULE_ROWS.length}>
                    <div className="dayOffContent">
                      <CalendarDays aria-hidden="true" />
                      <strong>WEEKLY<br />DAY OFF</strong>
                      <span className="dayOffDivider" />
                      <p>No meetings<br />No work sessions<br />No required activity</p>
                      <span className="dayOffDivider" />
                      <Leaf aria-hidden="true" />
                      <p>Rest today<br />for a better<br />tomorrow.</p>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScheduleCell({ entry }: { entry: { label: string; type: ScheduleEntryType } }) {
  const Icon = SCHEDULE_ENTRY_ICONS[entry.type];
  const hasLines = entry.type === "work" || entry.type === "review";

  return (
    <td className={`scheduleSlot scheduleSlot-${entry.type}`}>
      <div className="scheduleSlotContent">
        <Icon aria-hidden="true" />
        <span>{entry.label}</span>
        {hasLines && (
          <span className="scheduleNoteLines" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
    </td>
  );
}

function ToolsPanel({ tools, loading, error, onRetry }: { tools: WorkspaceTool[]; loading: boolean; error: string; onRetry: () => void }) {
  return (
    <section className="developerPanel">
      <div className="panelIntro">
        <h2>My Tools</h2>
        <p>Apps and tools you use for your daily work</p>
      </div>

      {loading && (
        <div className="toolsGrid" aria-label="Loading tools">
          {[1, 2, 3].map((item) => <div className="toolCard toolCardSkeleton" key={item} />)}
        </div>
      )}

      {!loading && error && (
        <div className="workspaceErrorState">
          <EmptyState title="Unable to load your tools" text="Please try again." />
          <button type="button" className="secondaryAction" onClick={onRetry}>Retry</button>
        </div>
      )}

      {!loading && !error && !tools.length && (
        <EmptyState title="No tools assigned yet" text="Your work tools will appear here when they are assigned to your role." />
      )}

      {!loading && !error && tools.length > 0 && (
        <div className="toolsGrid">
          {tools.map((tool) => {
            const iconUrl = tool.id === "android-studio" ? "/images/tools/android-studio.svg" : tool.iconUrl;

            return (
              <article className="toolCard" key={tool.id}>
                <div className="toolIconFrame" aria-hidden="true">
                  {iconUrl ? <img src={iconUrl} alt="" loading="lazy" /> : <span>{tool.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="toolDetails">
                  <h3>{tool.name}</h3>
                  <p>{tool.description}</p>
                  {tool.workAccountEmail && <small>Work Account <strong>{tool.workAccountEmail}</strong></small>}
                </div>
                <div className="toolActions">
                  <a href={tool.openUrl} target="_blank" rel="noopener noreferrer">Open</a>
                  {tool.downloadUrl && <a href={tool.downloadUrl} target="_blank" rel="noopener noreferrer" className="secondaryAction">Download</a>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="workspaceHelp">No passwords, API keys, server tools, database tools, or administrator credentials are shown here.</p>
    </section>
  );
}
