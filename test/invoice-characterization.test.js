const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');
const reports = require('../lib/reports');

test('invoice uses the billed HSN GST and total', function () {
  const order = {
    id: 42,
    date: '15/03/2022',
    customer: 'Test customer',
    status: 'completed',
    coupon: '',
    items: [{ id: 1, sku: 'GRN-001', name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
    subtotal: 100,
    discount: 0,
    tax: 5,
    total: 105
  };

  const billed = pricing.computeTotals(order.items, order.coupon);
  const invoiced = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { tax: billed.tax, total: billed.total },
    { tax: 5, total: 105 }
  );
  assert.deepEqual(
    {
      gstPercent: invoiced.rows[0].gstPercent,
      lineTax: invoiced.rows[0].lineTax,
      cgst: invoiced.cgst,
      sgst: invoiced.sgst,
      tax: invoiced.tax,
      total: invoiced.total
    },
    { gstPercent: 5, lineTax: 5, cgst: 2.5, sgst: 2.5, tax: 5, total: 105 }
  );

  const html = invoice.render(order);
  assert.match(html, /5%/);
  assert.match(html, /₹5\.00/);
  assert.match(html, /Invoice Total<\/td><td class="r">₹105\.00/);
  assert.doesNotMatch(html, /differs from Order Ledger recorded total/);
});

test('invoice applies the same capped SAVE10 discount and tax as order pricing', function () {
  const order = {
    id: 43,
    coupon: 'SAVE10',
    items: [{ id: 8, sku: 'BEV-001', name: 'Tea', hsn: '0902', price: 2000, qty: 1 }]
  };

  const billed = pricing.computeTotals(order.items, order.coupon);
  const invoiced = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { discount: billed.discount, tax: billed.tax, total: billed.total },
    { discount: 150, tax: 333, total: 2183 }
  );
  assert.deepEqual(
    { discount: invoiced.discount, tax: invoiced.tax, total: invoiced.total },
    { discount: 150, tax: 333, total: 2183 }
  );
  assert.equal(invoiced.rows[0].lineTax, 333);
});

test('GST reconciliation matches an invoice using the billed HSN tax', function () {
  const order = {
    id: 44,
    date: '15/03/2022',
    customer: 'Test customer',
    coupon: '',
    items: [{ id: 1, sku: 'GRN-001', name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
    subtotal: 100,
    discount: 0,
    tax: 5,
    total: 105
  };

  const reconciliation = reports.getGstReconciliation({ orders: [order] });

  assert.equal(reconciliation.totalChecked, 1);
  assert.equal(reconciliation.mismatchCount, 0);
  assert.deepEqual(
    {
      ledgerTax: reconciliation.rows[0].ledgerTax,
      invoiceTax: reconciliation.rows[0].invoiceTax,
      ledgerTotal: reconciliation.rows[0].ledgerTotal,
      invoiceTotal: reconciliation.rows[0].invoiceTotal,
      delta: reconciliation.rows[0].delta,
      matched: reconciliation.rows[0].matched
    },
    { ledgerTax: 5, invoiceTax: 5, ledgerTotal: 105, invoiceTotal: 105, delta: 0, matched: true }
  );
});
