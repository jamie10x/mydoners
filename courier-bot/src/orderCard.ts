import { InlineKeyboard } from "grammy";
import type { CourierAssignedData } from "@mydoners/shared-contracts";

export function yandexMapsLink(lat: number, lng: number): string {
  return `https://yandex.com/maps/?pt=${lng},${lat}&z=17&l=map`;
}

export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

const PAYMENT_LABEL: Record<CourierAssignedData["paymentType"], string> = {
  CASH: "Cash on Delivery",
  CLICK: "Click",
  PAYME: "Payme",
};

export function formatOrderCard(orderId: number, data: CourierAssignedData): string {
  const paymentLine =
    data.paymentStatus === "PAID"
      ? `✅ Paid online via ${PAYMENT_LABEL[data.paymentType]}`
      : `💵 Collect ${data.amountToCollect.toLocaleString("en-US")} UZS (${PAYMENT_LABEL[data.paymentType]})`;

  const lines = [
    `🚴 <b>New delivery — Order #${orderId}</b>`,
    "",
    `👤 ${data.customerName}`,
    data.customerPhone ? `📞 ${data.customerPhone}` : "📞 Not verified — call before arrival if needed",
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
    .text("🚴 On My Way", `on_my_way:${orderId}`)
    .row()
    .text("✅ Delivered", `delivered:${orderId}`);
}
