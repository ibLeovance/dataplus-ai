import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import {
  Banknote,
  Copy,
  ScanLine,
  ShieldCheck,
  Wallet,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  History,
} from "lucide-react";

interface AdminWallets {
  trxAddress: string;
  btcAddress: string;
  bnbAddress: string;
  minWithdrawal?: number;
}

const coinMeta: Record<string, { label: string; sub: string; color: string }> = {
  TRX: { label: "USDT", sub: "Tron Network (TRC-20)", color: "text-primary" },
  BTC: { label: "BTC", sub: "Bitcoin Network", color: "text-primary" },
  BNB: { label: "BNB", sub: "BSC Network (BEP-20)", color: "text-primary" },
};

export default function Recharge() {
  const { user, token, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [wallets, setWallets] = useState<AdminWallets | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number | null>(5);
  const [method, setMethod] = useState<string>("TRX");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            bnbAddress: data?.bnb || data?.usdt || "",
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

  useEffect(() => {
    if (user) {
      fetch("/api/recharges/my", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : Promise.resolve({ recharges: [] })))
        .then((data) => {
          const rows = (data.recharges || []).sort(
            (a: any, b: any) =>
              new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()
          );
          setHistory(rows);
          setHistoryLoading(false);
        })
        .catch(() => setHistoryLoading(false));
    }
  }, [user, token]);

  const onPickReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG/JPG)");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Receipt image is too large (max 5MB)");
      return;
    }
    setReceiptFile(f);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const onSubmit = async () => {
    if (!amount || amount < 5) {
      toast.error("Please choose a deposit amount (minimum $5)");
      return;
    }
    if (!receiptFile) {
      toast.error("Please upload your payment receipt image");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/recharges", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount,
          paymentMethod: method,
          txRef: "",
          receiptBase64: (receiptPreview || "").split(",")[1] || "",
          receiptMime: receiptFile.type || "image/png",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      toast.success("Deposit Submitted — Processing. Our AI verification system is reviewing your receipt automatically.");
      setReceiptFile(null);
      setReceiptPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const my = await fetch("/api/recharges/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const jd = await my.json();
      setHistory(
        ((jd.recharges || []) as any[]).sort(
          (a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()
        )
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
        </Badge>
      );
    if (s === "rejected")
      return (
        <Badge className="bg-red-100 text-red-700 border border-red-200 hover:bg-red-100">
          <XCircle className="w-3 h-3 mr-1" /> Rejected
        </Badge>
      );
    return (
      <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">
        <Clock className="w-3 h-3 mr-1" /> Pending
      </Badge>
    );
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
    if (wallets.bnbAddress) rows.push({ coin: "BNB", address: wallets.bnbAddress });
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
            <p className="text-sm text-muted-foreground">Deposit crypto, upload your receipt — admin reviews within minutes</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Scan the QR code or copy the address below to send payment to the admin wallets, then upload your payment receipt to complete the deposit.
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

        {/* Deposit form */}
        <Card className="border-border shadow-sm mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Submit Deposit Receipt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Choose amount</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[5, 50, 100, 300, 500, 1000].map((v) => (
                  <Button
                    key={v}
                    variant={amount === v ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(v)}
                    className={`h-10 font-semibold ${amount === v ? "" : "border-border text-foreground"}`}
                  >
                    ${v}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Payment wallet used</p>
              <div className="flex gap-2">
                {rows.map(({ coin }) => {
                  const meta = coinMeta[coin] || { label: coin };
                  return (
                    <Button
                      key={coin}
                      variant={method === coin ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMethod(coin)}
                      className={`h-10 font-semibold ${method === coin ? "" : "border-border text-foreground"}`}
                    >
                      {meta.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Payment receipt (image)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onPickReceipt}
                className="hidden"
              />
              {receiptPreview ? (
                <div className="relative rounded-lg border border-border overflow-hidden max-w-[240px]">
                  <img src={receiptPreview} alt="Receipt preview" className="w-full" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-1 right-1 h-7 bg-background/90 text-xs border-border"
                    onClick={() => {
                      setReceiptFile(null);
                      setReceiptPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-sm font-medium">Upload receipt screenshot</span>
                    <span className="text-[11px]">PNG/JPG, max 5MB</span>
                  </div>
                </Button>
              )}
            </div>
            <Button
              size="lg"
              onClick={onSubmit}
              disabled={submitting || !amount || !receiptFile}
              className="w-full h-12 font-semibold"
            >
              {submitting ? (
                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
              ) : (
                <Upload className="w-5 h-5 mr-2" />
              )}
              Submit Deposit — ${amount || 0}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Your deposit stays pending until admin reviews the receipt. Approved deposits are credited to your balance.
            </p>
          </CardContent>
        </Card>

        {/* Recharge history */}
        <Card className="border-border shadow-sm mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> My Recharge History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !history.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recharge records yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {history.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold">${Number(r.amount || 0).toFixed(2)} · {r.coin || "TRX"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(r.createdAt || r.created_at).toLocaleString()}
                      </p>
                    </div>
                    {statusBadge(r.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
              "Return here, pick the same amount and wallet, upload your receipt image and submit.",
              "Admin reviews your receipt — approved deposits are credited to your balance.",
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
