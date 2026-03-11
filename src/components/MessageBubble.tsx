import React from 'react';
import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface MessageData {
  role: 'user' | 'agent';
  content: string;
}

interface MessageBubbleProps {
  data: MessageData;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ data }) => {
  const isUser = data.role === 'user';

  return (
    <div className={`flex gap-4 message-enter ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden ${
        isUser ? 'bg-blue-600' : 'bg-[#151724] border border-[#2f334d]'
      }`}>
        {isUser ? <User className="w-5 h-5 text-white" /> : <img src="/logo.png" alt="Orbit" className="w-full h-full object-cover" />}
      </div>

      <div className={`max-w-[95%] sm:max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <span className="text-xs font-semibold text-slate-400 mb-1.5 px-1 tracking-wide">
          {isUser ? '나' : '오빗 에이전트'}
        </span>
        <div className={`
          px-5 py-4 rounded-2xl leading-relaxed shadow-sm
          ${isUser 
            ? 'bg-blue-600 text-white rounded-tr-sm whitespace-pre-wrap' 
            : 'glass-panel text-slate-200 rounded-tl-sm border-l-2 border-l-purple-500 w-full'}
        `}>
          {isUser ? (
            data.content
          ) : (
            <div className="w-full break-words">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 text-white" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-5 text-white" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2 mt-4 text-slate-100" {...props} />,
                  p: ({node, ...props}) => <p className="mb-4 last:mb-0 text-slate-300" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1.5" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1.5" {...props} />,
                  li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
                  code: ({node, inline, ...props}: any) => 
                    inline 
                      ? <code className="bg-[#2f334d] text-blue-300 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props} />
                      : <code className="block bg-[#0f111a] text-slate-300 p-4 rounded-xl text-[13px] font-mono overflow-x-auto border border-[#2f334d] mb-4 shadow-inner" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-600 pl-4 py-1 italic text-slate-400 mb-4 bg-[#1a1c29]/50 rounded-r-lg" {...props} />,
                  a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />
                }}
              >
                {data.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
