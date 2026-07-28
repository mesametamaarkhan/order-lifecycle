// This is the client that would change to fetch() calls without affecting
// the rest of the Order module

import * as inventoryService from '../inventory/service';
import { Reservation } from '../inventory/types';

export interface ReserveResult {
    ok: boolean;
    reservation?: Reservation;
    errorCode?: string;
}

export function reserve(productId: string, quantity: number, orderId: string): ReserveResult {
    try {
        const reservation = inventoryService.reserve(productId, quantity, orderId);
        return { ok: true, reservation };
    } catch (err: any) {
        return { ok: false, errorCode: err.code ?? 'INTERNAL_ERROR' };
    }
}

export function confirm(reservationId: string): { ok: boolean } {
    try {
        inventoryService.confirm(reservationId);
        return { ok: true };
    } catch {
        return { ok: false };
    }
}

export function release(reservationId: string): { ok: boolean } {
    try {
        inventoryService.release(reservationId);
        return { ok: true };
    } catch {
        return { ok: false };
    }
}
