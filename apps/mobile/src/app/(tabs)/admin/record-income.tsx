import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { IncomeSource, PaymentMethod } from '@community-finance/shared';
import { useCreateIncome } from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { Field, FormScreen, PickerField, SegmentField, SubmitBar } from '@/components/form';

const SOURCES: { value: IncomeSource; label: string }[] = [
  { value: IncomeSource.DONATION, label: 'Donation' },
  { value: IncomeSource.SPONSORSHIP, label: 'Sponsorship' },
  { value: IncomeSource.TEMPLE, label: 'Temple income' },
  { value: IncomeSource.MISC, label: 'Miscellaneous' },
];

export default function RecordIncomeScreen() {
  const router = useRouter();
  const create = useCreateIncome();

  const [source, setSource] = useState<IncomeSource>(IncomeSource.DONATION);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [donor, setDonor] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const needsName = source === IncomeSource.DONATION || source === IncomeSource.SPONSORSHIP;

  function submit() {
    const e: Record<string, string> = {};
    const amt = Number(amount);
    if (!amt || amt <= 0) e.amount = 'Enter a valid amount';
    if (needsName && !donor.trim()) e.donor = 'Name is required';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    create.mutate(
      {
        source,
        amount: amt,
        method,
        donorName: source === IncomeSource.DONATION ? donor.trim() : undefined,
        sponsorName: source === IncomeSource.SPONSORSHIP ? donor.trim() : undefined,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Income recorded', 'The income has been added to the community balance.');
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
            label="Source"
            value={source}
            onChange={(v) => setSource(v as IncomeSource)}
            searchable={false}
            options={SOURCES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Field
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            error={errors.amount}
          />
          {needsName && (
            <Field
              label={source === IncomeSource.DONATION ? 'Donor name' : 'Sponsor name'}
              value={donor}
              onChangeText={setDonor}
              error={errors.donor}
            />
          )}
          <SegmentField
            label="Method"
            value={method}
            onChange={setMethod}
            options={[
              { value: PaymentMethod.CASH, label: 'Cash' },
              { value: PaymentMethod.UPI, label: 'UPI' },
              { value: PaymentMethod.RAZORPAY, label: 'Online' },
            ]}
          />
          <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline />
        </ScrollView>
        <SubmitBar label="Record income" loading={create.isPending} onPress={submit} />
      </KeyboardAvoidingView>
    </FormScreen>
  );
}
