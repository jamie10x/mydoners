// One-off insert of the real MyDoners menu (from the physical menu boards),
// run once against production. NOT the same as seed.ts, which is throwaway
// dev/test fixture data — this is real business data. Safe to re-run:
// it upserts by (categoryId, name) so repeated runs don't duplicate rows.
import { db } from "./index";
import { categories, products } from "./schema";
import { eq, and } from "drizzle-orm";

interface ProductInput {
  name: string;
  description?: string;
  basePrice?: number;
  beefPrice?: number;
  chickenPrice?: number;
}

const MENU: Record<string, ProductInput[]> = {
  Pizza: [
    { name: "Peperoni Pizza (Small)", basePrice: 70000 },
    { name: "Peperoni Pizza (Large)", basePrice: 85000 },
    { name: "Margarita Pizza (Small)", basePrice: 65000 },
    { name: "Margarita Pizza (Large)", basePrice: 80000 },
    { name: "Qo'ziqorinli Pizza (Small)", basePrice: 65000 },
    { name: "Qo'ziqorinli Pizza (Large)", basePrice: 80000 },
    { name: "Go'shtli Pizza (Small)", basePrice: 75000 },
    { name: "Go'shtli Pizza (Large)", basePrice: 90000 },
    { name: "Sirli Pizza (Small)", basePrice: 60000 },
    { name: "Sirli Pizza (Large)", basePrice: 75000 },
    { name: "Qazili Pizza (Small)", basePrice: 75000 },
    { name: "Qazili Pizza (Large)", basePrice: 100000 },
    { name: "Assorti Pizza (Small)", basePrice: 80000 },
    { name: "Assorti Pizza (Large)", basePrice: 95000 },
  ],
  Lavash: [
    { name: "Lavash", beefPrice: 35000, chickenPrice: 25000 },
    { name: "Big Lavash", beefPrice: 40000, chickenPrice: 30000 },
    { name: "Sirli Lavash", beefPrice: 40000, chickenPrice: 30000 },
    { name: "Big Sirli Lavash", beefPrice: 45000, chickenPrice: 35000 },
    { name: "Achchiq Lavash", beefPrice: 35000, chickenPrice: 25000 },
    { name: "Tandir Lavash", beefPrice: 35000, chickenPrice: 25000 },
  ],
  Burger: [
    { name: "GamBurger", basePrice: 28000 },
    { name: "DablBurger", basePrice: 40000 },
    { name: "ChizBurger", basePrice: 32000 },
    { name: "Dabl Chizburger", basePrice: 42000 },
    { name: "ChikenBurger", basePrice: 28000 },
    { name: "NonBurger", beefPrice: 30000, chickenPrice: 25000 },
    { name: "Big NonBurger", beefPrice: 35000, chickenPrice: 30000 },
    { name: "Danar", basePrice: 28000 },
  ],
  Hotdog: [
    { name: "HotDog (Rizo)", basePrice: 12000 },
    { name: "HotDog (Canada)", basePrice: 15000 },
    { name: "DablHotDog (Rizo)", basePrice: 14000 },
    { name: "DablHotDog (Canada)", basePrice: 18000 },
    { name: "Xaggi HotDog", basePrice: 28000 },
    { name: "HotDog Amerikano", basePrice: 20000 },
    { name: "Go'shtli HotDog", basePrice: 25000 },
    { name: "Tost Sirli (Canada)", basePrice: 25000 },
    { name: "Tost Sirli (Go'shtli)", basePrice: 30000 },
  ],
  KFC: [
    { name: "Kfc Achchiq (1 porsiya)", basePrice: 35000 },
    { name: "Kfc Achchiq (1 kg)", basePrice: 98000 },
    { name: "Kfc Shirin (1 porsiya)", basePrice: 35000 },
    { name: "Kfc Shirin (1 kg)", basePrice: 98000 },
  ],
  "Siz uchun": [
    { name: "Fri", basePrice: 15000 },
    { name: "Pishloq sous", basePrice: 4000 },
    { name: "Chili sous", basePrice: 4000 },
    { name: "Xalapeno", basePrice: 4000 },
    { name: "Turk achchiq", basePrice: 4000 },
    { name: "Chesnokli sous", basePrice: 4000 },
    { name: "Burger bo'lichka", basePrice: 3000 },
    { name: "Xotdog bo'lichka", basePrice: 3000 },
  ],
  Ichimliklar: [
    { name: "Qora choy 0.33L", basePrice: 6000 },
    { name: "Qora choy 0.25L", basePrice: 4000 },
    { name: "Ko'k choy 0.33L", basePrice: 6000 },
    { name: "Ko'k choy 0.25L", basePrice: 4000 },
    { name: "Sutli kofe 0.33L", basePrice: 12000 },
    { name: "Sutli kofe 0.25L", basePrice: 7000 },
    { name: "Qora kofe 0.33L", basePrice: 9000 },
    { name: "Qora kofe 0.25L", basePrice: 6000 },
  ],
  Choy: [
    { name: "Malina choy", basePrice: 10000 },
    { name: "Karak choy", basePrice: 15000 },
    { name: "Imbir choy", basePrice: 15000 },
    { name: "Lavanda choy", basePrice: 15000 },
    { name: "Limon choy", basePrice: 8000 },
    { name: "Quyultirilgan kofe 0.25L", basePrice: 7000 },
    { name: "Quyultirilgan kofe 0.33L", basePrice: 12000 },
  ],
  Moxito: [
    { name: "Ice Tea", basePrice: 15000 },
    { name: "Moxito Klassik", basePrice: 25000 },
    { name: "Moxito Qulpnay", basePrice: 25000 },
    { name: "Moxito Ocean", basePrice: 25000 },
    { name: "Moxito Malina", basePrice: 25000 },
  ],
  Kokteyl: [
    { name: "Kuyov kokteyl", basePrice: 25000 },
    { name: "Bananli kokteyl", basePrice: 25000 },
  ],
  Fresh: [
    { name: "Assorti fresh", basePrice: 30000 },
    { name: "Apelsin fresh", basePrice: 35000 },
    { name: "Apelsin + olmali fresh", basePrice: 35000 },
    { name: "Olmali fresh", basePrice: 20000 },
    { name: "Sabzili fresh", basePrice: 10000 },
    { name: "Olma + sabzili fresh", basePrice: 15000 },
  ],
};

