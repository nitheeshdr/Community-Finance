import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Button, SegmentedButtons, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/** Labeled Paper outlined text input. */
export function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  multiline,
  maxLength,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  error?: string;
}) {
  return (
    <View className="mb-3">
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        maxLength={maxLength}
        placeholder={placeholder}
      />
      {error ? <Text className="mt-1 text-xs text-error">{error}</Text> : null}
    </View>
  );
}

/** Segmented single-choice control. */
export function SegmentField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: string }[];
}) {
  return (
    <View className="mb-3">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-on-surface-variant">{label}</Text>
      ) : null}
      <SegmentedButtons
        value={value}
        onValueChange={(v) => onChange(v as T)}
        buttons={options.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
      />
    </View>
  );
}

export interface PickerOption {
  value: string;
  label: string;
  hint?: string;
}

/** A field that opens a searchable modal list to pick one option. */
export function PickerField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchable = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: PickerOption[];
  placeholder?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q)
    );
  }, [options, query]);

  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-sm font-medium text-on-surface-variant">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-md border border-outline px-3 py-3"
      >
        <Text className={selected ? 'text-on-surface' : 'text-on-surface-variant'}>
          {selected ? selected.label : placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#777680" />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[70%] rounded-t-3xl bg-surface p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-on-surface">{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color="#777680" />
              </Pressable>
            </View>
            {searchable && (
              <TextInput
                mode="outlined"
                dense
                placeholder="Search…"
                value={query}
                onChangeText={setQuery}
                left={<TextInput.Icon icon="magnify" />}
                style={{ marginBottom: 8 }}
              />
            )}
            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex-row items-center justify-between border-b border-outline-variant py-3"
                >
                  <View className="flex-1">
                    <Text className="text-sm text-on-surface">{item.label}</Text>
                    {item.hint ? (
                      <Text className="text-xs text-on-surface-variant">{item.hint}</Text>
                    ) : null}
                  </View>
                  {item.value === value && (
                    <MaterialCommunityIcons name="check" size={18} color="#984447" />
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text className="py-6 text-center text-sm text-on-surface-variant">
                  No options found.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Sticky submit button for admin form screens. */
export function SubmitBar({
  label,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View className="border-t border-outline-variant bg-surface p-4">
      <Button
        mode="contained"
        onPress={onPress}
        loading={loading}
        disabled={disabled || loading}
        contentStyle={{ height: 48 }}
      >
        {label}
      </Button>
    </View>
  );
}

export function FormScreen({ children }: { children: ReactNode }) {
  return <View className="flex-1 bg-surface">{children}</View>;
}
