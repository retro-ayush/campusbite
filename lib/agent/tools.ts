import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { CURRENT_STUDENT_ID, ORDER_SELECT, formatSlot, toOrderView, type RawOrder } from "../campusbite";
import { getSupabase } from "../supabase";

/*
 * CampusBite agent tools.
 * Read tools (the agent's eyes): getMenu, getWalletBalance, getPickupSlots, getMyOrders.
 * Write tools (the agent's hands): placeOrder, cancelOrder. They only call the database
 * functions, which check every rule and change everything together, or nothing.
 */

const getMenu = defineTool({
  name: "getMenu",
  description:
    "Use this when the user asks what food is available, wants recommendations, or before placing an order to get real item ids and prices. Only returns items in stock. You can filter by category, vegetarian items, or maximum price.",
  schema: z.object({
    category: z
      .enum(["meal", "snack", "drink", "sweet"])
      .optional()
      .describe("Optional menu category to filter by."),
    veg_only: z.boolean().optional().describe("Set true to show vegetarian menu items only."),
    max_price: z.number().int().optional().describe("Maximum item price in whole rupees."),
  }),
  run: async ({ category, veg_only, max_price }) => {
    let query = getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, description")
      .gt("stock", 0)
      .order("category")
      .order("price");
    if (category) query = query.eq("category", category);
    if (veg_only) query = query.eq("is_veg", true);
    if (max_price !== undefined) query = query.lte("price", max_price);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { items: data };
  },
});

const getWalletBalance = defineTool({
  name: "getWalletBalance",
  description:
    "Use this when the user asks about their wallet or balance, and before placing an order to check they can pay.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
});

const getPickupSlots = defineTool({
  name: "getPickupSlots",
  description:
    "Use this when the user asks about pickup times, and before placing an order to get a real slot_id. Returns only slots that still have free places.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("pickup_slots")
      .select("id, slot_time, capacity, booked")
      .order("slot_time");
    if (error) throw new Error(error.message);
    return {
      slots: data
        .map((slot) => ({
          slot_id: slot.id,
          time: formatSlot(slot.slot_time),
          free: slot.capacity - slot.booked,
        }))
        .filter((slot) => slot.free > 0),
    };
  },
});

const getMyOrders = defineTool({
  name: "getMyOrders",
  description:
    "Use this when the user asks about their recent orders or an order's status, or wants to cancel an order and you need its id. Newest first.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("orders")
      .select(ORDER_SELECT)
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return {
      orders: (data as unknown as RawOrder[]).map((order) => {
        const view = toOrderView(order);
        return { id: view.id, status: view.status, total: view.total, pickup_time: view.pickup_time, items: view.items };
      }),
    };
  },
});

const placeOrder = defineTool({
  name: "placeOrder",
  description:
    "Use this when the student wants to order food. Needs real menu item ids from getMenu and a real slot_id from getPickupSlots. The database checks stock, wallet balance, slot capacity and the 5-item limit, and places the order all at once.",
  writes: true,
  schema: z.object({
    items: z
      .array(
        z.object({
          menu_item_id: z.number().int().positive().describe("The id of the menu item, from getMenu."),
          quantity: z.number().int().min(1).max(5).describe("How many of this item, 1 to 5."),
        })
      )
      .min(1)
      .describe("The items to order. At least one."),
    slot_id: z.number().int().positive().describe("The pickup slot id, from getPickupSlots."),
  }),
  run: async ({ items, slot_id }) => {
    const { data, error } = await getSupabase().rpc("place_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_slot_id: slot_id,
      p_items: items,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

const cancelOrder = defineTool({
  name: "cancelOrder",
  description:
    "Use this only when the student clearly asks to cancel an order. Needs the order id, so call getMyOrders first if you do not know it. Only orders the kitchen has not started can be cancelled.",
  writes: true,
  schema: z.object({
    order_id: z.number().int().positive().describe("The id of the order to cancel."),
  }),
  run: async ({ order_id }) => {
    const { data, error } = await getSupabase().rpc("cancel_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_order_id: order_id,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

/** Every tool in this list is given to Gemini. */
export const tools: AgentTool[] = [
  getMenu,
  getWalletBalance,
  getPickupSlots,
  getMyOrders,
  placeOrder,
  cancelOrder,
];
