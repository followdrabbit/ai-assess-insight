import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Shimmer effect overlay
const shimmerVariants: Variants = {
  initial: {
    x: '-100%',
  },
  animate: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear' as const,
    },
  },
};

// Pulse animation for skeleton items
const pulseVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: 1,
    transition: {
      repeat: Infinity,
      repeatType: 'reverse' as const,
      duration: 0.8,
      ease: 'easeInOut' as const,
    },
  },
};

// Staggered fade-in for skeleton items
const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

interface AnimatedSkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

// Basic animated skeleton with shimmer
export function ShimmerSkeleton({ className, style }: AnimatedSkeletonProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-muted', className)} style={style}>
      <motion.div
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
        className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent"
      />
    </div>
  );
}

// Pulsing skeleton
export function PulseSkeleton({ className, style }: AnimatedSkeletonProps) {
  return (
    <motion.div
      variants={pulseVariants}
      initial="initial"
      animate="animate"
      className={cn('rounded-md bg-muted', className)}
      style={style}
    />
  );
}

// Stats card skeleton with animation
export function StatsCardSkeleton() {
  return (
    <motion.div variants={staggerItemVariants}>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <ShimmerSkeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2 flex-1">
              <ShimmerSkeleton className="h-4 w-24" />
              <ShimmerSkeleton className="h-6 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Section card skeleton with header and content
export function SectionCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <motion.div variants={staggerItemVariants}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <ShimmerSkeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-2 flex-1">
              <ShimmerSkeleton className="h-5 w-48" />
              <ShimmerSkeleton className="h-4 w-72" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <ShimmerSkeleton 
              key={i} 
              className="h-4" 
              style={{ width: `${100 - i * 10}%` }} 
            />
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Table skeleton for data grids
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <motion.div variants={staggerItemVariants}>
      <Card>
        <CardContent className="p-0">
          {/* Header */}
          <div className="border-b p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <ShimmerSkeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="border-b last:border-0 p-4 flex gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <ShimmerSkeleton key={colIndex} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <motion.div variants={staggerItemVariants}>
      <Card>
        <CardHeader className="pb-2">
          <ShimmerSkeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 justify-around" style={{ height }}>
            {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
                className="flex-1 max-w-12 bg-muted rounded-t"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Full panel skeleton for async loading panels
interface PanelSkeletonProps {
  variant?: 'stats' | 'table' | 'list' | 'mixed';
  statsCount?: number;
  tableRows?: number;
  listItems?: number;
}

export function PanelSkeleton({ 
  variant = 'mixed', 
  statsCount = 4, 
  tableRows = 5,
  listItems = 3 
}: PanelSkeletonProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Stats grid */}
      {(variant === 'stats' || variant === 'mixed') && (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: statsCount }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Charts */}
      {variant === 'mixed' && (
        <div className="grid gap-4 md:grid-cols-3">
          <ChartSkeleton height={180} />
          <ChartSkeleton height={180} />
          <ChartSkeleton height={180} />
        </div>
      )}

      {/* Table */}
      {(variant === 'table' || variant === 'mixed') && (
        <TableSkeleton rows={tableRows} />
      )}

      {/* List items */}
      {variant === 'list' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <ShimmerSkeleton className="h-6 w-48" />
              <ShimmerSkeleton className="h-9 w-32 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: listItems }).map((_, i) => (
              <motion.div key={i} variants={staggerItemVariants}>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShimmerSkeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <ShimmerSkeleton className="h-5 w-32" />
                        <ShimmerSkeleton className="h-4 w-48" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <ShimmerSkeleton className="h-8 w-8 rounded-md" />
                      <ShimmerSkeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// Audit logs specific skeleton
export function AuditLogsSkeleton() {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ChartSkeleton key={i} height={160} />
        ))}
      </div>

      {/* Table */}
      <SectionCardSkeleton lines={0} />
      <TableSkeleton rows={8} columns={6} />
    </motion.div>
  );
}

// SIEM integrations specific skeleton
export function SIEMSkeleton() {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Integrations list */}
      <PanelSkeleton variant="list" listItems={2} />
    </motion.div>
  );
}

// AI Providers specific skeleton
export function AIProvidersSkeleton() {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      <motion.div variants={staggerItemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShimmerSkeleton className="h-5 w-5 rounded" />
                <ShimmerSkeleton className="h-6 w-40" />
              </div>
              <ShimmerSkeleton className="h-9 w-36 rounded-md" />
            </div>
            <ShimmerSkeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <motion.div key={i} variants={staggerItemVariants}>
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ShimmerSkeleton className="h-10 w-10 rounded-lg text-2xl" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ShimmerSkeleton className="h-5 w-28" />
                          <ShimmerSkeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <ShimmerSkeleton className="h-4 w-40" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <ShimmerSkeleton className="h-8 w-8 rounded-md" />
                      <ShimmerSkeleton className="h-8 w-8 rounded-md" />
                      <ShimmerSkeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-4">
                    <ShimmerSkeleton className="h-3 w-20" />
                    <ShimmerSkeleton className="h-3 w-28" />
                    <ShimmerSkeleton className="h-3 w-36" />
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
