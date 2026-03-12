import React, { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Terminal } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    // Always use the latest value from the DOM ref to avoid IME/State lag
    const textToSend = (textareaRef.current?.value || '').trim();
    
    if (textToSend && !isLoading && !isSending) {
      setIsSending(true);
      onSend(textToSend);
      
      // Clear both state and DOM value
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
      
      // Reset local lock
      setTimeout(() => setIsSending(false), 500);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Prevent triggering during IME composition (essential for Korean)
      if (e.nativeEvent.isComposing) return;
      
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#0f111a] via-[#0f111a] to-transparent pt-12 pb-4 sm:pb-6 px-2 sm:px-4">
      <div className="max-w-4xl mx-auto relative group">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="오늘 에이전트가 어떤 작업을 수행할까요?"
          className="w-full bg-[#1e2130]/90 border border-[#2f334d] text-slate-200 rounded-2xl py-3 sm:py-4 pl-10 sm:pl-12 pr-12 sm:pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none overflow-hidden placeholder:text-slate-500 shadow-xl backdrop-blur-md transition-all h-12 sm:h-14 text-sm sm:text-base"
          rows={1}
          disabled={isLoading}
        />
        
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          <Terminal className="w-5 h-5" />
        </div>

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading || isSending}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:bg-slate-700 transition-colors shadow-lg active:scale-95 cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      <p className="text-center text-xs text-slate-500 mt-3 font-medium">
        오빗 자율형 멀티 에이전트 오케스트레이터입니다. AI가 생성한 결과물은 완벽하지 않을 수 있습니다.
      </p>
    </div>
  );
};

export default ChatInput;
