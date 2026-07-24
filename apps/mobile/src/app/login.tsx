import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PHONE_REGEX } from '@community-finance/shared';
import { Logo } from '@/components/logo';
import { apiErrorMessage, getLastPhone } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { m3 } from '@/lib/theme';

const FIELD_BG = m3.light.surfaceContainerLowest;

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const theme = useTheme();
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

  const inputTheme = {
    roundness: 16,
    colors: {
      background: FIELD_BG,
    },
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-7 py-12"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark in a soft rose squircle */}
          <View
            className="mb-8 h-20 w-20 items-center justify-center rounded-3xl bg-primary-container"
          >
            <Logo size={52} />
          </View>

          {/* Left-aligned hero, per the reference */}
          <Text
            variant="displaySmall"
            style={{ fontWeight: '800', color: theme.colors.onSurface, letterSpacing: -0.5 }}
          >
            Welcome back
          </Text>
          <Text
            variant="bodyLarge"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, marginBottom: 32 }}
          >
            Sign in with your registered mobile number to continue.
          </Text>

          {/* Inputs */}
          <Text
            variant="labelLarge"
            style={{ color: theme.colors.onSurface, marginBottom: 8, fontWeight: '600' }}
          >
            Mobile number
          </Text>
          <TextInput
            mode="outlined"
            placeholder="10-digit mobile number"
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            autoComplete="tel"
            outlineColor={theme.colors.outlineVariant}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="phone-outline" />}
            style={{ backgroundColor: FIELD_BG }}
            theme={inputTheme}
            testID="login-phone"
          />

          <View style={{ height: 18 }} />

          <Text
            variant="labelLarge"
            style={{ color: theme.colors.onSurface, marginBottom: 8, fontWeight: '600' }}
          >
            Password
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Your password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
            outlineColor={theme.colors.outlineVariant}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            style={{ backgroundColor: FIELD_BG }}
            theme={inputTheme}
            onSubmitEditing={() => void onSubmit()}
            testID="login-password"
          />
          <HelperText type="error" visible={Boolean(error)} testID="login-error">
            {error ?? ''}
          </HelperText>

          {/* Big deep-crimson pill button, per the reference */}
          <Button
            mode="contained"
            onPress={() => void onSubmit()}
            loading={submitting}
            disabled={submitting}
            contentStyle={{ height: 58, flexDirection: 'row-reverse' }}
            labelStyle={{ fontSize: 16, fontWeight: '700' }}
            icon="arrow-right"
            style={{ borderRadius: 30, marginTop: 4 }}
            testID="login-submit"
          >
            Sign in
          </Button>

          {/* Helper + credit */}
          <View className="mt-8 flex-row items-center justify-center gap-1.5">
            <MaterialCommunityIcons
              name="shield-key-outline"
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Forgot your password? Ask your community admin.
            </Text>
          </View>
          <View className="mt-6 flex-row items-center justify-center gap-1.5">
            <MaterialCommunityIcons
              name="hammer-wrench"
              size={12}
              color={theme.colors.outline}
            />
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.secondary, fontWeight: '600' }}
            >
              Built by Setups Works
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
