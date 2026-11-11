// Shared CampusBite helpers. No secrets here, so client components may import it too.

/** The logged-in student. Never take a student id from the user or the AI. */
export const CURRENT_STUDENT_ID = "S001";

/** "13:15:00" -> "1:15 pm" */
export function formatSlot(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const hour = hours % 12 || 12;
  const period = hours >= 12 ? "pm" : "am";
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** 70 -> "Rs 70" */
export function rupees(amount: number): string {
  return `Rs ${amount}`;
}

/** Supabase may return a related row as an object or a one-item array. This handles both. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Kitchen flow: each status can only move to the next one. */
export const NEXT_STATUS: Record<string, string> = {
  placed: "preparing",
  preparing: "ready",
  ready: "collected",
};

/** Columns to select for an order with its pickup time and items. */
export const ORDER_SELECT =
  "id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, menu_items(name))";

type Rel<T> = T | T[] | null;

export type RawOrder = {
  id: number;
  status: string;
  total: number;
  created_at: string;
  pickup_slots: Rel<{ slot_time: string }>;
  wallets?: Rel<{ name: string }>;
  order_items: { quantity: number; menu_items: Rel<{ name: string }> }[] | null;
};

/** The clean order shape used by the tools, the API routes and the screens. */
export type OrderView = {
  id: number;
  status: string;
  total: number;
  created_at: string;
  pickup_time: string;
  items: string[];
  student_name?: string;
};

export function toOrderView(order: RawOrder): OrderView {
  const slot = one(order.pickup_slots);
  const student = one(order.wallets);
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    created_at: order.created_at,
    pickup_time: slot ? formatSlot(slot.slot_time) : "unknown",
    items: (order.order_items ?? []).map(
      (line) => `${line.quantity} x ${one(line.menu_items)?.name ?? "item"}`
    ),
    ...(student ? { student_name: student.name } : {}),
  };
}
