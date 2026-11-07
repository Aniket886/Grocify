const STEPS = ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

// Shows the five delivery steps; reached steps are filled green with the time they happened.
export default function DeliveryTimeline({ delivery }) {
  const reached = new Map((delivery?.history || []).map((h) => [h.status, h.at]));
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
      {STEPS.map((s) => {
        const at = reached.get(s);
        return (
          <li key={s} style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '8px 0', opacity: at ? 1 : 0.45 }}>
            <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', background: at ? 'var(--green)' : '#ccc', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13 }}>{at ? '✓' : ''}</span>
            <span style={{ flex: 1 }}><b>{s}</b>{at && <span className="muted"> · {new Date(at).toLocaleString()}</span>}</span>
          </li>
        );
      })}
    </ol>
  );
}
