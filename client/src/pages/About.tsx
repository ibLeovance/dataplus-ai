import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  Sparkles,
  ShieldCheck,
  Globe,
  Users,
  Coins,
  TrendingUp,
  Crown,
  Loader2,
} from "lucide-react";

export default function About() {
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/marketplace-stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => undefined);
  }, []);

  const pillars = [
    {
      icon: Sparkles,
      title: "AI-Powered Earning",
      body: "Tasks are curated and matched to you by our AI engine — watch videos, share links, answer surveys and earn in real crypto, with rewards calculated instantly.",
    },
    {
      icon: ShieldCheck,
      title: "Bank-Grade Security",
      body: "Every session, deposit and withdrawal is protected with encrypted connections, IP-pinned rate limiting and admin-reviewed receipts — your funds stay yours.",
    },
    {
      icon: Users,
      title: "Team Growth Engine",
      body: "Invite your upline and downline with a unique referral link. Earn 10% of everything your referrals complete — forever.",
    },
    {
      icon: Globe,
      title: "Global Community",
      body: "Members from every continent earn in BTC, USDT and TRX. Deposit from as little as $5 — no hidden fees, no gimmicks.",
    },
  ];

  const realStats = [
    { icon: Users, label: "Registered Users", value: stats?.totalUsers ?? "—" },
    { icon: Coins, label: "Tasks Completed", value: stats?.completedTasks ?? "—" },
    { icon: TrendingUp, label: "Withdrawals Paid", value: stats?.totalWithdrawals ?? "—" },
    { icon: Globe, label: "Total Payouts", value: stats?.totalPayouts ? `$${parseFloat(stats.totalPayouts).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button className="flex items-center gap-2.5" onClick={() => navigate("/")}>
            <img src="/aicp-logo.png" alt="AI COMPUTER PLUS logo" className="w-10 h-10 object-contain" />
            <span className="font-display font-semibold">AI COMPUTER PLUS</span>
          </button>
          <button
            onClick={() => navigate("/login")}
            className="btn-lux text-sm px-4 h-9"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src="/aicp-hero.jpg"
          alt="AI COMPUTER PLUS hero"
          className="absolute inset-0 w-full h-full object-cover -z-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(200,16,46,0.82)] via-[rgba(200,16,46,0.72)] to-[rgba(30,15,20,0.85)] -z-10" />
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-28 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary-foreground text-[11px] uppercase tracking-[0.2em] mb-5">
            <Crown className="w-3.5 h-3.5" /> Modern Investment Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-semibold text-primary-foreground leading-tight stagger-1 animate-in-up">
            Earn Smarter with AI
          </h1>
          <p className="text-primary-foreground/85 text-base md:text-lg mt-5 max-w-2xl mx-auto stagger-2 animate-in-up">
            AI COMPUTER PLUS combines artificial intelligence with a transparent earning economy.
            For years, thousands of members have grown their portfolios through simple daily tasks —
            powered by a team that treats your trust as its greatest asset.
          </p>
          <div className="shimmer-line mx-auto mt-8 w-32 stagger-3 animate-in-up" />
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-4 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-3 animate-in-up">
          {realStats.map((s) => (
            <Card key={s.label} className="card-lux">
              <CardContent className="p-4 text-center">
                <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-display font-bold">
                  {s.value === "—" ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /> : s.value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-display font-semibold">Why Members Choose Us</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Built on transparency, security and technology that actually pays.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pillars.map((p, i) => (
            <Card key={p.title} className={`card-lux stagger-${i + 1} animate-in-up`}>
              <CardContent className="p-6">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <p.icon className="w-5.5 h-5.5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Timeline / story */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <Card className="card-lux">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-display font-semibold mb-4">Our Story</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              AI COMPUTER PLUS is a modern digital investment platform, established in <strong className="text-foreground">2026</strong>,
              built on a simple belief: <em>everyone deserves access to online income, powered by technology, not gatekeepers</em>.
              Millions spend hours online every day yet very few earn anything from it — we flip that reality.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Through our <strong className="text-foreground">free task engine</strong>, members watch short 30-second videos and receive
              instant crypto rewards — no deposit required. As the platform grew, we introduced <strong className="text-foreground">VIP Plan
              Funding</strong>: six investment tiers from Bronze ($5) to Diamond ($500), each unlocking premium task rewards,
              daily earning rates, and a funded journey of up to 365 days.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI COMPUTER PLUS is self-funded and investment-driven — every free task completed feeds the platform's operating
              fund, and every VIP purchase sustains premium payouts. From your first task to your biggest portfolio,
              the mission stays simple: <strong className="text-foreground">turn spare minutes into real digital currency.</strong>
            </p>
            <button className="btn-lux mt-6" onClick={() => navigate("/login")}>
              Start Earning Today
            </button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/60 py-6">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          © 2026 AI COMPUTER PLUS · Modern Investment Platform · Founded 2026
        </div>
      </footer>
    </div>
  );
}
