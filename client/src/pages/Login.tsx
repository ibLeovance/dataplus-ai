import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MapPin, Mail, KeyRound, UserRound, ShieldCheck, Loader2, LogIn as LogInIcon, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica","Croatia","Cuba","Cyprus","Czechia",
  "Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
  "Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Guadeloupe",
  "Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar (Burma)",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman",
  "Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe",
];

/**
 * Single-step authentication (Round 13).
 * Login:  email + phone number + password on one page.
 * Register: username + country + phone + email + password on one page (no upline/referral field).
 */
export default function Login() {
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    phoneNumber: "",
    country: "",
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const formValid = (): boolean => {
    if (isLogin) {
      return /^\S+@\S+\.\S+$/.test(form.email) && form.password.length >= 6;
    }
    const p = form.phoneNumber.replace(/[\s\-()]/g, "");
    return (
      form.username.trim().length >= 3 &&
      form.country.length > 1 &&
      p.length >= 6 &&
      /^\+?[0-9]+$/.test(p) &&
      /^\S+@\S+\.\S+$/.test(form.email) &&
      form.password.length >= 6
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid()) {
      toast.error("Please complete all required fields correctly.");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form.username.trim(), form.email, form.password, undefined, form.phoneNumber, form.country);
      }
      toast.success(isLogin ? "Welcome back to AI COMPUTER PLUS" : "Account created — welcome aboard!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Luxury hero backdrop */}
      <div className="luxury-hero absolute inset-x-0 top-0 h-64 -z-10" />
      <div className="absolute inset-0 pointer-events-none -z-10" aria-hidden>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 -left-24 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md stagger-1 animate-in-up">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img
              src="/aicp-logo.png"
              alt="AI COMPUTER PLUS logo"
              className="w-24 h-24 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-display font-semibold text-foreground">AI COMPUTER PLUS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Sign in securely to your account" : "Join the premium earning platform"}
          </p>
        </div>

        <Card className="card-lux">
          <CardContent className="pt-6 pb-6">
            <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-5">
              {isLogin ? "Account Login" : "Create Account"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ---------- LOGIN: single step ---------- */}
              {isLogin && (
                <>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={(e) => set({ email: e.target.value })}
                      required
                      className="pl-9 bg-secondary/50 border-border/50"
                      autoFocus
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="tel"
                      placeholder="Phone number (e.g. +234 801 234 5678)"
                      value={form.phoneNumber}
                      onChange={(e) => set({ phoneNumber: e.target.value })}
                      className="pl-9 bg-secondary/50 border-border/50"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Used to verify it's really you — you can update it anytime in Settings.
                    </p>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => set({ password: e.target.value })}
                      required
                      minLength={6}
                      className="pl-9 bg-secondary/50 border-border/50"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      Your session is protected with bank-grade encryption.
                    </div>
                  </div>
                </>
              )}

              {/* ---------- REGISTER: single step ---------- */}
              {!isLogin && (
                <>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Username"
                      value={form.username}
                      onChange={(e) => set({ username: e.target.value })}
                      required
                      className="pl-9 bg-secondary/50 border-border/50"
                      autoFocus
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                    <Select value={form.country} onValueChange={(v) => set({ country: v })}>
                      <SelectTrigger className="w-full bg-secondary/50 border-border/50 text-foreground">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="tel"
                      placeholder="Phone number (e.g. +234 801 234 5678)"
                      value={form.phoneNumber}
                      onChange={(e) => set({ phoneNumber: e.target.value })}
                      required
                      className="pl-9 bg-secondary/50 border-border/50"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={(e) => set({ email: e.target.value })}
                      required
                      className="pl-9 bg-secondary/50 border-border/50"
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="Password (min 6 characters)"
                      value={form.password}
                      onChange={(e) => set({ password: e.target.value })}
                      required
                      minLength={6}
                      className="pl-9 bg-secondary/50 border-border/50"
                    />
                  </div>
                </>
              )}

              {/* ---------- Submit ---------- */}
              <Button type="submit" className="btn-lux w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Please wait...</>
                ) : isLogin ? (
                  <><LogInIcon className="w-4 h-4 mr-2" /> Sign In</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" /> Create Account</>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Register" : "Sign In"}
              </button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          © 2026 AI COMPUTER PLUS — Modern Investment Platform
        </p>
      </div>
    </div>
  );
}
