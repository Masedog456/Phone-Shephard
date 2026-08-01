export const colors = {
  cream: "#F7F3EA",
  card: "#FFFCF4",
  cardSoft: "#FBF7EE",
  ink: "#203033",
  subtle: "#5D6868",
  muted: "#8A938F",
  border: "#E4DED0",
  mist: "#E8EFE9",
  sage: "#607D6B",
  clay: "#B9735E",
  blue: "#5F7E9D",
  lavender: "#D8D7EA",
  blush: "#F0D8D1",
  warning: "#A9473D",
  warningSoft: "#F7E6DF"
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
  pill: 999
};

export const typography = {
  hero: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  subtitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "500" as const,
    letterSpacing: 0
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: 0
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  tab: {
    fontSize: 11
  }
};

export const shadows = {
  soft: {
    shadowColor: "#203033",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3
  },
  quiet: {
    shadowColor: "#203033",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2
  }
};