async function upsertCategory(name: string, displayOrder: number) {
  const [existing] = await db.select().from(categories).where(eq(categories.name, name));
  if (existing) return existing;
  const [created] = await db.insert(categories).values({ name, displayOrder }).returning();
  return created!;
}

async function upsertProduct(categoryId: number, input: ProductInput) {
  const [existing] = await db
    .select()
    .from(products)
    .where(and(eq(products.categoryId, categoryId), eq(products.name, input.name)));

  const values = {
    categoryId,
    name: input.name,
    description: input.description ?? null,
    basePrice: String(input.basePrice ?? 0),
    hasMeatChoice: input.beefPrice !== undefined,
    beefPrice: input.beefPrice !== undefined ? String(input.beefPrice) : null,
    chickenPrice: input.chickenPrice !== undefined ? String(input.chickenPrice) : null,
    isAvailable: true,
  };

  if (existing) {
    // Deliberately excludes imageUrl — this script is safe to re-run (e.g.
    // to add a new menu item), and must never clobber a real photo someone
    // already uploaded via the admin panel.
    await db.update(products).set(values).where(eq(products.id, existing.id));
  } else {
    await db.insert(products).values({ ...values, imageUrl: null });
  }
}

async function main() {
  let order = 1;
  let categoryCount = 0;
  let productCount = 0;

  for (const [categoryName, items] of Object.entries(MENU)) {
    const category = await upsertCategory(categoryName, order++);
    categoryCount++;
    for (const item of items) {
      await upsertProduct(category.id, item);
      productCount++;
    }
  }

  console.log(`Upserted ${categoryCount} categories and ${productCount} products.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Menu seed failed:", err);
    process.exit(1);
  });
