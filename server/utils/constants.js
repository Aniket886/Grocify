// Delivery steps, in the only order an order can move through them.
export const DELIVERY_STATUSES = ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

// An order must have a delivery person assigned before it can move to this step.
export const ASSIGNMENT_REQUIRED_FROM = 'Shipped';

export const NOTIFICATION_TYPES = ['order_confirmation', 'payment_status', 'delivery_update'];
