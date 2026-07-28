import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../shared/errors';
import * as productRepo from '../product/repository';
import * as repo from './repository';
import { Reservation } from './types';

const RESERVATION_TTL_MS = 5 * 60 * 1000;

export function reserve(productId: string, quantity: number, orderId: string): Reservation {
    if (!productRepo.findById(productId)) {
        throw new AppError('PRODUCT_NOT_FOUND', `Product ${productId} not found`);
    }
    if (quantity <= 0) {
        throw new AppError('VALIDATION_ERROR', 'quantity must be > 0');
    }

    const ok = repo.tryReserve(productId, quantity);
    if (!ok) {
        throw new AppError('INSUFFICIENT_STOCK', `Not enough stock for product ${productId}`);
    }

    const now = new Date();
    const reservation: Reservation = {
        id: uuidv4(),
        order_id: orderId,
        product_id: productId,
        quantity,
        status: 'RESERVED',
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + RESERVATION_TTL_MS).toISOString(),
    };
    repo.insertReservation(reservation);
    return reservation;
}

export function confirm(reservationId: string): void {
    const outcome = repo.confirmReservation(reservationId);
    if (outcome === 'conflict') {
        throw new AppError('STATE_CONFLICT', `Cannot confirm reservation ${reservationId}`);
    }
}

export function release(reservationId: string): void {
    const outcome = repo.releaseReservation(reservationId);
    if (outcome === 'conflict') {
        throw new AppError('STATE_CONFLICT', `Cannot release reservation ${reservationId}`);
    }
}

export function getInventory(productId: string) {
    const inv = repo.getInventory(productId);
    if (!inv) {
        throw new AppError('PRODUCT_NOT_FOUND', `Product ${productId} not found`);
    }
    return { ...inv, sellable: inv.total - inv.reserved };
}
