import { useState, useEffect } from "react";

const FAILING_CVV = "666";

function generateOrderNumber() {
  return "DL-" + Math.floor(10000 + Math.random() * 90000);
}

export default function PaymentModal({ person, items, subtotal, tax, total, onSuccess, onFail, onClose }) {
  const [step, setStep] = useState("summary");
  const [orderNumber] = useState(generateOrderNumber);
  const [form, setForm] = useState({ name: "", number: "", expiry: "", cvv: "" });

  useEffect(() => {
    if (step !== "processing") return;
    const failed = form.cvv.trim() === FAILING_CVV;
    const timer = setTimeout(() => {
      setStep(failed ? "failed" : "success");
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === "failed") onFail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== "success") return;
    const timer = setTimeout(() => onSuccess(), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function handleOverlayClick() {
    if (step !== "processing") onClose?.();
  }

  function handleNumberChange(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, "$1 ").trim();
    setForm((f) => ({ ...f, number: formatted }));
  }

  function handleExpiryChange(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    const formatted = raw.length > 2 ? raw.slice(0, 2) + "/" + raw.slice(2) : raw;
    setForm((f) => ({ ...f, expiry: formatted }));
  }

  const canPay =
    form.name.trim() &&
    form.number.replace(/\s/g, "").length === 16 &&
    form.expiry.length === 5 &&
    form.cvv.length >= 3;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {step === "summary" && (
          <div className="modal-step">
            <h2 className="modal-title">{person.name}'s Order</h2>
            <ul className="modal-item-list">
              {items.map((item) => (
                <li key={item.cartItemId} className="modal-item-row">
                  <span className="modal-item-emoji">{item.emoji}</span>
                  <span className="modal-item-name">{item.name}</span>
                  <span className="modal-item-qty">x{item.quantity}</span>
                  <span className="modal-item-price">€{(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="modal-totals">
              <div className="modal-totals-row">
                <span>Subtotal</span><span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="modal-totals-row">
                <span>Tax (10%)</span><span>€{tax.toFixed(2)}</span>
              </div>
              <div className="modal-totals-row modal-totals-total">
                <span>Total</span><span>€{total.toFixed(2)}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-primary modal-btn-full" onClick={() => setStep("card")}>
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {step === "card" && (
          <div className="modal-step">
            <h2 className="modal-title">{person.name}'s Payment</h2>
            <div className="card-form">
              <label className="card-label">
                Name on card
                <input
                  className="card-input"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="card-label">
                Card number
                <input
                  className="card-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={form.number}
                  onChange={handleNumberChange}
                />
              </label>
              <div className="card-row">
                <label className="card-label">
                  Expiry
                  <input
                    className="card-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={form.expiry}
                    onChange={handleExpiryChange}
                  />
                </label>
                <label className="card-label">
                  CVV
                  <input
                    className="card-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    maxLength={4}
                    value={form.cvv}
                    onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setStep("summary")}>Back</button>
              <button
                className="modal-btn-primary"
                disabled={!canPay}
                onClick={() => setStep("processing")}
              >
                Pre-authorize €{total.toFixed(2)}
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="modal-step modal-step-centered">
            <div className="spinner" />
            <p className="processing-title">Pre-authorizing {person.name}'s payment…</p>
            <p className="processing-subtitle">Please do not close this window.</p>
          </div>
        )}

        {step === "failed" && (
          <div className="modal-step modal-step-centered">
            <div className="error-icon">✕</div>
            <h2 className="error-title">Pre-authorization Failed</h2>
            <p className="error-meta">
              The card was declined for {person.name}. Please check the details and try again.
            </p>
            <button
              className="modal-btn-primary modal-btn-full"
              onClick={() => {
                setForm((f) => ({ ...f, cvv: "" }));
                setStep("card");
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="modal-step modal-step-centered">
            <div className="success-icon">✓</div>
            <h2 className="success-title">Pre-authorized!</h2>
            <p className="success-meta">{person.name} · Order {orderNumber}</p>
          </div>
        )}

      </div>
    </div>
  );
}
