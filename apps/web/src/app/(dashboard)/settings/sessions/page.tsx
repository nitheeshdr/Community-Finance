import { redirect } from 'next/navigation';

/** Legacy URL — sessions live in the Devices tab of Settings. */
export default function SessionsRedirect() {
  redirect('/settings?tab=sessions');
}
