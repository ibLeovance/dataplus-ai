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

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

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
