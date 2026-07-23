import { v2 as cloudinary } from 'cloudinary';
import { getEnv } from '../config/env';
import { ExternalServiceError } from '../errors/app-error';

let configured = false;

export function getCloudinary(): typeof cloudinary {
  if (!configured) {
    const env = getEnv();
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new ExternalServiceError(
        'Cloudinary is not configured. Set CLOUDINARY_* environment variables.'
      );
    }
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

/** Upload a Buffer (receipt PDFs, processed images) under the community's folder. */
export async function uploadBuffer(
  buffer: Buffer,
  options: { communityId: string; folder: string; publicId?: string; resourceType?: 'image' | 'raw' | 'auto' }
): Promise<{ url: string; publicId: string; bytes: number }> {
  const cld = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder: `community-finance/${options.communityId}/${options.folder}`,
        public_id: options.publicId,
        resource_type: options.resourceType ?? 'auto',
      },
      (error, result) => {
        if (error || !result) {
          reject(new ExternalServiceError(`Cloudinary upload failed: ${error?.message ?? 'unknown'}`));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id, bytes: result.bytes });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteAsset(publicId: string): Promise<void> {
  const cld = getCloudinary();
  await cld.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => undefined);
  await cld.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => undefined);
}

/**
 * Signed upload params for direct browser → Cloudinary uploads (bills,
 * event photos). The signature restricts folder placement.
 */
export function signUpload(communityId: string, folder: string): {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
} {
  const cld = getCloudinary();
  const env = getEnv();
  const timestamp = Math.round(Date.now() / 1000);
  const fullFolder = `community-finance/${communityId}/${folder}`;
  const signature = cld.utils.api_sign_request(
    { timestamp, folder: fullFolder },
    env.CLOUDINARY_API_SECRET
  );
  return {
    signature,
    timestamp,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder: fullFolder,
  };
}
