import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { PHONE_REGEX, UserRole } from '@community-finance/shared';
import { useCreateMember } from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { Field, FormScreen, SubmitBar } from '@/components/form';

export default function AddMemberScreen() {
  const router = useRouter();
  const createMember = useCreateMember();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Enter the full name';
    if (!PHONE_REGEX.test(phone.trim())) e.phone = 'Enter a valid 10-digit mobile number';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
      e.password = 'Include a letter and a number';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    createMember.mutate(
      {
        name: name.trim(),
        phone: phone.trim(),
        password,
        role: UserRole.MEMBER,
        address: address.trim() || undefined,
        family: [],
      },
      {
        onSuccess: () => {
          Alert.alert('Member added', `${name.trim()} can now log in with their phone and password.`);
          router.back();
        },
        onError: (err) => Alert.alert('Could not add member', apiErrorMessage(err)),
      }
    );
  }

  return (
    <FormScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-4" keyboardShouldPersistTaps="handled">
          <Field label="Full name" value={name} onChangeText={setName} error={errors.name} />
          <Field
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="number-pad"
            maxLength={10}
            error={errors.phone}
          />
          <Field
            label="Initial password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />
          <Field label="Address (optional)" value={address} onChangeText={setAddress} multiline />
        </ScrollView>
        <SubmitBar label="Add member" loading={createMember.isPending} onPress={submit} />
      </KeyboardAvoidingView>
    </FormScreen>
  );
}
