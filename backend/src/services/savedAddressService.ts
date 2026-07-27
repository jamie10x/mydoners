import type { SavedAddress } from "@mydoners/shared-contracts";
import { savedAddressRepository } from "../repositories/savedAddressRepository";
import { userRepository } from "../repositories/userRepository";
import { ValidationError, NotFoundError } from "../errors/AppError";

const MAX_ADDRESSES_PER_USER = 3;

function toApi(row: NonNullable<Awaited<ReturnType<typeof savedAddressRepository.create>>>): SavedAddress {
  return {
    id: row.id,
    label: row.label,
    latitude: row.latitude,
    longitude: row.longitude,
    landmarkAddress: row.landmarkAddress,
  };
}

export const savedAddressService = {
  async list(userId: number): Promise<SavedAddress[]> {
    const rows = await savedAddressRepository.listByUser(userId);
    return rows.map(toApi);
  },

  async create(userId: number, label: string, latitude: number, longitude: number, landmarkAddress: string) {
    const count = await savedAddressRepository.countByUser(userId);
    if (count >= MAX_ADDRESSES_PER_USER) {
      throw new ValidationError(`You can save up to ${MAX_ADDRESSES_PER_USER} addresses — remove one first.`);
    }
    // Bot onboarding can reach here for a telegramId with no `users` row yet
    // (skipped the name/phone steps, went straight to sharing location) —
    // without this the insert below fails its foreign key constraint.
    await userRepository.ensureExists(userId);
    const row = await savedAddressRepository.create(userId, label, latitude, longitude, landmarkAddress);
    if (!row) throw new Error("Failed to create saved address");
    return toApi(row);
  },

  async update(
    userId: number,
    addressId: number,
    patch: Partial<{ label: string; latitude: number; longitude: number; landmarkAddress: string }>,
  ) {
    const row = await savedAddressRepository.update(addressId, userId, patch);
    if (!row) throw new NotFoundError(`Saved address ${addressId} not found`);
    return toApi(row);
  },

  async delete(userId: number, addressId: number): Promise<void> {
    const deleted = await savedAddressRepository.delete(addressId, userId);
    if (!deleted) throw new NotFoundError(`Saved address ${addressId} not found`);
  },
};
