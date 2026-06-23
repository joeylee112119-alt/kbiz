const metrics = [
  ["일간 활성 사용자", "128"],
  ["전화 응답률", "78%"],
  ["15분 완주율", "71%"],
  ["Realtime 오류율", "1.0%"]
] as const;

const lessons = [
  ["hotel-checkin-a1", "호텔 체크인", "A1", "PUBLISHED"],
  ["restaurant-ordering-a1", "식당에서 주문하기", "A1", "PUBLISHED"],
  ["expressing-opinions-b1", "의견 표현하기", "B1", "DRAFT"]
] as const;

export default function AdminDashboard() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Call English Ops</div>
        <nav className="nav" aria-label="Admin">
          <a href="#dashboard">대시보드</a>
          <a href="#content">콘텐츠</a>
          <a href="#ai">AI</a>
          <a href="#users">사용자</a>
          <a href="#monitoring">수업 모니터링</a>
          <a href="#audit">감사 로그</a>
        </nav>
      </aside>
      <main className="main">
        <div className="topbar">
          <h1 id="dashboard">운영 대시보드</h1>
          <span className="pill">RBAC: SUPER_ADMIN</span>
        </div>
        <section className="grid" aria-label="핵심 지표">
          {metrics.map(([label, value]) => (
            <article className="card metric" key={label}>
              {label}
              <strong>{value}</strong>
            </article>
          ))}
          <article className="card wide" id="content">
            <h2>교재 CMS</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>제목</th>
                  <th>레벨</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map(([slug, title, level, status]) => (
                  <tr key={slug}>
                    <td>{slug}</td>
                    <td>{title}</td>
                    <td>{level}</td>
                    <td>
                      <span className="pill">{status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
          <article className="card wide" id="ai">
            <h2>AI 운영</h2>
            <p>활성 프롬프트 v1, Realtime 모델 gpt-realtime-2, 기본 음성 marin.</p>
            <p>Backchannel clips: mm_hm_01, uh_huh_01, i_see_01, right_01, okay_01.</p>
          </article>
          <article className="card wide" id="monitoring">
            <h2>수업 모니터링</h2>
            <p>Timeline, transcript, stage event, reconnect event, correction, report panels are represented in the API contracts and Prisma schema.</p>
          </article>
          <article className="card wide" id="audit">
            <h2>감사 로그</h2>
            <p>모든 관리자 변경은 AuditLog 모델과 requestId로 기록됩니다.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
