// Shared button styles, so every button in the app has the same shape, height and states.
// Radius system: buttons and inputs 8px (rounded-lg), cards and dialogs 12px (rounded-xl), badges pill.
const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

const variants = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary: "bg-white text-ink-900 shadow-sm ring-1 ring-ink-200 hover:bg-ink-50",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  danger: "text-red-700 hover:bg-red-50",
};

const sizes = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-9 px-3.5 text-sm",
  icon: "h-8 w-8 text-sm",
};

export function button(variant: keyof typeof variants = "secondary", size: keyof typeof sizes = "md") {
  return `${base} ${variants[variant]} ${sizes[size]}`;
}

export const input =
  "h-9 rounded-lg bg-white px-3 text-sm text-ink-900 shadow-sm ring-1 ring-ink-200 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500";
