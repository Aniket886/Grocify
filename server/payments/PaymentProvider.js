// Contract every payment provider must follow. Order code only talks to this shape,
// so a real gateway can be added later without touching orders.
//
//   name: string
//   pay({ order, method, outcome }) -> Promise<{ success: boolean, transactionId?: string, failureReason?: string }>
//
// `method` is one of PAYMENT_METHODS. Card numbers, CVV and UPI PINs are never passed to or stored by this app:
// a real gateway collects them on its own hosted page and only returns the result.
export const PAYMENT_METHODS = ['UPI', 'Card', 'Net Banking'];

export function assertProvider(provider) {
  if (!provider || typeof provider.pay !== 'function' || !provider.name) {
    throw new Error('Invalid payment provider: it needs a name and a pay() function');
  }
  return provider;
}
