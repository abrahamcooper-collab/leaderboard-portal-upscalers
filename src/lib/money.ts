const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdWithCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Whole-dollar display for boards and tables. */
export function formatUsd(amount: number): string {
  return usd.format(amount);
}

/** Exact display, for individual sales. */
export function formatUsdExact(amount: number): string {
  return usdWithCents.format(amount);
}
