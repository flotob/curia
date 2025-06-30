/**
 * Comprehensive Design System Tokens
 * 
 * Unified spacing scale, typography, component variants, and interactive states
 * for consistent design across the application with dark mode optimization.
 */

// === SPACING SCALE ===
export const spacing = {
  xs: '4px',    // 0.25rem
  sm: '8px',    // 0.5rem  
  md: '16px',   // 1rem
  lg: '24px',   // 1.5rem
  xl: '32px',   // 2rem
  '2xl': '48px', // 3rem
  '3xl': '64px', // 4rem
} as const;

export const spacingClasses = {
  xs: 'space-y-1 gap-1',     // 4px
  sm: 'space-y-2 gap-2',     // 8px  
  md: 'space-y-4 gap-4',     // 16px
  lg: 'space-y-6 gap-6',     // 24px
  xl: 'space-y-8 gap-8',     // 32px
  '2xl': 'space-y-12 gap-12', // 48px
  '3xl': 'space-y-16 gap-16', // 64px
} as const;

// === TYPOGRAPHY SCALE ===
export const typography = {
  heading: {
    h1: {
      size: 'text-3xl md:text-4xl lg:text-5xl',
      weight: 'font-bold',
      lineHeight: 'leading-tight',
      classes: 'text-3xl md:text-4xl lg:text-5xl font-bold leading-tight'
    },
    h2: {
      size: 'text-2xl md:text-3xl lg:text-4xl', 
      weight: 'font-bold',
      lineHeight: 'leading-tight',
      classes: 'text-2xl md:text-3xl lg:text-4xl font-bold leading-tight'
    },
    h3: {
      size: 'text-xl md:text-2xl lg:text-3xl',
      weight: 'font-semibold', 
      lineHeight: 'leading-snug',
      classes: 'text-xl md:text-2xl lg:text-3xl font-semibold leading-snug'
    },
    h4: {
      size: 'text-lg md:text-xl lg:text-2xl',
      weight: 'font-semibold',
      lineHeight: 'leading-snug', 
      classes: 'text-lg md:text-xl lg:text-2xl font-semibold leading-snug'
    }
  },
  body: {
    large: {
      size: 'text-lg',
      weight: 'font-normal',
      lineHeight: 'leading-relaxed',
      classes: 'text-lg font-normal leading-relaxed'
    },
    base: {
      size: 'text-base',
      weight: 'font-normal', 
      lineHeight: 'leading-normal',
      classes: 'text-base font-normal leading-normal'
    },
    small: {
      size: 'text-sm',
      weight: 'font-normal',
      lineHeight: 'leading-normal',
      classes: 'text-sm font-normal leading-normal'
    },
    tiny: {
      size: 'text-xs',
      weight: 'font-normal',
      lineHeight: 'leading-normal', 
      classes: 'text-xs font-normal leading-normal'
    }
  },
  meta: {
    label: {
      size: 'text-sm',
      weight: 'font-medium',
      lineHeight: 'leading-none',
      classes: 'text-sm font-medium leading-none'
    },
    caption: {
      size: 'text-xs',
      weight: 'font-normal',
      lineHeight: 'leading-tight',
      classes: 'text-xs font-normal leading-tight text-muted-foreground'
    }
  }
} as const;

// === COMPONENT VARIANTS ===
export const componentVariants = {
  density: {
    dense: {
      padding: 'p-2',
      spacing: spacingClasses.xs,
      text: typography.body.small.classes
    },
    comfortable: {
      padding: 'p-4', 
      spacing: spacingClasses.md,
      text: typography.body.base.classes
    },
    spacious: {
      padding: 'p-6',
      spacing: spacingClasses.lg,
      text: typography.body.large.classes
    }
  },
  card: {
    dense: {
      base: 'rounded-md border border-border bg-card shadow-sm',
      padding: 'p-3',
      spacing: 'space-y-2'
    },
    comfortable: {
      base: 'rounded-lg border border-border bg-card shadow-sm', 
      padding: 'p-4',
      spacing: 'space-y-4'
    },
    spacious: {
      base: 'rounded-xl border border-border bg-card shadow-md',
      padding: 'p-6', 
      spacing: 'space-y-6'
    }
  },
  button: {
    dense: {
      size: 'h-8 px-3 text-xs',
      iconSize: 'w-3 h-3'
    },
    comfortable: {
      size: 'h-9 px-4 text-sm',
      iconSize: 'w-4 h-4'
    },
    spacious: {
      size: 'h-11 px-8 text-base', 
      iconSize: 'w-5 h-5'
    }
  }
} as const;

// === INTERACTIVE STATES ===
export const interactiveStates = {
  hover: {
    card: 'hover:shadow-md hover:border-border/80 hover:-translate-y-0.5 transition-all duration-200',
    button: 'hover:bg-opacity-90 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150',
    link: 'hover:text-primary hover:underline transition-colors duration-150',
    avatar: 'hover:ring-2 hover:ring-primary hover:ring-opacity-30 transition-all duration-200'
  },
  focus: {
    ring: 'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
    visible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
  },
  active: {
    scale: 'active:scale-95 transition-transform duration-75',
    pressed: 'active:bg-opacity-80 active:shadow-none'
  },
  disabled: {
    opacity: 'disabled:opacity-50 disabled:cursor-not-allowed',
    pointer: 'disabled:pointer-events-none'
  }
} as const;

