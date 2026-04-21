import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  highContrast: boolean;
  toggle: () => void;
  set: (t: Theme) => void;
  toggleHighContrast: () => void;
  setHighContrast: (on: boolean) => void;
  init: () => void;
}

const KEY_THEME = "nexusca-theme";
const KEY_HC = "nexusca-high-contrast";

function apply(theme: Theme, hc: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("hc", hc);
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "light",
  highContrast: false,
  init: () => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem(KEY_THEME) as Theme | null)) || "light";
    const hc = typeof window !== "undefined" && localStorage.getItem(KEY_HC) === "1";
    set({ theme: stored, highContrast: hc });
    apply(stored, hc);
  },
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem(KEY_THEME, next);
    apply(next, get().highContrast);
    set({ theme: next });
  },
  set: (t) => {
    localStorage.setItem(KEY_THEME, t);
    apply(t, get().highContrast);
    set({ theme: t });
  },
  toggleHighContrast: () => {
    const next = !get().highContrast;
    localStorage.setItem(KEY_HC, next ? "1" : "0");
    apply(get().theme, next);
    set({ highContrast: next });
  },
  setHighContrast: (on) => {
    localStorage.setItem(KEY_HC, on ? "1" : "0");
    apply(get().theme, on);
    set({ highContrast: on });
  },
}));
