export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';
export type LineStatus = 'CONFIRMED' | 'RESERVED_THEN_RELEASED' | 'FAILED' | 'NOT_ATTEMPTED';

export interface OrderItemInput {
    product_id: string;
    quantity: number;
}

export interface Order {
    id: string;
    idempotency_key: string;
    status: OrderStatus;
    failure_reason: string | null;
    total_amount: number | null;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    line_status: LineStatus;
    reservation_id: string | null;
}

export interface OrderWithItems extends Order {
    items: OrderItem[];
}
