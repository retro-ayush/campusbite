"use client";

import { useEffect, useState } from "react";
import { rupees, type OrderView } from "@/lib/campusbite";

type Wallet = { student_id: string; name: string; balance: number };

export const STATUS_STYLES: Record<string, string> = {
  placed: "bg-sky-100 text-sky-800",
  preparing: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  collected: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

/** Dark wallet card + "My orders today". Loads /api/me. */
export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load wallet");
        setWallet(data.wallet);
        setOrders(data.orders);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load wallet");
      }
    }
    load();
    // Reload every 5 seconds so kitchen updates show up.
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [refreshKey]);

  return (
    <div className="rounded-xl bg-slate-900 p-4 text-white">
      <p className="text-xs uppercase tracking-wide text-slate-400">Wallet balance</p>
      <p className="mt-1 text-3xl font-semibold">{wallet ? rupees(wallet.balance) : "…"}</p>
      <p className="text-sm text-slate-300">
        {wallet ? `${wallet.name} · ${wallet.student_id}` : "Loading…"}
      </p>

      <h3 className="mt-4 border-t border-slate-700 pt-3 text-sm font-semibold">My orders today</h3>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      {!error && orders.length === 0 && <p className="mt-2 text-sm text-slate-400">No orders yet.</p>}
      <ul className="mt-2 space-y-2">
        {orders.map((o) => (
          <li key={o.id} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                #{o.id} · {o.pickup_time}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[o.status] ?? ""}`}>
                {o.status}
              </span>
            </div>
            <div className="mt-1 flex justify-between gap-2 text-xs text-slate-300">
              <span>{o.items.join(", ")}</span>
              <span className="shrink-0">{rupees(o.total)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
