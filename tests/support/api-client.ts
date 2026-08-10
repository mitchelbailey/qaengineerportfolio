import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Cart, Order, Product, User } from '@shared/schemas';
import type { OrderStatus } from '@shared/order-status';
import { DEMO_ACCOUNTS, SEED_PASSWORD } from './constants';

/**
 * `APIResponse.json()` is typed `Promise<any>` by Playwright, since it has no
 * way to know the server's response shape. Left alone, that `any` quietly
 * infects every value it touches — eslint's `no-unsafe-*` rules exist
 * specifically to catch that spread. This is the one audited place it is
 * cast away, behind an explicit generic, rather than sprinkling `as` through
 * every call site.
 */
export async function readJson<T>(response: APIResponse): Promise<T> {
  return (await response.json()) as T;
}

export interface SeedOrderSpec {
  status?: OrderStatus;
  email?: string;
  /** Epoch ms; defaults to now. Pin it for visual tests. */
  placedAt?: number;
  items: Array<{ slug: string; quantity: number }>;
}

export interface SeedRequest {
  stock?: Record<string, number>;
  cart?: Array<{ slug: string; quantity: number }>;
  promoCode?: string | null;
  orders?: SeedOrderSpec[];
}

/**
 * A thin, typed wrapper over the app's JSON API.
 *
 * Deliberately **not** a page object: it never touches `page`, only an
 * `APIRequestContext`. That is what lets the exact same client back both the
 * API suite (via the bare `request` fixture) and the `seed` fixture used by
 * E2E specs to jump straight into a UI state without clicking through it —
 * one implementation, two call sites, no duplication between them.
 *
 * `context.request` shares its cookie jar with the browser context it came
 * from, so calls made through this client in an E2E test land in the exact
 * same session as the page the test is driving.
 */
export class ApiClient {
  /**
   * Public and readonly: most specs use the typed methods below, but API
   * tests regularly need to hit an endpoint this client hasn't wrapped, or
   * send a deliberately malformed body to test validation. `api.request` is
   * the escape hatch for that, rather than every possible request shape
   * needing its own method here.
   */
  constructor(readonly request: APIRequestContext) {}

  async health() {
    const response = await this.request.get('/api/health');
    return readJson<{ status: string; testApiEnabled: boolean }>(response);
  }

  /** Wipe this session and lay down a fresh copy of the seed catalog. */
  async reset(): Promise<void> {
    const response = await this.request.post('/api/test/reset');
    if (!response.ok()) throw new Error(`Test reset failed: ${response.status()}`);
  }

  /** Declaratively push this session into a given state. See worker/routes/test.ts. */
  async seed(body: SeedRequest): Promise<{ orderReferences: string[] }> {
    const response = await this.request.post('/api/test/seed', { data: body });
    if (!response.ok()) {
      throw new Error(`Test seed failed: ${response.status()} ${await response.text()}`);
    }
    return readJson(response);
  }

  async state(): Promise<{
    sessionId: string;
    user: User | null;
    productCount: number;
    cartItemCount: number;
    orderCount: number;
  }> {
    const response = await this.request.get('/api/test/state');
    return readJson(response);
  }

  /** Forces the current admin/viewer session to look already-expired. */
  async expireSession(): Promise<void> {
    const response = await this.request.post('/api/test/session/expire');
    if (!response.ok()) throw new Error(`Session expiry failed: ${response.status()}`);
  }

  /**
   * Signs in via the API rather than the UI.
   *
   * This is the isolation-safe alternative to a shared `storageState` file. A
   * `storageState` captured once and reused across tests would give every one
   * of them the *same* session cookie, and therefore the same private catalog
   * — exactly the collision the whole session model exists to prevent. Calling
   * the login endpoint inside each test's own context authenticates that
   * test's session without paying for a UI login on every spec that merely
   * needs to *be* signed in rather than test signing in.
   */
  async login(email: string, password: string): Promise<User> {
    const response = await this.request.post('/api/auth/login', { data: { email, password } });
    if (!response.ok()) {
      throw new Error(`Login failed for ${email}: ${response.status()} ${await response.text()}`);
    }
    const body = await readJson<{ user: User }>(response);
    return body.user;
  }

  async loginAsAdmin(): Promise<User> {
    const admin = DEMO_ACCOUNTS.find((account) => account.role === 'admin');
    if (!admin) throw new Error('No seeded admin account configured');
    return this.login(admin.email, SEED_PASSWORD);
  }

  async loginAsViewer(): Promise<User> {
    const viewer = DEMO_ACCOUNTS.find((account) => account.role === 'viewer');
    if (!viewer) throw new Error('No seeded viewer account configured');
    return this.login(viewer.email, SEED_PASSWORD);
  }

  async getProduct(slug: string): Promise<Product> {
    const response = await this.request.get(`/api/products/${slug}`);
    if (!response.ok()) throw new Error(`GET /api/products/${slug} -> ${response.status()}`);
    return readJson(response);
  }

  async getCart(): Promise<Cart> {
    const response = await this.request.get('/api/cart');
    return readJson(response);
  }

  /** Add a seeded product to the cart by slug, resolving the id first. */
  async addToCart(slug: string, quantity = 1): Promise<Cart> {
    const product = await this.getProduct(slug);
    const response = await this.request.post('/api/cart/items', {
      data: { productId: product.id, quantity },
    });
    if (!response.ok()) {
      throw new Error(`Add to cart failed for ${slug}: ${response.status()} ${await response.text()}`);
    }
    return readJson(response);
  }

  async getOrder(reference: string): Promise<Order> {
    const response = await this.request.get(`/api/orders/${reference}`);
    if (!response.ok()) throw new Error(`GET /api/orders/${reference} -> ${response.status()}`);
    return readJson(response);
  }
}
