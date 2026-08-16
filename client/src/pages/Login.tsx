import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MapPin, Mail, KeyRound, UserRound, ShieldCheck, Loader2, LogIn as LogInIcon, UserPlus, Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/** Country dial-code lookup used by the country dropdown. */
export const COUNTRY_CODES: Record<string, string> = {
  "Afghanistan": "+93", "Albania": "+355", "Algeria": "+213", "Andorra": "+376", "Angola": "+244", "Antigua and Barbuda": "+1268", "Argentina": "+54", "Armenia": "+374", "Australia": "+61", "Austria": "+43", "Azerbaijan": "+994",
  "Bahamas": "+1242", "Bahrain": "+973", "Bangladesh": "+880", "Barbados": "+1246", "Belarus": "+375", "Belgium": "+32", "Belize": "+501", "Benin": "+229", "Bhutan": "+975", "Bolivia": "+591", "Bosnia and Herzegovina": "+387", "Botswana": "+267", "Brazil": "+55", "Brunei": "+673", "Bulgaria": "+359", "Burkina Faso": "+226", "Burundi": "+257",
  "Cabo Verde": "+238", "Cambodia": "+855", "Cameroon": "+237", "Canada": "+1", "Central African Republic": "+236", "Chad": "+235", "Chile": "+56", "China": "+86", "Colombia": "+57", "Comoros": "+269", "Congo (Congo-Brazzaville)": "+242", "Costa Rica": "+506", "Croatia": "+385", "Cuba": "+53", "Cyprus": "+357", "Czechia": "+420",
  "Democratic Republic of the Congo": "+243", "Denmark": "+45", "Djibouti": "+253", "Dominica": "+1767", "Dominican Republic": "+1809",
  "Ecuador": "+593", "Egypt": "+20", "El Salvador": "+503", "Equatorial Guinea": "+240", "Eritrea": "+291", "Estonia": "+372", "Eswatini": "+268", "Ethiopia": "+251",
  "Fiji": "+679", "Finland": "+358", "France": "+33",
  "Gabon": "+241", "Gambia": "+220", "Georgia": "+995", "Germany": "+49", "Ghana": "+233", "Greece": "+30", "Grenada": "+1473", "Guatemala": "+502", "Guinea": "+224", "Guinea-Bissau": "+245", "Guyana": "+592", "Guadeloupe": "+590",
  "Haiti": "+509", "Honduras": "+504", "Hungary": "+36",
  "Iceland": "+354", "India": "+91", "Indonesia": "+62", "Iran": "+98", "Iraq": "+964", "Ireland": "+353", "Israel": "+972", "Italy": "+39", "Ivory Coast": "+225",
  "Jamaica": "+1876", "Japan": "+81", "Jordan": "+962",
  "Kazakhstan": "+7", "Kenya": "+254", "Kiribati": "+686", "Kosovo": "+383", "Kuwait": "+965", "Kyrgyzstan": "+996",
  "Laos": "+856", "Latvia": "+371", "Lebanon": "+961", "Lesotho": "+266", "Liberia": "+231", "Libya": "+218", "Liechtenstein": "+423", "Lithuania": "+370", "Luxembourg": "+352",
  "Madagascar": "+261", "Malawi": "+265", "Malaysia": "+60", "Maldives": "+960", "Mali": "+223", "Malta": "+356", "Marshall Islands": "+692", "Mauritania": "+222", "Mauritius": "+230", "Mexico": "+52", "Micronesia": "+691", "Moldova": "+373", "Monaco": "+377", "Mongolia": "+976", "Montenegro": "+382", "Morocco": "+212", "Mozambique": "+258", "Myanmar (Burma)": "+95",
  "Namibia": "+264", "Nauru": "+674", "Nepal": "+977", "Netherlands": "+31", "New Zealand": "+64", "Nicaragua": "+505", "Niger": "+227", "Nigeria": "+234", "North Korea": "+850", "North Macedonia": "+389", "Norway": "+47",
  "Oman": "+968",
  "Pakistan": "+92", "Palau": "+680", "Palestine": "+970", "Panama": "+507", "Papua New Guinea": "+675", "Paraguay": "+595", "Peru": "+51", "Philippines": "+63", "Poland": "+48", "Portugal": "+351",
  "Qatar": "+974",
  "Romania": "+40", "Russia": "+7", "Rwanda": "+250",
  "Saint Kitts and Nevis": "+1869", "Saint Lucia": "+1758", "Saint Vincent and the Grenadines": "+1784", "Samoa": "+685", "San Marino": "+378", "Sao Tome and Principe": "+239", "Saudi Arabia": "+966", "Senegal": "+221", "Serbia": "+381", "Seychelles": "+248", "Sierra Leone": "+232", "Singapore": "+65", "Slovakia": "+421", "Slovenia": "+386", "Solomon Islands": "+677", "Somalia": "+252", "South Africa": "+27", "South Korea": "+82", "South Sudan": "+211", "Spain": "+34", "Sri Lanka": "+94", "Sudan": "+249", "Suriname": "+597", "Sweden": "+46", "Switzerland": "+41", "Syria": "+963",
  "Taiwan": "+886", "Tajikistan": "+992", "Tanzania": "+255", "Thailand": "+66", "Timor-Leste": "+670", "Togo": "+228", "Tonga": "+676", "Trinidad and Tobago": "+1868", "Tunisia": "+216", "Turkey": "+90", "Turkmenistan": "+993", "Tuvalu": "+688",
  "Uganda": "+256", "Ukraine": "+380", "United Arab Emirates": "+971", "United Kingdom": "+44", "United States": "+1", "Uruguay": "+598", "Uzbekistan": "+998",
  "Vanuatu": "+678", "Vatican City": "+39066", "Venezuela": "+58", "Vietnam": "+84",
  "Yemen": "+967",
  "Zambia": "+260", "Zimbabwe": "+263",
};

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
function detectCountryFromIP(): string | null {
  try {
    // cf-ipcountry is set by Cloudflare edge on every request
    const v = (navigator as any)?.userAgentData || null;
    void v;
    const cf = document.cookie.match(/CF-IPCOUNTRY=([A-Z]{2})/);
    return cf ? cf[1] : null;
  } catch { return null; }
}

