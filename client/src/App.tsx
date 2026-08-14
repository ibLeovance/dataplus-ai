import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import About from "@/pages/About";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import TaskDetail from "./pages/TaskDetail";
import Wallet from "./pages/Wallet";
import Withdraw from "./pages/Withdraw";
import Recharge from "./pages/Recharge";
import VipTask from "./pages/VipTask";
import Referral from "@/pages/Referral";
import Support from "./pages/Support";
import Marketplace from "./pages/Marketplace";
import AdminPanel from "./pages/AdminPanel";
import AdminLogin from "./pages/AdminLogin";
import Login from "./pages/Login";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

function MarketplaceGuard() {
  const { user, token } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  return <Marketplace />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/tasks"} component={Tasks} />
      <Route path={"/tasks/:id"} component={TaskDetail} />
      <Route path={"/vip"} component={VipTask} />
      <Route path={"/wallet"} component={Wallet} />
      <Route path={"/withdraw"} component={Withdraw} />
      <Route path={"/recharge"} component={Recharge} />
      <Route path={"/referral"} component={Referral} />
      <Route path={"/support"} component={Support} />
      <Route path={"/about"} component={About} />
      <Route path={"/marketplace"} component={MarketplaceGuard} />
      <Route path={"/admin-login"} component={AdminLogin} />
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
