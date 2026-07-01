import { useState } from "react";

const CATEGORIES = ["All", "Starters", "Mains", "Desserts"];

export default function Menu({ dishes, people, selectedCategory, onCategoryChange, onAddToCart }) {
  const filteredDishes = dishes;
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const effectiveSelectedPersonId = people.some((person) => person.id === selectedPersonId)
    ? selectedPersonId
    : (people[0]?.id ?? "");

  return (
    <section className="menu">
      <h2>Menu</h2>

      <div className="category-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {people.length > 0 && (
        <label className="assignee-picker-row">
          Add items for
          <select
            className="assignee-select"
            value={effectiveSelectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
          >
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>
      )}

      <div className="dish-grid">
        {filteredDishes.map((dish) => (
          <div key={dish.id} className="dish-card">
            <span className="dish-emoji">{dish.emoji}</span>
            <div className="dish-info">
              <h3>{dish.name}</h3>
              <p>{dish.description}</p>
              <div className="dish-footer">
                <span className="dish-price">€{dish.price.toFixed(2)}</span>
                <button
                  className="add-btn"
                  onClick={() => onAddToCart(dish, effectiveSelectedPersonId || null)}
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
