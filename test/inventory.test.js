const test = require('node:test');
const assert = require('node:assert/strict');

const inventory = require('../lib/inventory');
const orders = require('../lib/orders');

test('the exact last sellable unit can be ordered', function () {
  const products = [{ id: 1, name: 'Rice', stock: 4, reserved: 3 }];

  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), { ok: true });
});

test('cancelling a pending order restores deducted stock and leaves quote reservations intact', function () {
  const db = {
    products: [{ id: 1, name: 'Rice', stock: 3, reserved: 1 }],
    orders: [{
      id: 77,
      status: 'pending',
      paymentMode: 'cash',
      items: [{ id: 1, qty: 2 }],
      total: 0
    }]
  };

  const result = orders.cancel(db, 77, 'Not dispatched');

  assert.equal(result.ok, true);
  assert.equal(db.products[0].stock, 5);
  assert.equal(db.products[0].reserved, 1);
});
