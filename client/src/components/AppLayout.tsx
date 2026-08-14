import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Home,
  Compass,
  Users,
  UserCircle,
  Award,
  TrendingUp,
  PiggyBank,
  LogOut,
  Menu,
  Bell,
  Bookmark,
  Search,
  Coins,
  Wallet,
  Headset,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Compass, label: "Discover", path: "/tasks" },
  { icon: Users, label: "Team", path: "/referral" },
  { icon: UserCircle, label: "Personal Center", path: "/wallet" },
  { icon: Award, label: "Milestone", path: "/dashboard" },
  { icon: TrendingUp, label: "Upline", path: "/dashboard" },
  { icon: PiggyBank, label: "Savings Jar", path: "/wallet" },
  { icon: Headset, label: "Support Center", path: "/support" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">AI</span>
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight leading-tight">AI COMPUTER PLUS</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] px-1.5 py-px rounded bg-primary/10 text-primary font-semibold">Member</span>
            </div>
          </div>
        )}
      </div>

      {/* Greeting */}
      <div className="px-4 py-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <span>⌄</span>
          <span>{getGreeting()}</span>
          <span className="ml-auto text-xs">›</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.label}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="w-4.5 h-4.5 text-primary flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-4 space-y-1">
        {/* Refer & Earn card */}
        {!sidebarCollapsed && (
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
              onClick={() => navigate("/referral")}
            >
              Save URL
            </Button>
          </div>
        )}

        <button
          onClick={() => navigate("/recharge")}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Wallet className="w-4.5 h-4.5 flex-shrink-0" />
          {!sidebarCollapsed && <span>Recharge</span>}
        </button>

        <button
          onClick={() => navigate("/withdraw")}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Coins className="w-4.5 h-4.5 flex-shrink-0" />
          {!sidebarCollapsed && <span>Withdraw</span>}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          {!sidebarCollapsed && <span>Log out</span>}
        </button>

        {user.role === "admin" && (
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <span className="w-4.5 flex-shrink-0 text-center">⚙</span>
            {!sidebarCollapsed && <span>Admin Panel</span>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-60"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 z-50">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors"
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
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
                />
              </div>

              {/* Notification bell */}
              <button className="relative p-2 hover:bg-accent rounded-lg transition-colors">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              </button>

              {/* User */}
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {(user.username || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium truncate max-w-[100px]">
                  {user.username || "User"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
