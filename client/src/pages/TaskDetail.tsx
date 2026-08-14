import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import {
  MonitorPlay,
  Share2,
  ClipboardCheck,
  Users,
  Globe,
  Download,
  ArrowLeft,
  Coins,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
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

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const taskId = parseInt(id || "0");
  const { user, token, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [task, setTask] = useState<any>(null);
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState(false);
  const [proof, setProof] = useState("");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user && taskId > 0) {
      fetch(`/api/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then(data => { setTask(data.task); setTaskLoading(false); })
        .catch(() => { setTaskError(true); setTaskLoading(false); });
    }
  }, [user, token, taskId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const startTask = useCallback(() => {
    if (task?.taskUrl) {
      window.open(task.taskUrl, "_blank", "noopener,noreferrer");
    }
    setTimerActive(true);
    setTimerStarted(true);
  }, [task]);

  const handleSubmit = async () => {
    if (task?.requiredProof !== "none" && proof.trim().length < 5) {
      toast.error("Please provide proof of completion (at least 5 characters)");
      return;
    }

    // 30-second rule: video tasks must be watched at least 30s before payment
    if ((task.category === "video" || task.category === "watch_video") && timeElapsed < 30) {
      toast.error(`Video must be watched for at least 30 seconds before payment. You watched ${timeElapsed}s. Click "Start Task" and let the timer run while you watch.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, proof: proof.trim(), durationWatched: timeElapsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      toast.success(`Task submitted for review! Reward on approval: ${Number(task.reward || 0).toFixed(4)} ${task.currency || "USD"}`);
      navigate("/tasks");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-16 h-16 text-destructive/50" />
        <h2 className="text-2xl font-bold">Task not found</h2>
        <Button variant="outline" className="border-primary/30 text-primary" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Tasks
        </Button>
      </div>
    );
  }

  const Icon = typeIcons[task.category] || MonitorPlay;

  return (
    <AppLayout>
      <div className="max-w-3xl">
        {/* Task Header */}
        <Card className="border-border shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <Badge className="text-base px-3 py-1.5 bg-primary/10 text-primary border-primary/30 font-bold">
                {task.currency} ${Number(task.reward).toFixed(4)}
              </Badge>
            </div>

            <h1 className="text-xl font-bold mb-3">{task.title}</h1>

            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline">{typeLabels[task.category] || task.category}</Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Min. {task.timeLimit} seconds
              </span>
            </div>

            <p className="text-muted-foreground leading-relaxed">{task.description}</p>

            {task.taskUrl && (
              <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Task URL:</p>
                <p className="text-sm text-primary break-all">{task.taskUrl}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timer & Action */}
        <Card className="border-border shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-primary mb-2">
                {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, "0")}
              </div>
              <p className="text-sm text-muted-foreground">Time spent on this task</p>
              {(task.category === "video" || task.category === "watch_video") && (
                <p className={`text-xs font-semibold mt-1 ${timeElapsed >= 30 ? "text-emerald-600" : "text-primary"}`}>
                  {timeElapsed >= 30
                    ? `✓ Video watched ${timeElapsed}s — qualifies for payment (${task.currency} ${Number(task.reward).toFixed(4)})`
                    : `⚠ Video must be watched at least 30s before payment (${30 - timeElapsed}s remaining)`}
                </p>
              )}
            </div>

            {!timerStarted ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Click below to open the task URL and start the timer.
                  Complete the task, then come back and submit your proof.
                </p>
                <Button
                  size="lg"
                  onClick={startTask}
                  className="w-full h-12 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-opacity"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Start Task & Open URL
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Proof Section */}
                {task.requiredProof !== "none" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Proof of Completion *
                    </label>
                    <Textarea
                      placeholder="Describe what you did to complete this task..."
                      value={proof}
                      onChange={(e) => setProof(e.target.value)}
                      className="min-h-[120px] bg-secondary/50 border-border/50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 5 characters. Be specific about what you did.
                    </p>
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting || timeElapsed < (task.category === "video" || task.category === "watch_video" ? 30 : 5)}
                  className="w-full h-12 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                  )}
                  Submit for Review
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Your submission will be reviewed by our team. Once approved, the reward will be credited to your balance.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back button */}
        <Button variant="outline" className="border-border text-foreground" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Tasks
        </Button>
      </div>
    </AppLayout>
  );
}
