export interface PaymentSession {
  providerTransactionId: string;
  /** URL to redirect the customer to for hosted checkout — null for a stub/instant-confirm provider. */
  checkoutUrl: string | null;
}

export interface PaymentProvider {
  createPaymentSession(orderId: number, amountUzs: number): Promise<PaymentSession>;
}
