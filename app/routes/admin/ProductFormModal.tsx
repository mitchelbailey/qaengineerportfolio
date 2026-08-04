import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CATEGORY_LABELS, PRODUCT_CATEGORIES, type ProductCategory } from '@shared/catalog-seed';
import { parseAudToCents } from '@shared/money';
import type { AdminProductInput, Product } from '@shared/schemas';
import { useCreateProduct, useUpdateProduct } from '@/lib/admin-queries';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert, Field, Input, Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast-context';

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent means "create a new product". */
  product?: Product | undefined;
}

/**
 * Price is entered in dollars but stored and validated in cents, so the form
 * carries `priceDollars` and converts on submit rather than making the user
 * think in cents.
 */
interface FormValues {
  name: string;
  slug: string;
  category: ProductCategory;
  priceDollars: string;
  stock: number;
  featured: boolean;
  summary: string;
  description: string;
  material: string;
  dimensions: string;
}

const emptyValues: FormValues = {
  name: '',
  slug: '',
  category: 'ceramics',
  priceDollars: '',
  stock: 0,
  featured: false,
  summary: '',
  description: '',
  material: '',
  dimensions: '',
};

export function ProductFormModal({ open, onOpenChange, product }: ProductFormModalProps) {
  const isEdit = Boolean(product);
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const { toast } = useToast();
  const mutation = isEdit ? update : create;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: emptyValues, mode: 'onBlur' });

  // Reload the form whenever a different product is opened, so the modal never
  // shows the previously edited row's values.
  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            name: product.name,
            slug: product.slug,
            category: product.category,
            priceDollars: (product.priceCents / 100).toFixed(2),
            stock: product.stock,
            featured: product.featured,
            summary: product.summary,
            description: product.description,
            material: product.material,
            dimensions: product.dimensions,
          }
        : emptyValues,
    );
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetting on open/product only
  }, [open, product?.id]);

  function onSubmit(values: FormValues) {
    const priceCents = parseAudToCents(values.priceDollars);
    if (priceCents === null || priceCents < 1) {
      setError('priceDollars', { message: 'Enter a price like 42.00' });
      return;
    }

    const input: AdminProductInput = {
      name: values.name,
      slug: values.slug,
      category: values.category,
      priceCents,
      stock: Number(values.stock),
      featured: Boolean(values.featured),
      summary: values.summary,
      description: values.description,
      material: values.material,
      dimensions: values.dimensions,
    };

    const onError = (error: { fieldErrors?: Record<string, string[]> }) => {
      for (const [path, messages] of Object.entries(error.fieldErrors ?? {})) {
        if (path in emptyValues) {
          setError(path as keyof FormValues, { message: messages[0] ?? 'Invalid value' });
        }
      }
    };

    if (isEdit && product) {
      update.mutate(
        { id: product.id, input },
        {
          onSuccess: () => {
            toast({ title: 'Product updated', description: input.name, variant: 'success' });
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => {
          toast({ title: 'Product created', description: input.name, variant: 'success' });
          onOpenChange(false);
        },
        onError,
      });
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      testId="product-form-modal"
      size="lg"
      title={isEdit ? 'Edit product' : 'New product'}
      description={isEdit ? product?.name : 'Add a product to the catalog.'}
    >
      <form id="product-form" onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        {mutation.isError && !mutation.error.fieldErrors ? (
          <Alert className="mb-5" data-testid="product-form-error" title="Could not save">
            {mutation.error.message}
          </Alert>
        ) : null}

        <div className="grid gap-x-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="product-name" error={errors.name?.message}>
            <Input
              id="product-name"
              invalid={Boolean(errors.name)}
              {...register('name', { required: 'Name is required' })}
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="product-slug"
            hint="Lowercase words joined by hyphens"
            error={errors.slug?.message}
          >
            <Input
              id="product-slug"
              invalid={Boolean(errors.slug)}
              {...register('slug', { required: 'Slug is required' })}
            />
          </Field>

          <Field label="Category" htmlFor="product-category" error={errors.category?.message}>
            <Select id="product-category" {...register('category')}>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-x-5">
            <Field label="Price (AUD)" htmlFor="product-price" error={errors.priceDollars?.message}>
              <Input
                id="product-price"
                inputMode="decimal"
                placeholder="42.00"
                invalid={Boolean(errors.priceDollars)}
                {...register('priceDollars', { required: 'Price is required' })}
              />
            </Field>

            <Field label="Stock" htmlFor="product-stock" error={errors.stock?.message}>
              <Input
                id="product-stock"
                type="number"
                min={0}
                invalid={Boolean(errors.stock)}
                {...register('stock', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Stock cannot be negative' },
                })}
              />
            </Field>
          </div>
        </div>

        <Field label="Summary" htmlFor="product-summary" error={errors.summary?.message}>
          <Input
            id="product-summary"
            invalid={Boolean(errors.summary)}
            {...register('summary', { required: 'Summary is required' })}
          />
        </Field>

        <Field label="Description" htmlFor="product-description" error={errors.description?.message}>
          <textarea
            id="product-description"
            rows={4}
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg"
            {...register('description', { required: 'Description is required' })}
          />
        </Field>

        <div className="grid gap-x-5 sm:grid-cols-2">
          <Field label="Material" htmlFor="product-material" error={errors.material?.message}>
            <Input id="product-material" {...register('material')} />
          </Field>
          <Field label="Dimensions" htmlFor="product-dimensions" error={errors.dimensions?.message}>
            <Input id="product-dimensions" {...register('dimensions')} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" className="size-4 accent-[var(--color-accent)]" {...register('featured')} />
          Feature on the home page
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
