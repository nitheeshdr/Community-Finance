import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PHONE_REGEX } from '@community-finance/shared';
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
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
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
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <MaterialCommunityIcons name="currency-inr" size={34} color="#fff" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Community Finance
            </Text>
            <Text className="mt-1 text-sm text-muted">
              Transparent finances for your community
            </Text>
          </View>

          {/* Form card */}
          <View className="rounded-2xl bg-card p-5 shadow-sm dark:bg-card-dark">
            <Text className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              Mobile number
            </Text>
            <View className="mb-4 flex-row items-center rounded-xl border border-border bg-background px-3 dark:border-border-dark dark:bg-background-dark">
              <MaterialCommunityIcons name="phone-outline" size={18} color="#6b7280" />
              <TextInput
                className="ml-2 h-12 flex-1 text-base text-gray-900 dark:text-white"
                keyboardType="number-pad"
                maxLength={10}
                placeholder="98765 43210"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={setPhone}
                autoComplete="tel"
                testID="login-phone"
              />
            </View>

            <Text className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </Text>
            <View className="mb-2 flex-row items-center rounded-xl border border-border bg-background px-3 dark:border-border-dark dark:bg-background-dark">
              <MaterialCommunityIcons name="lock-outline" size={18} color="#6b7280" />
              <TextInput
                className="ml-2 h-12 flex-1 text-base text-gray-900 dark:text-white"
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                autoComplete="current-password"
                testID="login-password"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#6b7280"
                />
              </Pressable>
            </View>

            {error && (
              <Text className="mb-2 text-sm text-destructive" testID="login-error">
                {error}
              </Text>
            )}

            <Pressable
              className="mt-2 h-12 items-center justify-center rounded-xl bg-primary active:opacity-80"
              onPress={onSubmit}
              disabled={submitting}
              testID="login-submit"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Sign in</Text>
              )}
            </Pressable>
          </View>

          <Text className="mt-6 text-center text-xs text-muted">
            Forgot your password? Contact your community admin for a reset.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
