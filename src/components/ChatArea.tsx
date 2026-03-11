import React, { useRef, useEffect } from 'react';
import MessageBubble, { type MessageData } from './MessageBubble';

interface ChatAreaProps {
  messages: MessageData[];
  isLoading: boolean;
}

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
          <div className="h-full flex flex-col items-center justify-center mt-32 text-center opacity-60">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-1 mb-6 shadow-2xl">
              <div className="w-full h-full bg-[#1e2130] rounded-xl flex items-center justify-center">
                🤖
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">무엇을 도와드릴까요?</h2>
            <p className="text-slate-400 max-w-sm">
              원하시는 작업을 프롬프트로 지시해 주세요. 오빗 에이전트가 코드를 기획, 작성, 테스트까지 자동으로 수행합니다.
            </p>
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
