// Matches backend/src/services/adminService.ts's response shapes exactly —
// distinct from the customer-facing Category/Product in shared-contracts
// (admin responses use plain nullable numbers, not the number|string the
// public catalog endpoints return).

export interface AdminCategory {
  id: number;
  name: string;
  displayOrder: number | null;
}

export interface AdminProduct {
  id: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  basePrice: number | null;
  hasMeatChoice: boolean | null;
  beefPrice: number | null;
  chickenPrice: number | null;
  isAvailable: boolean | null;
  imageUrl: string | null;
}
