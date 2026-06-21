import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CF_R2_SECRET_KEY!,
  },
})

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: process.env.CF_R2_BUCKET!,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, cmd, { expiresIn: 300 })
}

export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({
    Bucket: process.env.CF_R2_BUCKET!,
    Key: key,
  }))
}

export function getPublicUrl(key: string): string {
  return `${process.env.CF_R2_PUBLIC_URL}/${key}`
}

export function mediaKey(userId: string, filename: string): string {
  return `users/${userId}/${Date.now()}-${filename}`
}
