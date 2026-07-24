import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
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
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View className="mb-8 items-center">
            <View className="mb-5 h-24 w-24 items-center justify-center rounded-full bg-primary-container">
              <Logo size={64} />
            </View>
            <Text variant="headlineMedium" style={{ fontWeight: '700', color: '#1B1B21' }}>
              Community Finance
            </Text>
            <Text variant="bodyMedium" style={{ color: '#46464F', marginTop: 4 }}>
              Transparent finances for your community
            </Text>
          </View>

          {/* MD3 elevated card */}
          <Surface elevation={1} style={{ borderRadius: 28, padding: 20 }}>
            <Text variant="titleLarge" style={{ fontWeight: '700', color: '#1B1B21' }}>
              Welcome back
            </Text>
            <Text variant="bodyMedium" style={{ color: '#46464F', marginTop: 2, marginBottom: 16 }}>
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
            <View style={{ height: 12 }} />
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
              contentStyle={{ height: 52, flexDirection: 'row-reverse' }}
              icon="arrow-right"
              style={{ borderRadius: 26 }}
              testID="login-submit"
            >
              Sign in
            </Button>
          </Surface>

          {/* Helper + credit */}
          <View className="mt-6 flex-row items-center justify-center gap-1.5">
            <MaterialCommunityIcons name="shield-key-outline" size={14} color="#5D5C72" />
            <Text variant="bodySmall" style={{ color: '#46464F' }}>
              Forgot your password? Ask your community admin.
            </Text>
          </View>
          <View className="mt-6 flex-row items-center justify-center gap-1.5">
            <MaterialCommunityIcons name="hammer-wrench" size={12} color="#777680" />
            <Text variant="labelMedium" style={{ color: '#5D5C72', fontWeight: '600' }}>
              Built by Setups Works
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
