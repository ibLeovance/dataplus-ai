import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import {
  ListChecks,
  CheckCircle2,
  XCircle,
  Clock,
  Crown,
  PlayCircle,
  ArrowRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Records() {
  const { user, token, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [completions, setCompletions] = useState<any[]>([]);
  const [vipPurchases, setVipPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetch("/api/tasks/my-completions", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : Promise.resolve({ completions: [] })))
          .catch(() => ({ completions: [] })),
        fetch("/api/vip/purchases", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : Promise.resolve({ purchases: [] })))
          .catch(() => ({ purchases: [] })),
      ]).then(([cd, vd]) => {
        const rows = (cd.completions || []).sort(
          (a: any, b: any) =>
            new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
        );
        setCompletions(rows);
        setVipPurchases((vd.purchases || []).map((p: any) => ({ ...p, status: p.status || "pending" })));
        setLoading(false);
      });
    }
  }, [user, token]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const statusIcon = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (s === "rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-warning" />;
  };

  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
          <CheckCircle2 className="w-3 h-3 mr-1" /> {s}
        </Badge>
      );
    if (s === "rejected")
      return (
        <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">
          <XCircle className="w-3 h-3 mr-1" /> {s}
        </Badge>
      );
    return (
      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">
        <Clock className="w-3 h-3 mr-1" /> pending
      </Badge>
    );
  };

  const vipStatus = (v: any) => {
    const s = (v.status || "pending").toLowerCase();
    const end = v.validUntil ? new Date(v.validUntil).getTime() : 0;
    const running = s === "active" && end > Date.now();
    const expired = s === "active" && end <= Date.now();
    if (running)
      return {
        running: true,
        badge: (
          <Badge className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary/10">
            <PlayCircle className="w-3 h-3 mr-1" /> Running
          </Badge>
        ),
      };
    if (expired)
      return {
        running: false,
        badge: (
          <Badge variant="outline" className="text-muted-foreground border-border">
            <XCircle className="w-3 h-3 mr-1" /> Expired
          </Badge>
        ),
      };
    if (s === "approved" || s === "active")
      return {
        running: true,
        badge: (
          <Badge className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary/10">
            <PlayCircle className="w-3 h-3 mr-1" /> {s}
          </Badge>
        ),
      };
    if (s === "cancelled")
      return {
        running: false,
        badge: (
          <Badge variant="outline" className="text-muted-foreground border-border">
            <XCircle className="w-3 h-3 mr-1" /> Cancelled
          </Badge>
        ),
      };
    return {
      running: false,
      badge: (
        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">
          <Clock className="w-3 h-3 mr-1" /> {s === "pending" ? "Pending approval" : s}
        </Badge>
      ),
    };
  };

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <ListChecks className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Records</h1>
            <p className="text-sm text-muted-foreground">All your tasks and VIP purchases in one place</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <Tabs defaultValue="tasks" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">Task Records</TabsTrigger>
              <TabsTrigger value="vip">VIP Records</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-4">
              <Card className="border-border shadow-sm">
                <CardContent className="pt-4">
                  {completions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListChecks className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm mb-3">No task records yet.</p>
                      <Button size="sm" variant="outline" className="border-border text-foreground" onClick={() => navigate("/tasks")}>
                        Start a task
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {completions.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {statusIcon(c.status)}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {c.taskTitle || `Task #${c.taskId}`}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {c.completedAt ? new Date(c.completedAt).toLocaleString() : "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {statusBadge(c.status)}
                            <span className="text-sm font-semibold text-success">
                              +${Number(c.reward || 0).toFixed(4)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vip" className="mt-4">
              <Card className="border-border shadow-sm">
                <CardContent className="pt-4">
                  {vipPurchases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Crown className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm mb-3">No VIP purchases yet.</p>
                      <Button size="sm" variant="outline" className="border-border text-foreground" onClick={() => navigate("/vip")}>
                        Browse VIP plans
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {vipPurchases.map((v: any, i: number) => {
                        const st = vipStatus(v);
                        return (
                          <div key={v.id || i} className="p-4 rounded-lg border border-border bg-secondary/30">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-primary" />
                                <p className="text-sm font-bold">
                                  {v.planName || v.tierName || v.name || "VIP Plan"} {vipPurchases.length > 1 ? `#${i + 1}` : ""}
                                </p>
                              </div>
                              {st.badge}
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                              <span>Purchase: <b className="text-foreground">${Number(v.amount || 0).toFixed(2)}</b></span>
                              <span>
                                Bought: <b className="text-foreground">{new Date(v.purchasedAt).toLocaleString()}</b>
                              </span>
                              <span>
                                Valid: <b className="text-foreground">{new Date(v.validFrom).toLocaleDateString()}</b> → <b className="text-foreground">{new Date(v.validUntil).toLocaleDateString()}</b>
                              </span>
                              <span>
                                Duration: <b className="text-foreground">{Number(v.validityDays || 0)} days</b>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
