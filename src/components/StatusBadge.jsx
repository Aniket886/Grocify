// Shows an order status with a colour: pending (orange), cancelled (grey), delivered (emerald success), everything else in progress.
export default function StatusBadge({ status }) {
  let cls = '';
  if (status === 'Payment Pending') cls = 'low_stock';
  else if (status === 'Cancelled') cls = 'out_of_stock';
  else if (status === 'Delivered') cls = 'delivered in_stock';
  else if (status === 'Out for Delivery' || status === 'Shipped' || status === 'Packed') cls = 'in_progress';
  else if (status === 'Order Placed') cls = 'placed';
  return <span className={`badge ${cls}`}>{status}</span>;
}
