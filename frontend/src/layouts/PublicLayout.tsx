import { Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)))]">
      <Outlet />
    </main>
  );
}
