const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/load-ts.cjs');
const { amountMatchesPayment, matchPaymentPlan, paymentAmounts, remainingAfterPayment } = loader()('src/lib/payment-types.ts');

test('a transfer may match exact required piastres or the next EGP 1, 5 or 10 boundary', () => {
  for (const [received, required] of [[125.13, 125.13], [126, 125.13], [130, 125.13], [192.5, 192.5], [193, 192.5], [195, 192.5], [200, 192.5], [250.01, 250.01], [251, 250.01], [255, 250.01], [260, 250.01], [125, 125], [130, 125], [0.01, 0.01], [1, 0.01], [5, 0.01], [10, 0.01]]) assert.equal(amountMatchesPayment(received, required), true, `${received} for ${required}`);
  for (const [received, required] of [[125.12, 125.13], [125.5, 125.13], [126.01, 125.13], [127, 125.13], [126, 125], [0, 0], [1.001, 1], [125.134, 125.13], [-126, 125.13], [Infinity, 125.13], [125.13, NaN]]) assert.equal(amountMatchesPayment(received, required), false, `${received} for ${required}`);
});

test('deposit and full classification use allowed amounts and credit the actual transfer against the balance', () => {
  assert.equal(paymentAmounts(250.01, 'deposit').amountDue, 125.01);
  assert.equal(matchPaymentPlan(250.01, 125.01), 'deposit');
  assert.equal(matchPaymentPlan(250.01, 126), 'deposit');
  assert.equal(remainingAfterPayment(250.01, 126), 124.01);
  assert.equal(matchPaymentPlan(250.01, 250.01), 'full');
  assert.equal(matchPaymentPlan(250.01, 251), 'full');
  assert.equal(remainingAfterPayment(250.01, 251), 0);
  assert.equal(matchPaymentPlan(250.01, 125), null);
  assert.equal(matchPaymentPlan(250.01, 126.01), null);
  assert.equal(matchPaymentPlan(250.01, 252), null);
  assert.equal(matchPaymentPlan(250.001, 251), null);
  for (const received of [193, 195, 200]) {
    assert.equal(matchPaymentPlan(385, received), 'deposit');
    assert.equal(remainingAfterPayment(385, received), 385 - received);
  }
  assert.equal(matchPaymentPlan(385, 385), 'full');
  assert.equal(matchPaymentPlan(385, 390), 'full');
  for (const received of [192.49, 194, 196, 199, 201, 400]) assert.equal(matchPaymentPlan(385, received), null, String(received));
});

test('tiny totals that overlap deposit rounding and full payment are always classified as full', () => {
  for (const total of [0.01, 0.02, 0.99, 1]) for (const received of [1, 5, 10]) assert.equal(matchPaymentPlan(total, received), 'full');
  assert.equal(matchPaymentPlan(0.01, 0.01), 'full');
  assert.equal(matchPaymentPlan(1.5, 1), 'deposit');
  assert.equal(matchPaymentPlan(1.5, 5), 'full');
  assert.equal(matchPaymentPlan(9, 5), 'deposit');
  assert.equal(matchPaymentPlan(9, 10), 'full');
  assert.equal(remainingAfterPayment(1.5, 1), 0.5);
  assert.equal(matchPaymentPlan(0, 1), null);
});
