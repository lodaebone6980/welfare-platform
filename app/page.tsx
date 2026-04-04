export default function Home() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '16px' }}>복지 플랫폼</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        복지 서비스 정보를 한눈에 확인하세요.
      </p>
      <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <p>사이트가 정상적으로 배포되었습니다.</p>
        <p style={{ marginTop: '8px', color: '#999', fontSize: '14px' }}>
          데이터베이스 연결 및 콘텐츠 설정이 완료되면 복지 서비스 목록이 표시됩니다.
        </p>
      </div>
    </div>
  )
}