// === SEMANTIC COLOR TOKENS (enhanced from existing colors.ts) ===
export const semanticColors = {
  content: {
    primary: 'text-foreground',
    secondary: 'text-muted-foreground', 
    tertiary: 'text-muted-foreground/60',
    inverse: 'text-primary-foreground',
    accent: 'text-primary',
    link: 'text-primary hover:text-primary/80'
  },
  surface: {
    primary: 'bg-background',
    secondary: 'bg-muted',
    tertiary: 'bg-muted/50',
    elevated: 'bg-card',
    overlay: 'bg-popover',
    accent: 'bg-primary',
    border: 'border-border'
  },
  feedback: {
    success: {
      surface: 'bg-green-50 dark:bg-green-950/10',
      content: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      accent: 'text-green-600 dark:text-green-400'
    },
    warning: {
      surface: 'bg-amber-50 dark:bg-amber-950/10',
      content: 'text-amber-700 dark:text-amber-300', 
      border: 'border-amber-200 dark:border-amber-800',
      accent: 'text-amber-600 dark:text-amber-400'
    },
    error: {
      surface: 'bg-red-50 dark:bg-red-950/10',
      content: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      accent: 'text-red-600 dark:text-red-400'
    },
    info: {
      surface: 'bg-blue-50 dark:bg-blue-950/10',
      content: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      accent: 'text-blue-600 dark:text-blue-400'
    }
  }
} as const;

// === LAYOUT TOKENS ===
export const layout = {
  container: {
    sm: 'max-w-sm mx-auto',
    md: 'max-w-2xl mx-auto', 
    lg: 'max-w-4xl mx-auto',
    xl: 'max-w-6xl mx-auto',
    full: 'max-w-full mx-auto'
  },
  grid: {
    cols1: 'grid-cols-1',
    cols2: 'grid-cols-1 md:grid-cols-2',
    cols3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    cols4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  },
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    start: 'flex items-start',
    column: 'flex flex-col'
  }
} as const;

// === UTILITY FUNCTIONS ===
export const getVariant = (component: keyof typeof componentVariants, variant: 'dense' | 'comfortable' | 'spacious' = 'comfortable') => {
  return componentVariants[component][variant];
};

export const getTypography = (type: 'heading' | 'body' | 'meta', variant: string): string => {
  switch (type) {
    case 'heading':
      return typography.heading[variant as keyof typeof typography.heading]?.classes || typography.body.base.classes;
    case 'body':
      return typography.body[variant as keyof typeof typography.body]?.classes || typography.body.base.classes;
    case 'meta':
      return typography.meta[variant as keyof typeof typography.meta]?.classes || typography.body.base.classes;
    default:
      return typography.body.base.classes;
  }
};

export const combineClasses = (...classes: (string | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

// === COMPONENT RECIPES (pre-built combinations) ===
export const recipes = {
  postCard: {
    dense: combineClasses(
      componentVariants.card.dense.base,
      componentVariants.card.dense.padding,
      interactiveStates.hover.card,
      interactiveStates.focus.visible
    ),
    comfortable: combineClasses(
      componentVariants.card.comfortable.base,
      componentVariants.card.comfortable.padding, 
      interactiveStates.hover.card,
      interactiveStates.focus.visible
    ),
    spacious: combineClasses(
      componentVariants.card.spacious.base,
      componentVariants.card.spacious.padding,
      interactiveStates.hover.card,
      interactiveStates.focus.visible
    )
  },
  comment: {
    dense: combineClasses(
      'rounded-md',
      componentVariants.density.dense.padding,
      componentVariants.density.dense.spacing,
      'transition-all duration-200'
    ),
    comfortable: combineClasses(
      'rounded-lg',
      componentVariants.density.comfortable.padding,
      componentVariants.density.comfortable.spacing,
      'transition-all duration-200'
    ),
    spacious: combineClasses(
      'rounded-xl', 
      componentVariants.density.spacious.padding,
      componentVariants.density.spacious.spacing,
      'transition-all duration-200'
    )
  },
  button: {
    primary: {
      dense: combineClasses(
        'bg-primary text-primary-foreground',
        componentVariants.button.dense.size,
        interactiveStates.hover.button,
        interactiveStates.focus.visible,
        interactiveStates.active.scale,
        interactiveStates.disabled.opacity
      ),
      comfortable: combineClasses(
        'bg-primary text-primary-foreground',
        componentVariants.button.comfortable.size,
        interactiveStates.hover.button,
        interactiveStates.focus.visible,
        interactiveStates.active.scale,
        interactiveStates.disabled.opacity
      ),
      spacious: combineClasses(
        'bg-primary text-primary-foreground',
        componentVariants.button.spacious.size,
        interactiveStates.hover.button,
        interactiveStates.focus.visible,
        interactiveStates.active.scale,
        interactiveStates.disabled.opacity
      )
    },
    ghost: {
      dense: combineClasses(
        'hover:bg-muted',
        componentVariants.button.dense.size,
        interactiveStates.hover.button,
        interactiveStates.focus.visible,
        interactiveStates.active.scale,
        interactiveStates.disabled.opacity
      ),
      comfortable: combineClasses(
        'hover:bg-muted',
        componentVariants.button.comfortable.size,
        interactiveStates.hover.button,
        interactiveStates.focus.visible,
        interactiveStates.active.scale,
        interactiveStates.disabled.opacity
      ),
      spacious: combineClasses(
        'hover:bg-muted',
        componentVariants.button.spacious.size,
        interactiveStates.hover.button,
        interactiveStates.focus.visible,
        interactiveStates.active.scale,
        interactiveStates.disabled.opacity
      )
    }
  }
} as const;

// === TYPE EXPORTS ===
export type SpacingKey = keyof typeof spacing;
export type TypographyCategory = keyof typeof typography;
export type ComponentVariant = 'dense' | 'comfortable' | 'spacious';
export type ComponentType = keyof typeof componentVariants;