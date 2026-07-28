import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedTestCatalog } from './helpers';
import * as orderService from '../src/order/service';
import * as inventoryService from '../src/inventory/service';

describe('concurrency safety', () => {
    beforeEach(() => {
        resetDb();
        seedTestCatalog();
    });

    it('exactly one of two concurrent orders for the last unit succeeds', async () => {
        const results = await Promise.all([
            Promise.resolve().then(() => orderService.placeOrder('race-1', [{ product_id: 'P-LOW', quantity: 1 }])),
            Promise.resolve().then(() => orderService.placeOrder('race-2', [{ product_id: 'P-LOW', quantity: 1 }])),
        ]);

        const confirmed = results.filter((r) => r.status === 'CONFIRMED');
        const failed = results.filter((r) => r.status === 'FAILED');

        expect(confirmed.length).toBe(1);
        expect(failed.length).toBe(1);

        const inv = inventoryService.getInventory('P-LOW');
        expect(inv.total).toBe(0);
        expect(inv.reserved).toBe(0);
    });
});
