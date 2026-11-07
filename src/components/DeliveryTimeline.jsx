const STEPS = [
  { name: 'Order Placed', icon: '📝', desc: 'Order received and confirmed' },
  { name: 'Packed', icon: '📦', desc: 'Artisanal provisions packed with care' },
  { name: 'Shipped', icon: '🚚', desc: 'Dispatched from local hub' },
  { name: 'Out for Delivery', icon: '🛵', desc: 'Driver is on the way to your door' },
  { name: 'Delivered', icon: '🏠', desc: 'Handed over safely' },
];

export default function DeliveryTimeline({ delivery, currentStepIndex = 0 }) {
  const reached = new Map((delivery?.history || []).map((h) => [h.status, h.at]));

  return (
    <div className="delivery-stepper-wrap" role="region" aria-label="Delivery progress timeline">
      <ol className="delivery-stepper">
        {STEPS.map((s, index) => {
          const isReached = reached.has(s.name) || index <= currentStepIndex;
          const isCurrent = (index === currentStepIndex);
          const isDeliveredNode = (index === STEPS.length - 1);
          const timestamp = reached.get(s.name);

          // Indicator icon: if it's reached and either not current OR it's the final Delivered node, show checkmark ✓
          let iconContent = s.icon;
          if (isReached && (!isCurrent || isDeliveredNode)) {
            iconContent = '✓';
          }

          return (
            <li 
              key={s.name} 
              className={`stepper-node ${isReached ? 'reached' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="stepper-indicator">
                <span className="stepper-icon" aria-hidden="true">
                  {iconContent}
                </span>
                {index < STEPS.length - 1 && (
                  <span className={`stepper-line ${isReached && index < currentStepIndex ? 'filled' : ''}`} />
                )}
              </div>
              <div className="stepper-details">
                <div className="stepper-header">
                  <strong className="stepper-title">{s.name}</strong>
                  {isCurrent && (
                    <span className={`current-pulse-badge ${isDeliveredNode ? 'completed-badge' : ''}`}>
                      {isDeliveredNode ? 'Completed' : 'In Progress'}
                    </span>
                  )}
                </div>
                <p className="stepper-desc">{s.desc}</p>
                {timestamp && (
                  <span className="stepper-timestamp">
                    {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
