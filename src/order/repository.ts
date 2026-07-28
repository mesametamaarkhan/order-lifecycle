import db from '../db/connection';
import { Order, OrderItem, OrderWithItems } from './types';

export function findByIdempotencyKey(key: string): Order | undefined {
    return db.prepare('SELECT * FROM orders WHERE idempotency_key = ?').get(key) as Order | undefined;
}

export function findById(id: string): Order | undefined {
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined;
}

export function findItemsByOrder(orderId: string): OrderItem[] {
    return db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as OrderItem[];
}

export function withItems(order: Order): OrderWithItems {
    return { ...order, items: findItemsByOrder(order.id) };
}

export function insertOrder(order: Order): void {
    db.prepare(
        `INSERT INTO orders (id, idempotency_key, status, failure_reason, total_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
        order.id,
        order.idempotency_key,
        order.status,
        order.failure_reason,
        order.total_amount,
        order.created_at,
        order.updated_at
    );
}

export function insertItem(item: OrderItem): void {
    db.prepare(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, line_status, reservation_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
        item.id,
        item.order_id,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.line_status,
        item.reservation_id
    );
}

export function updateItemStatus(id: string, lineStatus: OrderItem['line_status']): void {
    db.prepare('UPDATE order_items SET line_status = ? WHERE id = ?').run(lineStatus, id);
}

export function updateOrderStatus(
    id: string,
    status: Order['status'],
    opts: { failureReason?: string; totalAmount?: number } = {}
): void {
    db.prepare(
        `UPDATE orders SET status = ?, failure_reason = ?, total_amount = COALESCE(?, total_amount), updated_at = ?
     WHERE id = ?`
    ).run(status, opts.failureReason ?? null, opts.totalAmount ?? null, new Date().toISOString(), id);
}
