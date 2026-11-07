// Shows an order status with a colour: pending (orange), cancelled (grey), everything else green.
export default function StatusBadge({ status }) {
  const cls = status === 'Payment Pending' ? 'low_stock' : status === 'Cancelled' ? 'out_of_stock' : '';
  return <span className={`badge ${cls}`}>{status}</span>;
}
