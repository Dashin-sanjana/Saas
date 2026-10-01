import { CalendarDays, CheckCircle2, LayoutDashboard, ListChecks, LogOut, Menu, Moon, Settings, Sun, Target, User, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";

const navItems = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/week", label: "My Week", icon: CalendarDays },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/subjects", label: "Subjects", icon: ListChecks },
  { to: "/app/goals", label: "Goals", icon: Target },
  { to: "/app/free-time", label: "Free Time", icon: CheckCircle2 },
  { to: "/app/settings", label: "Settings", icon: Settings }
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const sidebar = (
    <aside className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center justify-between px-5">
        <div className="font-semibold">Smart Scheduler</div>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="grid gap-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-border p-4 text-sm">
        <div className="flex items-center gap-3 rounded-md bg-muted p-3">
          <User className="h-4 w-4" />
          <div className="min-w-0">
            <p className="truncate font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 hidden w-72 lg:block">{sidebar}</div>
      {open ? <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 transform transition lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>{sidebar}</div>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm text-muted-foreground">Plan your week around your real life.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="secondary" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
