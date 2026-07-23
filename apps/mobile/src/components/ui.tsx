import type { ReactNode } from 'react';
import { Text, View, type ViewProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Material 3 primitives. Surfaces use the M3 surface-container roles;
 * status chips use tonal containers (assist-chip style, no elevation).
 */

/** M3 filled card (surface-container, 16dp radius, no shadow). */
export function Card({ children, className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-m3-lg bg-surface-container p-4 dark:bg-surface-container-d ${className ?? ''}`}
      {...props}
    >
      {children}
    </View>
  );
}

/** Elevated-tonal stat tile. */
export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'success' | 'destructive' | 'warning';
}) {
  const accentClass =
    accent === 'success'
      ? 'text-success dark:text-success-d'
      : accent === 'destructive'
        ? 'text-error dark:text-error-d'
        : accent === 'warning'
          ? 'text-warning dark:text-warning-d'
          : 'text-on-surface dark:text-on-surface-d';
  return (
    <Card className="flex-1">
      <Text className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant dark:text-on-surface-variant-d">
        {label}
      </Text>
      <Text className={`mt-1 text-lg font-bold tabular-nums ${accentClass}`}>{value}</Text>
      {sub ? (
        <Text className="mt-0.5 text-xs text-on-surface-variant dark:text-on-surface-variant-d">
          {sub}
        </Text>
      ) : null}
    </Card>
  );
}

const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  PAID: {
    bg: 'bg-success-container dark:bg-success-container-d',
    text: 'text-on-success-container dark:text-on-success-container-d',
  },
  ACTIVE: {
    bg: 'bg-success-container dark:bg-success-container-d',
    text: 'text-on-success-container dark:text-on-success-container-d',
  },
  PENDING: {
    bg: 'bg-warning-container dark:bg-warning-container-d',
    text: 'text-on-warning-container dark:text-on-warning-container-d',
  },
  OVERDUE: {
    bg: 'bg-error-container dark:bg-error-container-d',
    text: 'text-on-error-container dark:text-on-error-container-d',
  },
  FAILED: {
    bg: 'bg-error-container dark:bg-error-container-d',
    text: 'text-on-error-container dark:text-on-error-container-d',
  },
  CANCELLED: {
    bg: 'bg-surface-variant dark:bg-surface-variant-d',
    text: 'text-on-surface-variant dark:text-on-surface-variant-d',
  },
  REFUNDED: {
    bg: 'bg-surface-variant dark:bg-surface-variant-d',
    text: 'text-on-surface-variant dark:text-on-surface-variant-d',
  },
  DRAFT: {
    bg: 'bg-surface-variant dark:bg-surface-variant-d',
    text: 'text-on-surface-variant dark:text-on-surface-variant-d',
  },
  COMPLETED: {
    bg: 'bg-secondary-container dark:bg-secondary-container-d',
    text: 'text-on-secondary-container dark:text-on-secondary-container-d',
  },
  CLOSED: {
    bg: 'bg-surface-variant dark:bg-surface-variant-d',
    text: 'text-on-surface-variant dark:text-on-surface-variant-d',
  },
};

/** M3 assist-chip style status badge. */
export function StatusBadge({ status }: { status: string }) {
  const style = BADGE_STYLES[status] ?? BADGE_STYLES.CANCELLED!;
  return (
    <View className={`rounded-m3-sm px-2.5 py-1 ${style.bg}`}>
      <Text className={`text-[11px] font-semibold capitalize ${style.text}`}>
        {status.toLowerCase()}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
}) {
  return (
    <View className="items-center justify-center py-14">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-m3-lg bg-secondary-container dark:bg-secondary-container-d">
        <MaterialCommunityIcons name={icon} size={26} color="#5D5C72" />
      </View>
      <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-d">{title}</Text>
      {description ? (
        <Text className="mt-1 max-w-[260px] text-center text-xs text-on-surface-variant dark:text-on-surface-variant-d">
          {description}
        </Text>
      ) : null}
    </View>
  );
}

/** M3 title-medium section header. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View className="mb-2.5 mt-6 flex-row items-center justify-between">
      <Text className="text-base font-semibold text-on-surface dark:text-on-surface-d">
        {children}
      </Text>
      {right}
    </View>
  );
}

export function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-sm text-on-surface-variant dark:text-on-surface-variant-d">{label}</Text>
      <Text
        className={`text-sm font-medium tabular-nums ${accent ?? 'text-on-surface dark:text-on-surface-d'}`}
      >
        {value}
      </Text>
    </View>
  );
}
