import { Types } from 'mongoose';
import {
  AuditAction,
  AuditEntity,
  UPLOAD,
  type DocumentDto,
  type DocumentListQuery,
  type RegisterDocumentInput,
} from '@community-finance/shared';
import { NotFoundError, ValidationError } from '../errors/app-error';
import { deleteAsset, signUpload } from '../lib/cloudinary';
import { DocumentModel, type DocumentDoc } from '../models/document.model';
import { BaseRepository, type ListResult } from '../repositories/base.repository';
import type { AuditService } from './audit.service';

export type DocumentEntity = DocumentDoc & { _id: Types.ObjectId; createdAt?: Date };

export class DocumentRepository extends BaseRepository<DocumentDoc> {
  constructor() {
    super(DocumentModel);
  }
}

export class DocumentService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly audit: AuditService
  ) {}

  async list(communityId: string, query: DocumentListQuery): Promise<ListResult<DocumentDto>> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.type) filter.type = query.type;
    if (query.entityId) filter.entityId = query.entityId;
    if (query.search) {
      filter.name = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    const { items, total } = await this.documents.list(communityId, filter, {
      page: query.page,
      limit: query.limit,
      populate: 'uploadedBy',
    });
    return { items: (items as DocumentEntity[]).map(toDocumentDto), total };
  }

  /** Signed params for a direct browser → Cloudinary upload. */
  getUploadSignature(communityId: string, folder: string): ReturnType<typeof signUpload> {
    const safe = folder.replace(/[^a-z0-9-]/gi, '');
    if (!safe) throw new ValidationError('Invalid folder');
    return signUpload(communityId, safe);
  }

  /** Register metadata after the client completes a direct upload. */
  async register(
    communityId: string,
    input: RegisterDocumentInput,
    uploadedBy: string
  ): Promise<DocumentDto> {
    if (input.sizeBytes > UPLOAD.MAX_FILE_SIZE_BYTES) {
      throw new ValidationError('File exceeds the 10 MB limit');
    }
    if (!(UPLOAD.ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(input.mimeType)) {
      throw new ValidationError('Unsupported file type');
    }

    const doc = (await this.documents.create(communityId, {
      type: input.type,
      name: input.name,
      cloudinaryId: input.cloudinaryId,
      url: input.url,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      entity: input.entity,
      entityId: input.entityId,
      uploadedBy,
    } as never)) as DocumentEntity;

    await this.audit.record({
      action: AuditAction.CREATE,
      entity: AuditEntity.DOCUMENT,
      entityId: String(doc._id),
      after: { name: doc.name, type: doc.type, sizeBytes: doc.sizeBytes },
    });
    return toDocumentDto(doc);
  }

  async remove(communityId: string, id: string): Promise<void> {
    const existing = (await this.documents.findById(communityId, id)) as DocumentEntity | null;
    if (!existing || existing.deletedAt) throw new NotFoundError('Document');

    await this.documents.updateById(communityId, id, { $set: { deletedAt: new Date() } });
    await deleteAsset(existing.cloudinaryId);
    await this.audit.record({
      action: AuditAction.DELETE,
      entity: AuditEntity.DOCUMENT,
      entityId: id,
      before: { name: existing.name, type: existing.type },
    });
  }
}

/* ---------------------------------------------------------------- */

function refName(ref: unknown): string | undefined {
  if (ref && typeof ref === 'object' && 'name' in ref) return String((ref as { name: unknown }).name);
  return undefined;
}
function refId(ref: unknown): string {
  if (ref && typeof ref === 'object' && '_id' in ref) return String((ref as { _id: unknown })._id);
  return String(ref ?? '');
}

export function toDocumentDto(doc: DocumentEntity): DocumentDto {
  return {
    id: String(doc._id),
    type: doc.type as DocumentDto['type'],
    name: doc.name,
    url: doc.url,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    entity: doc.entity ?? undefined,
    entityId: doc.entityId ? String(doc.entityId) : undefined,
    uploadedBy: refId(doc.uploadedBy),
    uploadedByName: refName(doc.uploadedBy),
    createdAt: doc.createdAt?.toISOString() ?? '',
  };
}
