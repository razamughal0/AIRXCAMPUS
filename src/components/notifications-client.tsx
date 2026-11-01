"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Card, Button, Badge, EmptyState, PageHeader } from "@/components/ui";
import type { notifications } from "@/db/schema";

type NotificationItem = typeof notifications.$inferSelect;

export function NotificationsClient({ initialItems }: { initialItems: NotificationItem[] }) {
  const [items, setItems] = useState<NotificationItem[]>(initialItems);
  const [marking, setMarking] = useState(false);

  const unreadCount = items.filter((n) => !n.isRead).length;

  async function markAllRead() {
    setMarking(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } finally {
      setMarking(false);
    }
  }

  async function markOneRead(id: number) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await fetch("/api/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}.`
            : "You're all caught up."
        }
        action={
          unreadCount > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              isLoading={marking}
              onClick={markAllRead}
              leftIcon={<CheckCheck className="h-4 w-4" />}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Card padding="md">
        {items.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="No notifications yet"
            description="Important academic, complaint, and system updates will appear here."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && void markOneRead(n.id)}
                className={`py-4 first:pt-0 last:pb-0 flex items-start gap-3 ${
                  !n.isRead ? "cursor-pointer" : ""
                }`}
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                    n.isRead ? "bg-slate-300" : "bg-navy-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-navy-950">{n.title}</span>
                    <Badge variant={n.isRead ? "default" : "navy"}>{n.type}</Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                  {n.link && (
                    <Link
                      href={n.link}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
                    >
                      Open details <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
