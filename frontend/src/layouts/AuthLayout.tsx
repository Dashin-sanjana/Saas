import { CalendarCheck } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Smart Scheduler
        </Link>
        <Outlet />
      </div>
    </main>
  );
}
