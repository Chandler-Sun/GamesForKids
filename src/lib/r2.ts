/**
 * Cloudflare R2 存储（S3 兼容 API）
 * 用于项目计划分享 JSON 的上传与读取
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

const R2_PREFIX = 'schedule/';

function getEndpoint(): string | null {
  if (endpoint) return endpoint;
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  return null;
}

function getClient(): S3Client | null {
  const ep = getEndpoint();
  if (!ep || !accessKeyId || !secretAccessKey || !bucketName) return null;
  return new S3Client({
    region: 'auto',
    endpoint: ep,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function isR2Configured(): boolean {
  return Boolean(getEndpoint() && accessKeyId && secretAccessKey && bucketName);
}

export async function uploadScheduleJson(shareId: string, json: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: `${R2_PREFIX}${shareId}.json`,
      Body: json,
      ContentType: 'application/json',
    })
  );
  return true;
}

export async function getScheduleJson(shareId: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: `${R2_PREFIX}${shareId}.json`,
      })
    );
    const body = res.Body;
    if (!body) return null;
    return await body.transformToString();
  } catch {
    return null;
  }
}
