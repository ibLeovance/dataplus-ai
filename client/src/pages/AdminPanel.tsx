import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import {
  Coins,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Shield,
  Settings as SettingsIcon,
  Bell,
  Send,
  UserRoundPen,
  MessageSquare,
  MonitorPlay,
  Receipt,
  Download,
  Image as ImageIcon,
  CircleDollarSign,
} from "lucide-react";

export default function AdminPanel() {
  const { user, token, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/admin-login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="w-16 h-16 text-destructive/20" />
        <h2 className="text-2xl font-sans font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have admin privileges. Only the site owner can enter.</p>
        <div className="flex gap-2 mt-2">
          <Button asChild variant="outline" className="border-primary/20 text-primary">
            <Link href="/admin-login">
              <Shield className="w-4 h-4 mr-1" />
              Admin Login
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <AdminContent />
    </AppLayout>
  );
}

function useApiFetch(endpoint: string) {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetcher = useCallback(async () => {
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  }, [endpoint, token]);

  useEffect(() => {
    fetcher();
  }, [fetcher]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetcher();
  }, [fetcher]);

  return { data, loading, refresh };
}

function useApiMutation(
  method: string,
  endpoint: string,
  onSuccessMsg?: string
) {
  const { token } = useAuth();
  const [pending, setPending] = useState(false);

  const mutate = async (body?: any) => {
    setPending(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 404) {
        if (onSuccessMsg) toast.warning("Database table not yet enabled — see admin guide.");
        throw new Error("Feature not enabled yet");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (onSuccessMsg) toast.success(onSuccessMsg);
      return data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setPending(false);
    }
  };

  return { mutate, pending };
}

function AdminContent() {
  const { token } = useAuth();
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Stats
  const { data: statsData, loading: statsLoading } = useApiFetch("/api/admin/stats");
  const stats = statsData?.stats || statsData;

  // Tasks
  const { data: tasksData, loading: tasksLoading, refresh: refreshTasks } = useApiFetch("/api/admin/tasks");
  const tasks = tasksData?.tasks || tasksData || [];

  const createTaskMutation = useApiMutation("POST", "/api/admin/tasks", "Task created!");
  const deleteTaskMutation = useApiMutation("DELETE", "/api/admin/tasks/", "Task deleted!");
  const updateTaskMutation = useApiMutation("PUT", "/api/admin/tasks/", "Task updated!");

  const [editTask, setEditTask] = useState<any>(null);

  // Completions
  const { data: compsData, loading: compLoading, refresh: refreshComps } = useApiFetch("/api/admin/completions/pending");
  const completions = compsData?.completions || compsData || [];

  const reviewCompletion = useApiMutation("PUT", "/api/admin/completions/review/", undefined);

  // Withdrawals
  const { data: wdsData, loading: wdLoading, refresh: refreshWds } = useApiFetch("/api/admin/withdrawals");
  const withdrawals = wdsData?.withdrawals || wdsData || [];

  const updateWithdrawal = useApiMutation("PUT", "/api/admin/withdrawals/", undefined);
  const handleUpdateWithdrawalWallet = async (id: number, walletAddress: string) => {
    const w = withdrawals.find((x: any) => x.id === id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ status: w?.status || "pending", walletAddress }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update withdrawal");
      }
      refreshWds();
      toast.success("Wallet address updated!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Users
  const { data: usersData, loading: usersLoading, refresh: refreshUsers } = useApiFetch("/api/admin/users");
  const allUsers = usersData?.users || usersData || [];

  const updateRole = useApiMutation("PUT", "/api/admin/users/role/", "User role updated!");

  // Notifications
  const { data: notifsData, loading: notifsLoading, refresh: refreshNotifs } = useApiFetch("/api/admin/notifications");
  const notifications = notifsData?.notifications || notifsData || [];
  const deleteNotification = useApiMutation("DELETE", "/api/admin/notifications/", "Notification deleted!");

  const handleDeleteNotification = async (id: number) => {
    if (!confirm("Delete this notification?")) return;
    try {
      await fetch(`/api/admin/notifications/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      refreshNotifs();
      toast.success("Notification deleted!");
    } catch {}
  };

  const [editUser, setEditUser] = useState<any>(null);
  const [detailUser, setDetailUser] = useState<any>(null);

  const handleApproveCompletion = async (id: number) => {
    try {
      await reviewCompletion.mutate({ id, status: "approved" });
      refreshComps();
      refreshTasks();
      refreshWds();
    } catch {}
  };

  const handleRejectCompletion = async (id: number) => {
    try {
      await reviewCompletion.mutate({ id, status: "rejected" });
      refreshComps();
    } catch {}
  };

  const handlePayWithdrawal = async (id: number, txHash: string) => {
    try {
      await updateWithdrawal.mutate({ id, status: "paid", txHash });
      refreshWds();
      toast.success("Withdrawal marked as paid!");
    } catch {}
  };

  const handleRejectWithdrawal = async (id: number) => {
    try {
      await updateWithdrawal.mutate({ id, status: "rejected", txHash: "" });
      refreshWds();
      toast.success("Withdrawal rejected.");
    } catch {}
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTaskMutation.mutate(undefined);
      // Need to append id to URL
      await fetch(`/api/admin/tasks/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      refreshTasks();
      toast.success("Task deleted!");
    } catch {}
  };

  const handleToggleTask = async (task: any) => {
    const newStatus = task.status === "active" ? "paused" : "active";
    try {
      await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, status: newStatus }),
      });
      refreshTasks();
      toast.success(newStatus === "active" ? "Task activated!" : "Task paused!");
    } catch {}
  };

  const handleRoleChange = async (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`Set user as ${newRole}?`)) return;
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      refreshUsers();
      toast.success(`User role changed to ${newRole}!`);
    } catch {}
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      refreshUsers();
      toast.success("User deleted!");
    } catch {}
  };

