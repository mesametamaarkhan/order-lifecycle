import db from '../db/connection';
import { Product } from './types';

export function findById(id: string): Product | undefined {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
}

export function findAll(): Product[] {
    return db.prepare('SELECT * FROM products').all() as Product[];
}