import { FilePlus2, LayoutDashboard, LogOut, Menu, ShieldCheck, Sparkles } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "../lib";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/button";

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/[0.07] bg-[#07101d]/95 p-5 backdrop-blur-xl lg:block">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan to-blue text-ink shadow-[0_0_30px_rgba(77,225,193,.2)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="font-['Manrope'] text-lg font-bold">ClaimLens</div>
            <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan">Verification AI</div>
          </div>
        </div>
        <nav className="space-y-2">
          {[
            { to: "/", label: "Dashboard", icon: LayoutDashboard },
            { to: "/claims/new", label: "New claim", icon: FilePlus2 },
          ].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition",
                  isActive && "bg-white/[0.07] text-white",
                )
              }
            >
              <Icon className="h-4.5 w-4.5" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-cyan"><Sparkles className="h-3 w-3" /> Secure workspace</div>
          <div className="truncate text-sm font-semibold">{user?.full_name}</div>
          <div className="mb-3 truncate text-xs text-slate-500">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-white/[0.07] bg-[#07101d]/90 px-4 backdrop-blur-xl lg:hidden">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan to-blue text-ink"><ShieldCheck className="h-5 w-5" /></div>
          <div><span className="block font-['Manrope'] text-sm font-extrabold leading-none">ClaimLens</span><span className="mt-1 block text-[8px] font-bold uppercase tracking-[.18em] text-cyan">Verification AI</span></div>
        </NavLink>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Dashboard"><NavLink to="/"><LayoutDashboard className="h-4.5 w-4.5" /></NavLink></Button>
          <Button asChild size="sm" className="rounded-xl px-3"><NavLink to="/claims/new"><FilePlus2 className="h-4 w-4" /><span className="hidden min-[380px]:inline">New claim</span></NavLink></Button>
        </div>
      </header>
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-[1500px] p-4 pb-10 sm:p-8 lg:p-10"><Outlet /></div>
      </main>
    </div>
  );
}
