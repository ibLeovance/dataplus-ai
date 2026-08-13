import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import {
  Coins,
  Users,
  Copy,
  Share2,
  ArrowLeft,
  MessageCircle,
  Gift,
  TrendingUp,
} from "lucide-react";

export default function Referral() {
  const { user, token, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [referralCode, setReferralCode] = useState("");
  const [myReferrals, setMyReferrals] = useState<any[]>([]);
  const [refLoading, setRefLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      // Fetch referral setup
      fetch("/api/referral/setup", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          setReferralCode(data.referralCode || data.code || "");
        })
        .catch(() => {});

      // Fetch my referrals
      fetch("/api/referral/my-referrals", { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          setMyReferrals(data.referrals || []);
          setRefLoading(false);
        })
        .catch(() => setRefLoading(false));
    }
  }, [user, token]);

  const referralUrl = referralCode ? `${window.location.origin}/?ref=${referralCode}` : "";

  const copyLink = () => {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl);
      toast.success("Referral link copied to clipboard!");
    }
  };

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success("Referral code copied!");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const code = referralCode || "—";
  const totalReferrals = myReferrals.length || 0;
  const totalBonus = myReferrals.reduce((sum: number, r: any) => sum + Number(r.bonusEarned || 0), 0);

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Team — Refer & Earn</h1>
        <p className="text-sm text-muted-foreground mb-6">Invite friends and earn 10% bonus on every task they complete.</p>

        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="border-border shadow-sm">
            <CardContent className="p-5 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalReferrals}</p>
              <p className="text-xs text-muted-foreground">Total Referrals</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="p-5 text-center">
              <Gift className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-success">${totalBonus.toFixed(4)}</p>
              <p className="text-xs text-muted-foreground">Bonus Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code & Link */}
        <Card className="border-border shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-base mb-1">Your Referral Code</h3>
              <div className="flex items-center justify-center gap-3 mb-4">
                <code className="text-xl font-bold text-primary tracking-wider">{code}</code>
                <Button size="sm" variant="outline" className="border-primary/30 text-primary" onClick={copyCode}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/50 border border-border mb-4">
              <p className="text-xs text-muted-foreground mb-1">Referral Link:</p>
              <p className="text-sm font-mono text-primary break-all">{referralUrl}</p>
            </div>

            <Button
              onClick={copyLink}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-opacity"
            >
              <Copy className="w-5 h-5 mr-2" />
              Copy Referral Link
            </Button>
          </CardContent>
        </Card>

        {/* Social Share Buttons */}
        <Card className="border-border shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="w-4.5 h-4.5 text-primary" />
              Share on Social Media
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <a href="https://whatsapp.com/channel/0029VbDeCZR0G0XcheBZiT2i" target="_blank" rel="noopener noreferrer">
                <Button className="w-full h-12 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 font-medium">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Join WhatsApp Channel
                </Button>
              </a>
              <Button
                className="w-full h-12 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-medium"
                onClick={copyLink}
              >
                <Copy className="w-5 h-5 mr-2" />
                Copy Your Referral Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4.5 h-4.5 text-primary" />
              Referral History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {refLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : myReferrals && myReferrals.length > 0 ? (
              <div className="space-y-3">
                {myReferrals.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.referredUserName || "User"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={r.status === "earned" ? "border-success/30 text-success" : "border-warning/30 text-warning"}>
                        {r.status}
                      </Badge>
                      <span className="text-sm font-medium text-success">+${Number(r.bonusEarned).toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-sm mb-2">No referrals yet.</p>
                <p className="text-xs">Share your link to start earning referral bonuses!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
