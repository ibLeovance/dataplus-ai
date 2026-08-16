import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Bell, CheckCheck, RefreshCw, Mail, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";

type Notif = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  isBroadcast: boolean;
  createdAt: string | null;
};

function toCamel(row: any): Notif {
  return {
    id: row.id,
    title: row.title ?? "",
    message: row.message ?? row.body ?? "",
    isRead: row.is_read ?? row.readStatus ?? row.isRead ?? false,
    isBroadcast: row.is_broadcast ?? row.isBroadcast ?? false,
    createdAt: row.created_at ?? row.createdAt ?? null,
  };
}

export default function Notifications() {
  const [, navigate] = useLocation();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/notifications", {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const json = await res.json();
        const rows = json.notifications || json || [];
        setNotifs(rows.map(toCamel));
      }
    } catch {
      /* network error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const markRead = async (id: number) => {
    try {
      const token = localStorage.getItem("token") || "";
      await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: "Bearer " + token },
      });
    } catch {
      /* ignore */
    }
  };

  const openNotif = async (n: Notif) => {
    if (!n.isRead) {
      await markRead(n.id);
      setNotifs(prev =>
        prev.map(x => (x.id === n.id ? { ...x, isRead: true } : x))
      );
    }
    setOpenId(n.id);
  };

  const unreadCount = useMemo(() => notifs.filter(n => !n.isRead).length, [notifs]);

  const open = openId !== null ? notifs.find(n => n.id === openId) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Notifications</h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} unread ${unreadCount === 1 ? "message" : "messages"}`
                  : "All caught up"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={fetchNotifs}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate("/dashboard")}
            >
              ← Back
            </Button>
          </div>
        </div>

        {open ? (
          <div className="mb-6">
            <button
              onClick={() => setOpenId(null)}
              className="text-xs text-primary hover:underline mb-3 inline-block"
            >
              ← All messages
            </button>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="text-base font-semibold leading-snug">{open.title}</h2>
                <span
                  className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    open.isBroadcast
                      ? "bg-primary/10 text-primary"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {open.isBroadcast ? (
                    <>
                      <Users className="w-3 h-3" /> Everyone
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3" /> For you
                    </>
                  )}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mb-4">
                {open.createdAt ? new Date(open.createdAt).toLocaleString() : ""}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {open.message}
              </p>
              <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                Marked as read
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : notifs.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-16 text-center">
            <Mail className="w-10 h-10 mx-auto mb-3 text-primary/20" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Messages from the admin will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifs.map(n => (
              <button
                key={n.id}
                onClick={() => openNotif(n)}
                className={`w-full text-left bg-card border rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${
                  !n.isRead
                    ? "border-primary/30 bg-primary/[0.03]"
                    : "border-border/60 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <p className="text-sm font-semibold line-clamp-1">{n.title}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 ml-4">
                  {n.message}
                </p>
                <p className="text-[10px] text-muted-foreground/70 ml-4 mt-1.5">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                  {!n.isRead && <span className="text-primary font-medium ml-1">• New</span>}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
