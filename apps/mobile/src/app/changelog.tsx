import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { WEB_ORIGIN } from '@/lib/api';

/** Release notes, rendered from the public web changelog page. */
export default function ChangelogScreen() {
  const [loading, setLoading] = useState(true);
  return (
    <View className="flex-1 bg-surface">
      <WebView
        source={{ uri: `${WEB_ORIGIN}/changelog` }}
        onLoadEnd={() => setLoading(false)}
        style={{ backgroundColor: '#FCF8FF' }}
      />
      {loading && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator />
        </View>
      )}
    </View>
  );
}
