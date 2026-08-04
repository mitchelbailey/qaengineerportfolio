import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import type { z } from 'zod';
import { loginSchema } from '@shared/schemas';
import { DEMO_ACCOUNTS, SEED_PASSWORD as SEED_PASSWORD_HINT } from '@shared/demo-accounts';
import { useLogin } from '@/lib/admin-queries';
import { Button } from '@/components/ui/Button';
import { Alert, Field, Input } from '@/components/ui/primitives';

type LoginValues = z.infer<typeof loginSchema>;

interface RedirectState {
  from?: string;
  reason?: 'expired' | 'forbidden';
}

export function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const state = (location.state ?? {}) as RedirectState;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(values: LoginValues) {
    login.mutate(values, {
      // Redirect back to whatever the user was trying to reach, so a session
      // that lapses mid-task does not dump them on a generic dashboard.
      onSuccess: () => void navigate(state.from ?? '/admin/products', { replace: true }),
    });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-3xl">Staff sign in</h1>
      <p className="mt-2 text-sm text-fg-muted">Manage the Yarra &amp; Co. catalog and orders.</p>

      {state.reason === 'expired' ? (
        <Alert className="mt-6" tone="warning" title="Your session expired">
          Sign in again to pick up where you left off.
        </Alert>
      ) : null}

      {login.isError ? (
        <Alert className="mt-6" data-testid="login-error" title="Could not sign in">
          {login.error.message}
        </Alert>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate className="mt-6">
        <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <Field label="Password" htmlFor="login-password" error={errors.password?.message}>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>

        <Button type="submit" className="mt-2 w-full" size="lg" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      <section
        aria-labelledby="demo-accounts"
        className="mt-8 rounded-lg border border-border bg-surface-muted p-4"
      >
        <h2 id="demo-accounts" className="text-xs font-semibold tracking-widest text-fg-muted uppercase">
          Demo accounts
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email} className="flex items-center justify-between gap-3">
              <span>
                <code className="text-fg">{account.email}</code>
                <span className="ml-2 text-xs text-fg-muted">{account.description}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setValue('email', account.email, { shouldValidate: true });
                  setValue('password', SEED_PASSWORD_HINT, { shouldValidate: true });
                }}
                className="shrink-0 text-xs font-medium text-accent-text underline-offset-4 hover:underline"
              >
                Use
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-fg-muted">
          Password for both: <code className="text-fg">{SEED_PASSWORD_HINT}</code>
        </p>
      </section>

      <Link
        to="/"
        className="mt-6 text-center text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
      >
        Back to the shop
      </Link>
    </div>
  );
}
