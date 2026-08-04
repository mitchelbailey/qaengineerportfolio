import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  isTerminalStatus,
  nextStatuses,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  type OrderStatus,
} from '@shared/order-status';
import type { Order } from '@shared/schemas';
import { adminOrdersQuery, useUpdateOrderStatus } from '@/lib/admin-queries';
import { useAdminUser } from './use-admin-user';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Alert,
  Badge,
  EmptyState,
  Pagination,
  Price,
  Select,
  Skeleton,
  type BadgeTone,
} from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast-context';

const STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  placed: 'neutral',
  paid: 'accent',
  packed: 'accent',
  shipped: 'accent',
  delivered: 'success',
  cancelled: 'danger',
  refunded: 'warning',
};

export function AdminOrders() {
  const user = useAdminUser();
  const canEdit = user.role === 'admin';
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);

  const { data, isPending, isError, error } = useQuery(
    adminOrdersQuery({ ...(status ? { status } : {}), page, pageSize: 10 }),
  );
  const updateStatus = useUpdateOrderStatus();
  const { toast } = useToast();

  /**
   * The open dialog renders from `selected`, which the status mutation replaces
   * with the order the API returned.
   *
   * Reading it back out of the list query instead would show the *previous*
   * status for as long as the refetch takes, because the list is held in place
   * by placeholderData. During that window the dialog would offer transitions
   * that are no longer legal, and clicking one earns a 409. Using the
   * authoritative response closes the window entirely.
   */
  const current = selected;

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-11 w-52" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <Alert title="Could not load orders">{error.message}</Alert>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="order-status-filter" className="text-sm font-medium text-fg">
            Filter by status
          </label>
          <Select
            id="order-status-filter"
            className="mt-1.5 w-52"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((option) => (
              <option key={option} value={option}>
                {ORDER_STATUS_LABELS[option]}
              </option>
            ))}
          </Select>
        </div>
        <p data-testid="admin-order-count" className="pb-3 text-sm text-fg-muted">
          {data.total} order{data.total === 1 ? '' : 's'}
        </p>
      </div>

      {data.items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No orders yet"
            description={
              status
                ? 'No orders currently have that status.'
                : 'Orders placed through the storefront will appear here.'
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table data-testid="admin-orders-table" className="w-full text-sm">
              <caption className="sr-only">Orders</caption>
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-fg-muted">
                    Reference
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-fg-muted">
                    Placed
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-fg-muted">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-fg-muted">
                    Items
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-fg-muted">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium text-fg-muted">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-fg-muted">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((order) => (
                  <tr key={order.id} data-testid="admin-order-row" data-reference={order.reference}>
                    <td className="px-4 py-3 font-mono text-xs text-fg">{order.reference}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      <time dateTime={order.placedAt}>
                        {new Date(order.placedAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{order.customer.email}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{order.totals.itemCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Price cents={order.totals.totalCents} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONES[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          updateStatus.reset();
                          setSelected(order);
                        }}
                        className="text-sm text-fg-muted underline-offset-4 hover:text-accent-text hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      <Modal
        open={current !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        testId="order-detail-modal"
        size="lg"
        title={current ? `Order ${current.reference}` : 'Order'}
        description={current ? `Placed by ${current.customer.email}` : undefined}
      >
        {current ? (
          <div>
            <div className="flex items-center gap-3">
              <Badge tone={STATUS_TONES[current.status]}>{ORDER_STATUS_LABELS[current.status]}</Badge>
              {isTerminalStatus(current.status) ? (
                <span className="text-xs text-fg-muted">This status is final — no further changes.</span>
              ) : null}
            </div>

            <ul className="mt-5 divide-y divide-border border-y border-border">
              {current.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span>
                    <span className="text-fg">{item.name}</span>
                    <span className="ml-2 text-fg-muted">× {item.quantity}</span>
                  </span>
                  <Price cents={item.lineTotalCents} />
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Subtotal</dt>
                <dd>
                  <Price cents={current.totals.subtotalCents} />
                </dd>
              </div>
              {current.totals.discountCents > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>Discount ({current.totals.appliedPromoCode})</dt>
                  <dd>
                    −<Price cents={current.totals.discountCents} />
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-fg-muted">Shipping</dt>
                <dd>
                  {current.totals.shippingCents === 0 ? (
                    'Free'
                  ) : (
                    <Price cents={current.totals.shippingCents} />
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                <dt>Total</dt>
                <dd data-testid="order-detail-total">
                  <Price cents={current.totals.totalCents} />
                </dd>
              </div>
            </dl>

            <address className="mt-5 text-sm leading-relaxed text-fg-muted not-italic">
              {current.customer.firstName} {current.customer.lastName}
              <br />
              {current.shippingAddress.line1}
              {current.shippingAddress.line2 ? <>, {current.shippingAddress.line2}</> : null}
              <br />
              {current.shippingAddress.suburb} {current.shippingAddress.state}{' '}
              {current.shippingAddress.postcode}
            </address>

            {updateStatus.isError ? (
              <Alert className="mt-5" data-testid="status-error" title="Status not changed">
                {updateStatus.error.message}
              </Alert>
            ) : null}

            {/*
              Only legal transitions are offered. The API enforces the same state
              machine independently and returns 409 for anything else — the UI
              narrowing the options is a convenience, not the control.
            */}
            {canEdit && !isTerminalStatus(current.status) ? (
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-sm font-medium text-fg">Move to</p>
                <div data-testid="status-actions" className="mt-3 flex flex-wrap gap-2">
                  {nextStatuses(current.status).map((next) => (
                    <Button
                      key={next}
                      size="sm"
                      variant={next === 'cancelled' || next === 'refunded' ? 'secondary' : 'primary'}
                      loading={updateStatus.isPending && updateStatus.variables?.status === next}
                      onClick={() =>
                        updateStatus.mutate(
                          { id: current.id, status: next },
                          {
                            onSuccess: (order) => {
                              setSelected(order);
                              toast({
                                title: `Order ${order.reference} is now ${ORDER_STATUS_LABELS[order.status].toLowerCase()}`,
                                variant: 'success',
                              });
                            },
                          },
                        )
                      }
                    >
                      {ORDER_STATUS_LABELS[next]}
                    </Button>
                  ))}
                </div>
                {current.status === 'paid' || current.status === 'packed' ? (
                  <p className="mt-3 text-xs text-fg-muted">
                    Cancelling or refunding returns the ordered quantities to stock.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
