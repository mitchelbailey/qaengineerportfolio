/**
 * Simulated payment gateway.
 *
 * Real gateways expose magic card numbers for exactly this reason: a test suite
 * needs a *deterministic* decline, not a random one. The checkout UI lists these
 * on screen so a reviewer clicking through the demo can trigger the failure
 * paths without reading the source.
 */

export type PaymentOutcome = 'approved' | 'declined' | 'insufficient_funds' | 'processing_error';

export const TEST_CARDS: Record<Exclude<PaymentOutcome, 'approved'> | 'approved', string> = {
  approved: '4242424242424242',
  declined: '4000000000000002',
  insufficient_funds: '4000000000009995',
  processing_error: '4000000000000119',
};

export const PAYMENT_OUTCOME_MESSAGES: Record<Exclude<PaymentOutcome, 'approved'>, string> = {
  declined: 'Your card was declined. Check the details or try another card.',
  insufficient_funds: 'There are insufficient funds on this card.',
  processing_error: 'We could not reach the payment provider. No charge was made — please try again.',
};

const OUTCOME_BY_CARD = new Map<string, PaymentOutcome>([
  [TEST_CARDS.declined, 'declined'],
  [TEST_CARDS.insufficient_funds, 'insufficient_funds'],
  [TEST_CARDS.processing_error, 'processing_error'],
]);

/**
 * Any 16-digit card that is not a known failure card is approved. That keeps the
 * happy path easy to reach by hand while leaving the failure paths pinned to
 * specific numbers.
 */
export function simulatePayment(cardNumber: string): PaymentOutcome {
  const digits = cardNumber.replace(/\s+/g, '');
  return OUTCOME_BY_CARD.get(digits) ?? 'approved';
}

/** Last four digits, for storing on the order without storing the card. */
export function cardLast4(cardNumber: string): string {
  return cardNumber.replace(/\s+/g, '').slice(-4);
}
