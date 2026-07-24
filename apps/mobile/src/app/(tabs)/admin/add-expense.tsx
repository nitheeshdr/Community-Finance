import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { DEFAULTS, PaymentMethod } from '@community-finance/shared';
import { useCreateExpense, useEventPicker } from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { Field, FormScreen, PickerField, SegmentField, SubmitBar } from '@/components/form';

export default function AddExpenseScreen() {
  const router = useRouter();
  const create = useCreateExpense();
  const { data: events } = useEventPicker();

  const [eventId, setEventId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(DEFAULTS.EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [mode, setMode] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const e: Record<string, string> = {};
    if (!eventId) e.event = 'Select an event';
    if (name.trim().length < 2) e.name = 'Enter an expense name';
    const amt = Number(amount);
    if (!amt || amt <= 0) e.amount = 'Enter a valid amount';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      if (e.event) Alert.alert('Missing', e.event);
      return;
    }

    create.mutate(
      {
        eventId,
        name: name.trim(),
        category,
        amount: amt,
        vendor: vendor.trim() || undefined,
        paymentMode: mode,
        bills: [],
      },
      {
        onSuccess: () => {
          Alert.alert('Expense added', 'The expense is pending approval.');
          router.back();
        },
        onError: (err) => Alert.alert('Failed', apiErrorMessage(err)),
      }
    );
  }

  return (
    <FormScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
          <PickerField
            label="Event"
            value={eventId}
            onChange={setEventId}
            options={(events ?? []).map((ev) => ({ value: ev.id, label: ev.name }))}
          />
          <Field label="Expense name" value={name} onChangeText={setName} error={errors.name} />
          <PickerField
            label="Category"
            value={category}
            onChange={setCategory}
            searchable={false}
            options={DEFAULTS.EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <Field
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            error={errors.amount}
          />
          <Field label="Vendor (optional)" value={vendor} onChangeText={setVendor} />
          <SegmentField
            label="Paid via"
            value={mode}
            onChange={setMode}
            options={[
              { value: PaymentMethod.CASH, label: 'Cash' },
              { value: PaymentMethod.UPI, label: 'UPI' },
              { value: PaymentMethod.RAZORPAY, label: 'Online' },
            ]}
          />
        </ScrollView>
        <SubmitBar label="Add expense" loading={create.isPending} onPress={submit} />
      </KeyboardAvoidingView>
    </FormScreen>
  );
}
