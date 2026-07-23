import { UserStatus } from '@community-finance/shared';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<UserStatus, 'success' | 'secondary' | 'destructive'> = {
  [UserStatus.ACTIVE]: 'success',
  [UserStatus.INACTIVE]: 'secondary',
  [UserStatus.SUSPENDED]: 'destructive',
};

export function MemberStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {status.toLowerCase()}
    </Badge>
  );
}
