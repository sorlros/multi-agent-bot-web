# Orbit Agent Web Client 🪐

![Orbit Banner](https://img.shields.io/badge/Status-Active-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-React%20|%20Vite%20|%20TailwindCSS%20|%20Supabase-blue)

A modern, React-based web interface for managing and triggering autonomous multi-agent pipelines. Built as a decoupled frontend proxying to a FastAPI orchestrator.

*(한국어 설명은 아래에 있습니다 / Korean description below)*

---

## 🇬🇧 English Description

### Overview
This project is a dedicated web UI for the Orbit Autonomous Agent System. Instead of operating agents purely from the terminal or using complex API clients, this interface allows you to chat naturally with the orchestrator, watch it plan (`task.md`), and review its artifacts (`walkthrough.md`) in a beautifully rendered markdown format.

### Features
- **Glassmorphic Chat UI**: Specialized chat components distinguishing User prompts from AI Markdown output.
- **Supabase Persistence**: Complete data retention for chat histories, tasks, and system settings across devices via PostgreSQL.
- **Dynamic System Settings**: Change your LLM provider (OpenRouter/OpenAI/Anthropic/Google), model, temperature, and agent autonomy level dynamically through the UI.

### Getting Started
1. Clone the repository.
2. Run `npm install`
3. Run `npm run dev` to start the frontend on `localhost:5176`.
4. Ensure your FastAPI orchestrator is running on `localhost:8001`.

---

## 🇰🇷 한국어 프로젝트 가이드

### 🤖 프로젝트 개요
**오빗 에이전트**는 사용자가 자연어로 작업을 지시하면, 여러 AI 에이전트(Manager, BackendDev, FrontendDev 등)가 협력하여 실제 코드를 작성·수정하고 결과를 보고하는 **자율형 멀티 에이전트 웹 시스템**입니다.

### 🏛 핵심 작동 원리 (Orchestration)
오빗의 백엔드는 **LangGraph** 워크플로우를 채택하여, 사용자의 프롬프트를 5명의 가상 직원(Agent)에게 순차/분기적으로 전달합니다:
1. **Manager (매니저):** 작업을 기획하고 방향성을 지시합니다.
2. **BackendDev & FrontendDev:** 각자의 포지션에 맞게 코드를 구현합니다.
3. **UIUXDesigner & QAEngineer:** 디자인 일관성을 점검하고 버그 코드를 찾아냅니다.
4. **Executive Reporter:** 모든 대화가 종료된 후, 최종 산출물을 정중한 한국어 요약본으로 보고합니다.

---

## 🗺️ 전체 시스템 파이프라인

```
사용자 입력 (채팅)
       │
       ▼
[React Frontend - ChatInput.tsx]
 - 메시지 입력, X-Api-Secret 헤더 포함
       │
       ▼ POST /api/orchestration/run
[FastAPI Backend - orchestration.py]
 1. API 시크릿 키 인증 (verify_api_key)
 2. Supabase에서 기존 대화 이력 조회 및 RAG 관련 메시지 검색
 3. 사용자 메시지 임베딩 & Supabase 저장
 4. LangGraph 그래프 실행
       │
       ▼
[LangGraph 멀티 에이전트 그래프 - graph.py]
 START → Manager → Supervisor 라우팅 → (각 에이전트) → ... → Reporter → END
       │
       ▼
[최종 결과(마크다운 보고서)]
 5. 에이전트 응답 임베딩 & Supabase 저장
 6. Background: 대화 요약 (10개 메시지 이상 시)
       │
       ▼
[React Frontend - UI 표시]
 - 결과 마크다운 렌더링
```

---

## 🧩 주요 컴포넌트 및 기능

### 1. Frontend (`/src`)
- **`App.tsx`**: 앱의 핵심 상태 관리 및 API 통신 제어.
- **`Layout.tsx` & `Sidebar.tsx`**: 모바일 대응 반응형 레이아웃 및 슬라이드-인 사이드바 시스템.
- **`ChatArea.tsx` & `MessageBubble.tsx`**: `react-markdown` 기반의 고해상도 마크다운 렌더링.
- **`SettingsModal.tsx`**: LLM 모델 교체, YOLO 모드(자율 모드), 작업 공간 바인딩 설정.

### 2. Backend (`/backend`)
- **`FastAPI`**: 고성능 비동기 API 서버.
- **`LangGraph`**: 상태 기반 멀티 에이전트 오케스트레이션.
- **RAG (Retrieval-Augmented Generation)**: Supabase `pgvector`를 활용하여 과거 유사 대화 맥락 주입.
- **자동 요약**: 대화가 길어질 경우 배경 작업(Background Task)으로 세션을 요약하여 컨텍스트 효율화.

---

## ⚙️ 실행 방법

### 1. 실행 명령어
```bash
# Frontend
npm install
npm run dev # http://localhost:5176

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 💡 자동 Git 동기화
수정 사항을 커스텀 메시지와 함께 푸시하려면:
```bash
npm run sync "커밋 메시지"
```

---

## ⚔️ 기존 시스템과의 비교

| 비교 항목 | Antigravity (전통적 1:1 방식) | Orbit Agent Web (멀티 에이전트 시스템) |
| :--- | :--- | :--- |
| **작업 형태** | **초거대 단일 AI 1명**이 모든 툴을 전천후로 다룸. | 분야별로 특화된 **여러 명의 소형 AI**들이 분업. |
| **의사 결정** | AI 스스로 다음 단계를 결정하여 자유도가 높음. | **상태 그래프(StateGraph)** 기반의 명확한 통제 루트. |
| **결과 피드백** | 작업 중인 원본 로그를 그대로 출력. | 내부 회의 완료 후 **정제된 마크다운 보고서** 출력. |
| **보안 레이어** | 사용자의 OS 자체를 제어할 수 있는 로컬 권한. | 지정된 작업 공간(Workspace)에 갇힌 **샌드박스** 구조. |

---

오봇 프로젝트는 자율 소프트웨어 컴퍼니의 비전을 실현하기 위해 지속적으로 발전하고 있습니다! 🚀
