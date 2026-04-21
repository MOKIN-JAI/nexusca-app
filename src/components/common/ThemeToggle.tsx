import { forwardRef } from "react";
import { Moon, Sun, Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-store";
import { cn } from "@/lib/utils";

export const ThemeToggle = forwardRef<HTMLDivElement>((_, ref) => {
  const { theme, toggle, highContrast, toggleHighContrast } = useTheme();
  return (
    <div ref={ref} className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleHighContrast}
        aria-label="Toggle high-contrast mode"
        aria-pressed={highContrast}
        title="Toggle high-contrast mode"
        className={cn(highContrast && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
      >
        <Contrast className="h-4 w-4" />
      </Button>
    </div>
  );
});
ThemeToggle.displayName = "ThemeToggle";
