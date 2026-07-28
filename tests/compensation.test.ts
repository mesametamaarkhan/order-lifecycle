import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, seedTestCatalog } from './helpers';
import * as orderService from '../src/order/service';
import * as inventoryService from '../src/inventory/service';

describe('compensation on failure', () => {
    beforeEach(() => {
        resetDb();
        seedTestCatalog();
    });

    it('releases reserved stock when a line fails due to insufficient stock', () => {
        const order = orderService.placeOrder('key-1', [
            { product_id: 'P-HEALTHY', quantity: 2 },
            { product_id: 'P-ZERO', quantity: 1 },
        ]);

        expect(order.status).toBe('FAILED');
        expect(order.failure_reason).toContain('P-ZERO');

        const healthyInv = inventoryService.getInventory('P-HEALTHY');
        expect(healthyInv.reserved).toBe(0);
        expect(healthyInv.total).toBe(50);

        const zeroInv = inventoryService.getInventory('P-ZERO');
        expect(zeroInv.reserved).toBe(0);

        const healthyLine = order.items.find((i) => i.product_id === 'P-HEALTHY')!;
        const zeroLine = order.items.find((i) => i.product_id === 'P-ZERO')!;
        expect(healthyLine.line_status).toBe('RESERVED_THEN_RELEASED');
        expect(zeroLine.line_status).toBe('FAILED');
    });

    it('marks later lines NOT_ATTEMPTED when an earlier line fails (short-circuit)', () => {
        const order = orderService.placeOrder('key-2', [
            { product_id: 'P-ZERO', quantity: 1 },
            { product_id: 'P-HEALTHY', quantity: 2 },
        ]);

        expect(order.status).toBe('FAILED');
        const secondLine = order.items.find((i) => i.product_id === 'P-HEALTHY')!;
        expect(secondLine.line_status).toBe('NOT_ATTEMPTED');

        const healthyInv = inventoryService.getInventory('P-HEALTHY');
        expect(healthyInv.reserved).toBe(0);
    });

    it('confirms and decrements stock on a fully successful order', () => {
        const order = orderService.placeOrder('key-3', [{ product_id: 'P-HEALTHY', quantity: 5 }]);

        expect(order.status).toBe('CONFIRMED');
        expect(order.total_amount).toBe(5000);

        const inv = inventoryService.getInventory('P-HEALTHY');
        expect(inv.total).toBe(45);
        expect(inv.reserved).toBe(0);
    });
});
