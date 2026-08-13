import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
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
  Copy,
  ArrowLeft,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const DEFAULT_MIN_WITHDRAWAL = 5;
const ADMIN_WALLET_TRX = "TKF8qKRjB7XGmwL5fRse1bbgxElWWZisHy4";
const ADMIN_WALLET_BTC = "bc1qae7mq6hmzf7xnq360emehgcthmpyjq0jtj3fct";
const ADMIN_WALLET_USDT = "0x5ECb8F07bb486c1d630e393849e7d5D4aD2608b8";

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "border-warning/30 text-warning", icon: Clock, label: "Pending" },
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
  const [overview, setOverview] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wdLoading, setWdLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [minWithdrawal] = useState(DEFAULT_MIN_WITHDRAWAL);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      // Fetch overview
      fetch("/api/auth/overview", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setOverview(data.overview))
        .catch(() => {});

      // Fetch withdrawals
      fetch("/api/tasks/my-completions", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          // Actually fetch withdrawals from a dedicated endpoint
          fetch("/api/withdrawals", { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.json())
            .then(wd => { setWithdrawals(wd.withdrawals || []); setWdLoading(false); })
            .catch(() => setWdLoading(false));
        })
        .catch(() => setWdLoading(false));
    }
  }, [user, token]);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < minWithdrawal) {
      toast.error(`Minimum withdrawal is $${minWithdrawal}`);
      return;
    }
    const balance = Number(overview?.availableBalance || 0);
    if (amt > balance) {
      toast.error("Insufficient balance");
      return;
    }
    if (walletAddress.trim().length < 10) {
      toast.error("Please enter a valid wallet address");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amt,
          walletAddress: walletAddress.trim(),
          currency: walletType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");
      toast.success("Withdrawal request submitted! You'll be notified once processed.");
      setAmount("");
      // Refresh data
      fetch("/api/auth/overview", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(d => setOverview(d.overview))
        .catch(() => {});
      fetch("/api/withdrawals", { headers: { Authorization: `Bearer ${token}` } })
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

  const balance = Number(overview?.availableBalance || 0);
  const canWithdraw = balance >= minWithdrawal;

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
                  <SelectItem value="USDT">Tether (USDT)</SelectItem>
                  <SelectItem value="TRX">TRON (TRX)</SelectItem>
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

            {/* Admin Payout Wallet Info */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-primary mb-3">Scan QR or Copy — Payment Wallet Addresses:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* TRX */}
                <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-border">
                  <QRCodeSVG value={ADMIN_WALLET_TRX} size={100} level="M" includeMargin={true} />
                  <p className="text-xs font-semibold mt-2 mb-1">TRX (Tron)</p>
                  <p className="text-[10px] text-muted-foreground text-center break-all mb-2 font-mono">{ADMIN_WALLET_TRX}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => { navigator.clipboard.writeText(ADMIN_WALLET_TRX); toast.success("TRX address copied!"); }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                </div>
                {/* BTC */}
                <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-border">
                  <QRCodeSVG value={ADMIN_WALLET_BTC} size={100} level="M" includeMargin={true} />
                  <p className="text-xs font-semibold mt-2 mb-1">BTC (Bitcoin)</p>
                  <p className="text-[10px] text-muted-foreground text-center break-all mb-2 font-mono">{ADMIN_WALLET_BTC}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => { navigator.clipboard.writeText(ADMIN_WALLET_BTC); toast.success("BTC address copied!"); }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                </div>
                {/* USDT */}
                <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-border">
                  <QRCodeSVG value={ADMIN_WALLET_USDT} size={100} level="M" includeMargin={true} />
                  <p className="text-xs font-semibold mt-2 mb-1">USDT (BSC)</p>
                  <p className="text-[10px] text-muted-foreground text-center break-all mb-2 font-mono">{ADMIN_WALLET_USDT}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => { navigator.clipboard.writeText(ADMIN_WALLET_USDT); toast.success("USDT address copied!"); }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                </div>
              </div>
            </div>
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
