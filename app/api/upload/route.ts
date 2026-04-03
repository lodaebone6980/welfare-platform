import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { nanoid } from 'nanoid'

const r2 = new S3Client({
  region:   'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file     = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const key = `uploads/${new Date().getFullYear()}/${nanoid()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  await r2.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET!,
    Key:         key,
    Body:        buf,
    ContentType: file.type,
    CacheControl: 'public, max-age=31536000',
  }))

  return NextResponse.json({ url: `${process.env.R2_PUBLIC_URL}/${key}` })
}
