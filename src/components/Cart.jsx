import { useState } from "react";

const TAX_RATE = 0.1;

export default function Cart({
  cart,
  people,
  groupPaymentActive,
  onRemove,
  onAssignItem,
  onAddPerson,
  onRemovePerson,
  onCheckout,
}) {
  const [newPersonName, setNewPersonName] = useState("");
  const [blockedPersonId, setBlockedPersonId] = useState(null);
  const [checkoutBlocked, setCheckoutBlocked] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const unassignedCount = cart.filter((item) => item.assignedTo == null).length;

  function personItemCount(personId) {
    return cart.filter((item) => item.assignedTo === personId).length;
  }

  function personSubtotal(personId) {
    return cart
      .filter((item) => item.assignedTo === personId)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function handleAddPerson() {
    if (!newPersonName.trim()) return;
    onAddPerson(newPersonName);
    setNewPersonName("");
  }

  function handleRemovePerson(personId) {
    if (personItemCount(personId) > 0) {
      setBlockedPersonId(personId);
      return;
    }
    setBlockedPersonId(null);
    onRemovePerson(personId);
  }

  function handleCheckoutClick() {
    if (people.length > 0 && unassignedCount > 0) {
      setCheckoutBlocked(true);
      return;
    }
    setCheckoutBlocked(false);
    onCheckout();
  }

  return (
    <aside className="cart">
      <h2>Your Order</h2>

      <div className="people-section">
        <div className="people-add-row">
          <input
            className="people-add-input"
            type="text"
            placeholder="Add a person (first name)"
            value={newPersonName}
            disabled={groupPaymentActive}
            onChange={(e) => setNewPersonName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
          />
          <button
            className="people-add-btn"
            disabled={!newPersonName.trim() || groupPaymentActive}
            onClick={handleAddPerson}
          >
            Add
          </button>
        </div>

        {people.length > 0 && (
          <ul className="people-list">
            {people.map((person) => (
              <li key={person.id} className="person-row">
                <span className="person-name">{person.name}</span>
                {!groupPaymentActive && (
                  <button className="remove-btn" onClick={() => handleRemovePerson(person.id)}>
                    ✕
                  </button>
                )}
                {blockedPersonId === person.id && (
                  <p className="person-remove-blocked-msg">
                    Cannot remove — {personItemCount(person.id)} item(s) assigned
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {cart.length === 0 ? (
        <p className="cart-empty">No items yet.</p>
      ) : (
        <ul className="cart-list">
          {cart.map((item) => (
            <li key={item.cartItemId} className="cart-item">
              <span className="cart-item-emoji">{item.emoji}</span>
              <div className="cart-item-details">
                <span className="cart-item-name">{item.name}</span>
                <span className="cart-item-qty">x{item.quantity}</span>
              </div>
              <span className="cart-item-price">€{(item.price * item.quantity).toFixed(2)}</span>
              {people.length > 0 &&
                (!groupPaymentActive ? (
                  <select
                    className="assignee-select"
                    value={item.assignedTo ?? ""}
                    onChange={(e) => onAssignItem(item.cartItemId, e.target.value || null)}
                  >
                    {item.assignedTo == null && <option value="" hidden></option>}
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className={item.assignedTo == null ? "unassigned-badge" : "assigned-badge"}>
                    {item.assignedTo == null
                      ? "Unassigned"
                      : people.find((p) => p.id === item.assignedTo)?.name ?? "Unassigned"}
                  </span>
                ))}
              {!groupPaymentActive && (
                <button className="remove-btn" onClick={() => onRemove(item.cartItemId)}>✕</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {people.length > 0 && cart.length > 0 && (
        <div className="person-subtotals">
          {people
            .filter((person) => personItemCount(person.id) > 0)
            .map((person) => (
              <div key={person.id} className="person-subtotal-row">
                <span>{person.name}</span>
                <span>€{personSubtotal(person.id).toFixed(2)}</span>
              </div>
            ))}
        </div>
      )}

      <div className="cart-totals">
        <div className="cart-totals-row">
          <span>Subtotal</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="cart-totals-row">
          <span>Tax (10%)</span>
          <span>€{tax.toFixed(2)}</span>
        </div>
        <div className="cart-totals-row total">
          <span>Total</span>
          <span>€{total.toFixed(2)}</span>
        </div>
      </div>

      {checkoutBlocked && unassignedCount > 0 && (
        <p className="checkout-blocked-msg">
          {unassignedCount} item{unassignedCount > 1 ? "s" : ""} still need{unassignedCount > 1 ? "" : "s"} to
          be assigned to a person before you can place the order.
        </p>
      )}

      <button
        className="checkout-btn"
        disabled={cart.length === 0 || groupPaymentActive}
        onClick={handleCheckoutClick}
      >
        Place Order
      </button>
    </aside>
  );
}
