import { PaymentStatus } from '@community-finance/shared';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<
  PaymentStatus,
  'success' | 'secondary' | 'destructive' | 'warning' | 'outline'
> = {
  [PaymentStatus.PAID]: 'success',
  [PaymentStatus.PENDING]: 'warning',
  [PaymentStatus.FAILED]: 'destructive',
  [PaymentStatus.CANCELLED]: 'secondary',
  [PaymentStatus.REFUNDED]: 'outline',
  [PaymentStatus.OVERDUE]: 'destructive',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {status.toLowerCase()}
    </Badge>
  );
}
