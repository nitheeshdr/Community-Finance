'use client';

import { useState } from 'react';
import {
  Download,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DocumentType,
  UserRole,
  type ApiSuccess,
  type DocumentDto,
  type RegisterDocumentInput,
} from '@community-finance/shared';
import { apiClient, apiErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { uploadToCloudinary } from '@/lib/upload';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.BILL]: 'Bill',
  [DocumentType.RECEIPT]: 'Receipt',
  [DocumentType.INVOICE]: 'Invoice',
  [DocumentType.EVENT_PHOTO]: 'Event photo',
  [DocumentType.PROFILE_IMAGE]: 'Profile image',
  [DocumentType.COMMUNITY_LOGO]: 'Logo',
  [DocumentType.OTHER]: 'Document',
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [type, setType] = useState<DocumentType | 'ALL'>('ALL');
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', { page, type }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccess<DocumentDto[]>>('/documents', {
        params: { page, limit: 24, ...(type !== 'ALL' ? { type } : {}) },
      });
      return res.data;
    },
  });
  const documents = data?.data ?? [];
  const meta = data?.meta;

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterDocumentInput) => {
      const res = await apiClient.post<ApiSuccess<DocumentDto>>('/documents', input);
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['documents'] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      toast.success('Document deleted');
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadToCloudinary(file, 'documents');
        await registerMutation.mutateAsync({
          type: file.type.startsWith('image/') ? DocumentType.EVENT_PHOTO : DocumentType.OTHER,
          name: file.name,
          cloudinaryId: uploaded.publicId,
          url: uploaded.url,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.bytes,
        });
      }
      toast.success('Upload complete');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Bills, receipts, invoices, and event photos"
        actions={
          isAdmin && (
            <label>
              <Button asChild disabled={uploading}>
                <span className="cursor-pointer">
                  {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                  {uploading ? 'Uploading…' : 'Upload'}
                </span>
              </Button>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => void handleUpload(e.target.files)}
                disabled={uploading}
              />
            </label>
          )
        }
      />

      <div className="mb-4">
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v as DocumentType | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents"
          description="Uploaded bills, receipts, and photos will appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="overflow-hidden">
                <a href={doc.url} target="_blank" rel="noreferrer" className="block">
                  {doc.mimeType.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doc.url}
                      alt={doc.name}
                      className="h-32 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-muted/50">
                      {doc.mimeType === 'application/pdf' ? (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </a>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(doc.createdAt)} · {(doc.sizeBytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {TYPE_LABELS[doc.type]}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={doc.url} target="_blank" rel="noreferrer" aria-label="Download">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => {
                          if (window.confirm(`Delete "${doc.name}"?`)) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {meta && <PaginationControls meta={meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
