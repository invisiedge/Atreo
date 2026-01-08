/**
 * Professional Chart Theme Configuration
 *
 * Centralized theme for all charts in the application
 * - Consistent colors across light and dark modes
 * - Professional design with clean aesthetics
 * - Accessibility-compliant color contrasts
 */

/**
 * Chart Colors - Professional Palette
 * Based on modern design systems with excellent contrast
 */
export const CHART_COLORS = {
  // Primary colors - Blues (Trust, Professionalism)
  primary: {
    light: '#3b82f6',      // blue-500
    DEFAULT: '#2563eb',    // blue-600
    dark: '#1d4ed8',       // blue-700
  },

  // Secondary colors - Purples (Innovation, Premium)
  secondary: {
    light: '#8b5cf6',      // violet-500
    DEFAULT: '#7c3aed',    // violet-600
    dark: '#6d28d9',       // violet-700
  },

  // Success - Greens
  success: {
    light: '#10b981',      // emerald-500
    DEFAULT: '#059669',    // emerald-600
    dark: '#047857',       // emerald-700
  },

  // Warning - Oranges
  warning: {
    light: '#f59e0b',      // amber-500
    DEFAULT: '#d97706',    // amber-600
    dark: '#b45309',       // amber-700
  },

  // Danger - Reds
  danger: {
    light: '#ef4444',      // red-500
    DEFAULT: '#dc2626',    // red-600
    dark: '#b91c1c',       // red-700
  },

  // Info - Cyans
  info: {
    light: '#06b6d4',      // cyan-500
    DEFAULT: '#0891b2',    // cyan-600
    dark: '#0e7490',       // cyan-700
  },

  // Multi-series chart colors (8 distinct colors)
  series: [
    '#3b82f6',  // blue-500
    '#8b5cf6',  // violet-500
    '#10b981',  // emerald-500
    '#f59e0b',  // amber-500
    '#06b6d4',  // cyan-500
    '#ec4899',  // pink-500
    '#14b8a6',  // teal-500
    '#f97316',  // orange-500
  ],

  // Gradient colors for areas
  gradients: {
    blue: ['#3b82f6', '#60a5fa', '#93c5fd'],
    purple: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
    green: ['#10b981', '#34d399', '#6ee7b7'],
    orange: ['#f59e0b', '#fbbf24', '#fcd34d'],
  },
} as const;

/**
 * Dark Mode Chart Colors
 * Slightly adjusted for better visibility on dark backgrounds
 */
export const DARK_CHART_COLORS = {
  primary: {
    light: '#60a5fa',      // blue-400
    DEFAULT: '#3b82f6',    // blue-500
    dark: '#2563eb',       // blue-600
  },

  secondary: {
    light: '#a78bfa',      // violet-400
    DEFAULT: '#8b5cf6',    // violet-500
    dark: '#7c3aed',       // violet-600
  },

  success: {
    light: '#34d399',      // emerald-400
    DEFAULT: '#10b981',    // emerald-500
    dark: '#059669',       // emerald-600
  },

  warning: {
    light: '#fbbf24',      // amber-400
    DEFAULT: '#f59e0b',    // amber-500
    dark: '#d97706',       // amber-600
  },

  danger: {
    light: '#f87171',      // red-400
    DEFAULT: '#ef4444',    // red-500
    dark: '#dc2626',       // red-600
  },

  info: {
    light: '#22d3ee',      // cyan-400
    DEFAULT: '#06b6d4',    // cyan-500
    dark: '#0891b2',       // cyan-600
  },

  series: [
    '#60a5fa',  // blue-400
    '#a78bfa',  // violet-400
    '#34d399',  // emerald-400
    '#fbbf24',  // amber-400
    '#22d3ee',  // cyan-400
    '#f472b6',  // pink-400
    '#2dd4bf',  // teal-400
    '#fb923c',  // orange-400
  ],
  gradients: CHART_COLORS.gradients,
} as const;

/**
 * Chart Common Styles
 */
export const CHART_STYLES = {
  // Grid styling
  grid: {
    stroke: 'hsl(var(--border))',
    strokeDasharray: '3 3',
    strokeOpacity: 0.3,
  },

  // Axis styling
  axis: {
    stroke: 'hsl(var(--border))',
    tick: {
      fill: 'hsl(var(--muted-foreground))',
      fontSize: 12,
    },
    label: {
      fill: 'hsl(var(--foreground))',
      fontSize: 14,
      fontWeight: 500,
    },
  },

  // Tooltip styling
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    },
    labelStyle: {
      color: 'hsl(var(--foreground))',
      fontWeight: 600,
      marginBottom: '4px',
    },
    itemStyle: {
      color: 'hsl(var(--muted-foreground))',
      fontSize: '14px',
    },
    cursor: {
      stroke: 'hsl(var(--primary))',
      strokeWidth: 1,
      strokeOpacity: 0.5,
    },
  },

  // Legend styling
  legend: {
    wrapperStyle: {
      paddingTop: '20px',
    },
    iconSize: 12,
    iconType: 'circle' as const,
  },
} as const;

/**
 * Chart Dimensions
 */
export const CHART_DIMENSIONS = {
  // Standard chart heights
  small: 200,
  medium: 300,
  large: 400,
  xlarge: 500,

  // Metric card mini chart
  metric: 64,

  // Dashboard widget
  widget: 250,
} as const;

/**
 * Animation Configuration
 */
export const CHART_ANIMATION = {
  duration: 800,
  easing: 'ease-out' as const,
} as const;

/**
 * Responsive Breakpoints for Charts
 */
export const CHART_BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * Helper function to get chart color based on theme
 */
export const getChartColor = (
  colorKey: keyof typeof CHART_COLORS,
  variant: 'light' | 'DEFAULT' | 'dark' = 'DEFAULT',
  isDarkMode = false
) => {
  const colors = isDarkMode ? DARK_CHART_COLORS : CHART_COLORS;
  const colorGroup = colors[colorKey];

  if (typeof colorGroup === 'object' && 'light' in colorGroup) {
    return colorGroup[variant];
  }

  return colorGroup;
};

/**
 * Helper function to get series color
 */
export const getSeriesColor = (index: number, isDarkMode = false) => {
  const colors = isDarkMode ? DARK_CHART_COLORS : CHART_COLORS;
  return colors.series[index % colors.series.length];
};

/**
 * CSS Variables for charts (use with Tailwind/CSS)
 */
export const CHART_CSS_VARS = `
  :root {
    --chart-1: 59 130 246;      /* blue-500 */
    --chart-2: 139 92 246;      /* violet-500 */
    --chart-3: 16 185 129;      /* emerald-500 */
    --chart-4: 245 158 11;      /* amber-500 */
    --chart-5: 6 182 212;       /* cyan-500 */
    --chart-6: 236 72 153;      /* pink-500 */
    --chart-7: 20 184 166;      /* teal-500 */
    --chart-8: 249 115 22;      /* orange-500 */
  }

  .dark {
    --chart-1: 96 165 250;      /* blue-400 */
    --chart-2: 167 139 250;     /* violet-400 */
    --chart-3: 52 211 153;      /* emerald-400 */
    --chart-4: 251 191 36;      /* amber-400 */
    --chart-5: 34 211 238;      /* cyan-400 */
    --chart-6: 244 114 182;     /* pink-400 */
    --chart-7: 45 212 191;      /* teal-400 */
    --chart-8: 251 146 60;      /* orange-400 */
  }
`;
