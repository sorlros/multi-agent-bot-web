import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { MessageData } from './MessageBubble';

interface AgentProgressProps {
  steps: MessageData[];
  isLoading: boolean;
}

const AgentProgress: React.FC<AgentProgressProps> = ({ steps, isLoading }) => {
  const lastStepRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastStepRef.current) {
      lastStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps]);

  if (steps.length === 0 && !isLoading) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8 mt-4">
      <div className="glass-panel border-l-4 border-l-blue-500 rounded-r-2xl p-5 shadow-lg bg-[#1a1c29]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4 text-slate-100 font-semibold text-sm">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>에이전트 실시간 작업 로그</span>
        </div>
        
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              ref={idx === steps.length - 1 ? lastStepRef : null}
              className="flex items-start gap-3 group animate-in fade-in slide-in-from-left-2 duration-300"
            >
              <div className="mt-1 flex-shrink-0">
                {idx === steps.length - 1 && isLoading ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/80" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[13px] text-slate-300 font-mono leading-relaxed">
                  <span className="text-blue-400 mr-2 opacity-50">LOG ›</span>
                  {step.content}
                </p>
              </div>
            </div>
          ))}

          {steps.length === 0 && isLoading && (
            <div className="flex items-center gap-3 text-slate-400 italic text-[13px] animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>에이전트가 초기 분석 중입니다...</span>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-[11px] font-bold text-blue-500/80 uppercase tracking-widest">Processing</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              협업 에이전트 간 통신 중
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentProgress;
