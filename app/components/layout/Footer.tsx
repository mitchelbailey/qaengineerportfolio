import { Link } from 'react-router';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-muted">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg text-fg">Yarra&nbsp;&amp;&nbsp;Co.</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">
            Considered homewares and coffee goods, made and sourced in Melbourne since 2019.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-sans text-xs font-semibold tracking-widest text-fg-muted uppercase">Shop</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/products" className="text-fg-soft hover:text-accent-text">
                All products
              </Link>
            </li>
            <li>
              <Link to="/products?category=coffee" className="text-fg-soft hover:text-accent-text">
                Coffee
              </Link>
            </li>
            <li>
              <Link to="/products?category=ceramics" className="text-fg-soft hover:text-accent-text">
                Ceramics
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-sans text-xs font-semibold tracking-widest text-fg-muted uppercase">
            About this site
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            This is a demonstration application built as the target for a production-grade Playwright test
            suite. No real orders are placed and no payment details are collected.
          </p>
          <a
            href="https://github.com"
            className="mt-4 inline-block text-sm font-medium text-accent-text hover:underline"
          >
            View the test suite on GitHub
          </a>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-fg-muted sm:px-6">
          Demo application · Prices in AUD and include GST · No goods are actually sold
        </p>
      </div>
    </footer>
  );
}
