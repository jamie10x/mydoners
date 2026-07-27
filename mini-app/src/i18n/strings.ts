// All customer-facing copy, in Uzbek (Latin script) — the app's only
// language, per the owner's decision. No i18n library: one typed dictionary
// and a tiny t() helper cover a five-screen app. Keys are grouped by screen.
export const STR = {
  // App shell
  loadingApp: "MyDoners yuklanmoqda…",
  signInFailed: "Kirishda xatolik yuz berdi",

  // Shared
  retry: "Qayta urinish",
  cancel: "Bekor qilish",
  save: "Saqlash",
  saving: "Saqlanmoqda…",

  // Menu
  tagline: "Halol va sifatli fast food",
  allCategories: "Barchasi",
  noItems: "Bu yerda hozircha mahsulot yo'q.",
  menuLoadFailed: "Menyu yuklanmadi — internet aloqasini tekshiring.",
  viewCart: "🛒 Savat · {count} ta",
  profileAria: "Profil",
  addToCart: "Qo'shish",

  // Variant modal
  chooseMeat: "Go'sht turini tanlang",
  beef: "Mol go'shti",
  chicken: "Tovuq go'shti",

  // Cart
  yourCart: "Savatingiz",
  cartEmpty: "Savatingiz bo'sh.",
  browseMenu: "Menyuni ko'rish →",
  checkout: "Buyurtma berish",

  // Checkout
  checkoutTitle: "Buyurtmani rasmiylashtirish",
  yourDetails: "Ma'lumotlaringiz",
  fullNamePlaceholder: "Ism familiya",
  phoneFieldLabel: "Telefon raqami",
  phoneInvalid: "To'g'ri raqam kiriting — masalan, +998 90 123 45 67",
  deliveryLocation: "Yetkazib berish manzili",
  landmarkTitle: "Mo'ljal / xonadon",
  landmarkPlaceholder: "Masalan: 5-bino, 2-kirish, 3-qavat, 14-xonadon",
  courierNotes: "Kuryer uchun izoh (ixtiyoriy)",
  payment: "To'lov",
  cashOnDelivery: "Naqd pul (yetkazilganda)",
  comingSoon: "Tez orada",
  codBlockedTitle: "Bu buyurtma uchun naqd to'lov hozircha mavjud emas.",
  codBlockedHelp: "Iltimos, bizga qo'ng'iroq qiling — hal qilamiz:",
  saveThisAddress: "📌 Manzilni saqlab qo'yish",
  addressLabelPlaceholder: "Masalan: Uy, Ish",
  saveAddressFailed: "Manzil saqlanmadi — qayta urinib ko'ring.",
  placeOrder: "Buyurtma berish",
  placingOrder: "Yuborilmoqda…",
  placeOrderFailed: "Buyurtma yuborilmadi. Qayta urinib ko'ring.",
  orderPlaced: "Buyurtma qabul qilindi!",
  takingToTracking: "Buyurtma #{id} — kuzatuv sahifasiga o'tmoqdamiz…",
  locationBlocked: "Joylashuvga ruxsat berilmagan — yetkazib berish uchun kerak.",
  locationBlockedHelp:
    "Telegram Sozlamalar → Maxfiylik va xavfsizlik → Joylashuv orqali ruxsat bering, so'ng yuqoridagi ⌖ tugmasini yana bosing.",
  shareViaTelegram: "📨 Telegram orqali yuborish",
  checkTelegramForLocation:
    "Telegramni oching — yuborilgan xabardagi «Joylashuvni ulashish» tugmasini bosing. Ilovani yopib, keyin qaytsangiz ham bo'ladi.",
  locationTimeout: "Joylashuv kelmadi — Telegram xabarlarini tekshiring yoki qayta urinib ko'ring.",
  sharePhonePrompt: "Naqd to'lovni tasdiqlashni tezlashtirish uchun Telegram kontaktingizni ulashing.",
  sharePhone: "📱 Telefon raqamni ulashish",
  waitingTelegram: "Telegram kutilmoqda…",

  // Bottom nav
  navMenu: "Menyu",
  navCart: "Savat",
  navOrder: "Buyurtma",
  navProfile: "Profil",

  // Map picker
  dragPinHint: "✥ Belgini suring yoki xaritani bosing",
  locating: "Joylashuvingiz aniqlanmoqda…",
  useCurrentLocationAria: "Joriy joylashuvdan foydalanish",

  // Tracking
  stageReceived: "Buyurtma qabul qilindi",
  stageCooking: "Oshxonada tayyorlanmoqda",
  stageOnTheWay: "Yetkazib berilmoqda",
  stageDelivered: "Yetkazib berildi",
  noActiveOrder: "Faol buyurtma yo'q.",
  orderLoadFailed: "Buyurtma yuklanmadi — internet aloqasini tekshiring.",
  orderCancelled: "Buyurtma #{id} bekor qilindi",
  backToMenu: "Menyuga qaytish",
  orderNumber: "Buyurtma #{id}",
  itemsTitle: "Mahsulotlar",
  orderSomethingElse: "Yana biror narsa buyurtma qilish",
  cashCodeHint: "Naqd to'lovni tasdiqlash uchun bu kodni kuryerga ayting",
  reconnecting: "Aloqa tiklanmoqda — holat biroz kechikishi mumkin…",
  pendingTitle: "Buyurtmangiz ko'rib chiqilmoqda",
  pendingSubtitle: "Restoran zaxirani tekshirib, tez orada tasdiqlaydi.",
  cancelOrder: "Buyurtmani bekor qilish",
  cancelling: "Bekor qilinmoqda…",
  cancelOrderFailed: "Bekor qilinmadi — qayta urinib ko'ring.",

  // Profile
  profileTitle: "Profil",
  addYourName: "Ismingizni kiriting",
  verifiedViaTelegram: "✓ Telegram orqali tasdiqlangan",
  firstNamePlaceholder: "Ism",
  lastNamePlaceholder: "Familiya",
  saveChanges: "Saqlash",
  profileSaved: "✓ Saqlandi",
  profileSaveFailed: "Profil saqlanmadi — qayta urinib ko'ring.",
  savedAddresses: "Saqlangan manzillar",
  addressCount: "{count} / 3",
  addressesLoadFailed: "Manzillar yuklanmadi — qayta urinish uchun bosing",
  remove: "O'chirish",
  confirmRemove: "Rostdanmi?",
  removeAddressFailed: "Manzil o'chirilmadi — qayta urinib ko'ring.",
  removeAddressAria: "{label} manzilini o'chirish",
  addAddress: "+ Manzil qo'shish",
  addressLabelExample: "Nomi — masalan: Uy, Ish",
  saveAddress: "Manzilni saqlash",

  // Order history (Profile)
  orderHistory: "Buyurtmalar tarixi",
  orderHistoryEmpty: "Hali buyurtma yo'q.",
  orderHistoryLoadFailed: "Tarix yuklanmadi — qayta urinish uchun bosing",
  statusPending: "Qabul qilindi",
  statusCooking: "Tayyorlanmoqda",
  statusOnTheWay: "Yetkazilmoqda",
  statusDelivered: "Yetkazildi",
  statusCancelled: "Bekor qilindi",

  // Delivered celebration
  deliveredTitle: "Yetkazib berildi!",
  deliveredSubtitle: "Yoqimli ishtaha! Buyurtmangizdan mamnun bo'lganingizni umid qilamiz.",
  receiptTitle: "Chek",
  receiptTotal: "Jami",
  orderAgain: "Yana shu buyurtmani berish",
  reordering: "Qo'shilmoqda…",
  doneBackToMenu: "Menyuga qaytish",
} as const;

export type StringKey = keyof typeof STR;

export function t(key: StringKey, params?: Record<string, string | number>): string {
  let text: string = STR[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }
  return text;
}

/**
 * Cart/order variant values are stored as "Beef"/"Chicken" (the API
 * contract) — this maps them to Uzbek only for display.
 */
export function variantLabel(variant: string): string {
  if (variant === "Beef") return STR.beef;
  if (variant === "Chicken") return STR.chicken;
  return variant;
}

/** Collapses the 7 backend statuses into the 5 labels shown in order history. */
export function orderStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
      return STR.statusPending;
    case "COOKING":
      return STR.statusCooking;
    case "READY_FOR_DELIVERY":
    case "ON_THE_WAY":
      return STR.statusOnTheWay;
    case "DELIVERED":
      return STR.statusDelivered;
    case "CANCELLED":
      return STR.statusCancelled;
    default:
      return status;
  }
}
