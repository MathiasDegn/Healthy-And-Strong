export const colors = {
  // Forest theme — deep, rich nature park palette
  forest: {
    50: '#f0f7f0',
    100: '#dceedc',
    200: '#bcdfbc',
    300: '#90c890',
    400: '#62a862',
    500: '#3e8a3e',
    600: '#2a6b2a',
    700: '#1c4f1c',
    800: '#123312',
    850: '#0d260d',
    900: '#081808',
    950: '#041004',
  },
  earth: {
    50: '#faf6f0',
    100: '#f0e6d5',
    200: '#e0cdb0',
    300: '#cbb085',
    400: '#b89360',
    500: '#a07845',
    600: '#825f36',
    700: '#634728',
    800: '#42301b',
    900: '#2a1d10',
  },
  sky: {
    50: '#f0f6f8',
    100: '#d5e8ee',
    200: '#b0d3dd',
    300: '#80b8c8',
    400: '#5094ac',
    500: '#387890',
    600: '#2c5f74',
    700: '#234a5c',
    800: '#1a3544',
    900: '#0f1f2c',
  },
  neutral: {
    0: '#ffffff',
    50: '#f8f8f8',
    100: '#f0f0f0',
    200: '#e0e0e0',
    300: '#c8c8c8',
    400: '#a0a0a0',
    500: '#787878',
    600: '#585858',
    700: '#383838',
    800: '#222222',
    900: '#121212',
    950: '#0a0a0a',
  },
  success: '#3e8a3e',
  warning: '#cbb085',
  error: '#d0504a',
  accent: '#62c862',
  accentBright: '#7ee07e',
  accentGlow: '#3e8a3e',
  gold: '#e8b84a',
  goldGlow: '#c8a030',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 28,
    lineHeight: 34,
    color: colors.forest[50],
  },
  heading: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 22,
    lineHeight: 28,
    color: colors.forest[50],
  },
  subheading: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: colors.forest[50],
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.forest[50],
  },
  small: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.forest[100],
  },
  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.forest[200],
  },
  number: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 32,
    lineHeight: 38,
    color: colors.accent,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// 3D shadow system — layered for depth
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  glow: {
    shadowColor: colors.accentGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 5,
  },
  goldGlow: {
    shadowColor: colors.goldGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  statCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  tabbar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
};

// Gradients used across the app for 3D depth
export const gradients = {
  background: [colors.forest[950], colors.forest[900], colors.forest[850]] as const,
  card: [colors.forest[800], colors.forest[850]] as const,
  cardElevated: [colors.forest[700], colors.forest[800]] as const,
  button: [colors.accent, colors.forest[500]] as const,
  buttonPrimary: [colors.accentBright, colors.accent] as const,
  gold: [colors.gold, colors.goldGlow] as const,
  header: [colors.forest[900], colors.forest[850]] as const,
  statCard: [colors.forest[800], colors.forest[900]] as const,
  heroCard: [colors.forest[700], colors.forest[850]] as const,
  avatar: [colors.forest[600], colors.forest[800]] as const,
  tabBar: [colors.forest[900], colors.forest[950]] as const,
  overlay: ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)'] as const,
};
