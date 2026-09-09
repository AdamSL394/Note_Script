import { useEffect, useState } from 'react';
import './confirmCheckmark.css';

interface ConfirmCheckmarkProps {
  // Increment this (e.g. setState(s => s + 1)) each time the
  // animation should fire -- a boolean toggle would miss a second
  // trigger if it happened to land on the same value as the first.
  trigger: number;
  label?: string;
}

const VISIBLE_MS = 1200;

export function ConfirmCheckmark({ trigger, label = 'Done' }: ConfirmCheckmarkProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!visible) return null;

  return (
    <span key={trigger} className="confirmCheckmark" role="status" aria-live="polite">
      <span className="confirmCheckmarkIcon" aria-hidden="true">✓</span>
      {label}
    </span>
  );
}
