import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  ClipboardCheck,
  Wallet,
  Briefcase,
  TrendingUp,
  Activity,
  Anchor,
  Waves,
  BarChart3,
  LineChart,
  Scale,
  Target,
  BookOpen,
  RefreshCw,
} from "lucide-react";

const BUSINESS_TERMS = [
  {
    icon: BarChart3,
    title: "Market Overview",
    body: "A summary of how a market is performing at a given time — activity, participation, and volume. Our platform statistics (users, completed tasks, total payouts) form our own market overview.",
  },
  {
    icon: Users,
    title: "Analyst",
    body: "A professional who examines data and publishes findings. On this platform, our Admin Panel analytics act as an analyst — reviewing user activity and task performance.",
  },
  {
    icon: Waves,
    title: "Volatility",
    body: "How fast and how far values move. In markets it describes price swings; in earning platforms it describes how earnings fluctuate with task availability and completion rates.",
  },
  {
    icon: Anchor,
    title: "Resistance",
    body: "A price level where upward movement tends to stall. Understanding resistance teaches discipline: goals should be realistic rather than chasing impossible returns.",
  },
  {
    icon: Target,
    title: "Support",
    body: "A price level where downward movement tends to hold. A steady earnings floor — like our guaranteed task reward amounts — gives users reliable support.",
  },
  {
    icon: LineChart,
    title: "Trend",
    body: "The general direction of movement over time. Consistent task completion builds a positive earnings trend; one-off bursts rarely sustain growth.",
  },
  {
    icon: Activity,
    title: "Liquidity",
    body: "How easily value can be moved or accessed. A platform with prompt withdrawal processing provides healthy liquidity for its users.",
  },
  {
    icon: TrendingUp,
    title: "ROI (Educational)",
    body: "Return on Investment measures gain relative to cost: ROI = (gain − cost) ÷ cost × 100%. Always ask whether a claimed ROI is backed by real, verifiable activity — if it is promised without work, treat it with caution.",
  },
  {
    icon: Scale,
    title: "Risk & Reward",
    body: "Every earning decision balances risk and reward. Our model keeps risk near zero: you spend time on tasks, and rewards are paid after admin approval — no upfront investment required.",
  },
];

function fmtUsd(n: string | number | null | undefined): string {
  const v = Number(n || 0);
  if (isNaN(v)) return "$0.00";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n: number | null | undefined): string {
  const v = Number(n || 0);
  if (isNaN(v)) return "0";
  return v.toLocaleString("en-US");
}

export default function Marketplace() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace-stats");
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const cards = stats
    ? [
        { icon: Users, label: "Total Users", value: fmtNum(stats.totalUsers), tint: "from-primary/15 to-primary/5" },
        { icon: ClipboardCheck, label: "Tasks Completed", value: fmtNum(stats.completedTasks), tint: "from-emerald-500/15 to-emerald-500/5" },
        { icon: Wallet, label: "Withdrawals Paid", value: fmtNum(stats.totalWithdrawals), tint: "from-blue-500/15 to-blue-500/5" },
        { icon: TrendingUp, label: "Total Payouts", value: fmtUsd(stats.totalPayouts), tint: "from-amber-500/15 to-amber-500/5" },
        { icon: Briefcase, label: "Active Tasks", value: fmtNum(stats.activeTasks), tint: "from-purple-500/15 to-purple-500/5" },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Marketplace — AI COMPUTER PLUS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live business statistics from our platform — real data, updated on refresh.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh stats
        </button>
      </div>

      {/* Stats grid */}
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.tint} flex items-center justify-center mb-3`}>
                <c.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className="text-xl font-bold tracking-tight">{c.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-muted mb-3" />
              <div className="h-3 w-20 rounded bg-muted mb-2" />
              <div className="h-6 w-14 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* Business terms guide */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Business & Market Terms</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUSINESS_TERMS.map((t) => (
            <div key={t.title} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <t.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{t.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        All figures above are computed live from platform records. AI COMPUTER PLUS never displays fabricated numbers.
      </p>
    </div>
  );
}
