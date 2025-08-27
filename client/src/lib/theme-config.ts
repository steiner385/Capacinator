// Centralized theme configuration
// All color values in HSL format for consistency

export const themeConfig = {
  light: {
    // Base colors
    background: "0 0% 100%", // white
    foreground: "221 39% 11%", // dark gray
    
    // Component colors
    card: "0 0% 100%",
    cardForeground: "221 39% 11%",
    
    popover: "0 0% 100%",
    popoverForeground: "221 39% 11%",
    
    // Primary colors
    primary: "242 84% 61%", // blue
    primaryForeground: "0 0% 100%",
    
    // Secondary colors
    secondary: "210 16% 93%", // light gray
    secondaryForeground: "221 39% 11%",
    
    // Muted colors
    muted: "210 16% 93%",
    mutedForeground: "215 16% 47%",
    
    // Accent colors
    accent: "210 16% 93%",
    accentForeground: "221 39% 11%",
    
    // Destructive colors
    destructive: "0 72% 51%", // red
    destructiveForeground: "0 0% 100%",
    
    // Border and input
    border: "214 32% 91%",
    input: "214 32% 91%",
    ring: "242 84% 61%",
    
    // Status colors
    success: "142 71% 45%",
    successForeground: "0 0% 100%",
    successBackground: "142 71% 95%",
    
    warning: "38 92% 50%",
    warningForeground: "0 0% 100%",
    warningBackground: "38 92% 95%",
    
    danger: "0 84% 60%",
    dangerForeground: "0 0% 100%",
    dangerBackground: "0 84% 95%",
    
    info: "199 89% 48%",
    infoForeground: "0 0% 100%",
    infoBackground: "199 89% 95%",
  },
  dark: {
    // Base colors
    background: "221 39% 11%", // dark gray
    foreground: "210 20% 98%", // light gray
    
    // Component colors
    card: "217 33% 17%",
    cardForeground: "210 20% 98%",
    
    popover: "217 25% 35%",
    popoverForeground: "210 20% 98%",
    
    // Primary colors
    primary: "238 84% 67%", // lighter blue
    primaryForeground: "221 39% 11%",
    
    // Secondary colors
    secondary: "217 25% 27%",
    secondaryForeground: "210 20% 98%",
    
    // Muted colors
    muted: "217 25% 27%",
    mutedForeground: "215 14% 65%",
    
    // Accent colors
    accent: "217 25% 27%",
    accentForeground: "210 20% 98%",
    
    // Destructive colors
    destructive: "0 62% 57%",
    destructiveForeground: "210 20% 98%",
    
    // Border and input
    border: "217 25% 27%",
    input: "217 25% 27%",
    ring: "238 84% 67%",
    
    // Status colors
    success: "142 71% 45%",
    successForeground: "0 0% 100%",
    successBackground: "142 71% 15%",
    
    warning: "38 92% 50%",
    warningForeground: "0 0% 100%",
    warningBackground: "38 92% 15%",
    
    danger: "0 84% 60%",
    dangerForeground: "0 0% 100%",
    dangerBackground: "0 84% 15%",
    
    info: "199 89% 48%",
    infoForeground: "0 0% 100%",
    infoBackground: "199 89% 15%",
  }
} as const;

export type Theme = keyof typeof themeConfig;
export type ThemeColors = keyof typeof themeConfig.light;

// Helper function to apply theme to CSS variables
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const colors = themeConfig[theme];
  
  Object.entries(colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });
  
  // Set additional CSS variables that might be needed
  root.style.setProperty('--radius', '0.5rem');
  root.style.colorScheme = theme;
}

// Helper function to get CSS variable value
export function getCSSVariable(variable: ThemeColors, theme?: Theme) {
  const currentTheme = theme || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  return themeConfig[currentTheme][variable];
}