/* Round 22 — admin self top-up: add any amount directly to the admin's own dashboard balance (unlimited) */
function SelfTopUpDialog() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const doSelfTopUp = async (amt: number) => {
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/self-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amt }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Top-up failed");
      toast.success(`Added $${amt.toFixed(2)} to your balance. New balance: $${Number(d.newBalance).toFixed(4)}`);
      setAmount("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs gap-1.5">
          <CircleDollarSign className="w-4 h-4" /> Self Top-Up (Unlimited)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-base">Add Money to Your Admin Balance</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground">Funds go directly to your dashboard balance — usable for VIP purchases, withdrawals, etc. No limit.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void doSelfTopUp(100)} className="flex-1 h-8 text-xs border-primary/20 text-primary hover:bg-primary/10">+ $100</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void doSelfTopUp(500)} className="flex-1 h-8 text-xs border-primary/20 text-primary hover:bg-primary/10">+ $500</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void doSelfTopUp(1000)} className="flex-1 h-8 text-xs border-primary/20 text-primary hover:bg-primary/10">+ $1000</Button>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input type="number" step="0.01" min="0.01" placeholder="Custom amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-6 h-9" />
            </div>
            <Button disabled={busy} onClick={() => {
              const amt = parseFloat(amount);
              if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
              void doSelfTopUp(amt);
            }} className="h-9 shrink-0">Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

  return (
    <div className="pt-4 pb-8 px-2 lg:px-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-sans font-bold">Admin Panel</h1>
        <SelfTopUpDialog />
      </div>
      <p className="text-muted-foreground text-sm mb-6">Manage tasks, reviews, and payouts.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card className="bg-card">
          <CardContent className="p-4">
            <Users className="w-5 h-5 text-primary mb-1" />
            <p className="text-xl font-sans font-bold">{stats?.totalUsers ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <TrendingUp className="w-5 h-5 text-success mb-1" />
            <p className="text-xl font-sans font-bold text-success">${stats?.totalEarned ?? "0"}</p>
            <p className="text-xs text-muted-foreground">Total Paid Out</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <Clock className="w-5 h-5 text-warning mb-1" />
            <p className="text-xl font-sans font-bold text-warning">{stats?.pendingWithdrawals ?? 0}</p>
            <p className="text-xs text-muted-foreground">Pending Withdrawals</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <CheckCircle2 className="w-5 h-5 text-chart-3 mb-1" />
            <p className="text-xl font-sans font-bold">{stats?.completedTasks ?? 0}</p>
            <p className="text-xs text-muted-foreground">Approved Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList className="bg-card mb-4">
          <TabsTrigger value="tasks" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Tasks</TabsTrigger>
          <TabsTrigger value="completions" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Reviews</TabsTrigger>
          <TabsTrigger value="withdrawals" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Withdrawals</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Users</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Notifications</TabsTrigger>
          <TabsTrigger value="deposits" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Deposits
            {(stats?.pendingRecharges ?? 0) > 0 && (
              <span className="ml-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold text-primary-foreground bg-warning rounded-full">{stats.pendingRecharges}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Settings</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card className="bg-card mb-4">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-5 h-5 text-primary" />
                Task Management
              </CardTitle>
              <CreateTaskDialog onCreated={refreshTasks} />
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{task.title}</p>
                          <Badge variant="outline" className={`text-xs ${task.status === "active" ? "border-success/20 text-success" : "border-muted/20 text-muted-foreground"}`}>
                            {task.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{task.category} — ${Number(task.reward).toFixed(4)} — {task.timeLimit}s min</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="border-primary/20 text-primary" onClick={() => setEditTask(task)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-primary/20 text-primary" onClick={() => handleToggleTask(task)}>
                          {task.status === "active" ? "Pause" : "Activate"}
                        </Button>
                        <Button size="sm" variant="outline" className="border-destructive/20 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 text-primary/20" />
                  <p className="text-sm">No tasks yet. Create your first task!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completions Tab */}
        <TabsContent value="completions">
          <Card className="bg-card">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Task Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : completions.length > 0 ? (
                <div className="space-y-2">
                  {completions.map((c: any) => (
                    <div key={c.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{c.taskTitle}</p>
                          <Badge variant="outline" className={`text-xs ${
                            c.status === "approved" ? "border-success/20 text-success" :
                            c.status === "rejected" ? "border-destructive/20 text-destructive" :
                            "border-warning/20 text-warning"
                          }`}>{c.status}</Badge>
                        </div>
                        <span className="text-sm font-medium text-success">+${Number(c.reward).toFixed(4)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        <p>User: {c.userName || c.userEmail} — {c.submittedAt ? new Date(c.submittedAt).toLocaleString() : ""}</p>
                        {c.proof && <p className="mt-1 p-2 rounded bg-background/50 font-mono text-xs break-all">Proof: {c.proof}</p>}
                        {c.proofImageUrl && <p className="mt-1"><a href={c.proofImageUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">View proof image</a></p>}
                      </div>
                      {c.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-success/10 border border-success/20 text-success hover:bg-success/10" variant="outline" onClick={() => handleApproveCompletion(c.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => handleRejectCompletion(c.id)}>
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-primary/20" />
                  <p className="text-sm">No submissions to review.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals">
          <Card className="bg-card">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="w-5 h-5 text-primary" />
                Withdrawal Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wdLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : withdrawals.length > 0 ? (
                <div className="space-y-2">
                  {withdrawals.map((w: any) => (
                    <div key={w.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{w.userName || w.userEmail}</p>
                          <Badge variant="outline" className={`text-xs ${
                            w.status === "paid" ? "border-success/20 text-success" :
                            w.status === "rejected" ? "border-destructive/20 text-destructive" :
                            w.status === "approved" ? "border-chart-2/20 text-chart-2" :
                            "border-warning/20 text-warning"
                          }`}>{w.status}</Badge>
                        </div>
                        <span className="text-sm font-bold text-primary">${Number(w.amount).toFixed(4)} {w.currency}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {w.fee !== undefined && w.fee > 0 && <p className="text-warning">Fee: ${(Number(w.fee)).toFixed(4)} (net: ${(Number(w.amount) - Number(w.fee)).toFixed(4)})</p>}
                        <div className="flex items-start gap-1">
                          <p className="font-mono break-all">{w.walletAddress}</p>
                          <button className="shrink-0 text-primary hover:underline mt-0.5" onClick={() => {
                            const addr = prompt("Edit withdrawal wallet address:", w.walletAddress);
                            if (addr !== null && addr.trim()) handleUpdateWithdrawalWallet(w.id, addr.trim());
                          }}>Edit</button>
                        </div>
                        <p>{w.requestedAt ? new Date(w.requestedAt).toLocaleString() : ""}</p>
                        {w.txHash && <p className="mt-1 text-success font-mono break-all">TX: {w.txHash}</p>}
                      </div>
                      {w.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-success/10 border border-success/20 text-success hover:bg-success/10" variant="outline" onClick={() => {
                            const tx = prompt("Enter TX hash (or leave empty):");
                            if (tx !== null) handlePayWithdrawal(w.id, tx || "");
                          }}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Mark Paid
                          </Button>
                          <Button size="sm" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => handleRejectWithdrawal(w.id)}>
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="w-10 h-10 mx-auto mb-3 text-primary/20" />
                  <p className="text-sm">No withdrawal requests.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="bg-card">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : allUsers.length > 0 ? (
                <div className="space-y-2">
                  {allUsers.map((u: any) => (
                    <div key={u.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{u.username || u.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}{u.country ? ` • ${u.country}` : ""}{u.phoneNumber ? ` • ${u.phoneNumber}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={u.role === "admin" ? "border-primary/20 text-primary" : "border-muted/20 text-muted-foreground"}>
                            {u.role}
                          </Badge>
                          <Button size="sm" variant="outline" className="border-primary/20 text-primary" onClick={() => setDetailUser(u)} title="View full profile">
                            <UserRoundPen className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-primary/20 text-primary" onClick={() => setEditUser(u)} title="Edit all fields">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-primary/20 text-primary" onClick={() => handleRoleChange(u.id, u.role)}>
                            {u.role === "admin" ? "Make User" : "Make Admin"}
                          </Button>
                          <Button size="sm" variant="outline" className="border-destructive/20 text-destructive" onClick={() => handleDeleteUser(u.id)} title="Delete user">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span>Balance: ${Number(u.availableBalance || 0).toFixed(4)}</span>
                        <span>Earned: ${Number(u.totalEarned || 0).toFixed(4)}</span>
                        <span>Tasks done: {u.completedTasksCount ?? 0}</span>
                        <span>Deposits: {u.depositsCount ?? 0} (${Number(u.depositsAmount || 0).toFixed(2)})</span>
                        <span>Withdrawals: {u.withdrawalsCount ?? 0}</span>
                        <span>PIN: {u.hasPin ? "Yes" : "No"}</span>
                        {u.registerTime && <span>Registered: {new Date(u.registerTime).toLocaleString()}</span>}
                        {u.vip ? (
                          <span className="text-primary font-medium">VIP: {u.vip.planName} ({u.vip.daysLeft} days left)</span>
                        ) : (
                          u.has_recharged ? <span className="text-muted-foreground">No VIP</span> : null
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 text-primary/20" />
                  <p className="text-sm">No users registered yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="bg-card mb-4">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
              <CreateNotificationDialog onCreated={refreshNotifs} />
            </CardHeader>
            <CardContent>
              {notifsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-2">
                  {notifications.map((n: any) => (
                    <div key={n.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${n.user_id ? "border-chart-2/20 text-chart-2" : "border-primary/20 text-primary"}`}>
                            {n.user_id ? "single user" : "broadcast"}
                          </Badge>
                          <Badge variant="outline" className="text-xs border-muted/20 text-muted-foreground">{n.is_broadcast ? "broadcast" : "info"}</Badge>
                          <span className="text-xs text-muted-foreground">{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</span>
                        </div>
                        <Button size="sm" variant="outline" className="border-destructive/20 text-destructive" onClick={() => handleDeleteNotification(n.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.message ?? n.body ?? ""}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-10 h-10 mx-auto mb-3 text-primary/20" />
                  <p className="text-sm">No notifications sent yet.</p>
                  <p className="text-xs mt-1">Send a broadcast to all users or a message to one user.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deposits Tab — receipt review (Round 11) */}
        <TabsContent value="deposits">
          <AdminDeposits />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-4">
            <AdminSettings />
            <AdChannelsEditor />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Task Dialog */}
      {editTask && <EditTaskDialog task={editTask} onClose={() => { setEditTask(null); refreshTasks(); }} />}

      {/* Edit User Dialog */}
      {editUser && <EditUserDialog user={editUser} onClose={() => { setEditUser(null); refreshUsers(); }} />}
      {detailUser && <UserDetailDialog user={detailUser} onClose={() => setDetailUser(null)} />}
    </div>
  );
}

function CreateTaskDialog({ onCreated }: { onCreated: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("watch_video");
  const [reward, setReward] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [requiredProof, setRequiredProof] = useState("screenshot");
  const [timeLimit, setTimeLimit] = useState("30");
  const [imageUrl, setImageUrl] = useState("");

  const handleCreate = async () => {
    if (!title.trim() || !description.trim() || !reward) {
      toast.error("Please fill in all required fields");
      return;
    }
    const rewardNum = parseFloat(reward);
    if (isNaN(rewardNum) || rewardNum <= 0) {
      toast.error("Invalid reward amount");
      return;
    }

    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          reward: rewardNum,
          currency,
          timeLimit: parseInt(timeLimit) || 30,
          requiredProof,
          imageUrl: imageUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");
      toast.success("Task created successfully!");
      setOpen(false);
      setTitle("");
      setDescription("");
      setReward("");
      setImageUrl("");
      onCreated();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-to-r bg-primary text-primary-foreground font-semibold">
          <Plus className="w-4 h-4 mr-1" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sans text-xl">Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Watch our promotional video" className="bg-secondary/50 border-border/50" />
          </div>
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what the user needs to do..." className="bg-secondary/50 border-border/50 min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watch_video">Watch Video</SelectItem>
                  <SelectItem value="share_link">Share Link</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="social_follow">Social Follow</SelectItem>
                  <SelectItem value="visit_site">Visit Site</SelectItem>
                  <SelectItem value="app_download">App Download</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reward (USD) *</Label>
              <Input type="number" step="0.0001" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="0.10" className="bg-secondary/50 border-border/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="TRX">TRX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min Time (seconds)</Label>
              <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="30" className="bg-secondary/50 border-border/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Required Proof</Label>
            <Select value={requiredProof} onValueChange={setRequiredProof}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="screenshot">Screenshot</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Image URL (optional)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="bg-secondary/50 border-border/50" />
          </div>
          <Button onClick={handleCreate} className="w-full bg-gradient-to-r bg-primary text-primary-foreground font-semibold hover:opacity-90">
            <Plus className="w-5 h-5 mr-2" />
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditTaskDialog({ task, onClose }: { task: any; onClose: () => void }) {
  const { token } = useAuth();
  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [category, setCategory] = useState(task.category || "watch_video");
  const [reward, setReward] = useState(String(Number(task.reward) || ""));
  const [currency, setCurrency] = useState(task.currency || "USDT");
  const [requiredProof, setRequiredProof] = useState(task.requiredProof || "screenshot");
  const [timeLimit, setTimeLimit] = useState(String(task.timeLimit || "30"));
  const [imageUrl, setImageUrl] = useState(task.imageUrl || "");

  const handleUpdate = async () => {
    if (!title.trim() || !description.trim() || !reward) {
      toast.error("Please fill in all required fields");
      return;
    }
    const rewardNum = parseFloat(reward);
    if (isNaN(rewardNum) || rewardNum <= 0) {
      toast.error("Invalid reward amount");
      return;
    }

    try {
      const res = await fetch(`/api/admin/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          reward: rewardNum,
          currency,
          timeLimit: parseInt(timeLimit) || 30,
          requiredProof,
          imageUrl: imageUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");
      toast.success("Task updated!");
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sans text-xl">Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary/50 border-border/50" />
          </div>
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary/50 border-border/50 min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="watch_video">Watch Video</SelectItem>
                  <SelectItem value="share_link">Share Link</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="social_follow">Social Follow</SelectItem>
                  <SelectItem value="visit_site">Visit Site</SelectItem>
                  <SelectItem value="app_download">App Download</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reward (USD) *</Label>
              <Input type="number" step="0.0001" value={reward} onChange={(e) => setReward(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="TRX">TRX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min Time (seconds)</Label>
              <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Required Proof</Label>
            <Select value={requiredProof} onValueChange={setRequiredProof}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="screenshot">Screenshot</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Image URL (optional)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-secondary/50 border-border/50" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleUpdate} className="flex-1 bg-gradient-to-r bg-primary text-primary-foreground font-semibold hover:opacity-90">
              Update Task
            </Button>
            <Button onClick={onClose} variant="outline" className="border-border/50">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdChannelsEditor() {
  const { token } = useAuth();
  const [channels, setChannels] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/ad-payment-channels")
      .then((r) => r.json())
      .then((d) => { setChannels(d.channels || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const setField = (id: string, field: "accountRef" | "enabled", value: any) => {
    setChannels((prev) => prev.map((ch) => (ch.id === id ? { ...ch, [field]: value } : ch)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ad-payment-channels", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channels: channels.map((c) => ({ id: c.id, accountRef: c.accountRef, enabled: c.enabled })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save ad-network channels");
      setChannels(data.channels || channels);
      toast.success("Ad-network payment channels saved! Enabled channels now appear for users on the Withdraw page.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <Card className="bg-card">
        <CardContent className="flex justify-center py-6">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MonitorPlay className="w-5 h-5 text-primary" />
          Ad-Network Payment Channels
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Unlimited admin control of payout channels: set each channel's account details, enable or disable it, and verify payouts through it. These channels are internal to the admin only — they never appear to users on the website; users withdraw through the crypto wallets, and you confirm the funds arrive at the channel account/exchanger.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border divide-y divide-border/50">
          {channels.map((ch) => (
            <div key={ch.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{ch.label}</p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!!ch.enabled}
                    onChange={(e) => setField(ch.id, "enabled", e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  Enabled
                </label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Account ID / Payout Details (e.g. publisher email, site ID)</Label>
                <Input
                  value={ch.accountRef || ""}
                  onChange={(e) => setField(ch.id, "accountRef", e.target.value)}
                  placeholder={`Enter your ${ch.label} account / publisher reference`}
                  className="bg-secondary/50 border-border/50 font-mono text-sm"
                />
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r bg-primary text-primary-foreground font-semibold hover:opacity-90">
          {saving ? (
            <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
          ) : null}
          Save Ad-Network Channels
        </Button>
      </CardContent>
    </Card>
  );
}

function AdminSettings() {
  const { token } = useAuth();
  const { data: settingsData, loading: settingsLoading, refresh: refreshSettings } = useApiFetch("/api/admin/settings");
  const settings = settingsData?.settings || settingsData;

  const [trxWallet, setTrxWallet] = useState("");
  const [btcWallet, setBtcWallet] = useState("");
  const [bnbWallet, setBnbWallet] = useState("");
  const [minWithdrawal, setMinWithdrawal] = useState("5.00");
  const [bonusPct, setBonusPct] = useState("10");
  const [feePct, setFeePct] = useState("0");
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeBody, setWelcomeBody] = useState("");
  const [videoPool, setVideoPool] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setTrxWallet(settings.trx_wallet || "");
      setBtcWallet(settings.btc_wallet || "");
      setBnbWallet(settings.bnb_wallet || "");
      setMinWithdrawal(settings.min_withdrawal || "5.00");
      setBonusPct(settings.referral_bonus_pct || "10");
      setFeePct(settings.withdrawal_fee_pct || "0");
      setWelcomeTitle(settings.welcome_title || "Welcome to AI COMPUTER PLUS!");
      setWelcomeBody(settings.welcome_body || "You can now complete tasks to earn crypto. Invite friends with your link and earn 10% of what they earn!");
      let pool = "";
      try { pool = (settings.video_pool ? JSON.parse(settings.video_pool) : []).join("\n"); } catch { pool = settings.video_pool || ""; }
      setVideoPool(pool);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          trxWallet: trxWallet.trim(),
          btcWallet: btcWallet.trim(),
          bnbWallet: bnbWallet.trim(),
          minWithdrawal: minWithdrawal.trim(),
          referralBonusPct: bonusPct.trim(),
          withdrawalFeePct: feePct.trim(),
          welcomeTitle: welcomeTitle.trim(),
          welcomeBody: welcomeBody.trim(),
          videoPool: videoPool.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      toast.success("Settings updated!");
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (settingsLoading) {
    return (
      <Card className="bg-card">
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <SettingsIcon className="w-5 h-5 text-primary" />
          Platform Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">Configure payout wallets and platform parameters.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>TRX (Tron) Wallet</Label>
            <Input value={trxWallet} onChange={(e) => setTrxWallet(e.target.value)} className="bg-secondary/50 border-border/50 font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <Label>BTC (Bitcoin) Wallet</Label>
            <Input value={btcWallet} onChange={(e) => setBtcWallet(e.target.value)} className="bg-secondary/50 border-border/50 font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <Label>BNB (BSC — BEP-20) Wallet</Label>
            <Input value={bnbWallet} onChange={(e) => setBnbWallet(e.target.value)} className="bg-secondary/50 border-border/50 font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Withdrawal (USD)</Label>
              <Input type="number" step="0.01" value={minWithdrawal} onChange={(e) => setMinWithdrawal(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label>Referral Bonus (%)</Label>
              <Input type="number" value={bonusPct} onChange={(e) => setBonusPct(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label>Withdrawal Fee (%)</Label>
              <Input type="number" step="0.01" value={feePct} onChange={(e) => setFeePct(e.target.value)} className="bg-secondary/50 border-border/50" />
              <p className="text-xs text-muted-foreground">Deducted from each withdrawal request (0 = no fee).</p>
            </div>
          </div>
          <div className="pt-4 border-t border-border/50 space-y-4">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Welcome Notification (sent automatically to every new registration)
            </p>
            <div className="space-y-2">
              <Label>Welcome Title</Label>
              <Input value={welcomeTitle} onChange={(e) => setWelcomeTitle(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label>Welcome Message</Label>
              <Textarea value={welcomeBody} onChange={(e) => setWelcomeBody(e.target.value)} className="bg-secondary/50 border-border/50 min-h-[80px]" />
            </div>
          </div>
          <div className="pt-4 border-t border-border/50 space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <MonitorPlay className="w-4 h-4 text-primary" />
              Daily Task Video Pool
            </p>
            <Textarea
              value={videoPool}
              onChange={(e) => setVideoPool(e.target.value)}
              placeholder={`One video link per line, e.g.\nhttps://www.youtube.com/watch?v=XXXXXXXXXXX\nhttps://vm.tiktok.com/xxxxxx`}
              className="bg-secondary/50 border-border/50 min-h-[100px] font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">YouTube & TikTok links only. Each user gets one video per day, rotated per-member. Video tasks require 30s of viewing before payout.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r bg-primary text-primary-foreground font-semibold hover:opacity-90">
          {saving ? (
            <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
          ) : null}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------- Deposits tab: receipt review & decision ----------
function AdminDeposits() {
  const { token } = useAuth();
  const { data: depsData, loading: depsLoading, refresh: refreshDeps } = useApiFetch("/api/admin/recharges");
  const recharges = depsData?.recharges || depsData || [];
  const [deciding, setDeciding] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});

  const handleDecision = async (id: number, decision: "approved" | "rejected") => {
    setDeciding(id);
    try {
      const res = await fetch(`/api/admin/recharges/${id}/decision`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision, note: noteDraft[id] || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update deposit");
      toast.success(decision === "approved" ? "Deposit approved — tasks unlocked for the user." : "Deposit rejected.");
      refreshDeps();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeciding(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "approved")
      return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Approved</Badge>;
    if (status === "rejected")
      return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/25">Rejected</Badge>;
    return <Badge className="bg-warning/15 text-warning-foreground hover:bg-warning/25">Pending</Badge>;
  };

  const downloadReceipt = (r: any) => {
    if (!r.receiptUrl) return;
    const a = document.createElement("a");
    a.href = r.receiptUrl;
    const ext = (r.receiptMime || (r.receiptUrl || "").split(";")[0].split("/")[1] || "png").split("/").pop() || "png";
    a.download = `receipt-${r.id}.${ext}`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="w-5 h-5 text-primary" /> Deposit Requests
            </CardTitle>
            <p className="text-sm text-muted-foreground">Review payment receipts, approve to unlock tasks or reject invalid deposits.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshDeps} className="border-primary/20 text-primary">
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {depsLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : recharges.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 text-primary/20" />
              No deposit requests yet. Requests appear here after users upload payment receipts.
            </div>
          ) : (
            <div className="space-y-4">
              {recharges.map((r: any) => (
                <div key={r.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">{(r.userName || "?").charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{r.userName || "User"} <span className="font-normal text-muted-foreground text-xs">({r.userEmail || "no email"})</span></p>
                        <p className="text-[11px] text-muted-foreground">{r.paymentMethod || "—"} • ${Number(r.amount || 0).toFixed(2)}#{r.id}</p>
                        <p className="text-[10px] text-muted-foreground/70">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</p>
                      </div>
                      {statusBadge(r.status || "pending")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(r.status === "pending") && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleDecision(r.id, "approved")}
                            disabled={deciding === r.id}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 h-8"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecision(r.id, "rejected")}
                            disabled={deciding === r.id}
                            className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8"
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {r.receiptUrl && (
                        <Button size="sm" variant="outline" onClick={() => downloadReceipt(r)} className="border-primary/20 text-primary h-8">
                          <Download className="w-4 h-4 mr-1" /> Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                  {r.receiptUrl && (
                    <div className="border border-border rounded-lg overflow-hidden bg-secondary/30">
                      <img src={r.receiptUrl} alt="Payment receipt" className="max-h-[380px] w-full object-contain" />
                    </div>
                  )}
                  {!r.receiptUrl && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border border-dashed border-border rounded-lg p-3">
                      <ImageIcon className="w-4 h-4" /> No receipt image attached
                    </div>
                  )}
                  {r.adminNote && (
                    <p className="text-xs text-muted-foreground">Admin note: {r.adminNote}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserDetailDialog({ user: row, onClose }: { user: any; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserRoundPen className="w-4 h-4 text-primary" />
            User Profile — {row.username || row.email || `#${row.id}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <DetailRow label="ID" value={String(row.id)} />
          <DetailRow label="Username" value={row.username || "—"} />
          <DetailRow label="Email" value={row.email || "—"} />
          <DetailRow label="Phone" value={row.phoneNumber ? `${row.country ? row.country + " " : ""}${row.phoneNumber}` : "—"} />
          <DetailRow label="Country" value={row.country || "—"} />
          <DetailRow label="Role" value={row.role || "user"} />
          <DetailRow label="Register Time" value={row.registerTime ? new Date(row.registerTime).toLocaleString() : "—"} />
          <DetailRow label="Available Balance" value={`$${Number(row.availableBalance || 0).toFixed(4)}`} />
          <DetailRow label="Total Earned" value={`$${Number(row.totalEarned || 0).toFixed(4)}`} />
          <DetailRow label="Referral Bonus" value={`$${Number(row.referralBonus || 0).toFixed(4)}`} />
          <DetailRow label="Deposit Amount" value={`$${Number(row.depositAmount || 0).toFixed(2)} (${row.has_recharged ? "has recharged" : "not yet"})`} />
          <DetailRow label="Tasks Completed" value={`${row.completedTasksCount ?? 0} (paid: ${row.approvedTasksCount ?? 0} | free: ${row.freeTasksCount ?? 0})`} />
          <DetailRow label="Tasks Amount (approved)" value={`$${Number(row.completedTasksAmount || 0).toFixed(4)}`} />
          <DetailRow label="Withdrawals" value={`${row.withdrawalsCount ?? 0} — $${Number(row.withdrawalsAmount || 0).toFixed(4)}`} />
          <DetailRow label="Deposits" value={`${row.depositsCount ?? 0} approved — $${Number(row.depositsAmount || 0).toFixed(2)}`} />
          <DetailRow label="Withdraw PIN" value={row.hasPin ? "Set" : "Not set"} />
          <DetailRow label="Status" value={row.isBanned ? "Banned" : "Active"} />
          {row.vip && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-semibold text-primary mb-1">{row.vip.planName}</p>
              <p className="text-xs text-muted-foreground">Task pay: ${Number(row.vip.taskAmount).toFixed(2)} • Daily rate: ${Number(row.vip.dailyEarnRate).toFixed(2)} • Validity: {row.vip.validityDays} days ({row.vip.daysLeft} left)</p>
              <p className="text-xs text-muted-foreground">Expires: {new Date(row.vip.validUntil).toLocaleString()}</p>
            </div>
          )}
          {/* Unlimited top-up — admin direct */}
          <TopUpPanel userId={row.id} balance={Number(row.availableBalance || 0)} onDone={() => {}} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopUpPanel({ userId, balance, onDone }: { userId: number; balance: number; onDone: () => void }) {
  const { token } = useAuth();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Admin top-up");
  const [busy, setBusy] = useState(false);

  const quickAdd = (preset: number, presetReason: string) => {
    setAmount(String(preset));
    setReason(presetReason);
    void doTopUp(preset, presetReason);
  };

  const doTopUp = async (amt: number, rsn: string) => {
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amt, reason: rsn }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Top-up failed");
      toast.success(`Added $${amt.toFixed(2)} to user's balance. New balance: $${Number(d.newBalance).toFixed(4)}`);
      setAmount("");
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitCustom = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    void doTopUp(amt, reason.trim() || "Admin top-up");
  };

  return (
    <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
      <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
        <CircleDollarSign className="w-4 h-4" /> Add Money (Unlimited — direct to balance)
      </p>
      <div className="flex gap-2 mb-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => quickAdd(10, "Free Task bonus")} className="flex-1 h-8 text-xs border-primary/20 text-primary hover:bg-primary/10">
          + $10 Free Task
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => quickAdd(50, "VIP Task bonus")} className="flex-1 h-8 text-xs border-primary/20 text-primary hover:bg-primary/10">
          + $50 VIP Task
        </Button>
      </div>
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Custom amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-card border-border/50 pl-6 h-8 text-sm"
          />
        </div>
        <Input
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="bg-card border-border/50 h-8 text-xs"
        />
        <Button size="sm" onClick={submitCustom} disabled={busy} className="h-8 px-3 bg-primary text-primary-foreground">
          {busy ? <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Plus className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5">
        Any amount can be added (unlimited). The user receives an instant notification.
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-all">{value}</span>
    </div>
  );
}

function EditUserDialog({ user: editUserRow, onClose }: { user: any; onClose: () => void }) {
  const { token } = useAuth();
  const [username, setUsername] = useState(editUserRow.username || "");
  const [email, setEmail] = useState(editUserRow.email || "");
  const [availableBalance, setAvailableBalance] = useState(String(Number(editUserRow.availableBalance ?? editUserRow.available_balance ?? 0)));
  const [totalEarned, setTotalEarned] = useState(String(Number(editUserRow.totalEarned ?? editUserRow.total_earned ?? 0)));
  const [btcAddress, setBtcAddress] = useState(editUserRow.btcAddress || editUserRow.btc_address || "");
  const [usdtAddress, setUsdtAddress] = useState(editUserRow.usdtAddress || editUserRow.usdt_address || "");
  const [trxAddress, setTrxAddress] = useState(editUserRow.trxAddress || editUserRow.trx_address || "");
  const [phoneNumber, setPhoneNumber] = useState(editUserRow.phoneNumber || editUserRow.phone_number || "");
  const [country, setCountry] = useState(editUserRow.country || "");
  const [isBanned, setIsBanned] = useState(Boolean(editUserRow.isBanned ?? editUserRow.is_banned));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editUserRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          available_balance: parseFloat(availableBalance) || 0,
          total_earned: parseFloat(totalEarned) || 0,
          btc_address: btcAddress.trim(),
          usdt_address: usdtAddress.trim(),
          trx_address: trxAddress.trim(),
          phone_number: phoneNumber.trim(),
          country: country.trim(),
          is_banned: isBanned,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      toast.success("User updated!");
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sans text-xl flex items-center gap-2">
            <UserRoundPen className="w-5 h-5 text-primary" />
            Edit User
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="bg-secondary/50 border-border/50 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Available Balance (USD)</Label>
              <Input type="number" step="0.0001" value={availableBalance} onChange={(e) => setAvailableBalance(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label>Total Earned (USD)</Label>
              <Input type="number" step="0.0001" value={totalEarned} onChange={(e) => setTotalEarned(e.target.value)} className="bg-secondary/50 border-border/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>BTC Address</Label>
            <Input value={btcAddress} onChange={(e) => setBtcAddress(e.target.value)} className="bg-secondary/50 border-border/50 font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>USDT Address</Label>
            <Input value={usdtAddress} onChange={(e) => setUsdtAddress(e.target.value)} className="bg-secondary/50 border-border/50 font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>TRX Address</Label>
            <Input value={trxAddress} onChange={(e) => setTrxAddress(e.target.value)} className="bg-secondary/50 border-border/50 font-mono text-xs" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
            <div>
              <p className="text-sm font-medium">Account Suspended</p>
              <p className="text-xs text-muted-foreground">Banned users cannot log in until unbanned.</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isBanned}
                onChange={(e) => setIsBanned(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 rounded-full peer bg-muted-foreground/30 peer-checked:bg-destructive/70 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r bg-primary text-primary-foreground font-semibold hover:opacity-90">
              {saving ? <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" /> : null}
              Save Changes
            </Button>
            <Button onClick={onClose} variant="outline" className="border-border/50">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateNotificationDialog({ onCreated }: { onCreated: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"broadcast" | "user">("broadcast");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("broadcast");
  const { data: usersData } = useApiFetch("/api/admin/users");
  const allUsers = usersData?.users || usersData || [];

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          kind: target === "broadcast" ? "broadcast" : "info",
          user_id: target === "user" ? (parseInt(userId) || null) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.note || "Failed to send notification");
      if (data.success === false) {
        toast.warning("Notifications are not enabled yet — run the SQL from the admin guide in Supabase first.");
        return;
      }
      toast.success(target === "broadcast" ? "Broadcast sent to all users!" : "Notification sent!");
      setOpen(false);
      setTitle("");
      setBody("");
      setUserId("");
      onCreated();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-to-r bg-primary text-primary-foreground font-semibold">
          <Send className="w-4 h-4 mr-1" />
          Send Notification
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sans text-xl">Send Notification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Who receives it?</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className={target === "broadcast" ? "border-primary text-primary bg-primary/5" : "border-border/50"}
                onClick={() => setTarget("broadcast")}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                All Users
              </Button>
              <Button
                type="button"
                variant="outline"
                className={target === "user" ? "border-primary text-primary bg-primary/5" : "border-border/50"}
                onClick={() => setTarget("user")}
              >
                <UserRoundPen className="w-4 h-4 mr-1" />
                One User
              </Button>
            </div>
          </div>
          {target === "user" && (
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.username || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., New task available!" className="bg-secondary/50 border-border/50" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the notification message..." className="bg-secondary/50 border-border/50 min-h-[80px]" />
          </div>
          <Button onClick={handleSend} className="w-full bg-gradient-to-r bg-primary text-primary-foreground font-semibold hover:opacity-90">
            <Send className="w-4 h-4 mr-2" />
            {target === "broadcast" ? "Broadcast to All Users" : "Send to User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
