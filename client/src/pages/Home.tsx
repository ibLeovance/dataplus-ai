import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  MonitorPlay,
  Share2,
  ClipboardCheck,
  Users,
  Wallet,
  TrendingUp,
  ArrowRight,
  Bitcoin,
  DollarSign,
  Coins,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Globe,
  Star,
  Bookmark,
  Bell,
  Search,
  Menu,
  LogIn,
  UserPlus,
  Home as HomeIcon,
  Compass,
  UserCircle,
  Award,
  PiggyBank,
  LogOut,
  Copy,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const taskTypes = [
  {
    icon: MonitorPlay,
    title: "Watch Videos",
    description: "Watch short videos from our partners and earn rewards instantly.",
    reward: "$0.05 - $0.50",
  },
  {
    icon: Share2,
    title: "Share Links",
    description: "Share referral links on social media and earn for every click.",
    reward: "$0.10 - $1.00",
  },
  {
    icon: ClipboardCheck,
    title: "Answer Surveys",
    description: "Complete short surveys and get paid for your valuable opinions.",
    reward: "$0.25 - $2.00",
  },
  {
    icon: Users,
    title: "Social Follow",
    description: "Follow social media accounts and earn crypto rewards.",
    reward: "$0.05 - $0.30",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { user, token, isLoading } = useAuth();
  const isAuthenticated = !!token && !!user;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Store referral code from URL ?ref=CODE for later use during registration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode && !localStorage.getItem("pendingReferralCode")) {
      localStorage.setItem("pendingReferralCode", refCode);
    }

    // Redirect authenticated users to dashboard
    if (isAuthenticated && user) {
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated, user]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const landingNavItems = [
    { icon: HomeIcon, label: "Home", action: () => {} },
    { icon: Compass, label: "Discover", action: () => document.getElementById("tasks")?.scrollIntoView({ behavior: "smooth" }) },
    { icon: UserCircle, label: "Personal Center", action: () => isAuthenticated ? window.location.href = "/dashboard" : window.location.href = "/login" },
    { icon: Award, label: "Milestone", action: () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }) },
    { icon: PiggyBank, label: "Savings Jar", action: () => isAuthenticated ? window.location.href = "/wallet" : window.location.href = "/login" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <aside className="hidden md:flex flex-col w-56 h-screen sticky top-0 border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-sm">AI</span>
          </div>
          <span className="font-bold text-base tracking-tight">AI COMPUTER PLUS</span>
        </div>

        {/* Greeting */}
        <div className="px-4 py-3">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
            <span>⌄</span>
            <span>{getGreeting()}</span>
            <span className="ml-auto text-xs">›</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {landingNavItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <item.icon className="w-4.5 h-4.5 text-primary flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-4 space-y-1">
          {/* Refer & Earn card */}
          <div className="mx-2 mb-3 p-3 rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-sm">💰</span>
              </div>
              <span className="text-xs font-semibold">Refer & Earn</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Invite your friends to earn by completing tasks
            </p>
            <Button
              size="sm"
              className="w-full h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCopyUrl}
            >
              {copied ? "✓ Copied!" : "Save URL"}
            </Button>
          </div>

          <button
            onClick={() => window.location.href = "/login"}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
          >
            <LogIn className="w-4.5 h-4.5 flex-shrink-0" />
            <span>Sign In</span>
          </button>

          <button
            onClick={() => window.location.href = "/login"}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
          >
            <UserPlus className="w-4.5 h-4.5 flex-shrink-0" />
            <span>Register</span>
          </button>
        </div>
      </aside>

      {/* Mobile nav toggle */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-56 z-50 border-r border-border bg-sidebar">
            <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">AI</span>
              </div>
              <span className="font-bold text-base">AI COMPUTER PLUS</span>
            </div>
            <nav className="px-2 py-2 space-y-0.5">
              {landingNavItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setMobileNavOpen(false); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  <item.icon className="w-4.5 h-4.5 text-primary flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="px-2 pb-4">
              <button
                onClick={() => window.location.href = "/login"}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-primary font-medium"
              >
                <LogIn className="w-4.5 h-4.5" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="md:hidden p-2 hover:bg-accent rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Bookmark banner */}
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg bookmark-banner border border-primary/20">
                <Bookmark className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold">Bookmark us</p>
                  <p className="text-[10px] text-muted-foreground">
                    Bookmark this site for easy access next time
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-4 h-7 text-xs bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  onClick={handleCopyUrl}
                >
                  {copied ? "✓ Saved" : "Save URL"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
                />
              </div>
              <button className="p-2 hover:bg-accent rounded-lg relative">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          {/* Hero */}
          <section className="mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div>
                <Badge className="mb-3 px-3 py-1 text-xs font-medium bg-primary/10 text-primary border-primary/20">
                  <Star className="w-3 h-3 mr-1" />
                  Simple tasks, real rewards
                </Badge>
                <h1 className="text-3xl lg:text-4xl font-bold mb-3">
                  Earn Crypto by <span className="text-gradient">Completing Tasks</span>
                </h1>
                <p className="text-muted-foreground text-base max-w-xl">
                  Complete simple online tasks and get paid directly to your crypto wallet in BTC, USDT, or TRX.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button
                size="lg"
                onClick={() => window.location.href = "/login"}
                className="h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                Start Earning Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <a href="#tasks">
                <Button size="lg" variant="outline" className="h-11 px-6 border-primary/30 text-primary hover:bg-primary/5">
                  Learn More
                </Button>
              </a>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <Wallet className="w-6 h-6 text-primary mx-auto mb-1" />
                <div className="text-xs font-semibold">BTC, USDT & TRX</div>
                <div className="text-[10px] text-muted-foreground">Payout options</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <ShieldCheck className="w-6 h-6 text-primary mx-auto mb-1" />
                <div className="text-xs font-semibold">Verified Tasks</div>
                <div className="text-[10px] text-muted-foreground">Admin-reviewed</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-card border border-border">
                <Users className="w-6 h-6 text-primary mx-auto mb-1" />
                <div className="text-xs font-semibold">Referral Bonus</div>
                <div className="text-[10px] text-muted-foreground">10% per referral</div>
              </div>
            </div>
          </section>

          {/* Crypto supported */}
          <section className="mb-8 py-4 border-y border-border">
            <p className="text-center text-sm text-muted-foreground mb-4">Get paid in your preferred cryptocurrency</p>
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <Bitcoin className="w-6 h-6 text-[#F7931A]" />
                <span className="font-semibold text-sm">Bitcoin</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-[#26A17B]" />
                <span className="font-semibold text-sm">USDT</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-[#FF0013]" />
                <span className="font-semibold text-sm">TRX</span>
              </div>
            </div>
          </section>

          {/* Hot news / Tasks */}
          <section id="tasks" className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-xl font-bold">Hot Tasks</h2>
              <div className="flex gap-2">
                <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted">Popular</span>
                <span className="text-xs text-muted-foreground px-3 py-1 rounded-full">Latest</span>
                <span className="text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground">All</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {taskTypes.map((task) => (
                <Card key={task.title} className="hover:shadow-md transition-shadow border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <task.icon className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                        {task.reward}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{task.title}</h3>
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Hot news (echoeffect-style column rows) */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Hot News</h2>
            <Card className="border-border shadow-sm">
              <CardContent className="p-0">
                {/* Column headers */}
                <div className="grid grid-cols-[48px_1fr_90px_90px_90px_90px] items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                  <span className="text-center">#</span>
                  <span>Article</span>
                  <span className="text-center">Views</span>
                  <span className="text-center">Likes</span>
                  <span className="text-center">Favorites</span>
                  <span className="text-center">Reward</span>
                </div>
                {/* Data rows */}
                <div>
                  {[
                    { n: 1, title: "Watch a short video and earn TRX", views: "12,480", likes: "1,204", favs: "856", reward: "$0.05" },
                    { n: 2, title: "Share your referral link on Telegram", views: "9,312", likes: "892", favs: "640", reward: "$0.10" },
                    { n: 3, title: "Complete a quick partner survey", views: "7,845", likes: "741", favs: "523", reward: "$0.25" },
                    { n: 4, title: "Follow the platform news channel", views: "5,621", likes: "632", favs: "412", reward: "$0.02" },
                    { n: 5, title: "Download a partner app and keep it 24h", views: "4,209", likes: "503", favs: "358", reward: "$0.50" },
                  ].map((row) => (
                    <div key={row.n} className="grid grid-cols-[48px_1fr_90px_90px_90px_90px] items-center gap-2 px-4 py-3 border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition-colors">
                      <span className="text-center text-xs font-semibold text-primary">{row.n}</span>
                      <span className="text-sm font-medium truncate">{row.title}</span>
                      <span className="text-center text-xs text-muted-foreground">{row.views}</span>
                      <span className="text-center text-xs text-muted-foreground">{row.likes}</span>
                      <span className="text-center text-xs text-muted-foreground">{row.favs}</span>
                      <span className="text-center text-xs font-semibold text-primary">{row.reward}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* How it works / News */}
          <section id="how-it-works" className="mb-8">
            <h2 className="text-xl font-bold mb-4">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: UserPlus, title: "Create Account", desc: "Sign up for free in seconds." },
                { icon: ClipboardCheck, title: "Choose Tasks", desc: "Browse and pick tasks that suit you." },
                { icon: CheckCircle2, title: "Complete & Submit", desc: "Finish the task and submit proof." },
                { icon: Wallet, title: "Get Paid", desc: "Withdraw to BTC, USDT, or TRX." },
              ].map((item, i) => (
                <div key={item.title} className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
                  <div className="text-2xl font-bold text-primary/20 flex-shrink-0">{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <item.icon className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">News</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: ShieldCheck, title: "Secure & Transparent", desc: "All earnings tracked transparently. No hidden fees." },
                { icon: Zap, title: "Fast Payouts", desc: "Withdrawals processed within 24-48 hours." },
                { icon: TrendingUp, title: "Referral Bonus", desc: "Earn 10% bonus when your referrals complete tasks." },
                { icon: Globe, title: "Worldwide Access", desc: "Available to users from all countries." },
              ].map((feature) => (
                <Card key={feature.title} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold mb-0.5">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>© 2026 AI Computer Plus. All rights reserved.</span>
            <span>Earn BTC • USDT • TRX</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
