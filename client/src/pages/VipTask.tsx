import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Sparkles,
  CalendarDays,
  Coins,
  TrendingUp,
  Layers,
  Lock,
  Zap,
  CheckCircle2,
  Clock,
} from "lucide-react";

const PLAN_TIERS: Record<string, { accent: string; chip: string }> = {
  Bronze: { accent: "from-amber-700/90 to-amber-900/90", chip: "border-amber-600/40 text-amber-700" },
  Silver: { accent: "from-slate-400/90 to-slate-600/90", chip: "border-slate-400/40 text-slate-600" },
  Gold: { accent: "from-yellow-500/90 to-yellow-700/90", chip: "border-yellow-500/40 text-yellow-700" },
  Platinum: { accent: "from-sky-400/90 to-sky-600/90", chip: "border-sky-400/40 text-sky-700" },
  Diamond: { accent: "from-cyan-400/90 to-cyan-600/90", chip: "border-cyan-400/40 text-cyan-700" },
  Elite: { accent: "from-violet-600/90 to-violet-900/90", chip: "border-violet-500/40 text-violet-700" },
};

function tierOf(name: string | null | undefined): string {
  const n = (name ?? "").toString().toLowerCase();
  return Object.keys(PLAN_TIERS).find((t) => n.includes(t.toLowerCase())) || "Gold";
}

export default function VipTask() {
  const { user, token, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [plans, setPlans] = useState<any[]>([]);
  const [myVip, setMyVip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/vip-plans", { headers }).then((r) => r.json()),
      fetch("/api/vip-my", { headers }).then((r) => (r.ok ? r.json() : Promise.resolve({ vip: null }))),
    ])
      .then(([plansData, vipData]) => {
        setPlans(plansData.plans || []);
        setMyVip(vipData.vip || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, token]);

  const handlePurchase = async (plan: any) => {
    if (!window.confirm(`Purchase VIP ${plan.name} for $${Number(plan.depositAmount).toFixed(2)}? This matches the recharge amount you select.`)) return;
    setPurchasing(plan.id);
    try {
      const res = await fetch(`/api/vip-plans/${plan.id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");
      toast.success(`VIP ${plan.name} activated! Your VIP tasks start paying immediately.`);
      fetch("/api/vip-my", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : Promise.resolve({ vip: null })))
        .then((d) => setMyVip(d.vip || null));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPurchasing(null);
    }
  };

  const daysLeft = myVip ? Math.max(0, Math.ceil((new Date(myVip.validUntil).getTime() - Date.now()) / 86400000)) : 0;

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">VIP Task</h1>
            <p className="text-sm text-muted-foreground">Upgrade your earning power — bigger deposits, bigger daily rewards.</p>
          </div>
        </div>

        {/* Active VIP banner */}
        {myVip && (
          <Card className="border-border shadow-sm mb-6 overflow-hidden">
            <div className={`bg-gradient-to-r ${PLAN_TIERS[tierOf(myVip.planName)]?.accent || PLAN_TIERS.Gold.accent} p-5 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <div>
                    <p className="font-bold text-lg">{myVip.planName}</p>
                    <p className="text-sm opacity-90">Daily earn: ${Number(myVip.dailyEarnRate || 0).toFixed(2)} • Task reward: ${Number(myVip.taskAmount || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <CalendarDays className="w-4 h-4" />
                    <p className="font-bold text-lg">{daysLeft} days left</p>
                  </div>
                  <p className="text-xs opacity-90">Valid until {new Date(myVip.validUntil).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                Your VIP tasks are now paying at the VIP rate. Complete your daily VIP tasks in the Task page.
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-primary" />
          Free task (30s video) earnings are credited to the platform admin account. VIP tasks pay the plan reward directly to you.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan: any) => {
              const isElite = plan.status === "not_yet_active";
              const tier = tierOf(plan.name);
              const isOwned = myVip && myVip.planName === plan.name;
              return (
                <Card key={plan.id} className={`border-border shadow-sm overflow-hidden transition-transform hover:-translate-y-0.5 ${isOwned ? "ring-2 ring-primary/40" : ""}`}>
                  <div className={`bg-gradient-to-r ${PLAN_TIERS[tier]?.accent || PLAN_TIERS.Gold.accent} p-4 text-white flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5" />
                      <p className="font-bold">{plan.name}</p>
                    </div>
                    {isElite && (
                      <Badge className="bg-white/15 text-white border border-white/30 hover:bg-white/25">Not yet active</Badge>
                    )}
                    {isOwned && (
                      <Badge className="bg-white/15 text-white border border-white/30 hover:bg-white/25">Active</Badge>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold">${Number(plan.depositAmount).toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">Product Amount</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" /> Daily Earn
                        </span>
                        <span className="font-semibold text-success">${Number(plan.dailyEarnRate).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5" /> Task Amount
                        </span>
                        <span className="font-semibold">${Number(plan.taskAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" /> Validity
                        </span>
                        <span className="font-semibold">{plan.validityDays} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" /> Max daily tasks
                        </span>
                        <span className="font-semibold">{plan.maxDailyTasks}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePurchase(plan)}
                      disabled={purchasing === plan.id || isElite || isOwned}
                      className="w-full h-10 font-semibold"
                    >
                      {purchasing === plan.id ? (
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      ) : isOwned ? (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      ) : isElite ? (
                        <Lock className="w-4 h-4 mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      {isOwned ? "Your plan" : isElite ? "Coming soon" : `Purchase VIP $${Number(plan.depositAmount).toFixed(0)}`}
                    </Button>
                    {!isElite && !isOwned && (
                      <p className="text-[11px] text-muted-foreground text-center">
                        Choose this amount in Recharge and submit your deposit receipt.
                      </p>
                    )}
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
