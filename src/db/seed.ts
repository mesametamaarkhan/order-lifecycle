import fs from 'fs';
import path from 'path';
import db from './connection';

interface SeedProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
}

interface SeedInventory {
  product_id: string;
  available: number;
}

interface SeedFile {
  products: SeedProduct[];
  inventory: SeedInventory[];
}

function seed() {
  const seedPath = process.env.SEED_PATH || path.join(__dirname, '..', '..', 'seeds', 'products_inventory.json');
  const raw = fs.readFileSync(seedPath, 'utf-8');
  const data: SeedFile = JSON.parse(raw);

  const insertProduct = db.prepare(
    `INSERT INTO products (id, name, brand, category, price)
     VALUES (@id, @name, @brand, @category, @price)
     ON CONFLICT(id) DO UPDATE SET name=@name, brand=@brand, category=@category, price=@price`
  );

  const insertInventory = db.prepare(
    `INSERT INTO inventory (product_id, total, reserved)
     VALUES (@product_id, @total, 0)
     ON CONFLICT(product_id) DO UPDATE SET total=@total`
  );

  const tx = db.transaction((seedData: SeedFile) => {
    for (const p of seedData.products) {
      insertProduct.run(p);
    }
    for (const inv of seedData.inventory) {
      insertInventory.run({ product_id: inv.product_id, total: inv.available });
    }
  });

  tx(data);
  console.log(`Seeded ${data.products.length} products and ${data.inventory.length} inventory rows from ${seedPath}`);
}

seed();