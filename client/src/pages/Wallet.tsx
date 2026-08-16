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
  Wallet as WalletIcon2,
  Coins,
  Bitcoin,
  DollarSign,
  CheckCircle2,
  ArrowLeft,
  Lock,
  ShieldCheck,
  Clock,
  XCircle,
  ListChecks,
} from "lucide-react";

const walletIcons: Record<string, any> = {
  BTC: Bitcoin,
  USDT: DollarSign,
  TRX: Coins,
};

export default function Wallet() {
  const { user, token, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [btcAddress, setBtcAddress] = useState(user?.btcAddress || "");
  const [usdtAddress, setUsdtAddress] = useState(user?.usdtAddress || "");
  const [trxAddress, setTrxAddress] = useState(user?.trxAddress || "");
  const [saving, setSaving] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [pinFetched, setPinFetched] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMode, setPinMode] = useState<"create" | "change">("create");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetch("/api/auth/my-pin", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => (r.ok ? r.json() : Promise.resolve({ pin: "" })))
        .then(d => {
          setCurrentPin(d.pin || "");
          setPinMode(d.pin ? "change" : "create");
          setPinFetched(true);
        })
        .catch(() => setPinFetched(true));
      fetch("/api/withdrawals/my", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(wd => setWithdrawals((wd.withdrawals || []).slice(0, 10)))
        .catch(() => {});
    }
  }, [user, token]);

  const handleSave = async () => {
    if (!btcAddress.trim() && !usdtAddress.trim() && !trxAddress.trim()) {
      toast.error("Please enter at least one wallet address");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ btcAddress: btcAddress.trim(), usdtAddress: usdtAddress.trim(), trxAddress: trxAddress.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success("Wallet addresses updated successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-bold mb-1">Personal Center</h1>
        <p className="text-sm text-muted-foreground mb-6">Set your crypto wallet addresses to receive payouts.</p>

        {/* Update Form */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <WalletIcon2 className="w-4.5 h-4.5 text-primary" />
              Wallet Addresses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* BTC */}
            <div className="space-y-2">
              <Label>Bitcoin (BTC)</Label>
              <Input
                placeholder="bc1q... or 1A1z..."
                value={btcAddress}
                onChange={(e) => setBtcAddress(e.target.value)}
                className="bg-secondary/50 border-border font-mono"
              />
              <p className="text-xs text-muted-foreground">Enter your BTC wallet address.</p>
            </div>

            {/* USDT */}
            <div className="space-y-2">
              <Label>Tether (USDT - BNB/BSC)</Label>
              <Input
                placeholder="0x..."
                value={usdtAddress}
                onChange={(e) => setUsdtAddress(e.target.value)}
                className="bg-secondary/50 border-border font-mono"
              />
              <p className="text-xs text-muted-foreground">Enter your USDT address (BNB Smart Chain / BSC).</p>
            </div>

            {/* TRX */}
            <div className="space-y-2">
              <Label>TRON (TRX)</Label>
              <Input
                placeholder="T..."
                value={trxAddress}
                onChange={(e) => setTrxAddress(e.target.value)}
                className="bg-secondary/50 border-border font-mono"
              />
              <p className="text-xs text-muted-foreground">Enter your TRX wallet address.</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-opacity"
            >
              {saving ? (
                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              Save Wallet Addresses
            </Button>
          </CardContent>
        </Card>

        {/* Withdraw PIN */}
        <Card className="border-border shadow-sm mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="w-4.5 h-4.5 text-primary" />
              {pinMode === "create" ? "Create Withdraw PIN" : "Change Withdraw PIN"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Your Withdraw PIN (4-6 digits) is required for every withdrawal. Keep it secret and never share it.
            </p>
            {pinMode === "change" && (
              <div className="space-y-2">
                <Label>Current PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter current PIN"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, ""))}
                  className="bg-secondary/50 border-border font-mono tracking-widest"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>New PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="4 to 6 digits"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ""))}
                className="bg-secondary/50 border-border font-mono tracking-widest"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Repeat new PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ""))}
                className="bg-secondary/50 border-border font-mono tracking-widest"
              />
            </div>
            <Button
              onClick={async () => {
                if (!pinFetched) { toast.error("Please wait, loading..."); return; }
                if (pinMode === "change" && currentPin !== (newPin || "").padEnd(0) && currentPin === "") {
                  // fallback handled below
                }
                if (newPin.length < 4 || newPin.length > 6) {
                  toast.error("PIN must be 4 to 6 digits");
                  return;
                }
                if (newPin !== confirmPin) {
                  toast.error("PINs do not match");
                  return;
                }
                if (pinMode === "change" && newPin === currentPin) {
                  toast.error("New PIN must differ from current PIN");
                  return;
                }
                setPinSaving(true);
                try {
                  const res = await fetch("/api/auth/my-pin", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ pin: newPin }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed");
                  toast.success(pinMode === "create" ? "Withdraw PIN created!" : "Withdraw PIN changed!");
                  setCurrentPin(newPin);
                  setNewPin("");
                  setConfirmPin("");
                  setPinMode("change");
                } catch (err: any) {
                  toast.error(err.message);
                } finally {
                  setPinSaving(false);
                }
              }}
              disabled={pinSaving || !newPin || !confirmPin || !pinFetched}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {pinSaving ? (
                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
              ) : (
                <ShieldCheck className="w-5 h-5 mr-2" />
              )}
              {pinMode === "create" ? "Create PIN" : "Change PIN"}
            </Button>
          </CardContent>
        </Card>

        {/* Withdrawal Records */}
        <Card className="border-border shadow-sm mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="w-4.5 h-4.5 text-primary" />
              Withdrawal Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No withdrawal records yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {withdrawals.map((w: any) => {
                  const status = (w.status || "pending").toLowerCase();
                  const statusColor =
                    status === "approved" || status === "paid"
                      ? "text-success"
                      : status === "rejected"
                      ? "text-destructive"
                      : "text-warning";
                  const StatusIcon =
                    status === "approved" || status === "paid" ? CheckCircle2 : status === "rejected" ? XCircle : Clock;
                  return (
                    <div key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StatusIcon className={`w-4 h-4 ${statusColor} flex-shrink-0`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{w.currency} — ${Number(w.amount).toFixed(4)}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]">{w.walletAddress}</p>
                          <p className="text-[11px] text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold capitalize ${statusColor} flex-shrink-0`}>{w.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 border-border text-foreground"
              onClick={() => navigate("/withdraw")}
            >
              View all withdrawals
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-border shadow-sm mt-6">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3 text-sm">Supported Currencies</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Bitcoin className="w-5 h-5 text-[#F7931A]" />
                <div>
                  <p className="text-sm font-medium">Bitcoin (BTC)</p>
                  <p className="text-xs text-muted-foreground">Native BTC transfers</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-[#26A17B]" />
                <div>
                  <p className="text-sm font-medium">Tether (USDT)</p>
                  <p className="text-xs text-muted-foreground">USDT on BNB Smart Chain (BSC)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Coins className="w-5 h-5 text-[#FF0013]" />
                <div>
                  <p className="text-sm font-medium">TRON (TRX)</p>
                  <p className="text-xs text-muted-foreground">Native TRX transfers</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
