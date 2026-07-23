import type { ReactNode } from 'react';
import { Text, View, type ViewProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/** Surface card matching the web dashboard look. */
export function Card({ children, className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl bg-card p-4 shadow-sm dark:bg-card-dark ${className ?? ''}`}
      {...props}
    >
      {children}
    </View>
  );
}

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
      ? 'text-success'
      : accent === 'destructive'
        ? 'text-destructive'
        : accent === 'warning'
          ? 'text-warning'
          : 'text-gray-900 dark:text-white';
  return (
    <Card className="flex-1">
      <Text className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</Text>
      <Text className={`mt-1 text-lg font-bold tabular-nums ${accentClass}`}>{value}</Text>
      {sub ? <Text className="mt-0.5 text-xs text-muted">{sub}</Text> : null}
    </Card>
  );
}

const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  PAID: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-400' },
  ACTIVE: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-400' },
  PENDING: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-400' },
  OVERDUE: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-400' },
  FAILED: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-400' },
  CANCELLED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  REFUNDED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  DRAFT: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  COMPLETED: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-400' },
  CLOSED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
};

export function StatusBadge({ status }: { status: string }) {
  const style = BADGE_STYLES[status] ?? BADGE_STYLES.CANCELLED!;
  return (
    <View className={`rounded-md px-2 py-0.5 ${style.bg}`}>
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
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <MaterialCommunityIcons name={icon} size={22} color="#6b7280" />
      </View>
      <Text className="text-sm font-medium text-gray-900 dark:text-white">{title}</Text>
      {description ? (
        <Text className="mt-1 max-w-[260px] text-center text-xs text-muted">{description}</Text>
      ) : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View className="mb-2.5 mt-6 flex-row items-center justify-between">
      <Text className="text-base font-semibold text-gray-900 dark:text-white">{children}</Text>
      {right}
    </View>
  );
}

export function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className={`text-sm font-medium tabular-nums ${accent ?? 'text-gray-900 dark:text-white'}`}>
        {value}
      </Text>
    </View>
  );
}
