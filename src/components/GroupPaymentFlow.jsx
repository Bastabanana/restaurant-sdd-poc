import { useEffect, useRef, useState } from "react";
import PaymentModal from "./PaymentModal";

const STATUS_LABELS = {
  pending: "⏳ Pending",
  success: "✅ Paid",
  failed: "❌ Failed",
};

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function GroupPaymentFlow({
  cart,
  people,
  groupPayment,
  onPersonSuccess,
  onPersonFail,
  onTimeout,
  onReset,
}) {
  const [now, setNow] = useState(null);
  const firedRef = useRef(false);
  const isDone = groupPayment.cancelled || groupPayment.phase === "complete";

  useEffect(() => {
    if (isDone) return;
    const tick = () => setNow(Date.now());
    const kickoff = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(interval);
    };
  }, [isDone]);

  useEffect(() => {
    if (isDone || firedRef.current || now == null) return;
    if (groupPayment.deadline - now <= 0) {
      firedRef.current = true;
      onTimeout();
    }
  }, [now, isDone, groupPayment.deadline, onTimeout]);

  function personName(personId) {
    return people.find((p) => p.id === personId)?.name ?? "Unknown";
  }

  if (groupPayment.cancelled) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-step modal-step-centered">
            <div className="cancelled-icon">✕</div>
            <h2 className="cancelled-title">Order Cancelled</h2>
            <p className="cancelled-meta">
              The 30-minute payment window expired before everyone completed their pre-authorization.
              The order has been cancelled and no payment was captured.
            </p>
            <button className="modal-btn-primary modal-btn-full" onClick={onReset}>
              Start New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (groupPayment.phase === "complete") {
    const receipt = groupPayment.receipt ?? [];
    const grandTotal = receipt.reduce((sum, entry) => sum + entry.total, 0);
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-step modal-step-centered">
            <div className="success-icon">✓</div>
            <h2 className="success-title">Payment Successful!</h2>
            <p className="success-meta">Everyone has paid their share.</p>
            <ul className="modal-item-list modal-item-list--receipt">
              {receipt.map((entry) => (
                <li key={entry.personId} className="modal-item-row">
                  <span className="modal-item-name">{entry.name}</span>
                  <span className="modal-item-price">€{entry.total.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="modal-totals">
              <div className="modal-totals-row modal-totals-total">
                <span>Total paid</span>
                <span>€{grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <button className="modal-btn-primary modal-btn-full" onClick={onReset}>
              Start New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPersonId = groupPayment.queue[groupPayment.currentIndex];
  const currentPerson = people.find((p) => p.id === currentPersonId);
  const items = cart.filter((item) => item.assignedTo === currentPersonId);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  const remaining = now == null ? null : groupPayment.deadline - now;

  return (
    <>
      <div className="group-payment-banner">
        <span className="group-timer">
          ⏱ {remaining == null ? "--:--" : formatTime(remaining)} remaining
        </span>
        <ul className="group-status-list">
          {groupPayment.queue.map((personId) => (
            <li key={personId} className="group-status-row">
              <span>{personName(personId)}</span>
              <span>{STATUS_LABELS[groupPayment.statuses[personId]]}</span>
            </li>
          ))}
        </ul>
      </div>
      {currentPerson && (
        <PaymentModal
          key={currentPersonId}
          person={currentPerson}
          items={items}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onSuccess={() => onPersonSuccess(currentPersonId)}
          onFail={() => onPersonFail(currentPersonId)}
        />
      )}
    </>
  );
}
