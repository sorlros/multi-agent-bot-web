import React, { useRef, useEffect } from 'react';
import MessageBubble, { type MessageData } from './MessageBubble';
import { ShieldCheck, Code2, Layout as LayoutIcon, Search, FileText, Settings as SettingsIcon } from 'lucide-react';

interface ChatAreaProps {
  messages: MessageData[];
  isLoading: boolean;
}

const AGENT_ROLES = [
  { icon: <ShieldCheck className="w-5 h-5 text-blue-400" />, name: 'Manager', desc: '작업 기획 및 전체 방향성 지시' },
  { icon: <Code2 className="w-5 h-5 text-purple-400" />, name: 'BackendDev', desc: '서버 로직 및 API 기능 구현' },
  { icon: <LayoutIcon className="w-5 h-5 text-pink-400" />, name: 'FrontendDev', desc: '사용자 인터페이스 및 반응형 UI 작업' },
  { icon: <Search className="w-5 h-5 text-emerald-400" />, name: 'QAEngineer', desc: '코드 검증 및 버그 수정 루프' },
  { icon: <FileText className="w-5 h-5 text-amber-400" />, name: 'Reporter', desc: '최종 결과물 한국어 요약 및 보고' },
  { icon: <SettingsIcon className="w-5 h-5 text-slate-400" />, name: 'Designer', desc: '디자인 일관성 및 UX 최적화' }
];

const ChatArea: React.FC<ChatAreaProps> = ({ messages, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto w-full px-2 sm:px-4 py-4 sm:py-6 custom-scrollbar" ref={scrollRef}>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-32">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center mt-12 md:mt-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 p-1 mb-8 shadow-2xl animate-in fade-in zoom-in duration-500">
              <div className="w-full h-full bg-[#1e2130] rounded-xl flex items-center justify-center overflow-hidden border border-white/5">
                <img src="/logo.png" alt="Welcome Logo" className="w-14 h-14 object-contain" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">오빗 멀티 에이전트 시스템</h2>
            <p className="text-slate-400 max-w-md mb-12 text-sm sm:text-base leading-relaxed">
              원하시는 작업을 지시해 주세요. 6명의 전문 에이전트가<br />
              기획부터 구현, 테스트까지 자동으로 협력하여 완료합니다.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full px-2 sm:px-4">
              {AGENT_ROLES.map((role, idx) => (
                <div 
                  key={idx}
                  className="glass-panel p-3 sm:p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all hover:bg-white/[0.03] group text-left animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="mb-2 sm:mb-3 p-1.5 sm:p-2 w-fit rounded-lg bg-white/5 group-hover:bg-blue-500/10 transition-colors">
                    {role.icon}
                  </div>
                  <h4 className="text-slate-100 font-semibold mb-0.5 sm:mb-1 text-[13px] sm:text-sm">{role.name}</h4>
                  <p className="text-slate-500 text-[10px] sm:text-xs leading-tight sm:leading-relaxed">{role.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageBubble key={index} data={msg} />
          ))
        )}

        {isLoading && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0" />
            <div className="glass-panel px-4 py-3 rounded-2xl rounded-tl-sm text-slate-300 w-fit">
              <span className="flex gap-1.5 items-center h-5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
