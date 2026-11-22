const test = require('node:test');
const assert = require('node:assert/strict');

const orders = require('../lib/orders');
const ledger = require('../lib/ledger');

const datedOrders = [
  { id: 1, date: '28/12/2021' },
  { id: 2, date: '05/01/2022' },
  { id: 3, date: '14/02/2022' },
  { id: 4, date: '18/02/2022' },
  { id: 5, date: '04/03/2022' },
  { id: 6, date: '15/03/2022' }
];

test('order history sorts by calendar date newest first', function () {
  const result = orders.list({ orders: datedOrders });

  assert.deepEqual(result.map(function (order) { return order.id; }), [6, 5, 4, 3, 2, 1]);
});

test('order history date filters include only the selected calendar range', function () {
  const result = orders.list({ orders: datedOrders }, { from: '2022-02-01', to: '2022-02-28' });

  assert.deepEqual(result.map(function (order) { return order.id; }), [4, 3]);
});

test('Khata settlements from the form add numeric amounts without producing a negative due balance', function () {
  const db = {
    nextSettlementId: 501,
    settlements: [],
    customers: [{
      id: 2,
      name: 'Anil Kulkarni',
      openingBalance: 320,
      totalBilled: 0,
      totalSettled: 200
    }]
  };

  const result = ledger.recordSettlement(db, 2, '50', 'upi', 'Part payment');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 250);
  assert.equal(typeof result.customer.totalSettled, 'number');
  assert.equal(result.customer.balance, 70);
  assert.equal(ledger.listCustomers(db)[0].balance, 70);
  assert.equal(result.settlement.amount, 50);
});
