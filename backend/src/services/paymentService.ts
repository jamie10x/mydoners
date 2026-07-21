import type { PaymentType } from "@mydoners/shared-contracts";
import { StubPaymentProvider } from "../core/payments/StubPaymentProvider";
import type { PaymentSession } from "../core/payments/PaymentProvider";

const clickProvider = new StubPaymentProvider("Click");
const paymeProvider = new StubPaymentProvider("Payme");

export const paymentService = {
  async initiatePayment(orderId: number, paymentType: Extract<PaymentType, "CLICK" | "PAYME">, amountUzs: number): Promise<PaymentSession> {
    const provider = paymentType === "CLICK" ? clickProvider : paymeProvider;
    return provider.createPaymentSession(orderId, amountUzs);
  },
};
