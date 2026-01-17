import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// Card hover animation variants
const cardHoverVariants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  },
  hover: {
    scale: 1.01,
    y: -2,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  tap: {
    scale: 0.99,
    y: 0,
    transition: {
      duration: 0.1,
    },
  },
};

// Icon animation variants
const iconVariants = {
  rest: {
    scale: 1,
    rotate: 0,
  },
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

// Border glow animation variants
const glowVariants = {
  rest: {
    opacity: 0,
  },
  hover: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
};

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  isHighlighted?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, isHighlighted, onClick, disabled }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="rest"
        whileHover={disabled ? undefined : "hover"}
        whileTap={disabled ? undefined : "tap"}
        animate="rest"
        variants={cardHoverVariants}
        className={cn(
          "relative rounded-lg",
          onClick && !disabled && "cursor-pointer",
          disabled && "opacity-60",
          className
        )}
        onClick={disabled ? undefined : onClick}
      >
        {/* Glow effect on hover */}
        <motion.div
          variants={glowVariants}
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 -z-10"
        />
        
        <Card
          className={cn(
            "h-full transition-colors duration-300",
            isHighlighted && "ring-2 ring-primary ring-offset-2"
          )}
        >
          {children}
        </Card>
      </motion.div>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';

interface AnimatedSectionCardProps {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  isHighlighted?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const AnimatedSectionCard = forwardRef<HTMLDivElement, AnimatedSectionCardProps>(
  ({ id, title, description, icon: Icon, isHighlighted, children, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="rest"
        whileHover="hover"
        animate="rest"
        variants={cardHoverVariants}
        className={cn("relative rounded-lg", className)}
      >
        {/* Glow effect on hover */}
        <motion.div
          variants={glowVariants}
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 -z-10"
        />
        
        <Card
          className={cn(
            "h-full transition-all duration-500",
            isHighlighted && "ring-2 ring-primary ring-offset-2"
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {Icon && (
                <motion.div variants={iconVariants}>
                  <Icon className="h-4 w-4" />
                </motion.div>
              )}
              {title}
            </CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

AnimatedSectionCard.displayName = 'AnimatedSectionCard';

// Stats Card with animated icon
interface AnimatedStatsCardProps {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  value: string | number;
  className?: string;
}

export function AnimatedStatsCard({ 
  icon: Icon, 
  iconClassName, 
  label, 
  value,
  className 
}: AnimatedStatsCardProps) {
  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={cardHoverVariants}
      className={cn("relative rounded-lg", className)}
    >
      <Card className="h-full">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <motion.div
              variants={iconVariants}
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                iconClassName
              )}
            >
              <Icon className="h-5 w-5" />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Clickable Card with selection state
interface AnimatedSelectableCardProps extends HTMLMotionProps<'div'> {
  isSelected?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const AnimatedSelectableCard = forwardRef<HTMLDivElement, AnimatedSelectableCardProps>(
  ({ isSelected, children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        animate="rest"
        variants={cardHoverVariants}
        className={cn("relative rounded-lg cursor-pointer", className)}
        {...props}
      >
        <motion.div
          variants={glowVariants}
          className={cn(
            "absolute inset-0 rounded-lg -z-10",
            isSelected 
              ? "bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" 
              : "bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10"
          )}
        />
        
        <Card
          className={cn(
            "h-full transition-all duration-200",
            isSelected 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50"
          )}
        >
          {children}
        </Card>
      </motion.div>
    );
  }
);

AnimatedSelectableCard.displayName = 'AnimatedSelectableCard';
