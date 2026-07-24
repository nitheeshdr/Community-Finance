import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE, getAccessToken } from './api';

const EXT: Record<string, string> = { PDF: 'pdf', EXCEL: 'xlsx', CSV: 'csv' };
const MIME: Record<string, string> = {
  PDF: 'application/pdf',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  CSV: 'text/csv',
};

/**
 * Download a report export with the bearer token and open the native
 * share sheet so the admin can save or forward it. Works for the plain
 * (/reports/export) and advanced (/reports/export/advanced) endpoints.
 */
export async function downloadReport(params: {
  path: string; // e.g. '/reports/export'
  query: Record<string, string>;
  format: 'PDF' | 'EXCEL' | 'CSV';
  filename: string;
}): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    Alert.alert('Session', 'Please sign in again.');
    return;
  }
  const qs = new URLSearchParams(params.query).toString();
  const url = `${API_BASE}${params.path}?${qs}`;
  const fileUri = `${FileSystem.cacheDirectory}${params.filename}.${EXT[params.format]}`;

  try {
    const res = await FileSystem.downloadAsync(url, fileUri, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200) {
      Alert.alert('Export failed', 'The report could not be generated. Try a different range.');
      return;
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(res.uri, {
        mimeType: MIME[params.format],
        dialogTitle: 'Save or share report',
        UTI: params.format === 'PDF' ? 'com.adobe.pdf' : undefined,
      });
    } else {
      Alert.alert('Downloaded', `Saved to ${Platform.OS === 'ios' ? 'Files' : 'app storage'}.`);
    }
  } catch {
    Alert.alert('Export failed', 'Could not download the report. Check your connection.');
  }
}
