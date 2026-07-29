export const ORDER_STATUSES = [
  'placed',
  'paid',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Legal status transitions.
 *
 * Modelled explicitly rather than left as "any admin can set any status",
 * because an unguarded status field is exactly the kind of thing that looks
 * fine in a UI click-through and is wrong the moment anyone hits the API
 * directly. The admin UI only offers legal targets; the API rejects the rest
 * with 409, and both are covered by tests.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ['paid', 'cancelled'],
  paid: ['packed', 'cancelled', 'refunded'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Statuses an order may legally move to from its current one. */
export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Terminal statuses accept no further transitions. */
export function isTerminalStatus(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'Placed',
  paid: 'Paid',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};
