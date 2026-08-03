import { test, expect } from '../fixtures/test';
import { SEED_PRODUCTS } from '@shared/catalog-seed';

/* 
 *
TC-028 | an out-of-stock product shows a disabled state instead of Add to cart
TC-029 | adding a quantity greater than 1 adds that many units to the cart
TC-030 | a reviews fetch failure shows a retry state, and retry recovers it
 */
test.describe('product detail', () => {

  test("TC-027 | the quantity stepper is bounded by available stock", async({ api, productDetailPage }) => {
    await api.reset();

    await productDetailPage.goto('brighton-linen-apron');
    
  });

});