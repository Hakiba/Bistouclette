export type MultipartPart = {
  name: string
  value?: string
  filename?: string
  content?: Buffer
  contentType?: string
}

/** Construit un corps multipart/form-data à la main, pour `app.inject` (pas de dépendance en plus). */
export function multipart(parts: MultipartPart[]) {
  const boundary = '----bistouclette-test-boundary'
  const chunks: Buffer[] = []
  for (const part of parts) {
    const disposition = part.filename
      ? `form-data; name="${part.name}"; filename="${part.filename}"`
      : `form-data; name="${part.name}"`
    const type = part.contentType ? `\r\nContent-Type: ${part.contentType}` : ''
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: ${disposition}${type}\r\n\r\n`))
    chunks.push(part.content ?? Buffer.from(part.value ?? ''))
    chunks.push(Buffer.from('\r\n'))
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`))
  return {
    payload: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}
