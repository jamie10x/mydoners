import { InlineKeyboard } from "grammy";
import type { CourierAssignedData } from "@mydoners/shared-contracts";

export function yandexMapsLink(lat: number, lng: number): string {
  return `https://yandex.com/maps/?pt=${lng},${lat}&z=17&l=map`;
}

export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

const PAYMENT_LABEL: Record<CourierAssignedData["paymentType"], string> = {
  CASH: "Naqd pul",
  CLICK: "Click",
  PAYME: "Payme",
};

function formatSom(amount: number): string {
  return `${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm`;
}

export function formatOrderCard(orderId: number, data: CourierAssignedData): string {
  const paymentLine =
    data.paymentStatus === "PAID"
      ? `✅ Onlayn to'langan (${PAYMENT_LABEL[data.paymentType]})`
      : `💵 Olinadigan summa: ${formatSom(data.amountToCollect)} (${PAYMENT_LABEL[data.paymentType]})`;

  const lines = [
    `🚴 <b>Yangi yetkazma — #${orderId}-buyurtma</b>`,
    "",
    `👤 ${data.customerName}`,
    data.customerPhone ? `📞 ${data.customerPhone}` : "📞 Raqam tasdiqlanmagan — kerak bo'lsa yetib borishdan oldin qo'ng'iroq qiling",
    `📍 ${data.landmarkAddress}`,
    "",
    paymentLine,
  ];
  if (data.courierNotes) lines.push("", `📝 ${data.courierNotes}`);

  return lines.join("\n");
}

export function orderKeyboard(orderId: number, latitude: number, longitude: number): InlineKeyboard {
  return new InlineKeyboard()
    .url("🗺 Yandex Maps", yandexMapsLink(latitude, longitude))
    .url("🗺 Google Maps", googleMapsLink(latitude, longitude))
    .row()
    .text("🚴 Yo'lga chiqdim", `on_my_way:${orderId}`)
    .row()
    .text("✅ Yetkazdim", `delivered:${orderId}`);
}
