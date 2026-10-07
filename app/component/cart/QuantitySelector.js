"use client";

export default function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
}) {
  function decrease() {
    if (quantity > min) onChange(quantity - 1);
  }

  function increase() {
    if (quantity < max) onChange(quantity + 1);
  }

  return (
    <div className="ls-qty" role="group" aria-label="Quantity">
      <button
        type="button"
        className="ls-qty-btn"
        onClick={decrease}
        disabled={disabled || quantity <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>

      <span className="ls-qty-value" aria-live="polite">
        {quantity}
      </span>

      <button
        type="button"
        className="ls-qty-btn"
        onClick={increase}
        disabled={disabled || quantity >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
