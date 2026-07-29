import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CATEGORY_LABELS } from '@shared/catalog-seed';
import { formatBytes, MAX_IMAGE_BYTES } from '@shared/upload';
import type { Product, User } from '@shared/schemas';
import { adminProductsQuery, useDeleteProduct, useUploadProductImage } from '@/lib/admin-queries';
import { useAdminUser } from './use-admin-user';
import { ProductFormModal } from './ProductFormModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, EmptyState, Input, Pagination, Price, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast-context';
import { cn } from '@/lib/cn';

type SortKey = 'name' | 'category' | 'priceCents' | 'stock';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 8;

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: 'name', label: 'Product' },
  { key: 'category', label: 'Category' },
  { key: 'priceCents', label: 'Price', numeric: true },
  { key: 'stock', label: 'Stock', numeric: true },
];

export function AdminProducts() {
  const user: User = useAdminUser();
  const canEdit = user.role === 'admin';
  const { data, isPending, isError, error } = useQuery(adminProductsQuery());
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [uploadingFor, setUploadingFor] = useState<Product | null>(null);

  const deleteProduct = useDeleteProduct();
  const uploadImage = useUploadProductImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    const all = data?.items ?? [];
    const term = search.trim().toLowerCase();
    const filtered = term
      ? all.filter(
          (product) =>
            product.name.toLowerCase().includes(term) || product.slug.toLowerCase().includes(term),
        )
      : all;

    const sorted = [...filtered].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const comparison =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right));
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [data?.items, search, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  }

  function handleFileChosen(file: File | undefined) {
    if (!file || !uploadingFor) return;
    uploadImage.mutate(
      { id: uploadingFor.id, file },
      {
        onSuccess: () => {
          toast({ title: 'Image updated', description: uploadingFor.name, variant: 'success' });
          setUploadingFor(null);
        },
      },
    );
  }

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-11 w-64" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <Alert title="Could not load products">{error.message}</Alert>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="admin-product-search" className="sr-only">
            Filter products
          </label>
          <Input
            id="admin-product-search"
            type="search"
            placeholder="Filter by name or slug…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        {canEdit ? (
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            New product
          </Button>
        ) : null}
      </div>

      <p data-testid="admin-product-count" className="mt-4 text-sm text-fg-muted">
        {rows.length} of {data.total} products
      </p>

      {deleteProduct.isError ? (
        <Alert className="mt-4" title="Could not delete">
          {deleteProduct.error.message}
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No products match" description="Try a different search term." />
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table data-testid="admin-products-table" className="w-full text-sm">
              <caption className="sr-only">Catalog products, sortable by column</caption>
              <thead className="bg-surface-muted">
                <tr>
                  {COLUMNS.map((column) => {
                    const active = sortKey === column.key;
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className={cn('px-4 py-3 text-left font-medium', column.numeric && 'text-right')}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={cn(
                            'inline-flex items-center gap-1 hover:text-accent-text',
                            active ? 'text-fg' : 'text-fg-muted',
                          )}
                        >
                          {column.label}
                          <span aria-hidden="true" className="text-xs">
                            {active ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className="px-4 py-3 text-right font-medium text-fg-muted">
                    <span className={canEdit ? undefined : 'sr-only'}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((product) => (
                  <tr key={product.id} data-testid="admin-product-row" data-slug={product.slug}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.imageUrl}
                          alt=""
                          width={40}
                          height={50}
                          className="h-12 w-10 rounded border border-border object-cover"
                        />
                        <div>
                          <p className="font-medium text-fg">{product.name}</p>
                          <p className="text-xs text-fg-muted">{product.slug}</p>
                        </div>
                        {product.featured ? <Badge tone="accent">Featured</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{CATEGORY_LABELS[product.category]}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Price cents={product.priceCents} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" data-testid="stock-cell">
                      {product.stock === 0 ? (
                        <span className="text-danger">0</span>
                      ) : product.lowStock ? (
                        <span className="text-warning">{product.stock}</span>
                      ) : (
                        product.stock
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit ? (
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(product);
                              setFormOpen(true);
                            }}
                            className="text-sm text-fg-muted underline-offset-4 hover:text-accent-text hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              uploadImage.reset();
                              setUploadingFor(product);
                            }}
                            className="text-sm text-fg-muted underline-offset-4 hover:text-accent-text hover:underline"
                          >
                            Image
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(product)}
                            className="text-sm text-fg-muted underline-offset-4 hover:text-danger hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-fg-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      <ProductFormModal open={formOpen} onOpenChange={setFormOpen} product={editing} />

      <Modal
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        testId="delete-confirm-modal"
        title="Delete this product?"
        description={
          deleting
            ? `"${deleting.name}" will be removed from the catalog and from any carts containing it. This cannot be undone.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteProduct.isPending}
              onClick={() => {
                if (!deleting) return;
                const name = deleting.name;
                deleteProduct.mutate(
                  { id: deleting.id },
                  {
                    onSuccess: () => {
                      toast({ title: 'Product deleted', description: name });
                      setDeleting(null);
                    },
                  },
                );
              }}
            >
              Delete product
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          Orders that already contain this product keep their line items — historical orders are never
          rewritten.
        </p>
      </Modal>

      <Modal
        open={uploadingFor !== null}
        onOpenChange={(open) => {
          if (!open) setUploadingFor(null);
        }}
        testId="image-upload-modal"
        title="Replace product image"
        description={uploadingFor?.name}
      >
        <label htmlFor="product-image" className="text-sm font-medium text-fg">
          Choose an image
        </label>
        <input
          id="product-image"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFileChosen(event.target.files?.[0])}
          className="mt-2 block w-full text-sm text-fg-muted file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-fg"
        />
        <p className="mt-2 text-xs text-fg-muted">
          JPEG, PNG or WebP, up to {formatBytes(MAX_IMAGE_BYTES)}.
        </p>

        {uploadImage.isPending ? <p className="mt-4 text-sm text-fg-muted">Uploading…</p> : null}

        {uploadImage.isError ? (
          <Alert className="mt-4" data-testid="upload-error" title="Upload rejected">
            {Object.values(uploadImage.error.fieldErrors ?? {})
              .flat()
              .join(' ') || uploadImage.error.message}
          </Alert>
        ) : null}
      </Modal>
    </div>
  );
}
