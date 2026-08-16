import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import {
  MonitorPlay,
  Share2,
  ClipboardCheck,
  Users,
  Globe,
  Download,
  ArrowRight,
  Coins,
  Clock,
  Crown,
  Lock,
  CheckCircle2,
  Hourglass,
  Sparkles,
  ListChecks,
} from "lucide-react";

const typeIcons: Record<string, any> = {
  watch_video: MonitorPlay,
  share_link: Share2,
  survey: ClipboardCheck,
  social_follow: Users,
  visit_site: Globe,
  app_download: Download,
};

const typeLabels: Record<string, string> = {
  watch_video: "Watch Video",
  share_link: "Share Link",
  survey: "Survey",
  social_follow: "Social Follow",
  visit_site: "Visit Site",
  app_download: "App Download",
};

export default function Tasks() {
  const { user, token, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [daily, setDaily] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetch("/api/tasks", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => { setTasks(data.tasks || []); setTasksLoading(false); })
        .catch(() => setTasksLoading(false));
      fetch("/api/tasks/daily-task", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => (res.ok ? res.json() : Promise.resolve({ vip: null })))
        .then(d => setDaily(d.vip ? d : null))
        .catch(() => {});
    }
  }, [user, token]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const videoTasks = (tasks || []).filter(
    (t: any) => t.category === "video" || t.category === "watch_video"
  );
  const vipVideoPool: string[] = Array.isArray(daily?.vipVideoPool) ? daily.vipVideoPool : [];
  const nonVideoTasks = (tasks || []).filter(
    (t: any) => !(t.category === "video" || t.category === "watch_video")
  );
  const hasVip = !!daily?.vip;
  const doneIds: number[] = daily?.doneTaskIds || [];
  const queueIds: number[] = daily?.queue || [];
  const vipLimitReached = hasVip && queueIds.length === 0 && doneIds.length > 0;

  return (
    <AppLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Free Tasks</h1>
          <p className="text-sm text-muted-foreground">Free task earnings are credited to the platform admin account. Every task video is exactly 30 seconds — watch and submit proof for verification.</p>
        </div>

        {/* ===== VIP TASK SECTION — separate per-plan queue on the Task page ===== */}
        {hasVip && (
          <div className="mb-8">
            <Card className="border-primary/30 shadow-sm mb-4 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-base font-bold">VIP Task — {daily.vip.planName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Purchase: <b>${Number(daily.purchaseAmount || 0).toFixed(2)}</b> • Max daily earn: <b className="text-success">${Number(daily.maxDailyEarn || 0).toFixed(2)}</b> • Total plan tasks: <b>{Number(daily.totalPlanTasks || 0)}</b>
                      </p>
                    </div>
                  </div>
                  <span className="ml-auto text-[11px] text-muted-foreground">{daily.vip.daysLeft} days left</span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5" />
                    Done today: <b className="text-foreground">{daily.completedToday} / {daily.limit}</b>
                  </span>
                  <span>
                    Earn <b className="text-success">${Number(daily.rewardEach).toFixed(2)}</b> per approved task
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, (daily.completedToday / Math.max(1, daily.limit)) * 100)}%` }}
                  />
                </div>
                {vipLimitReached && (
                  <p className="text-[11px] text-success font-semibold mt-2">
                    ✓ All of today's VIP tasks are done — the queue resets tomorrow with the full list.
                  </p>
                )}
              </div>
            </Card>

            {/* Ordered VIP video queue */}
            <div className="space-y-3 mb-2">
              {(videoTasks.length > 0 ? videoTasks : []).map((task: any, idx: number) => {
                const taskId = Number(task.id);
                const isDone = doneIds.includes(taskId);
                // Position in the ordered queue: queue lists remaining ids in order
                const queuePos = queueIds.indexOf(taskId);
                const isNext = queuePos === 0;
                const isLocked = !isDone && !isNext;
                return (
                  <Card
                    key={task.id}
                    className={`border-border shadow-sm transition-all ${isDone ? "opacity-60 bg-secondary/30" : isNext ? "border-primary/40 ring-1 ring-primary/20" : "opacity-55"}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDone ? "bg-success/10" : isNext ? "bg-primary/15" : "bg-muted"}`}>
                          {isDone ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-success" />
                          ) : (
                            <span className="text-sm font-bold text-primary">{idx + 1}</span>
                          )}
                        </div>

                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MonitorPlay className="w-5 h-5 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold">{task.title}</p>
                            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold">
                              {daily.vip.planName}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />30s video</span>
                            <span className="font-semibold text-success">${Number(daily.rewardEach).toFixed(2)}</span>
                            <span>
                              Purchase <b>${Number(daily.purchaseAmount || 0).toFixed(2)}</b> • Max daily earn <b>${Number(daily.maxDailyEarn || 0).toFixed(2)}</b> • Plan tasks <b>{daily.totalPlanTasks}</b>
                            </span>
                          </p>
                        </div>

                        <div className="flex-shrink-0 w-36">
                          {isDone ? (
                            <Badge className="w-full justify-center bg-success/10 text-success border-success/30 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Done today
                            </Badge>
                          ) : isNext ? (
                            <Button
                              size="sm"
                              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs"
                              onClick={() => navigate(`/tasks/${task.id}`)}
                            >
                              Start VIP Task
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          ) : (
                            <Badge className="w-full justify-center text-muted-foreground border-border font-medium">
                              <Lock className="w-3 h-3 mr-1" /> Unlock next
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {videoTasks.length === 0 && (
                <Card className="border-border">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No VIP videos available right now. Check back soon.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ===== FREE TASKS ===== */}
        {hasVip && (
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold">Free Tasks</h2>
            <Badge variant="outline" className="text-muted-foreground border-border">
              <Hourglass className="w-3 h-3 mr-1" /> Pending review, earnings go to admin
            </Badge>
          </div>
        )}

        {tasksLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="text-center py-16">
            <Coins className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">No tasks available</h3>
            <p className="text-sm text-muted-foreground">Check back later for new earning opportunities.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task: any) => {
              const Icon = typeIcons[task.category] || MonitorPlay;
              return (
                <Card
                  key={task.id}
                  className="group hover:shadow-md transition-all duration-200 border-border"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/30 font-semibold text-xs">
                        {task.currency} ${Number(task.reward).toFixed(4)}
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{task.title}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <Badge variant="outline" className="text-xs">{typeLabels[task.category] || task.category}</Badge>
                      {(() => {
                        try { const m = task.meta ? JSON.parse(task.meta) : null; if (m?.ad_source) {
                          return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">{m.ad_source}</Badge>;
                        } } catch { /* ignore */ }
                        return null;
                      })()}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        30s video
                      </span>
                    </div>
                    {task.canRedo === false && task.resetInHours != null && (
                      <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                        <Hourglass className="w-3 h-3" /> Resets in {task.resetInHours}h — available again after the 24-hour window
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      Start Task
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
