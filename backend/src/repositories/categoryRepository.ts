import { asc } from "drizzle-orm";
import { db } from "../db";
import { categories } from "../db/schema";

export const categoryRepository = {
  async listAll() {
    return db.select().from(categories).orderBy(asc(categories.displayOrder));
  },
};
