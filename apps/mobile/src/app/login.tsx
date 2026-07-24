import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PHONE_REGEX } from '@community-finance/shared';
import { Logo } from '@/components/logo';
import { apiErrorMessage, getLastPhone } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getLastPhone().then((saved) => {
      if (saved) setPhone((current) => current || saved);
    });
  }, []);

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
    <View className="flex-1 bg-surface">
      {/* Hero */}
      <View className="items-center rounded-b-[40px] bg-primary pb-10 pt-20">
        <View className="rounded-3xl bg-white/15 p-3">
          <Logo size={72} />
        </View>
        <Text className="mt-4 text-2xl font-bold text-white">Community Finance</Text>
        <Text className="mt-1 text-sm text-indigo-100">
          Transparent finances for your community
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Form card overlapping the hero */}
          <View className="-mt-6 rounded-3xl bg-surface-lowest p-5 shadow-lg">
            <Text className="text-lg font-bold text-on-surface">Welcome back</Text>
            <Text className="mb-4 mt-0.5 text-sm text-on-surface-variant">
              Sign in with your registered mobile number
            </Text>

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
              onSubmitEditing={() => void onSubmit()}
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
              contentStyle={{ height: 50, flexDirection: 'row-reverse' }}
              icon="arrow-right"
              testID="login-submit"
            >
              Sign in
            </Button>
          </View>

          <View className="mt-5 flex-row items-center justify-center gap-1.5 rounded-2xl bg-surface-container px-4 py-3">
            <MaterialCommunityIcons name="shield-key-outline" size={15} color="#5D5C72" />
            <Text className="text-xs text-on-surface-variant">
              Forgot your password? Ask your community admin to reset it.
            </Text>
          </View>

          <View className="mt-auto items-center pt-8">
            <View className="flex-row items-center gap-1.5">
              <MaterialCommunityIcons name="hammer-wrench" size={12} color="#777680" />
              <Text className="text-xs font-semibold text-on-surface-variant">
                Built by Setups Works
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
