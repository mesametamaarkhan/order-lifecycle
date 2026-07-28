import db from '../src/db/connection';

export function resetDb() {
    db.exec(`
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM reservations;
    DELETE FROM inventory;
    DELETE FROM products;
  `);
}

export function seedTestCatalog() {
    const insertProduct = db.prepare(
        `INSERT INTO products (id, name, brand, category, price) VALUES (@id, @name, @brand, @category, @price)`
    );
    const insertInventory = db.prepare(
        `INSERT INTO inventory (product_id, total, reserved) VALUES (@product_id, @total, 0)`
    );

    const catalog = [
        { id: 'P-HEALTHY', name: 'Healthy Item', brand: 'Test', category: 'Test', price: 1000, available: 50 },
        { id: 'P-LOW', name: 'Low Stock Item', brand: 'Test', category: 'Test', price: 2000, available: 1 },
        { id: 'P-ZERO', name: 'Zero Stock Item', brand: 'Test', category: 'Test', price: 3000, available: 0 },
    ];

    for (const p of catalog) {
        insertProduct.run(p);
        insertInventory.run({ product_id: p.id, total: p.available });
    }
}
