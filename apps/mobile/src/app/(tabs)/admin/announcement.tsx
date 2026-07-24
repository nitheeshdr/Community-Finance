import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { NotificationType } from '@community-finance/shared';
import { useSendAnnouncement } from '@/lib/admin';
import { apiErrorMessage } from '@/lib/api';
import { Field, FormScreen, SegmentField, SubmitBar } from '@/components/form';

export default function AnnouncementScreen() {
  const router = useRouter();
  const send = useSendAnnouncement();
  const [type, setType] = useState<NotificationType>(NotificationType.ANNOUNCEMENT);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const e: Record<string, string> = {};
    if (title.trim().length < 2) e.title = 'Enter a title';
    if (body.trim().length < 2) e.body = 'Enter a message';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    send.mutate(
      { type, title: title.trim(), body: body.trim() },
      {
        onSuccess: () => {
          Alert.alert('Sent', 'Your announcement has been sent to all members.');
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
          <SegmentField
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: NotificationType.ANNOUNCEMENT, label: 'Announcement', icon: 'bullhorn' },
              { value: NotificationType.EMERGENCY, label: 'Emergency', icon: 'alert' },
            ]}
          />
          <Field label="Title" value={title} onChangeText={setTitle} error={errors.title} maxLength={150} />
          <Field
            label="Message"
            value={body}
            onChangeText={setBody}
            error={errors.body}
            multiline
            maxLength={2000}
          />
        </ScrollView>
        <SubmitBar label="Send to all members" loading={send.isPending} onPress={submit} />
      </KeyboardAvoidingView>
    </FormScreen>
  );
}
