import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../shared/errors';
import * as productRepo from '../product/repository';
import * as inventoryClient from './inventoryClient';
import * as repo from './repository';
import { Order, OrderItem, OrderItemInput, OrderWithItems } from './types';

export function placeOrder(idempotencyKey: string, items: OrderItemInput[]): OrderWithItems {
    if (!idempotencyKey) {
        throw new AppError('VALIDATION_ERROR', 'idempotency_key is required');
    }
    if (!items || items.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'items must be a non-empty array');
    }

    // 1. Idempotency check first 
    const existing = repo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
        return repo.withItems(existing);
    }

    // 2. Create Order row in PENDING. 
    const orderId = uuidv4();
    const now = new Date().toISOString();
    try {
        repo.insertOrder({
            id: orderId,
            idempotency_key: idempotencyKey,
            status: 'PENDING',
            failure_reason: null,
            total_amount: null,
            created_at: now,
            updated_at: now,
        });
    } catch (err: any) {
        if (String(err.message).includes('UNIQUE constraint failed')) {
            const winner = repo.findByIdempotencyKey(idempotencyKey);
            if (winner) return repo.withItems(winner);
        }
        throw err;
    }

    // Pre-create order_items rows as NOT_ATTEMPTED, snapshotting unit_price now.
    const itemRows: OrderItem[] = items.map((item) => {
        const product = productRepo.findById(item.product_id);
        if (!product) {
            throw new AppError('PRODUCT_NOT_FOUND', `Product ${item.product_id} not found`);
        }
        const row: OrderItem = {
            id: uuidv4(),
            order_id: orderId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: product.price,
            line_status: 'NOT_ATTEMPTED',
            reservation_id: null,
        };
        repo.insertItem(row);
        return row;
    });

    // 3. Reserve each line in order. Stop at first failure (all-or-nothing).
    const reservationIds: string[] = [];
    let failureReason: string | null = null;

    for (const row of itemRows) {
        const result = inventoryClient.reserve(row.product_id, row.quantity, orderId);
        if (!result.ok) {
            failureReason = `Reservation failed for ${row.product_id}: ${result.errorCode}`;
            repo.updateItemStatus(row.id, 'FAILED');
            break;
        }
        reservationIds.push(result.reservation!.id);
        row.reservation_id = result.reservation!.id;
    }

    if (failureReason) {
        // Compensation: release every reservation already made for this order.
        for (const resId of reservationIds) {
            inventoryClient.release(resId);
        }
        for (const row of itemRows) {
            if (row.reservation_id) {
                repo.updateItemStatus(row.id, 'RESERVED_THEN_RELEASED');
            }
        }
        repo.updateOrderStatus(orderId, 'FAILED', { failureReason });
        const failed = repo.findById(orderId)!;
        return repo.withItems(failed);
    }

    // 4. All reservations succeeded -> confirm each one, decrementing stock.
    let confirmFailure = false;
    for (const row of itemRows) {
        const result = inventoryClient.confirm(row.reservation_id!);
        if (!result.ok) {
            confirmFailure = true;
            break;
        }
        repo.updateItemStatus(row.id, 'CONFIRMED');
    }

    if (confirmFailure) {
        repo.updateOrderStatus(orderId, 'FAILED', {
            failureReason: 'Partial confirm failure -- unrecoverable, needs manual reconciliation',
        });
        const failed = repo.findById(orderId)!;
        return repo.withItems(failed);
    }

    const totalAmount = itemRows.reduce((sum, r) => sum + r.unit_price * r.quantity, 0);
    repo.updateOrderStatus(orderId, 'CONFIRMED', { totalAmount });
    const confirmed = repo.findById(orderId)!;
    return repo.withItems(confirmed);
}

export function getOrder(id: string): OrderWithItems {
    const order = repo.findById(id);
    if (!order) {
        throw new AppError('ORDER_NOT_FOUND', `Order ${id} not found`);
    }
    return repo.withItems(order);
}
