import { EventStatus } from '@community-finance/shared';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<
  EventStatus,
  'success' | 'secondary' | 'warning' | 'outline' | 'destructive'
> = {
  [EventStatus.DRAFT]: 'secondary',
  [EventStatus.ACTIVE]: 'success',
  [EventStatus.COMPLETED]: 'outline',
  [EventStatus.CLOSED]: 'outline',
  [EventStatus.CANCELLED]: 'destructive',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {status.toLowerCase()}
    </Badge>
  );
}
