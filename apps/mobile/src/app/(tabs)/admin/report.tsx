import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReportPeriod } from '@community-finance/shared';
import { downloadReport } from '@/lib/download';
import { inr } from '@/lib/format';
import { useReport } from '@/lib/queries';
import { Card, Row, SectionTitle, StatCard } from '@/components/ui';
import { SegmentField } from '@/components/form';

const PERIODS = [
  { value: ReportPeriod.MONTHLY, label: 'Month' },
  { value: ReportPeriod.QUARTERLY, label: 'Quarter' },
  { value: ReportPeriod.YEARLY, label: 'Year' },
];

export default function ReportScreen() {
  const [period, setPeriod] = useState<ReportPeriod>(ReportPeriod.MONTHLY);
  const { data: report, isLoading, refetch, isRefetching } = useReport(period);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(format: 'PDF' | 'EXCEL' | 'CSV') {
    setDownloading(format);
    try {
      await downloadReport({
        path: '/reports/export',
        query: { period, format },
        format,
        filename: `report-${report?.period ?? period}`.replace(/\s+/g, '-'),
      });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="p-4 pb-10"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <SegmentField
        label="Period"
        value={period}
        onChange={(v) => setPeriod(v as ReportPeriod)}
        options={PERIODS}
      />

      {isLoading || !report ? (
        <ActivityIndicator className="py-16" />
      ) : (
        <>
          <Text className="mb-3 text-xs text-on-surface-variant">
            {report.period}
            {report.snapshot ? ' · closed snapshot' : ' · live'}
          </Text>

          {/* Headline */}
          <View className="rounded-m3-xl bg-primary p-5">
            <Text className="text-xs font-medium uppercase tracking-wider text-primary-container">
              Closing balance
            </Text>
            <Text className="mt-1 text-3xl font-bold text-on-primary tabular-nums">
              {inr(report.closingBalance)}
            </Text>
            <Text className="mt-1 text-xs text-primary-container">
              Opened at {inr(report.openingBalance)}
            </Text>
          </View>

          <View className="mt-3 flex-row gap-3">
            <StatCard tone="primary" icon="arrow-down-circle-outline" label="Income" value={inr(report.income.total)} />
            <StatCard tone="primary" icon="arrow-up-circle-outline" label="Expenses" value={inr(report.expenses.total)} />
          </View>

          {/* Collection */}
          <SectionTitle>Collection</SectionTitle>
          <Card>
            <Row label="Expected" value={inr(report.collection.expected)} />
            <Row label="Collected" value={inr(report.collection.collected)} accent="text-success" />
            <Row label="Pending" value={inr(report.collection.pending)} accent="text-warning" />
            <Row
              label="Paid / pending / failed"
              value={`${report.collection.paidCount} / ${report.collection.pendingCount} / ${report.collection.failedCount}`}
            />
          </Card>

          {/* Income by source */}
          {report.income.bySource.length > 0 && (
            <>
              <SectionTitle>Income by source</SectionTitle>
              <Card>
                {report.income.bySource.map((s, i) => (
                  <View
                    key={s.category}
                    className={`flex-row justify-between py-2 ${i > 0 ? 'border-t border-outline-variant' : ''}`}
                  >
                    <Text className="text-sm capitalize text-on-surface">
                      {s.category.toLowerCase()} · {s.count}
                    </Text>
                    <Text className="text-sm font-medium tabular-nums text-on-surface">
                      {inr(s.amount)}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Expenses by category */}
          {report.expenses.byCategory.length > 0 && (
            <>
              <SectionTitle>Expenses by category</SectionTitle>
              <Card>
                {report.expenses.byCategory.map((c, i) => (
                  <View
                    key={c.category}
                    className={`flex-row justify-between py-2 ${i > 0 ? 'border-t border-outline-variant' : ''}`}
                  >
                    <Text className="text-sm text-on-surface">
                      {c.category} · {c.count}
                    </Text>
                    <Text className="text-sm font-medium tabular-nums text-on-surface">
                      {inr(c.amount)}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Members + events */}
          <SectionTitle>Community</SectionTitle>
          <Card>
            <Row
              label="Members (active / total)"
              value={`${report.memberStats.active} / ${report.memberStats.total}`}
            />
            <Row label="Suspended" value={String(report.memberStats.suspended)} />
            <Row
              label="Events (active / closed)"
              value={`${report.eventStats.active} / ${report.eventStats.closed}`}
            />
            <Row label="Donations" value={`${inr(report.donations.total)} · ${report.donations.count}`} />
          </Card>

          {/* Downloads */}
          <SectionTitle>Download</SectionTitle>
          <View className="flex-row gap-2">
            <Button
              mode="contained-tonal"
              icon="file-pdf-box"
              loading={downloading === 'PDF'}
              onPress={() => download('PDF')}
              style={{ flex: 1 }}
            >
              PDF
            </Button>
            <Button
              mode="contained-tonal"
              icon="file-excel-box"
              loading={downloading === 'EXCEL'}
              onPress={() => download('EXCEL')}
              style={{ flex: 1 }}
            >
              Excel
            </Button>
            <Button
              mode="contained-tonal"
              icon="file-delimited"
              loading={downloading === 'CSV'}
              onPress={() => download('CSV')}
              style={{ flex: 1 }}
            >
              CSV
            </Button>
          </View>
          <View className="mt-3 flex-row items-start gap-2 rounded-m3-md bg-surface-container p-3">
            <MaterialCommunityIcons name="information-outline" size={15} color="#5D5C72" />
            <Text className="flex-1 text-xs text-on-surface-variant">
              Exports open the share sheet — save to Files, or send via WhatsApp, email, or Drive.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
