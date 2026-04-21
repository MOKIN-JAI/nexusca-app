/** Display + formatting helpers. */
export const inr = (n: number | null | undefined) => {
  if (n == null || isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n));
};

export const compactInr = (n: number | null | undefined) => {
  if (n == null || isNaN(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v}`;
};

export const maskPan = (pan?: string | null, reveal = false) => {
  if (!pan) return "—";
  if (reveal) return pan;
  return `${pan.slice(0, 3)}XXXX${pan.slice(-1)}`;
};

export const maskAadhaar = (a?: string | null, reveal = false) => {
  if (!a) return "—";
  const digits = a.replace(/\s/g, "");
  if (reveal) return digits.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
  return `XXXX XXXX ${digits.slice(-4)}`;
};

export const initials = (name?: string | null) =>
  (name ?? "—")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
