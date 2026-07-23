'use client';

import type { ApiSuccess } from '@community-finance/shared';
import { apiClient } from './api-client';

interface SignedUpload {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export interface UploadedFile {
  url: string;
  publicId: string;
  bytes: number;
  mimeType: string;
  name: string;
}

/**
 * Direct browser → Cloudinary upload using server-signed params.
 * Files never pass through our API (Vercel body-size limits).
 */
export async function uploadToCloudinary(
  file: File,
  folder: 'bills' | 'receipts' | 'invoices' | 'events' | 'profiles' | 'documents' | 'logos'
): Promise<UploadedFile> {
  const signRes = await apiClient.get<ApiSuccess<SignedUpload>>('/documents/sign-upload', {
    params: { folder },
  });
  const sign = signRes.data.data;

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', String(sign.timestamp));
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`,
    { method: 'POST', body: form }
  );
  if (!res.ok) {
    throw new Error('Upload failed — please try again');
  }
  const data = (await res.json()) as {
    secure_url: string;
    public_id: string;
    bytes: number;
  };
  return {
    url: data.secure_url,
    publicId: data.public_id,
    bytes: data.bytes,
    mimeType: file.type,
    name: file.name,
  };
}
