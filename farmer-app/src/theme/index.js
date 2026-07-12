// Smart Farming — shared design tokens (mirrors the web admin's "Fresh agri-modern" system).
export const colors = {
  brand: {
    50: '#f0faf4',
    100: '#d9f1e2',
    200: '#b6e3c8',
    300: '#86cfa6',
    400: '#4faf7f',
    500: '#2f9264',
    600: '#1f7a52',
    700: '#1a6144',
    800: '#174d38',
    900: '#133f2f',
  },
  harvest: {
    50: '#fff9ed',
    100: '#fdefcc',
    200: '#fbdd8f',
    500: '#ef9f27',
    600: '#d97d0e',
    700: '#b45c0a',
  },
  canvas: '#f4f7f4',
  surface: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#eef2f6',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerText: '#b91c1c',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  white: '#ffffff',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const font = {
  size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 28, display: 32 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
};

export const shadow = {
  soft: { shadowColor: '#0f281e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  card: { shadowColor: '#0f281e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 },
};
