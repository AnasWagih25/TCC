const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/load-ts.cjs');
const { normalizeReceiptText, readReceiptAmount } = loader()('src/lib/payment-receipt-text.ts');

test('normalizes Arabic and Persian digits and decimal separators without changing the amount', () => {
  assert.equal(normalizeReceiptText('١٬٢٥٠٫٥٠'), '1,250.50');
  assert.equal(normalizeReceiptText('۱۲۵٫۰۱'), '125.01');
});

test('reads English EGP receipts, decimal-comma formats and grouped thousands', () => {
  for (const [amount, text] of [[125.01, 'Transfer successful\nTransfer amount\n125.01 EGP'], [1250.5, 'Successful\nAmount EGP 1,250.50'], [1250.5, 'Payment amount: 1.250,50 EGP'], [1250, 'Amount 1,250 EGP'], [125.5, 'Amount 125,50 L.E.']]) assert.equal(readReceiptAmount(text).amount, amount, text);
});

test('reads Arabic transfer labels and Egyptian pound abbreviations', () => {
  for (const text of ['تم التحويل بنجاح\nمبلغ التحويل\n١٢٥٫٠١ جنيه', 'تم التحويل بنجاح\n١٢٥٫٠١ ج.م', 'تم التحويل بنجاح\n١٢٥٫٠١ ج م']) assert.equal(readReceiptAmount(text).amount, 125.01, text);
});

test('ignores fee, balance and reference fields and their following value lines', () => {
  assert.equal(readReceiptAmount('Transfer successful\n125.00 EGP\nFee\n1.00 EGP\nAvailable balance\n500.00 EGP\nTransaction ID\n123456').amount, 125);
  assert.equal(readReceiptAmount('Transfer successful\nAvailable balance\n125.00 EGP').amount, null);
  assert.equal(readReceiptAmount('Transfer successful\nTransaction Amount: 125 EGP\nFee 1 EGP\nReference 125000').amount, 125);
});

test('rejects foreign-currency or currency-free figures even when an amount label is present', () => {
  for (const text of ['Transfer successful\nAmount USD 125.00', 'Transfer successful\nAmount 125.00 EUR\nFee 1.00 EGP', 'Transfer successful\nAmount 125.00', 'Amount 125.00 GBP']) assert.equal(readReceiptAmount(text).amount, null, text);
});

test('rejects failed, cancelled, pending and negative transfers', () => {
  for (const status of ['Failed', 'Declined', 'Pending', 'Cancelled', 'فشل', 'قيد التنفيذ', 'ملغي']) assert.equal(readReceiptAmount(`${status}\nAmount 125 EGP`).amount, null, status);
  for (const sign of ['-', '−']) assert.equal(readReceiptAmount(`Transfer amount: ${sign}125.00 EGP`).amount, null, sign);
});

test('rejects ambiguous transfers, unreadable values and references without inventing an amount', () => {
  for (const text of ['Transfer amount 125.00 EGP\nPayment amount 250.00 EGP', 'Payment successful\nReference 125000\nDate 16/10/2026', 'Amount 12,34,56 EGP', 'Amount 0 EGP', 'Amount 1000001 EGP']) assert.equal(readReceiptAmount(text).amount, null, text);
});
