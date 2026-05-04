export const getFontVar = (fontName: string) => {
  const map: Record<string, string> = {
    "Courier Prime": "var(--font-courier-prime)",
    "Poppins": "var(--font-poppins)",
    "Inter": "var(--font-inter)",
    "Roboto": "var(--font-roboto)",
    "Open Sans": "var(--font-open-sans)",
    "Lato": "var(--font-lato)",
    "Montserrat": "var(--font-montserrat)",
    "Playfair Display": "var(--font-playfair)",
    "Lora": "var(--font-lora)",
    "Comic Neue": "var(--font-comic-neue)",
  };
  return map[fontName] || "var(--font-courier-prime)";
};
