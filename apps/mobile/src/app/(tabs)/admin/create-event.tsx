import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  EventCategory,
  EventFundingMode,
  toPaise,
  toRupees,
} from '@community-finance/shared';
import { useCreateEvent, useMemberPicker, useUpdateEvent } from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { useEvent } from '@/lib/queries';
import { inr } from '@/lib/format';
import { DateField, Field, FormScreen, PickerField, SegmentField, SubmitBar } from '@/components/form';

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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const create = useCreateEvent();
  const update = useUpdateEvent(id ?? '');
  const { data: members } = useMemberPicker();
  const { data: existing } = useEvent(id ?? '');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<EventCategory>(EventCategory.OTHER);
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('');
  const [collectAmount, setCollectAmount] = useState('');
  const [fundingMode, setFundingMode] = useState<EventFundingMode>(EventFundingMode.SPLIT);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCollect = fundingMode === EventFundingMode.COLLECT;
  const isSplit = fundingMode === EventFundingMode.SPLIT;
  const showParticipants = isSplit || isCollect;

  // Prefill when editing.
  useEffect(() => {
    if (isEdit && existing) {
      setName(existing.name);
      setCategory(existing.category);
      setDate(existing.date.slice(0, 10));
      setBudget(String(toRupees(existing.budget)));
      setFundingMode(existing.fundingMode);
      if (existing.collectAmountPerMember)
        setCollectAmount(String(toRupees(existing.collectAmountPerMember)));
    }
  }, [isEdit, existing]);

  useEffect(() => {
    if (isEdit && existing && existing.participantIds.length > 0 && (members?.length ?? 0) > 0) {
      const included = new Set(existing.participantIds);
      setExcluded(new Set((members ?? []).filter((m) => !included.has(m.id)).map((m) => m.id)));
    }
  }, [isEdit, existing, members]);

  const allMembers = members ?? [];
  const participants = useMemo(
    () => allMembers.filter((m) => !excluded.has(m.id)),
    [allMembers, excluded]
  );
  const perHead = isCollect
    ? toPaise(Number(collectAmount) || 0)
    : isSplit && participants.length > 0
      ? Math.ceil(toPaise(Number(budget) || 0) / participants.length)
      : 0;
  const collectTotal = isCollect ? perHead * participants.length : 0;

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
    if (isCollect) {
      if (!(Number(collectAmount) > 0)) e.collect = 'Enter the amount per member';
      if (participants.length === 0) e.participants = 'Select members to collect from';
    } else {
      if (!(Number(budget) > 0)) e.budget = 'Enter a valid budget';
      if (isSplit && participants.length === 0)
        e.participants = 'Select at least one participant';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const payload = {
      name: name.trim(),
      category,
      date: new Date(date),
      ...(isCollect
        ? { collectAmountPerMember: Number(collectAmount) }
        : { budget: Number(budget) }),
      fundingMode,
      participantIds:
        showParticipants && (isCollect || excluded.size > 0)
          ? participants.map((m) => m.id)
          : [],
      budgetOverride: false,
    };

    if (isEdit) {
      update.mutate(payload, {
        onSuccess: () => {
          Alert.alert('Event updated', 'Your changes have been saved.');
          router.back();
        },
        onError: (err) => Alert.alert('Failed', apiErrorMessage(err)),
      });
    } else {
      create.mutate(
        { ...payload, images: [] },
        {
          onSuccess: () => {
            Alert.alert('Event created', 'The event and member shares have been set up.');
            router.back();
          },
          onError: (err) => Alert.alert('Failed', apiErrorMessage(err)),
        }
      );
    }
  }

  return (
    <FormScreen>
      <Stack.Screen options={{ title: isEdit ? 'Edit event' : 'Create event' }} />
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
          <DateField
            label="Date"
            value={date}
            onChange={setDate}
            placeholder="Pick a date"
            error={errors.date}
          />
          <SegmentField
            label="Funding"
            value={fundingMode}
            onChange={setFundingMode}
            options={[
              { value: EventFundingMode.SPLIT, label: 'Split' },
              { value: EventFundingMode.BALANCE, label: 'Balance' },
              { value: EventFundingMode.COLLECT, label: 'Collect' },
            ]}
          />

          {/* Amount field: budget for Split/Balance, per-member for Collect */}
          {isCollect ? (
            <Field
              label="Amount per member (₹)"
              value={collectAmount}
              onChangeText={setCollectAmount}
              keyboardType="decimal-pad"
              error={errors.collect}
            />
          ) : (
            <Field
              label="Budget (₹)"
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              error={errors.budget}
            />
          )}

          <View className="mb-3 flex-row items-start gap-2 rounded-m3-md bg-surface-container p-3">
            <MaterialCommunityIcons name="information-outline" size={16} color="#5D5C72" />
            <Text className="flex-1 text-xs text-on-surface-variant">
              {fundingMode === EventFundingMode.BALANCE
                ? 'From community balance — the expense is deducted from the available balance. No member contributions.'
                : isSplit
                  ? 'Split among members — the selected members share the budget equally, each with a Pay button.'
                  : 'Collect payment — each selected member is assigned the same amount and pays it directly via the app. Not tied to the community balance.'}
            </Text>
          </View>

          {fundingMode === EventFundingMode.BALANCE ? null : (
            <View className="rounded-m3-md border border-outline-variant p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-on-surface">
                  {isCollect ? 'Collect from' : 'Participants'} ({participants.length}/
                  {allMembers.length})
                </Text>
                <Text className="text-sm font-semibold text-primary">
                  {inr(perHead)} each{isCollect ? ` · ${inr(collectTotal)} total` : ''}
                </Text>
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
          label={isEdit ? 'Save changes' : 'Create event'}
          loading={create.isPending || update.isPending}
          disabled={showParticipants && participants.length === 0}
          onPress={submit}
        />
      </KeyboardAvoidingView>
    </FormScreen>
  );
}
