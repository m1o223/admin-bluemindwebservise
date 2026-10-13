"use client";

import { useEffect, useState } from "react";

export type WorkspaceNotification = {
  id: string;
  title: string;
  message?: string;
  actionLabel?: string;
  autoDismissMs?: number;
  onClick?: () => void;
};

type WorkspaceNotificationCenterProps = {
  notifications: WorkspaceNotification[];
  onDismiss: (id: string) => void;
};

const EXIT_DURATION_MS = 300;

export function WorkspaceNotificationCenter({ notifications, onDismiss }: WorkspaceNotificationCenterProps) {
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  function closeNotification(id: string) {
    setExitingIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });

    window.setTimeout(() => {
      setExitingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      onDismiss(id);
    }, EXIT_DURATION_MS);
  }

  useEffect(() => {
    const timers = notifications
      .filter((notification) => notification.autoDismissMs)
      .map((notification) =>
        window.setTimeout(() => closeNotification(notification.id), notification.autoDismissMs),
      );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [notifications]);

  if (!notifications.length) return null;

  return (
    <div className="workspaceNotificationStack" aria-live="polite" aria-label="Workspace notifications">
      {notifications.map((notification) => {
        const isExiting = exitingIds.has(notification.id);

        return (
          <article className="workspaceToast" data-exiting={isExiting} key={notification.id}>
            <div>
              <strong>{notification.title}</strong>
              {notification.message && <p>{notification.message}</p>}
            </div>
            <div className="workspaceToastActions">
              {notification.onClick && (
                <button
                  type="button"
                  className="workspaceToastAction"
                  onClick={() => {
                    notification.onClick?.();
                    closeNotification(notification.id);
                  }}
                >
                  {notification.actionLabel || "Open"}
                </button>
              )}
              <button type="button" className="workspaceToastClose" aria-label="Close notification" onClick={() => closeNotification(notification.id)}>
                X
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}