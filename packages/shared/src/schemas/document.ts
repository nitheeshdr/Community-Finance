import { z } from 'zod';
import { DocumentType } from '../enums';
import { objectIdSchema, paginationQuerySchema } from './common';

export const documentListQuerySchema = paginationQuerySchema.extend({
  type: z.nativeEnum(DocumentType).optional(),
  entityId: objectIdSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

/** Metadata registered after a successful Cloudinary upload. */
export const registerDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  name: z.string().trim().min(1).max(200),
  cloudinaryId: z.string().trim().min(1).max(300),
  url: z.string().url(),
  mimeType: z.string().trim().max(100),
  sizeBytes: z.number().int().min(0),
  entity: z.string().trim().max(50).optional(),
  entityId: objectIdSchema.optional(),
});

export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;
export type RegisterDocumentInput = z.infer<typeof registerDocumentSchema>;
