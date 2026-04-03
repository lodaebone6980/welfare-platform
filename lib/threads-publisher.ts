interface ThreadsInsights {
  views:    number
  likes:    number
  replies:  number
  reposts:  number
}

export class ThreadsPublisher {
  private userId:      string
  private accessToken: string
  private base = 'https://graph.threads.net/v1.0'

  constructor() {
    this.userId      = process.env.THREADS_USER_ID!
    this.accessToken = process.env.THREADS_ACCESS_TOKEN!
  }

  // 텍스트 포스트 발행
  async publish(text: string): Promise<string | null> {
    try {
      // 1단계: 컨테이너 생성
      const createRes = await fetch(
        `${this.base}/${this.userId}/threads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type:   'TEXT',
            text,
            access_token: this.accessToken,
          }),
        }
      )
      const { id: containerId } = await createRes.json()
      if (!containerId) return null

      // 잠깐 대기 (Threads API 권장)
      await new Promise(r => setTimeout(r, 3000))

      // 2단계: 발행
      const publishRes = await fetch(
        `${this.base}/${this.userId}/threads_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: this.accessToken,
          }),
        }
      )
      const { id } = await publishRes.json()
      return id ?? null
    } catch (e) {
      console.error('[Threads 발행 오류]', e)
      return null
    }
  }

  // 포스트 성과 조회
  async getInsights(postId: string): Promise<ThreadsInsights> {
    try {
      const res = await fetch(
        `${this.base}/${postId}/insights` +
        `?metric=views,likes,replies,reposts` +
        `&access_token=${this.accessToken}`
      )
      const data = await res.json()
      const result: Record<string, number> = {}
      for (const item of data.data ?? []) {
        result[item.name] = item.values?.[0]?.value ?? 0
      }
      return {
        views:   result.views   ?? 0,
        likes:   result.likes   ?? 0,
        replies: result.replies ?? 0,
        reposts: result.reposts ?? 0,
      }
    } catch {
      return { views: 0, likes: 0, replies: 0, reposts: 0 }
    }
  }
}
