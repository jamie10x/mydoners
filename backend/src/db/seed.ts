import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { categories, deviceKeys, orderItems, orderLogs, orders, products } from "./schema";

async function seed() {
  // Idempotent — re-running this repeatedly during local dev shouldn't pile
  // up duplicate categories/products. Order tables cascade from products, so
  // truncate those too rather than leaving orphaned test orders around.
  await db.execute(
    sql`TRUNCATE TABLE ${orderLogs}, ${orderItems}, ${orders}, ${products}, ${categories}, ${deviceKeys} RESTART IDENTITY CASCADE`,
  );

  const [lavashCategory] = await db
    .insert(categories)
    .values({ name: "Lavash", displayOrder: 1 })
    .returning();
  const [burgerCategory] = await db
    .insert(categories)
    .values({ name: "NonBurger", displayOrder: 2 })
    .returning();
  const [drinksCategory] = await db
    .insert(categories)
    .values({ name: "Drinks", displayOrder: 3 })
    .returning();
  const [sidesCategory] = await db
    .insert(categories)
    .values({ name: "Sides & Sauces", displayOrder: 4 })
    .returning();

  await db.insert(products).values([
    {
      categoryId: lavashCategory!.id,
      name: "Classic Lavash",
      description: "Grilled meat, fresh vegetables, house sauce, wrapped in lavash bread.",
      basePrice: "0",
      hasMeatChoice: true,
      beefPrice: "38000",
      chickenPrice: "34000",
      isAvailable: true,
    },
    {
      categoryId: burgerCategory!.id,
      name: "NonBurger Classic",
      description: "Signature burger on traditional non bread.",
      basePrice: "0",
      hasMeatChoice: true,
      beefPrice: "42000",
      chickenPrice: "37000",
      isAvailable: true,
    },
    {
      categoryId: drinksCategory!.id,
      name: "Coca-Cola 0.5L",
      description: null,
      basePrice: "12000",
      hasMeatChoice: false,
      isAvailable: true,
    },
    {
      categoryId: sidesCategory!.id,
      name: "French Fries",
      description: null,
      basePrice: "18000",
      hasMeatChoice: false,
      isAvailable: true,
    },
    {
      categoryId: sidesCategory!.id,
      name: "Cheese Sauce",
      description: null,
      basePrice: "6000",
      hasMeatChoice: false,
      isAvailable: true,
    },
  ]);

  // Local-dev device key so the Android KDS app has something to authenticate
  // with without a manual admin step — see docs/auth-contract.md #2.
  const devApiKey = randomBytes(24).toString("hex");
  await db.insert(deviceKeys).values({ label: "kitchen-tablet-dev", apiKey: devApiKey });

  console.log("Seeded categories, products, and a dev KDS device key.");
  console.log(`KDS_DEVICE_API_KEY=${devApiKey}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
