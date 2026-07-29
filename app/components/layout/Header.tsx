import { NavLink, Link } from 'react-router';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/products', label: 'Shop' },
  { to: '/products?category=coffee', label: 'Coffee' },
  { to: '/products?category=ceramics', label: 'Ceramics' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          to="/"
          className="font-display text-xl tracking-tight text-fg"
          aria-label="Yarra and Co. home"
        >
          Yarra&nbsp;&amp;&nbsp;Co.
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'text-fg' : 'text-fg-muted hover:text-fg',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link
            to="/cart"
            className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <CartIcon />
            <span>Cart</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.55L20.5 8H6" />
      <circle cx="10" cy="20" r="1.25" />
      <circle cx="17" cy="20" r="1.25" />
    </svg>
  );
}
