import type { PaymentProvider, PaymentSession } from "./PaymentProvider";

/**
 * Placeholder for both Click and Payme — see docs/decisions.md #3. Real
 * integration needs actual merchant accounts (business registration + bank
 * account + KYC approval from Click/Payme, which is the real bottleneck —
 * see the roadmap's Phase 2 notes on starting that process early) and their
 * exact webhook protocols (Click's Prepare/Complete action callbacks with an
 * MD5 signature; Payme's JSON-RPC CheckPerformTransaction/CreateTransaction/
 * PerformTransaction methods). Implementing either protocol's signature
 * verification without a real sandbox to test against would be guessing at
 * details that are easy to get subtly wrong — worse than an honest stub,
 * since it would look integrated without actually being verified.
 *
 * This stub simulates instant payment success so the rest of the order flow
 * (paymentStatus=PAID, courier's amountToCollect=0, etc.) can be built and
 * tested end-to-end now. Swap for real ClickPaymentProvider/PaymePaymentProvider
 * implementations once merchant credentials exist — nothing outside
 * paymentService.ts needs to change for that swap.
 */
export class StubPaymentProvider implements PaymentProvider {
  constructor(private readonly providerName: "Click" | "Payme") {}

  async createPaymentSession(orderId: number, amountUzs: number): Promise<PaymentSession> {
    console.log(
      `[StubPaymentProvider:${this.providerName}] Simulating instant payment success for order ${orderId} ` +
        `(${amountUzs} UZS) — no real ${this.providerName} merchant account configured yet.`,
    );
    return { providerTransactionId: `stub-${this.providerName.toLowerCase()}-${orderId}-${Date.now()}`, checkoutUrl: null };
  }
}
