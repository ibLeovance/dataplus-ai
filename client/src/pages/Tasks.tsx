import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
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
    }
  }, [user, token]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Discover Tasks</h1>
          <p className="text-sm text-muted-foreground">Complete tasks and earn crypto rewards. Submit proof for verification.</p>
        </div>

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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{typeLabels[task.category] || task.category}</Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.timeLimit}s
                      </span>
                    </div>
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
