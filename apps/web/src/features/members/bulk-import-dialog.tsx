'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Download, FileUp, Upload, XCircle } from 'lucide-react';
import type {
  ApiSuccess,
  BulkImportResultRow,
  BulkMemberRow,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';
import { csvToObjects, downloadCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BulkResponse {
  results: BulkImportResultRow[];
  created: number;
  failed: number;
}

export function BulkImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkMemberRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [response, setResponse] = useState<BulkResponse | null>(null);

  const importMutation = useMutation({
    mutationFn: async (members: BulkMemberRow[]) => {
      const res = await apiClient.post<ApiSuccess<BulkResponse>>('/members/bulk', { members });
      return res.data.data;
    },
    onSuccess: (data) => {
      setResponse(data);
      toast.success(`${data.created} member(s) created${data.failed ? `, ${data.failed} failed` : ''}`);
      void qc.invalidateQueries({ queryKey: ['members'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function reset() {
    setRows([]);
    setFileName(null);
    setParseError(null);
    setResponse(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setParseError(null);
    setResponse(null);
    try {
      const objects = csvToObjects(await file.text());
      if (objects.length === 0) {
        setParseError('No data rows found. Use the template format with a header line.');
        return;
      }
      if (!('name' in objects[0]!) || !('phone' in objects[0]!)) {
        setParseError('Missing required columns: name, phone. Download the template for reference.');
        return;
      }
      setRows(
        objects.map((o) => ({
          name: o.name ?? '',
          phone: o.phone ?? '',
          password: o.password || undefined,
          address: o.address || undefined,
          aadhaar: o.aadhaar || undefined,
          memberSince: o.membersince ? new Date(o.membersince) : undefined,
        }))
      );
      setFileName(file.name);
    } catch {
      setParseError('Could not read the file. Make sure it is a valid CSV.');
    }
  }

  function downloadResults() {
    if (!response) return;
    downloadCsv('import-results.csv', [
      ['row', 'name', 'phone', 'status', 'password', 'error'],
      ...response.results.map((r) => [
        r.row,
        r.name,
        r.phone,
        r.status,
        r.password ?? '',
        r.error ?? '',
      ]),
    ]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import members</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns <code>name, phone, password, address, aadhaar, memberSince</code>.
            Only name and phone are required — passwords are generated automatically when blank.
          </DialogDescription>
        </DialogHeader>

        {!response ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/members-template.csv" download>
                  <Download />
                  Download template
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                <FileUp />
                Choose CSV file
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
              {fileName && (
                <span className="text-sm text-muted-foreground">
                  {fileName} · {rows.length} row(s)
                </span>
              )}
            </div>

            {parseError && <p className="text-sm text-destructive">{parseError}</p>}

            {rows.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="tabular-nums">{r.phone}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.password ? '•••' : 'auto-generate'}
                        </TableCell>
                        <TableCell className="max-w-40 truncate text-muted-foreground">
                          {r.address ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 50 && (
                  <p className="p-2 text-center text-xs text-muted-foreground">
                    …and {rows.length - 50} more rows
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={rows.length === 0}
                loading={importMutation.isPending}
                onClick={() => importMutation.mutate(rows)}
              >
                <Upload />
                Import {rows.length > 0 ? `${rows.length} member(s)` : ''}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-md border bg-muted/40 p-3 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                {response.created} created
              </span>
              {response.failed > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                  <XCircle className="h-4 w-4" />
                  {response.failed} failed
                </span>
              )}
            </div>

            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Password / error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {response.results.map((r) => (
                    <TableRow key={r.row}>
                      <TableCell className="text-muted-foreground">{r.row}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="tabular-nums">{r.phone}</TableCell>
                      <TableCell>
                        {r.status === 'CREATED' ? (
                          <span className="text-xs font-semibold text-success">Created</span>
                        ) : (
                          <span className="text-xs font-semibold text-destructive">Failed</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.password ?? r.error ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              ⚠️ Generated passwords are shown only once. Download the results and share each
              password with its member — they must change it at first login.
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={downloadResults}>
                <Download />
                Download results CSV
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
