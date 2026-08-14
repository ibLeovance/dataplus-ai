import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MapPin, Mail, KeyRound } from "lucide-react";
import { useLocation } from "wouter";
import { LogIn, UserPlus } from "lucide-react";
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

export default function Login() {
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", referralCode: "", phoneNumber: "", country: "" });

  // Prefill the upline referral code from the ?ref= query parameter (or stored ref)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      const code = ref.trim().toUpperCase();
      setForm((f) => ({ ...f, referralCode: code }));
      localStorage.setItem("uplineRef", code);
    } else {
      const stored = localStorage.getItem("uplineRef");
      if (stored) setForm((f) => (f.referralCode ? f : { ...f, referralCode: stored }));
    }
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(
          form.username,
          form.email,
          form.password,
          form.referralCode || undefined,
          form.phoneNumber || undefined,
          form.country || undefined
        );
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-foreground font-bold text-lg">AI</span>
          </div>
          <CardTitle className="text-2xl">AI COMPUTER PLUS</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                className="pl-9"
              />
              </div>
            )}
            {!isLogin && (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                type="tel"
                placeholder="Phone Number (e.g. +234 801 234 5678)"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                required
                className="pl-9"
              />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="pl-9"
            />
            </div>
              {!isLogin && (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })} required>
                <SelectTrigger className="w-full bg-background text-foreground">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            )}
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              className="pl-9"
            />
            </div>
            {!isLogin && (
              <div>
                <Input
                  placeholder="Referral Code (Upline)"
                  value={form.referralCode}
                  onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })}
                  className="border-primary/30"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Enter the code of the person who invited you — you both earn 10% of each other's rewards.
                </p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? (
                <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Register</>
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
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
    </div>
  );
}
