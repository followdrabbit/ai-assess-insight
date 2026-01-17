import { motion, AnimatePresence, Variants, HTMLMotionProps } from 'framer-motion';
import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedTabContentProps {
  children: ReactNode;
  tabKey: string;
  className?: string;
}

const tabVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1] as const,
    },
  },
};

export function AnimatedTabContent({ children, tabKey, className }: AnimatedTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        variants={tabVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Staggered container variants for cascading animations
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Staggered item variants with cascading entry effect
export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 24,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

// Faster stagger for grids with many items
export const fastStaggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

// Subtle stagger item for smaller elements
export const subtleStaggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

// Component for staggered container
interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  fast?: boolean;
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, className, fast = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={fast ? fastStaggerContainerVariants : staggerContainerVariants}
        initial="initial"
        animate="animate"
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerContainer.displayName = 'StaggerContainer';

// Component for staggered items
interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  subtle?: boolean;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, subtle = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={subtle ? subtleStaggerItemVariants : staggerItemVariants}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerItem.displayName = 'StaggerItem';

// Tab content with staggered children
interface StaggeredTabContentProps {
  children: ReactNode;
  tabKey: string;
  className?: string;
}

export function StaggeredTabContent({ children, tabKey, className }: StaggeredTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={{
          initial: { opacity: 0 },
          animate: {
            opacity: 1,
            transition: {
              staggerChildren: 0.08,
              delayChildren: 0.05,
            },
          },
          exit: {
            opacity: 0,
            transition: {
              duration: 0.15,
            },
          },
        }}
        className={cn('space-y-6', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