const IP_COUNTRY_MAP: Record<string, string> = {
  "NG": "Nigeria", "US": "United States", "GB": "United Kingdom", "GH": "Ghana", "KE": "Kenya",
  "TZ": "Tanzania", "UG": "Uganda", "ZA": "South Africa", "IN": "India", "PK": "Pakistan",
  "EG": "Egypt", "MA": "Morocco", "DZ": "Algeria", "CA": "Canada", "DE": "Germany",
  "FR": "France", "AE": "United Arab Emirates", "SA": "Saudi Arabia", "TR": "Turkey",
};

export default function Login() {
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [remember, setRemember] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    phoneNumber: "",
    country: "",
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // Auto-fill referral code from ?ref=CODE in the URL (preserves existing behavior, done once)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setForm((f) => ({ ...f, referralCode: ref.trim().toUpperCase() }));
    }
  }, []);

  const [referralCode, setReferralCode] = useState("");

  // Default country: IP-based detection (Cloudflare CF-IPCOUNTRY), fallback +234 Nigeria
  const defaultCountry = useMemo(() => {
    const ipCode = detectCountryFromIP();
    if (ipCode && IP_COUNTRY_MAP[ipCode]) return IP_COUNTRY_MAP[ipCode];
    return "Nigeria";
  }, []);

  // Pre-select default country once for register
  useEffect(() => {
    setForm((f) => (f.country ? f : { ...f, country: defaultCountry }));
  }, [defaultCountry]);

  // Password strength (register only)
  const strength = useMemo(() => {
    const p = form.password;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 4);
  }, [form.password]);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength] || "";
  const strengthColor = ["", "bg-destructive", "bg-amber-500", "bg-yellow-400", "bg-emerald-500"][strength] || "";

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (isLogin) {
      if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address";
      if (form.password.length < 6) next.password = "Password must be at least 6 characters";
    } else {
      if (form.username.trim().length < 3) next.username = "Username must be at least 3 characters";
      if (!form.country || form.country.length < 2) next.country = "Please select your country";
      const p = form.phoneNumber.replace(/[\s\-()]/g, "");
      if (!p) next.phoneNumber = "Phone number is required";
      else if (p.length < 6 || p.length > 20 || !/^\+?[0-9]+$/.test(p)) next.phoneNumber = "Use the international format, e.g. +234 801 234 5678";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address";
      if (form.password.length < 6) next.password = "Password must be at least 6 characters";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

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
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) {
        if (remember) {
          try { localStorage.setItem("acp_last_email", form.email); } catch { /* no-op */ }
        }
        await login(form.email, form.password);
      } else {
        await register(form.username.trim(), form.email, form.password, referralCode || undefined, form.phoneNumber, form.country);
      }
      toast.success(isLogin ? "Welcome back to AI COMPUTER PLUS" : "Account created — welcome aboard!");
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err.message || "An error occurred";
      // Map known server errors to inline field errors
      const lower = String(msg).toLowerCase();
      if (lower.includes("already exists")) setErrors({ email: "This email is already registered — try Sign In" });
      else if (lower.includes("user already exists")) setErrors({ username: "This username is taken — choose another" });
      else if (lower.includes("disposable")) setErrors({ email: "Disposable email addresses are not allowed" });
      else if (lower.includes("phone")) setErrors({ phoneNumber: msg });
      else if (lower.includes("country")) setErrors({ country: msg });
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Remember-me prefill on login view
  useEffect(() => {
    if (isLogin) {
      try {
        const last = localStorage.getItem("acp_last_email");
        if (last) setForm((f) => ({ ...f, email: last }));
      } catch { /* no-op */ }
    }
  }, [isLogin]);

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
                      onChange={(e) => { set({ email: e.target.value }); setErrors((x) => ({ ...x, email: "" })); }}
                      required
                      className={`pl-9 bg-secondary/50 border-border/50 ${errors.email ? "border-destructive" : ""}`}
                      autoFocus
                    />
                    {errors.email && <p className="text-[11px] text-destructive mt-1.5">{errors.email}</p>}
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="tel"
                      placeholder="Phone number (e.g. +234 801 234 5678)"
                      value={form.phoneNumber}
                      onChange={(e) => { set({ phoneNumber: e.target.value }); setErrors((x) => ({ ...x, phoneNumber: "" })); }}
                      className={`pl-9 bg-secondary/50 border-border/50 ${errors.phoneNumber ? "border-destructive" : ""}`}
                    />
                    {errors.phoneNumber ? (
                      <p className="text-[11px] text-destructive mt-1.5">{errors.phoneNumber}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Used to verify it's really you — you can update it anytime in Settings.
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => { set({ password: e.target.value }); setErrors((x) => ({ ...x, password: "" })); }}
                      required
                      minLength={6}
                      className="pl-9 pr-9 bg-secondary/50 border-border/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Show password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      Your session is protected with bank-grade encryption.
                    </div>
                    <label className="flex items-center gap-2 mt-3 text-[12px] text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="rounded border-border accent-primary"
                      />
                      Remember my email on this device
                    </label>
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
                    <Select value={form.country} onValueChange={(v) => { set({ country: v }); setErrors((x) => ({ ...x, country: "" })); }}>
                      <SelectTrigger className={`w-full bg-secondary/50 border-border/50 text-foreground ${errors.country ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.country && <p className="text-[11px] text-destructive mt-1.5">{errors.country}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Detected automatically from your connection — {defaultCountry} by default.
                    </p>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="tel"
                      placeholder={`Phone number (e.g. ${COUNTRY_CODES[form.country] || "+234"} 801 234 5678)`}
                      value={form.phoneNumber}
                      onChange={(e) => { set({ phoneNumber: e.target.value }); setErrors((x) => ({ ...x, phoneNumber: "" })); }}
                      required
                      className={`pl-9 bg-secondary/50 border-border/50 ${errors.phoneNumber ? "border-destructive" : ""}`}
                    />
                    {errors.phoneNumber && <p className="text-[11px] text-destructive mt-1.5">{errors.phoneNumber}</p>}
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={(e) => { set({ email: e.target.value }); setErrors((x) => ({ ...x, email: "" })); }}
                      required
                      className={`pl-9 bg-secondary/50 border-border/50 ${errors.email ? "border-destructive" : ""}`}
                    />
                    {errors.email && <p className="text-[11px] text-destructive mt-1.5">{errors.email}</p>}
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password (min 6 characters)"
                      value={form.password}
                      onChange={(e) => { set({ password: e.target.value }); setErrors((x) => ({ ...x, password: "" })); }}
                      required
                      minLength={6}
                      className="pl-9 pr-9 bg-secondary/50 border-border/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Show password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {/* Password strength meter (register only) */}
                    {form.password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : "bg-secondary"}`}
                            />
                          ))}
                        </div>
                        <p className={`text-[11px] ${strength >= 3 ? "text-emerald-600" : "text-muted-foreground"}`}>
                          Password strength: {strengthLabel}
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Referral code (auto-filled from ?ref= link) */}
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Referral code (optional)"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.trim().toUpperCase())}
                      className="pl-9 bg-secondary/50 border-border/50"
                    />
                    {referralCode && (
                      <p className="text-[11px] text-primary mt-1.5">
                        <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
                        You'll earn through the friend who invited you
                      </p>
                    )}
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
