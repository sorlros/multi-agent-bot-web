# Orbit Agent Web Client 🪐

![Orbit Banner](https://img.shields.io/badge/Status-Active-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-React%20|%20Vite%20|%20TailwindCSS%20|%20Supabase-blue)

A modern, React-based web interface for managing and triggering autonomous multi-agent pipelines. Built as a decoupled frontend proxying to a FastAPI orchestrator.

*(한국어 설명은 아래에 있습니다 / Korean description below)*

## 🇬🇧 English Description

### Overview
This project is a dedicated web UI for the Orbit Autonomous Agent System. Instead of operating agents purely from the terminal or using complex API clients, this interface allows you to chat naturally with the orchestrator, watch it plan (`task.md`), and review its artifacts (`walkthrough.md`) in a beautifully rendered markdown format.

### Features
- **Glassmorphic Chat UI**: Specialized chat components distinguishing User prompts from AI Markdown output.
- **Supabase Persistence**: Complete data retention for chat histories, tasks, and system settings across devices via PostgreSQL.
- **Dynamic System Settings**: Change your LLM provider (OpenRouter/OpenAI/Anthropic/Google), model, temperature, and agent autonomy level dynamically through the UI.

### Getting Started
1. Clone the repository.
2. Initialize environment variables in `.env`:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
3. Run `npm install`
4. Run `npm run dev` to start the frontend on `localhost:5174`.
5. Ensure your FastAPI orchestrator is running on `localhost:8000` (proxied in `vite.config.ts`).

---

## 🇰🇷 한국어 설명

### 개요 (Overview)
본 프로젝트는 자율형 멀티-에이전트 시스템을 위한 전용 웹 대시보드(Agent Web Client)입니다. 개발을 에이전트에게 지시할 때 터미널 커맨드라인 환경을 벗어나, 편안한 웹 브라우저에서 자연어 채팅으로 에이전트와 소통하고 작업 결과를 실시간으로 확인할 수 있도록 설계되었습니다.

### 주요 기능 (Features)
- **모던 마크다운 채팅 UI**: 에이전트가 생성하는 복잡한 시스템 기획서(`task.md`)나 결과 보고서(`walkthrough.md`)를 실제 마크다운 문서처럼 시각적으로 렌더링해 줍니다.
- **Supabase 클라우드 데이터베이스**: 로컬 스토리지에 의존하지 않고 클라우드 데이터베이스를 결합하여, Vercel 배포 후 언제 어디서든 이전 작업 내역을 확인하고 이어서 작업할 수 있습니다.
- **실시간 시스템 다이내믹 설정**: 프론트엔드 내 설정(Settings) 탭을 통해 언제든 추론용 AI 엔진(GPT-4o, Gemini 2.5 Flash, Claude 3.5 등)을 교체할 수 있으며, 에이전트 자율 모드(YOLO Mode) 활성화 여부를 즉시 통제할 수 있습니다.

### 설치 및 로컬 실행 방법
1. 저장소를 클론(Clone)합니다.
2. 프로젝트 최상단 폴더에 `.env` 파일을 만들고 아래 변수를 세팅합니다.
   ```env
   VITE_SUPABASE_URL=회원님의_수파베이스_URL
   VITE_SUPABASE_ANON_KEY=회원님의_수파베이스_앱키
   ```
3. `npm install` 로 의존성 패키지를 설치합니다.
4. `npm run dev` 를 입력해 개발용 서버를 띄웁니다 (`localhost:5174`).
5. (필수) 사전에 구축된 파이썬 백엔드(FastAPI)가 `localhost:8000`에서 실행되어 있어야 에이전트 통신이 진행됩니다!

### 💡 자동 Git 동기화 명령어
수정 사항이 생겨 깃허브에 푸시(Push)하고자 할 경우, 터미널에 아래 명령어를 치면 자동으로 Git add, commit, push 단계를 한 번에 처리해 줍니다.
```bash
npm run sync
```
