import { Outlet } from "react-router-dom";
import { BrandMark, AdminBadge } from "./Brand";

export function LandingShell() {
  return (
    <div className="min-h-screen flex flex-col surface-canvas">
      <header className="bg-white border-b border-ink-200">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="flex items-center justify-between h-14">
            <BrandMark />
            <AdminBadge />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-8 py-10">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-ink-200 py-4">
        <div className="max-w-[1400px] mx-auto px-8 flex items-center justify-between text-2xs text-ink-500">
          <span>Synovate · Assessment Centre Application</span>
          <span>v0.8 · Pass 6 · All destinations live</span>
        </div>
      </footer>
    </div>
  );
}
