import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ExternalLink, Copy, ShieldCheck, Clock, Wallet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";

const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbDeCZR0G0XcheBZiT2i";

export default function Support() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [user, isLoading, navigate]);

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
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Support Center</h1>
            <p className="text-sm text-muted-foreground">Contact the platform admin</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Our official support channel is the WhatsApp channel below. All payment proofs,
          withdrawal issues and account questions are handled there.
        </p>

        {/* Official channel card */}
        <Card className="border-primary/30 bg-primary/5 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Official WhatsApp Channel</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This is the only official contact channel of AI COMPUTER PLUS. Do not trust
                  anyone who contacts you outside this channel.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                asChild
                className="flex-1 h-10 bg-[#25D366] text-white hover:bg-[#25D366]/90 font-semibold"
              >
                <a href={WHATSAPP_CHANNEL} target="_blank" rel="noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" /> Open WhatsApp Channel
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </Button>
              <Button
                variant="outline"
                className="h-10 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => {
                  navigator.clipboard.writeText(WHATSAPP_CHANNEL);
                  setCopied(true);
                  toast.success("WhatsApp channel link copied!");
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help topics */}
        <div className="space-y-3">
          {[
            {
              icon: Wallet,
              title: "Recharge / Deposit Issues",
              desc: "After sending payment to the admin wallet, join the WhatsApp channel and send your transaction hash so your balance can be credited.",
            },
            {
              icon: CheckCircle2,
              title: "Withdrawal Problems",
              desc: "Submit your withdrawal request in the app, then notify the channel with your withdrawal ID if it is not processed in time.",
            },
            {
              icon: Clock,
              title: "Task Rewards Not Credited",
              desc: "If a completed task reward is delayed, share the task name and your username on the WhatsApp channel.",
            },
          ].map((item, i) => (
            <Card key={i} className="border-border shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          AI COMPUTER PLUS works only through the official WhatsApp channel. No other account
          represents the platform.
        </p>
      </div>
    </AppLayout>
  );
}
