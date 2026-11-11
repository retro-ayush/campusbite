"use client";

import { useEffect, useState } from "react";
import { rupees } from "@/lib/campusbite";

type MenuItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  is_veg: boolean;
  stock: number;
  description: string;
};

const GROUPS = [
  { category: "meal", title: "Meals" },
  { category: "snack", title: "Snacks" },
  { category: "sweet", title: "Sweets" },
  { category: "drink", title: "Drinks" },
];

/** Today's menu with live stock. Loads /api/menu. */
export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load menu");
        setItems(data.items);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load menu");
      }
    }
    load();
    // Reload every 5 seconds so stock stays live.
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [refreshKey]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Today&apos;s menu</h2>
        <p className="text-xs text-slate-500">Live stock from the canteen.</p>
      </div>
      {error && <p className="p-4 text-sm text-red-600">{error}</p>}
      {GROUPS.map((group) => {
        const rows = items.filter((i) => i.category === group.category);
        if (rows.length === 0) return null;
        return (
          <div key={group.category} className="px-4 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</h3>
            <ul className="divide-y divide-slate-100">
              {rows.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      title={item.is_veg ? "Veg" : "Non-veg"}
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.is_veg ? "bg-emerald-500" : "bg-red-500"}`}
                    />
                    <span className={item.stock === 0 ? "text-slate-400" : ""}>{item.name}</span>
                    {item.stock === 0 && (
                      <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Sold out</span>
                    )}
                    {item.stock > 0 && item.stock <= 3 && (
                      <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                        Only {item.stock} left
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 font-medium">{rupees(item.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
