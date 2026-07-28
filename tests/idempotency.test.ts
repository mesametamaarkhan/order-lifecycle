import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedTestCatalog } from './helpers';
import * as orderService from '../src/order/service';
import * as inventoryService from '../src/inventory/service';

describe('idempotency', () => {
    beforeEach(() => {
        resetDb();
        seedTestCatalog();
    });

    it('does not double-reserve or double-decrement stock on a duplicate key', () => {
        const first = orderService.placeOrder('dup-key', [{ product_id: 'P-HEALTHY', quantity: 3 }]);
        const second = orderService.placeOrder('dup-key', [{ product_id: 'P-HEALTHY', quantity: 3 }]);

        expect(first.id).toBe(second.id);
        expect(second.status).toBe('CONFIRMED');

        const inv = inventoryService.getInventory('P-HEALTHY');
        expect(inv.total).toBe(47);
    });

    it('replaying a failed order returns the same FAILED order, does not retry', () => {
        const first = orderService.placeOrder('dup-fail-key', [{ product_id: 'P-ZERO', quantity: 1 }]);
        const second = orderService.placeOrder('dup-fail-key', [{ product_id: 'P-ZERO', quantity: 1 }]);

        expect(first.id).toBe(second.id);
        expect(second.status).toBe('FAILED');
    });
});
