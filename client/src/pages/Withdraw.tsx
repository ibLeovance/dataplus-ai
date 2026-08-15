import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import {
  Wallet,
  Coins,
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Percent,
} from "lucide-react";
const DEFAULT_MIN_WITHDRAWAL = 5;
const FEE_PCT = 5;
const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "border-warning/30 text-warning", icon: Clock, label: "Pending" },
  processing: { color: "border-primary/30 text-primary", icon: Clock, label: "Processing" },
  approved: { color: "border-chart-2/30 text-chart-2", icon: CheckCircle2, label: "Approved" },
  paid: { color: "border-success/30 text-success", icon: CheckCircle2, label: "Paid" },
  rejected: { color: "border-destructive/30 text-destructive", icon: XCircle, label: "Rejected" },
};

export default function Withdraw() {
  const { user, token, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletType, setWalletType] = useState<string>("USDT");
  const [withdrawPin, setWithdrawPin] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wdLoading, setWdLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pinFetched, setPinFetched] = useState(false);
  const [minWithdrawal] = useState(DEFAULT_MIN_WITHDRAWAL);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetch("/api/auth/overview", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setOverview(data.overview))
        .catch(() => {});
      fetch("/api/auth/my-pin", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => (r.ok ? r.json() : Promise.resolve({ pin: "" })))
        .then(d => { setWithdrawPin(d.pin || ""); setPinFetched(true); })
        .catch(() => setPinFetched(true));
      fetch("/api/withdrawals/my", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(wd => { setWithdrawals(wd.withdrawals || []); setWdLoading(false); })
        .catch(() => setWdLoading(false));
    }
  }, [user, token]);

  const amt = parseFloat(amount) || 0;
  const fee = amt * (FEE_PCT / 100);
  const netAmount = amt - fee;
  const balance = Number(overview?.availableBalance || 0);
  const canWithdraw = balance >= minWithdrawal;

  const handleSubmit = async () => {
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum < minWithdrawal) {
      toast.error(`Minimum withdrawal is $${minWithdrawal}`);
      return;
    }
    if (amtNum > balance) {
      toast.error("Insufficient balance");
      return;
    }
    if (walletAddress.trim().length < 10) {
      toast.error("Please enter a valid wallet address");
      return;
    }
    // Withdraw PIN requirement (set yours in Personal Center if not set yet)
    const digits = withdrawPin.replace(/[^0-9]/g, "");
    if (digits.length < 4 || digits.length > 6) {
      toast.error("Please enter your 4-6 digit Withdraw PIN (set it in Personal Center first)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amtNum,
          walletAddress: walletAddress.trim(),
          currency: walletType,
          pin: digits,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");
      toast.success(`Withdrawal submitted! Fee ${FEE_PCT}% ($${fee.toFixed(4)}). Net payout: $${netAmount.toFixed(4)}. Funds arrive within 10 minutes.`);
      setAmount("");
      fetch("/api/auth/overview", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(d => setOverview(d.overview))
        .catch(() => {});
      fetch("/api/withdrawals/my", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(wd => setWithdrawals(wd.withdrawals || []))
        .catch(() => {});
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

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Withdraw Funds</h1>
        <p className="text-sm text-muted-foreground mb-6">Request a payout to your crypto wallet.</p>

        {/* Balance Card */}
        <Card className="border-border shadow-sm mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold text-success">${balance.toFixed(4)}</p>
                </div>
              </div>
              {!canWithdraw && (
                <Badge variant="outline" className="border-warning/30 text-warning">
                  Min: ${minWithdrawal.toFixed(2)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card className="border-border shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="w-4.5 h-4.5 text-primary" />
              New Withdrawal Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                step="0.0001"
                min="0.01"
                placeholder={`Min: $${minWithdrawal.toFixed(2)}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-secondary/50 border-border text-lg font-mono"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Balance: ${balance.toFixed(4)}</span>
                <span>Min: ${minWithdrawal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cryptocurrency</Label>
              <Select value={walletType} onValueChange={setWalletType}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="USDT">Tether (USDT — TRC-20)</SelectItem>
                  <SelectItem value="TRX">TRON (TRX — TRC-20)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input
                placeholder="Enter your wallet address..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="bg-secondary/50 border-border font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Withdraw PIN (required)
              </Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter your 4-6 digit PIN"
                value={withdrawPin}
                onChange={(e) => setWithdrawPin(e.target.value.replace(/[^0-9]/g, ""))}
                className="bg-secondary/50 border-border font-mono tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                You must enter your Withdraw PIN before withdrawing. Set or change it in Personal Center.
              </p>
            </div>

            {/* Fee summary */}
            {amt > 0 && (
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" /> Withdrawal fee ({FEE_PCT}%)
                  </span>
                  <span className="font-mono">-${fee.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-border/50">
                  <span>You will receive</span>
                  <span className="text-success font-mono">${netAmount.toFixed(4)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Payouts are processed automatically and arrive in your wallet exchange account within 10 minutes.
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !canWithdraw}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-opacity disabled:opacity-50"
            >
              {submitting ? (
                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
              ) : (
                <Wallet className="w-5 h-5 mr-2" />
              )}
              Request Withdrawal
            </Button>

            {!canWithdraw && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  You need at least ${minWithdrawal.toFixed(2)} to make a withdrawal. Keep completing tasks to reach the minimum!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {wdLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : withdrawals && withdrawals.length > 0 ? (
              <div className="space-y-3">
                {withdrawals.map((w: any) => {
                  const config = statusConfig[w.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <div key={w.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                          <StatusIcon className={`w-4 h-4 ${config.color.split(" ")[1]}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{w.currency} — ${Number(w.amount).toFixed(4)}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{w.walletAddress}</p>
                          <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={config.color}>
                        {config.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-sm">No withdrawals yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
