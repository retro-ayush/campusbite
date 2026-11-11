"use client";

import { useState } from "react";
import Link from "next/link";
import AgentChat from "@/components/AgentChat";
import WalletOrders from "@/components/WalletOrders";
import MenuPanel from "@/components/MenuPanel";

/*
 * STUDENT SCREEN
 * Left: the agent chat. Right: wallet, my orders and today's menu.
 */
export default function HomePage() {
  // Changes every time the agent writes data, so the panels on the right reload.
  const [refreshKey, setRefreshKey] = useState(0);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">CampusBite · SRM canteen ordering agent</h1>
          <p className="text-sm text-slate-500">Order lunch in plain English. Pick up between 12:00 and 2:30 pm.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/kitchen" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">
            Open kitchen screen
          </Link>
          <button onClick={logout} className="text-slate-500 hover:text-slate-900">
            Log out
          </button>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-5">
        <section className="md:col-span-3">
          <AgentChat onDataChanged={() => setRefreshKey((k) => k + 1)} />
        </section>
        <section className="space-y-4 md:col-span-2">
          <WalletOrders refreshKey={refreshKey} />
          <MenuPanel refreshKey={refreshKey} />
        </section>
      </div>
    </main>
  );
}
