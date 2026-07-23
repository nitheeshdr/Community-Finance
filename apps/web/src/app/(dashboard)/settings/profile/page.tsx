import { redirect } from 'next/navigation';

/** Legacy URL — profile lives in the Account tab of Settings. */
export default function ProfileRedirect() {
  redirect('/settings?tab=account');
}
