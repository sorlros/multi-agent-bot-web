import React from 'react';
import { Bot, MessageSquare, Plus, Settings } from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
}

interface SidebarProps {
  tasks: TaskItem[];
  onNewTask: () => void;
  onSelectTask: (taskId: string) => void;
  onOpenSettings: () => void;
  activeTaskId?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ tasks, onNewTask, onSelectTask, onOpenSettings, activeTaskId }) => {
  return (
    <aside className="w-64 h-full border-r border-[#2f334d] bg-[#151724] flex flex-col">
      <div className="p-4 pt-6 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <h1 className="font-bold text-lg tracking-tight">오빗 에이전트</h1>
      </div>

      <div className="px-4 py-2">
        <button 
          onClick={onNewTask}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          새로운 작업 시작
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto mt-2 custom-scrollbar">
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">최근 작업</p>
        
        {tasks.map((task) => (
          <button 
            key={task.id}
            onClick={() => onSelectTask(task.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors group ${activeTaskId === task.id ? 'bg-[#2a2d3d] text-white' : 'text-slate-300 hover:bg-[#202336]'}`}
          >
            <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeTaskId === task.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
            <span className="truncate">{task.title}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-[#2f334d]">
        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors w-full cursor-pointer group"
        >
          <Settings className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          시스템 설정
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
