import db from "../db/connection";
import { InventoryRow, Reservation, ReservationStatus } from "./types";

export function getInventory(productId: string): InventoryRow | undefined {
	return db
		.prepare("SELECT * FROM inventory WHERE product_id = ?")
		.get(productId) as InventoryRow | undefined;
}

// Atomically reserve qty units of a product
export function tryReserve(productId: string, qty: number): boolean {
	const result = db
		.prepare(
			`UPDATE inventory
       SET reserved = reserved + ?
       WHERE product_id = ? AND (total - reserved) >= ?`,
		)
		.run(qty, productId, qty);
	return result.changes > 0;
}

export function insertReservation(r: Reservation): void {
	db.prepare(
		`INSERT INTO reservations (id, order_id, product_id, quantity, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
	).run(
		r.id,
		r.order_id,
		r.product_id,
		r.quantity,
		r.status,
		r.created_at,
		r.expires_at,
	);
}

export function findReservation(id: string): Reservation | undefined {
	return db.prepare("SELECT * FROM reservations WHERE id = ?").get(id) as
		| Reservation
		| undefined;
}

export function findReservationsByOrder(orderId: string): Reservation[] {
	return db
		.prepare("SELECT * FROM reservations WHERE order_id = ?")
		.all(orderId) as Reservation[];
}

// move reserved to confirmed and deduct from total/available stock
export function confirmReservation(id: string): "ok" | "noop" | "conflict" {
	const res = findReservation(id);
	if (!res) return "conflict";
	if (res.status === "CONFIRMED") return "noop";
	if (res.status !== "RESERVED") return "conflict";

	const tx = db.transaction(() => {
		db.prepare(
			`UPDATE reservations SET status = 'CONFIRMED' WHERE id = ? AND status = 'RESERVED'`,
		).run(id);
		db.prepare(
			`UPDATE inventory SET total = total - ?, reserved = reserved - ? WHERE product_id = ?`,
		).run(res.quantity, res.quantity, res.product_id);
	});
	tx();
	return "ok";
}

// release the reservation and reset available stock
export function releaseReservation(
	id: string,
	toStatus: Extract<ReservationStatus, "RELEASED" | "EXPIRED"> = "RELEASED",
): "ok" | "noop" | "conflict" {
	const res = findReservation(id);
	if (!res) return "conflict";
	if (res.status === "RELEASED" || res.status === "EXPIRED") return "noop";
	if (res.status !== "RESERVED") return "conflict";

	const tx = db.transaction(() => {
		db.prepare(
			`UPDATE reservations SET status = ? WHERE id = ? AND status = 'RESERVED'`,
		).run(toStatus, id);
		db.prepare(
			`UPDATE inventory SET reserved = reserved - ? WHERE product_id = ?`,
		).run(res.quantity, res.product_id);
	});
	tx();
	return "ok";
}
