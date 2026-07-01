import { useState } from "react";
import { dishes, deliveryInfo } from "./data";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import GroupPaymentFlow from "./components/GroupPaymentFlow";
import "./App.css";

const GROUP_PAYMENT_TIMEOUT_MS = 30 * 60 * 1000;
const TAX_RATE = 0.1;

function generateCartItemId() {
  return "ci-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function generatePersonId() {
  return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}

export default function App() {
  const [cart, setCart] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [groupPayment, setGroupPayment] = useState(null);

  function addToCart(dish, personId = null) {
    setCart((prev) => [
      ...prev,
      { ...dish, cartItemId: generateCartItemId(), quantity: 1, assignedTo: personId },
    ]);
  }

  function removeFromCart(cartItemId) {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  }

  function assignItem(cartItemId, personId) {
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, assignedTo: personId } : item
      )
    );
  }

  function addPerson(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPerson = { id: generatePersonId(), name: trimmed };
    setPeople((prev) => [...prev, newPerson]);
    setCart((prev) =>
      prev.map((item) => (item.assignedTo == null ? { ...item, assignedTo: newPerson.id } : item))
    );
  }

  function removePerson(personId) {
    const hasItems = cart.some((item) => item.assignedTo === personId);
    if (hasItems) return;
    setPeople((prev) => prev.filter((p) => p.id !== personId));
  }

  function startGroupPayment() {
    if (cart.some((item) => item.assignedTo == null)) return;
    const queue = people
      .filter((p) => cart.some((item) => item.assignedTo === p.id))
      .map((p) => p.id);
    if (queue.length === 0) return;
    setGroupPayment({
      queue,
      currentIndex: 0,
      statuses: Object.fromEntries(queue.map((id) => [id, "pending"])),
      deadline: Date.now() + GROUP_PAYMENT_TIMEOUT_MS,
      cancelled: false,
      phase: "in_progress",
      receipt: null,
    });
  }

  function handlePersonSuccess(personId) {
    if (!groupPayment) return;
    const statuses = { ...groupPayment.statuses, [personId]: "success" };
    const allDone = groupPayment.queue.every((id) => statuses[id] === "success");
    const receipt = allDone
      ? groupPayment.queue.map((id) => {
          const items = cart.filter((item) => item.assignedTo === id);
          const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const tax = subtotal * TAX_RATE;
          return {
            personId: id,
            name: people.find((p) => p.id === id)?.name ?? "Unknown",
            items,
            subtotal,
            tax,
            total: subtotal + tax,
          };
        })
      : groupPayment.receipt;
    setGroupPayment({
      ...groupPayment,
      statuses,
      currentIndex: allDone ? groupPayment.currentIndex : groupPayment.currentIndex + 1,
      phase: allDone ? "complete" : groupPayment.phase,
      receipt,
    });
    if (allDone) setCart([]);
  }

  function handlePersonFail(personId) {
    if (!groupPayment) return;
    setGroupPayment({
      ...groupPayment,
      statuses: { ...groupPayment.statuses, [personId]: "failed" },
    });
  }

  function handleTimeout() {
    if (!groupPayment) return;
    setGroupPayment({ ...groupPayment, cancelled: true });
  }

  function resetOrder() {
    setCart([]);
    setPeople([]);
    setGroupPayment(null);
  }

  const cartCount = cart.length;
  const groupPaymentActive = groupPayment !== null;

  return (
    <div className="app">
      <header className="app-header">
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <img src="/restaurant-demo/deliveroo-logo.png" alt="Deliveroo" height="36" />
          <h1>roo<span style={{color:"#1a271f"}}>food</span></h1>
          <span className="delivery-eta">
            <span className="eta-dot" />
            <span className="eta-icon">🛵</span>
            Delivery in {deliveryInfo.etaMin}–{deliveryInfo.etaMax} min
          </span>
        </div>
        <div className="cart-badge-wrapper">
          <span className="cart-icon">🛒</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </div>
      </header>

      <main className="app-main">
        <Menu
          dishes={dishes}
          people={people}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddToCart={addToCart}
        />
        <Cart
          cart={cart}
          people={people}
          groupPaymentActive={groupPaymentActive}
          onRemove={removeFromCart}
          onAssignItem={assignItem}
          onAddPerson={addPerson}
          onRemovePerson={removePerson}
          onCheckout={startGroupPayment}
        />
      </main>
      {groupPayment && (
        <GroupPaymentFlow
          cart={cart}
          people={people}
          groupPayment={groupPayment}
          onPersonSuccess={handlePersonSuccess}
          onPersonFail={handlePersonFail}
          onTimeout={handleTimeout}
          onReset={resetOrder}
        />
      )}
    </div>
  );
}
