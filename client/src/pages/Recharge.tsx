import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Banknote, Copy, ScanLine, ShieldCheck, Wallet } from "lucide-react";

interface AdminWallets {
  trxAddress: string;
  btcAddress: string;
  usdtAddress: string;
  minWithdrawal?: number;
}

const coinMeta: Record<string, { label: string; sub: string; color: string }> = {
  TRX: { label: "TRX", sub: "Tron Network (TRC-20)", color: "text-primary" },
  BTC: { label: "BTC", sub: "Bitcoin Network", color: "text-primary" },
  USDT: { label: "USDT", sub: "BSC Network (BEP-20)", color: "text-primary" },
};

export default function Recharge() {
  const { user, token, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [wallets, setWallets] = useState<AdminWallets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetch("/api/withdrawals/admin-wallets")
        .then((res) => res.json())
        .then((data) => {
          setWallets({
            btcAddress: data?.btc || "",
            trxAddress: data?.trx || "",
            usdtAddress: data?.usdt || "",
          });
          setLoading(false);
        })
        .catch(() => {
          setWallets(null);
          setLoading(false);
        });
    }
  }, [user]);

  const copyAddress = (address: string, coin: string) => {
    navigator.clipboard.writeText(address);
    toast.success(`${coin} address copied!`);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const rows: { coin: string; address: string }[] = [];
  if (wallets) {
    if (wallets.trxAddress) rows.push({ coin: "TRX", address: wallets.trxAddress });
    if (wallets.btcAddress) rows.push({ coin: "BTC", address: wallets.btcAddress });
    if (wallets.usdtAddress) rows.push({ coin: "USDT", address: wallets.usdtAddress });
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Banknote className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Recharge</h1>
            <p className="text-sm text-muted-foreground">Admin payment wallet addresses</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Scan the QR code or copy the address below to send payment to the admin wallets.
        </p>

        {/* Info banner */}
        <Card className="border-primary/20 bg-primary/5 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-primary">Official Admin Payment Wallets</p>
                <p className="text-xs text-muted-foreground mt-1">
                  These are the platform's verified payment addresses. Always double-check the address before sending crypto — transactions cannot be reversed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet cards */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="border-border shadow-sm">
            <CardContent className="text-center py-12">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No payment wallets configured yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Admin can add addresses in Admin Panel → Settings.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map(({ coin, address }) => {
              const meta = coinMeta[coin] || { label: coin, sub: "", color: "text-primary" };
              return (
                <Card key={coin} className="border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className={`w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center`}>
                        <ScanLine className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      {meta.label} <Badge variant="outline" className="text-xs font-normal">{meta.sub}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="p-3 rounded-xl bg-background border border-border flex-shrink-0">
                        <QRCodeSVG value={address} size={130} level="M" includeMargin={true} />
                      </div>
                      <div className="flex-1 w-full space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                          <p className="text-xs font-mono break-all bg-secondary/50 border border-border rounded-lg p-2.5 select-all">
                            {address}
                          </p>
                        </div>
                        <Button
                          className="w-full h-10 bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                          onClick={() => copyAddress(address, meta.label)}
                        >
                          <Copy className="w-4 h-4 mr-2" /> Copy {meta.label} Address
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* How it works */}
        <Card className="border-border shadow-sm mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How to Recharge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Open your crypto wallet app and choose the network shown above each address.",
              "Tap Copy under the wallet you want to use, then paste it as the recipient.",
              "Enter the amount, confirm and send the payment.",
              "After sending, contact admin on the WhatsApp channel with your transaction hash so your balance can be credited.",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
