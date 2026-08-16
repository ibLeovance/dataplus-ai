import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Coins,
  Copy,
  Crown,
} from "lucide-react";
import { RotatingChart } from "@/components/RotatingChart";
import { toast } from "sonner";
import React from "react";

interface OverviewData {
  totalEarned: string;
  pendingBalance: string;
  referralBonus: string;
  completedTasks: number;
  completedFreeTasks?: number;
  completedVipTasks?: number;
  pendingTasks: number;
  pendingFreeTasks?: number;
  pendingVipTasks?: number;
  referralCode: string;
  availableBalance: string;
}

interface Completion {
  id: number;
  taskId: number;
  taskTitle?: string;
  status: string;
  reward: string;
  currency: string;
  completedAt: string;
}

export default function Dashboard() {
  const { user, token, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [overview, setOverview] = React.useState<OverviewData | null>(null);
  const [completions, setCompletions] = React.useState<Completion[]>([]);
  const [dataLoading, setDataLoading] = React.useState(true);
  const isAuthenticated = !!token && !!user;

  const apiFetch = async (url: string) => {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.json();
  };

  // Fetch dashboard data
  React.useEffect(() => {
    if (isAuthenticated) {
      Promise.all([
        apiFetch('/api/auth/overview'),
        apiFetch('/api/tasks/my-completions'),
      ]).then(([overviewData, completionsData]) => {
        setOverview(overviewData?.overview || null);
        setCompletions(completionsData?.completions || []);
        setDataLoading(false);
      }).catch(() => setDataLoading(false));
    }
  }, [isAuthenticated]);

  // Auto-register referral code from localStorage
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const refCode = localStorage.getItem("pendingReferralCode");
      if (refCode) {
        fetch('/api/referral/register-with-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ referralCode: refCode }),
        }).then((res) => res.json()).then((data) => {
          if (data.success) {
            toast.success("You've been registered under a referral! 🎉");
          }
          localStorage.removeItem("pendingReferralCode");
        }).catch(() => {});
      }
    }
  }, [isAuthenticated, user]);

  const copyReferralLink = () => {
    const baseUrl = window.location.origin;
    const code = overview?.referralCode || "N/A";
    navigator.clipboard.writeText(`${baseUrl}?ref=${code}`);
    toast.success("Referral link copied!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Please sign in to view your dashboard</h2>
        <Button onClick={() => navigate("/login")} className="bg-primary text-primary-foreground font-semibold">
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Earned</span>
              </div>
              <p className="text-xl font-bold">${overview?.totalEarned || "0.00"}</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5 text-success" />
                </div>
                <span className="text-sm text-muted-foreground">Available Balance</span>
              </div>
              <p className="text-xl font-bold text-success">${overview?.availableBalance || "0.00"}</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">VIP Tasks Approved</span>
              </div>
              <p className="text-xl font-bold">{overview?.completedVipTasks ?? 0}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Pays directly to your wallet on approval</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                  <CheckCircle2 className="w-4.5 h-4.5 text-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Free Tasks Approved</span>
              </div>
              <p className="text-xl font-bold">{overview?.completedFreeTasks ?? 0}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Credited to the platform account</p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="w-4.5 h-4.5 text-warning" />
                </div>
                <span className="text-sm text-muted-foreground">Pending Review</span>
              </div>
              <p className="text-xl font-bold text-warning">{overview?.pendingTasks || 0}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                VIP: <b className="text-foreground">{overview?.pendingVipTasks ?? 0}</b> • Free: <b className="text-foreground">{overview?.pendingFreeTasks ?? 0}</b>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Card */}
        <Card className="border-border shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 w-full">
                <p className="text-sm mb-1">
                  Your referral code:{" "}
                  <span className="font-mono font-bold text-primary">{overview?.referralCode || "—"}</span>
                </p>
                <p className="text-sm text-muted-foreground">Earn 10% bonus when your referrals complete tasks!</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-primary/30 text-primary" onClick={copyReferralLink}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Link
                </Button>
                <Button size="sm" onClick={() => navigate("/referral")}>
                  Share
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Button
            className="h-16 flex flex-col gap-1 bg-primary/5 border-primary/30 text-primary hover:bg-primary/10"
            variant="outline"
            onClick={() => navigate("/tasks")}
          >
            <Coins className="w-5 h-5" />
            <span className="text-xs font-medium">Browse Tasks</span>
          </Button>
          <Button
            className="h-16 flex flex-col gap-1 bg-success/5 border-success/30 text-success hover:bg-success/10"
            variant="outline"
            onClick={() => navigate("/withdraw")}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-xs font-medium">Withdraw</span>
          </Button>
          <Button
            className="h-16 flex flex-col gap-1 bg-accent border-border text-foreground hover:bg-accent/80"
            variant="outline"
            onClick={() => navigate("/wallet")}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-xs font-medium">Update Wallet</span>
          </Button>
        </div>

        {/* Milestone — Rotating earnings chart */}
        <Card className="border-transparent shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Earnings Overview</CardTitle>
            <p className="text-xs text-muted-foreground">Live rotating market-style chart of your platform activity</p>
          </CardHeader>
          <CardContent>
            <RotatingChart baseValue={Number(overview?.totalEarned || "0")} completed={overview?.completedTasks || 0} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Task Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : completions.length > 0 ? (
              <div className="space-y-2">
                {completions.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Task #{c.taskId}</p>
                        <p className="text-xs text-muted-foreground">{new Date(c.completedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(c as any).funding === "user" ? (
                        <Badge className="bg-primary/10 text-primary border-primary/30 font-semibold">
                          <Crown className="w-3 h-3 mr-1" /> VIP
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-border">
                          <Coins className="w-3 h-3 mr-1" /> Free
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          c.status === "approved" ? "border-success/30 text-success" :
                          c.status === "rejected" ? "border-destructive/30 text-destructive" :
                          "border-warning/30 text-warning"
                        }
                      >
                        {c.status}
                      </Badge>
                      <span className="text-sm font-medium text-success">+${c.reward}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Coins className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm">No tasks completed yet.</p>
                <Button size="sm" variant="ghost" className="text-primary mt-2" onClick={() => navigate("/tasks")}>
                  Browse available tasks
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
