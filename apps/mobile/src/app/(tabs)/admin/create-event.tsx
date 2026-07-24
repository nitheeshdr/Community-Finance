import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  EventCategory,
  EventFundingMode,
  toPaise,
} from '@community-finance/shared';
import { useCreateEvent, useMemberPicker } from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { inr } from '@/lib/format';
import { Field, FormScreen, PickerField, SegmentField, SubmitBar } from '@/components/form';

const CATEGORIES = [
  { value: EventCategory.TEMPLE_FESTIVAL, label: 'Temple festival' },
  { value: EventCategory.SPORTS, label: 'Sports' },
  { value: EventCategory.ANNUAL_MEETING, label: 'Annual meeting' },
  { value: EventCategory.CHARITY, label: 'Charity' },
  { value: EventCategory.EMERGENCY_COLLECTION, label: 'Emergency collection' },
  { value: EventCategory.OTHER, label: 'Other' },
];

export default function CreateEventScreen() {
  const router = useRouter();
  const create = useCreateEvent();
  const { data: members } = useMemberPicker();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<EventCategory>(EventCategory.OTHER);
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [fundingMode, setFundingMode] = useState<EventFundingMode>(EventFundingMode.SPLIT);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allMembers = members ?? [];
  const participants = useMemo(
    () => allMembers.filter((m) => !excluded.has(m.id)),
    [allMembers, excluded]
  );
  const perHead =
    fundingMode === EventFundingMode.SPLIT && participants.length > 0
      ? Math.ceil(toPaise(Number(budget) || 0) / participants.length)
      : 0;

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Enter an event name';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Use format YYYY-MM-DD';
    const b = Number(budget);
    if (!b || b <= 0) e.budget = 'Enter a valid budget';
    if (fundingMode === EventFundingMode.SPLIT && participants.length === 0)
      e.participants = 'Select at least one participant';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    create.mutate(
      {
        name: name.trim(),
        category,
        date: new Date(date),
        budget: b,
        fundingMode,
        participantIds:
          fundingMode === EventFundingMode.SPLIT && excluded.size > 0
            ? participants.map((m) => m.id)
            : [],
        images: [],
        budgetOverride: false,
      },
      {
        onSuccess: () => {
          Alert.alert('Event created', 'The event and member shares have been set up.');
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
          <Field label="Event name" value={name} onChangeText={setName} error={errors.name} />
          <PickerField
            label="Category"
            value={category}
            onChange={(v) => setCategory(v as EventCategory)}
            searchable={false}
            options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          />
          <Field
            label="Date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            placeholder="2026-12-15"
            error={errors.date}
          />
          <Field
            label="Budget (₹)"
            value={budget}
            onChangeText={setBudget}
            keyboardType="decimal-pad"
            error={errors.budget}
          />
          <SegmentField
            label="Funding"
            value={fundingMode}
            onChange={setFundingMode}
            options={[
              { value: EventFundingMode.SPLIT, label: 'Split', icon: 'account-group' },
              { value: EventFundingMode.BALANCE, label: 'Balance', icon: 'wallet' },
            ]}
          />

          {fundingMode === EventFundingMode.BALANCE ? (
            <View className="flex-row items-center gap-2 rounded-m3-md bg-surface-container p-3">
              <MaterialCommunityIcons name="information-outline" size={16} color="#5D5C72" />
              <Text className="flex-1 text-xs text-on-surface-variant">
                Funded from the community balance — no member contributions collected.
              </Text>
            </View>
          ) : (
            <View className="rounded-m3-md border border-outline-variant p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-on-surface">
                  Participants ({participants.length}/{allMembers.length})
                </Text>
                <Text className="text-sm font-semibold text-primary">{inr(perHead)} each</Text>
              </View>
              <View className="mb-2 flex-row gap-3">
                <Pressable onPress={() => setExcluded(new Set())}>
                  <Text className="text-xs text-primary">Select all</Text>
                </Pressable>
                <Pressable onPress={() => setExcluded(new Set(allMembers.map((m) => m.id)))}>
                  <Text className="text-xs text-primary">Clear all</Text>
                </Pressable>
              </View>
              <View className="max-h-64">
                <ScrollView nestedScrollEnabled>
                  {allMembers.map((m) => {
                    const included = !excluded.has(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => toggle(m.id)}
                        className="flex-row items-center gap-2.5 py-2"
                      >
                        <MaterialCommunityIcons
                          name={included ? 'checkbox-marked' : 'checkbox-blank-outline'}
                          size={20}
                          color={included ? '#4F46E5' : '#777680'}
                        />
                        <Text
                          className={`flex-1 text-sm ${included ? 'text-on-surface' : 'text-on-surface-variant line-through'}`}
                        >
                          {m.name}
                        </Text>
                        <Text className="text-xs text-on-surface-variant">{m.phone}</Text>
                      </Pressable>
                    );
                  })}
                  {allMembers.length === 0 && (
                    <Text className="py-3 text-center text-xs text-on-surface-variant">
                      No active members. Use “Balance” funding instead.
                    </Text>
                  )}
                </ScrollView>
              </View>
              {errors.participants ? (
                <Text className="mt-1 text-xs text-error">{errors.participants}</Text>
              ) : null}
            </View>
          )}
          <View className="h-2" />
        </ScrollView>
        <SubmitBar
          label="Create event"
          loading={create.isPending}
          disabled={fundingMode === EventFundingMode.SPLIT && participants.length === 0}
          onPress={submit}
        />
      </KeyboardAvoidingView>
    </FormScreen>
  );
}
