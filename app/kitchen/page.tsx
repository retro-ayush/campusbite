"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { NEXT_STATUS, rupees, type OrderView } from "@/lib/campusbite";

const COLUMNS = [
  { status: "placed", title: "New orders", button: "Start preparing" },
  { status: "preparing", title: "Preparing", button: "Mark ready" },
  { status: "ready", title: "Ready for pickup", button: "Collected" },
];

/** KITCHEN SCREEN: live board of open orders. Reloads every 3 seconds. */
export default function KitchenPage() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load orders");
      setOrders(data.orders);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  async function advance(order: OrderView) {
    setBusyId(order.id);
    try {
      const res = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, status: NEXT_STATUS[order.status] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
      load();
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">CampusBite Kitchen</h1>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          Student screen
        </Link>
      </header>

      {error && <p className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const rows = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="rounded-xl bg-slate-900 p-3">
              <h2 className="mb-3 flex items-center justify-between font-semibold">
                {col.title}
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{rows.length}</span>
              </h2>
              {rows.length === 0 && <p className="text-sm text-slate-500">No orders.</p>}
              <ul className="space-y-3">
                {rows.map((o) => (
                  <li key={o.id} className="rounded-lg bg-slate-800 p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-semibold">#{o.id}</span>
                      <span className="text-sm font-medium text-amber-300">{o.pickup_time}</span>
                    </div>
                    <p className="text-sm text-slate-300">{o.student_name ?? "Student"}</p>
                    <ul className="mt-2 text-sm">
                      {o.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-400">{rupees(o.total)}</span>
                      <button
                        onClick={() => advance(o)}
                        disabled={busyId === o.id}
                        className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 disabled:opacity-50"
                      >
                        {col.button}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
