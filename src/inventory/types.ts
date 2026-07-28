export type ReservationStatus = 'RESERVED' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';

export interface InventoryRow {
    product_id: string;
    total: number;
    reserved: number;
}

export interface Reservation {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    status: ReservationStatus;
    created_at: string;
    expires_at: string;
}