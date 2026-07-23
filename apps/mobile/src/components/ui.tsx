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

/** M3 tonal stat tile — each tone maps to a container/on-container pair. */
const STAT_TONES = {
  surface: {
    bg: 'bg-surface-container dark:bg-surface-container-d',
    label: 'text-on-surface-variant dark:text-on-surface-variant-d',
    value: 'text-on-surface dark:text-on-surface-d',
    icon: 'bg-surface-high dark:bg-surface-high-d',
  },
  primary: {
    bg: 'bg-primary-container dark:bg-primary-container-d',
    label: 'text-on-primary-container/80 dark:text-on-primary-container-d/80',
    value: 'text-on-primary-container dark:text-on-primary-container-d',
    icon: 'bg-surface-lowest/50 dark:bg-surface-lowest-d/30',
  },
  secondary: {
    bg: 'bg-secondary-container dark:bg-secondary-container-d',
    label: 'text-on-secondary-container/80 dark:text-on-secondary-container-d/80',
    value: 'text-on-secondary-container dark:text-on-secondary-container-d',
    icon: 'bg-surface-lowest/50 dark:bg-surface-lowest-d/30',
  },
  tertiary: {
    bg: 'bg-tertiary-container dark:bg-tertiary-container-d',
    label: 'text-on-tertiary-container/80 dark:text-on-tertiary-container-d/80',
    value: 'text-on-tertiary-container dark:text-on-tertiary-container-d',
    icon: 'bg-surface-lowest/50 dark:bg-surface-lowest-d/30',
  },
  warning: {
    bg: 'bg-warning-container dark:bg-warning-container-d',
    label: 'text-on-warning-container/80 dark:text-on-warning-container-d/80',
    value: 'text-on-warning-container dark:text-on-warning-container-d',
    icon: 'bg-surface-lowest/50 dark:bg-surface-lowest-d/30',
  },
  error: {
    bg: 'bg-error-container dark:bg-error-container-d',
    label: 'text-on-error-container/80 dark:text-on-error-container-d/80',
    value: 'text-on-error-container dark:text-on-error-container-d',
    icon: 'bg-surface-lowest/50 dark:bg-surface-lowest-d/30',
  },
} as const;

export type StatTone = keyof typeof STAT_TONES;

export function StatCard({
  label,
  value,
  sub,
  tone = 'surface',
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: StatTone;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  const t = STAT_TONES[tone];
  return (
    <View className={`flex-1 rounded-m3-lg p-4 ${t.bg}`}>
      {icon ? (
        <View className={`mb-2 h-8 w-8 items-center justify-center rounded-full ${t.icon}`}>
          <MaterialCommunityIcons name={icon} size={16} color="#46464F" />
        </View>
      ) : null}
      <Text className={`text-[11px] font-medium uppercase tracking-wide ${t.label}`}>{label}</Text>
      <Text className={`mt-1 text-lg font-bold tabular-nums ${t.value}`}>{value}</Text>
      {sub ? <Text className={`mt-0.5 text-xs ${t.label}`}>{sub}</Text> : null}
    </View>
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
