import { useState, type FormEvent } from "react";
import { ArrowRight, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { apiError } from "../services/api";

export function AuthPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "register") await register(name, email, password);
      else await login(email, password);
      navigate("/");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_.85fr]">
      <section className="relative hidden overflow-hidden border-r border-white/10 p-16 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-cyan/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan text-ink"><ShieldCheck /></div>
          <span className="font-['Manrope'] text-xl font-bold">ClaimLens AI</span>
        </div>
        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1.5 text-xs font-semibold text-cyan">
            <Sparkles className="h-3.5 w-3.5" /> MULTI-MODAL CLAIM INTELLIGENCE
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-tight xl:text-6xl">
            See the evidence.<br /><span className="text-cyan">Know the risk.</span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-400">
            Visual damage analysis, narrative consistency, evidence compliance, and claimant history—resolved into one transparent decision.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4">
            {["Vision analysis", "Text forensics", "Risk ensemble"].map((item, index) => (
              <div key={item} className="glass rounded-xl p-4">
                <div className="mb-3 text-xs font-bold text-cyan">0{index + 1}</div>
                <div className="text-sm font-semibold">{item}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-600">Evidence-led decisions. Human-review ready.</p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10">
        <Card className="w-full max-w-md p-7 sm:p-9">
          <div className="mb-8">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-blue/10 text-blue"><ScanSearch /></div>
            <h2 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "login" ? "Sign in to review and verify your claims." : "Start verifying evidence in a few moments."}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            {mode === "register" && (
              <div><label className="label">Full name</label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            )}
            <div><label className="label">Email address</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label className="label">Password</label><Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</div>}
            <Button className="w-full" size="lg" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <button className="mt-6 w-full text-center text-sm text-slate-400 hover:text-white" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "New to ClaimLens? Create an account" : "Already have an account? Sign in"}
          </button>
        </Card>
      </section>
    </main>
  );
}

