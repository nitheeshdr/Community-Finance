import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { PHONE_REGEX } from '@community-finance/shared';
import { Logo } from '@/components/logo';
import { apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!PHONE_REGEX.test(phone.trim())) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!password) {
      setError('Enter your password');
      return;
    }
    setSubmitting(true);
    try {
      await login(phone.trim(), password);
      router.replace('/');
    } catch (err) {
      setError(apiErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-d">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View className="mb-10 items-center">
            <View className="mb-5">
              <Logo size={88} />
            </View>
            <Text className="text-[28px] font-bold leading-9 text-on-surface dark:text-on-surface-d">
              Community Finance
            </Text>
            <Text className="mt-1 text-sm text-on-surface-variant dark:text-on-surface-variant-d">
              Transparent finances for your community
            </Text>
          </View>

          {/* M3 form surface */}
          <View className="rounded-m3-xl bg-surface-container p-5 dark:bg-surface-container-d">
            <TextInput
              mode="outlined"
              label="Mobile number"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              autoComplete="tel"
              left={<TextInput.Icon icon="phone-outline" />}
              testID="login-phone"
            />
            <View className="h-3" />
            <TextInput
              mode="outlined"
              label="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoComplete="current-password"
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowPassword((v) => !v)}
                />
              }
              testID="login-password"
            />
            <HelperText type="error" visible={Boolean(error)} testID="login-error">
              {error ?? ''}
            </HelperText>
            <Button
              mode="contained"
              onPress={() => void onSubmit()}
              loading={submitting}
              disabled={submitting}
              contentStyle={{ height: 48 }}
              testID="login-submit"
            >
              Sign in
            </Button>
          </View>

          <Text className="mt-6 text-center text-xs text-on-surface-variant dark:text-on-surface-variant-d">
            Forgot your password? Contact your community admin for a reset.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
