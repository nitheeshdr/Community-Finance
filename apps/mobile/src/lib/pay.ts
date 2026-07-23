import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { QueryClient } from '@tanstack/react-query';
import type { ApiSuccess, EventPayLinkDto } from '@community-finance/shared';
import { api, apiErrorMessage } from './api';

/**
 * Open a one-time Razorpay payment link for a pending due (subscription
 * or event contribution). Works alongside AutoPay — a member can pay the
 * current period manually even if a mandate exists. Refreshes payments +
 * splits on return so the webhook-settled status shows up.
 */
export async function payPendingPayment(
  paymentId: string,
  qc: QueryClient
): Promise<void> {
  try {
    const res = await api.post<ApiSuccess<EventPayLinkDto>>(`/payments/${paymentId}/pay`);
    await WebBrowser.openBrowserAsync(res.data.data.shortUrl);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['payments'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  } catch (err) {
    Alert.alert('Payment', apiErrorMessage(err));
  }
}

/** Open a one-time link for an event share (creates the payment row). */
export async function payEventShare(eventId: string, qc: QueryClient): Promise<void> {
  try {
    const res = await api.post<ApiSuccess<EventPayLinkDto>>(`/events/${eventId}/pay`);
    await WebBrowser.openBrowserAsync(res.data.data.shortUrl);
    await qc.invalidateQueries({ queryKey: ['events', 'splits', eventId] });
  } catch (err) {
    Alert.alert('Payment', apiErrorMessage(err));
  }
}
