import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { PaymentMethod, PaymentType } from '@community-finance/shared';
import { useMemberPicker, useRecordPayment } from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { Field, FormScreen, PickerField, SegmentField, SubmitBar } from '@/components/form';

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function RecordPaymentScreen() {
  const router = useRouter();
  const record = useRecordPayment();
  const { data: members } = useMemberPicker();

  const [memberId, setMemberId] = useState('');
  const [type, setType] = useState<PaymentType>(PaymentType.SUBSCRIPTION);
  const [method, setMethod] = useState<PaymentMethod.CASH | PaymentMethod.UPI>(PaymentMethod.CASH);
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [upiRef, setUpiRef] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const e: Record<string, string> = {};
    if (!memberId) e.member = 'Select a member';
    const amt = Number(amount);
    if (!amt || amt <= 0) e.amount = 'Enter a valid amount';
    if (method === PaymentMethod.UPI && !upiRef.trim()) e.upi = 'UPI reference required';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    record.mutate(
      {
        memberId,
        type,
        method,
        amount: amt,
        period: type === PaymentType.SUBSCRIPTION ? period : undefined,
        upiReference: method === PaymentMethod.UPI ? upiRef.trim() : undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Recorded', 'Payment recorded and added to the approval queue.');
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
            label="Member"
            value={memberId}
            onChange={setMemberId}
            options={(members ?? []).map((m) => ({ value: m.id, label: m.name, hint: m.phone }))}
          />
          <SegmentField
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: PaymentType.SUBSCRIPTION, label: 'Subscription' },
              { value: PaymentType.DONATION, label: 'Donation' },
              { value: PaymentType.MISC, label: 'Misc' },
            ]}
          />
          <SegmentField
            label="Method"
            value={method}
            onChange={setMethod}
            options={[
              { value: PaymentMethod.CASH, label: 'Cash', icon: 'cash' },
              { value: PaymentMethod.UPI, label: 'UPI', icon: 'cellphone' },
            ]}
          />
          <Field
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            error={errors.amount}
          />
          {type === PaymentType.SUBSCRIPTION && (
            <Field label="Period (YYYY-MM)" value={period} onChangeText={setPeriod} />
          )}
          {method === PaymentMethod.UPI && (
            <Field label="UPI reference" value={upiRef} onChangeText={setUpiRef} error={errors.upi} />
          )}
          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
          {errors.member ? null : null}
        </ScrollView>
        <SubmitBar label="Record payment" loading={record.isPending} onPress={submit} />
      </KeyboardAvoidingView>
    </FormScreen>
  );
}
