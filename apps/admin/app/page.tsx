"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Role = "SUPER_ADMIN" | "CONTENT_MANAGER" | "SUPPORT" | "ANALYST";
type Session = { email: string; role: Role } | null;

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/v1";

export default function AdminDashboard() {
  const [session, setSession] = useState<Session>(null);
  const [templates, setTemplates] = useState<Array<Record<string, unknown>>>([]);
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([]);
  const [promptVersions, setPromptVersions] = useState<Array<Record<string, unknown>>>([]);
  const [activeVersionId, setActiveVersionId] = useState("");
  const [message, setMessage] = useState("");
  const canEdit = useMemo(() => session?.role === "SUPER_ADMIN" || session?.role === "CONTENT_MANAGER", [session]);

  useEffect(() => {
    if (!session) return;
    void refresh();
  }, [session]);

  async function refresh() {
    const [templateResult, promptResult, sessionResult] = await Promise.all([
      apiGet("/admin/content/lesson-templates"),
      apiGet("/admin/ai/prompt-versions"),
      apiGet("/admin/lesson-sessions")
    ]);
    setTemplates(templateResult);
    setPromptVersions(promptResult);
    setSessions(sessionResult);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSession({ email: String(data.get("email")), role: data.get("role") as Role });
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setMessage("권한 없음");
      return;
    }
    const data = new FormData(event.currentTarget);
    const created = await apiPost("/admin/content/lesson-templates", {
      slug: data.get("slug"),
      titleKo: data.get("titleKo"),
      titleEn: data.get("titleEn"),
      level: data.get("level"),
      category: data.get("category"),
      objective: data.get("objective")
    });
    setActiveVersionId(String(created.activeVersionId));
    setMessage("LessonTemplate 생성 완료");
    await refresh();
  }

  async function createStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setMessage("권한 없음");
      return;
    }
    const data = new FormData(event.currentTarget);
    const versionId = String(data.get("versionId") || activeVersionId);
    await apiPost(`/admin/content/lesson-template-versions/${versionId}/stages`, {
      stageType: data.get("stageType"),
      sequence: Number(data.get("sequence")),
      objective: data.get("objective"),
      plannedDurationSeconds: Number(data.get("plannedDurationSeconds"))
    });
    setMessage("Stage 수정 완료");
  }

  async function createMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setMessage("권한 없음");
      return;
    }
    const data = new FormData(event.currentTarget);
    const versionId = String(data.get("versionId") || activeVersionId);
    await apiPost(`/admin/content/lesson-template-versions/${versionId}/material-cards`, {
      type: "SITUATION",
      title: data.get("title"),
      body: data.get("body"),
      sequence: Number(data.get("sequence"))
    });
    setMessage("MaterialCard 생성 완료");
  }

  async function createPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setMessage("권한 없음");
      return;
    }
    const data = new FormData(event.currentTarget);
    const created = await apiPost("/admin/ai/prompt-versions", {
      templateName: data.get("templateName"),
      body: data.get("body")
    });
    await apiPost(`/admin/ai/prompt-versions/${created.id}/activate`, {});
    setMessage("Prompt version 활성화 완료");
    await refresh();
  }

  async function createBackchannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      setMessage("권한 없음");
      return;
    }
    const data = new FormData(event.currentTarget);
    await apiPost("/admin/backchannel-clips", {
      clipKey: data.get("clipKey"),
      label: data.get("label"),
      audioUrl: data.get("audioUrl"),
      durationMs: Number(data.get("durationMs"))
    });
    setMessage("Backchannel clip 등록 완료");
  }

  if (!session) {
    return (
      <main className="login">
        <form className="panel loginPanel" onSubmit={login}>
          <h1>Admin 로그인</h1>
          <label>
            Email
            <input name="email" type="email" defaultValue="admin@example.com" required />
          </label>
          <label>
            Role
            <select name="role" defaultValue="SUPER_ADMIN">
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="CONTENT_MANAGER">CONTENT_MANAGER</option>
              <option value="SUPPORT">SUPPORT</option>
              <option value="ANALYST">ANALYST</option>
            </select>
          </label>
          <button type="submit">로그인</button>
        </form>
      </main>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Lesson Reminder Ops</div>
        <nav className="nav" aria-label="Admin">
          <a href="#content">LessonTemplate</a>
          <a href="#stages">Stage</a>
          <a href="#materials">MaterialCard</a>
          <a href="#prompts">Prompt</a>
          <a href="#backchannels">Backchannel</a>
          <a href="#sessions">LessonSession</a>
        </nav>
      </aside>
      <main className="main">
        <div className="topbar">
          <h1>운영 콘솔</h1>
          <div className="topActions">
            <span className="pill">{session.role}</span>
            <button type="button" onClick={() => setSession(null)}>로그아웃</button>
          </div>
        </div>
        {message ? <p className="notice" role="status">{message}</p> : null}
        <section className="workbench">
          <form className="panel" id="content" onSubmit={createTemplate}>
            <h2>LessonTemplate 생성</h2>
            <input name="slug" placeholder="slug" defaultValue={`admin-${Date.now()}`} />
            <input name="titleKo" placeholder="titleKo" defaultValue="관리자 테스트 수업" />
            <input name="titleEn" placeholder="titleEn" defaultValue="Admin Test Lesson" />
            <select name="level" defaultValue="A1"><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select>
            <input name="category" placeholder="category" defaultValue="admin" />
            <textarea name="objective" placeholder="objective" defaultValue="관리자 CRUD 테스트" />
            <button type="submit">LessonTemplate 생성</button>
          </form>

          <form className="panel" id="stages" onSubmit={createStage}>
            <h2>Stage 수정</h2>
            <input name="versionId" placeholder="versionId" value={activeVersionId} onChange={(event) => setActiveVersionId(event.target.value)} />
            <select name="stageType" defaultValue="WARM_UP"><option>WARM_UP</option><option>GUIDED_ROLEPLAY</option><option>FREE_TALK</option></select>
            <input name="sequence" type="number" defaultValue="2" />
            <input name="plannedDurationSeconds" type="number" defaultValue="90" />
            <textarea name="objective" defaultValue="관리자 수정 Stage" />
            <button type="submit">Stage 수정</button>
          </form>

          <form className="panel" id="materials" onSubmit={createMaterial}>
            <h2>MaterialCard 생성</h2>
            <input name="versionId" placeholder="versionId" value={activeVersionId} onChange={(event) => setActiveVersionId(event.target.value)} />
            <input name="title" defaultValue="체크인 상황 카드" />
            <textarea name="body" defaultValue="프런트에서 예약을 확인하고 조용한 방을 요청한다." />
            <input name="sequence" type="number" defaultValue="1" />
            <button type="submit">MaterialCard 생성</button>
          </form>

          <form className="panel" id="prompts" onSubmit={createPrompt}>
            <h2>Prompt version</h2>
            <input name="templateName" defaultValue="admin-playwright" />
            <textarea name="body" defaultValue="Be concise, warm, and ask one question." />
            <button type="submit">Prompt version 생성·활성화</button>
          </form>

          <form className="panel" id="backchannels" onSubmit={createBackchannel}>
            <h2>Backchannel clip 등록</h2>
            <input name="clipKey" defaultValue={`admin_clip_${Date.now()}`} />
            <input name="label" defaultValue="admin clip" />
            <input name="audioUrl" defaultValue="/assets/backchannel/admin.mp3" />
            <input name="durationMs" type="number" defaultValue="420" />
            <button type="submit">Backchannel clip 등록</button>
          </form>

          <section className="panel" id="sessions">
            <h2>수업 세션 조회</h2>
            <button type="button" onClick={refresh}>수업 세션 조회</button>
            <table className="table">
              <thead><tr><th>ID</th><th>State</th><th>Transcript</th></tr></thead>
              <tbody>
                {sessions.map((item) => (
                  <tr key={String(item.id)}>
                    <td>{String(item.id).slice(0, 8)}</td>
                    <td>{String(item.state)}</td>
                    <td>{String(item.transcriptCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel wide">
            <h2>현재 데이터</h2>
            <p>LessonTemplates: {templates.length}</p>
            <p>PromptVersions: {promptVersions.length}</p>
          </section>
        </section>
      </main>
    </div>
  );
}

async function apiGet(path: string): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(`${apiBase}${path}`, { cache: "no-store" });
  if (!response.ok) return [];
  const body = await response.json();
  return body.data ?? [];
}

async function apiPost(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Admin API failed: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}
