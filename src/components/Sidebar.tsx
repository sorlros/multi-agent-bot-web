import React from 'react';
import { MessageSquare, Plus, Settings, X, Trash2 } from 'lucide-react';

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
  isOpen: boolean;
  onClose: () => void;
  onDeleteTask: (taskId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ tasks, onNewTask, onSelectTask, onOpenSettings, activeTaskId, isOpen, onClose, onDeleteTask }) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[80vw] max-w-sm sm:w-64 border-r border-[#2f334d] bg-[#151724] flex flex-col
        transition-transform duration-300 ease-in-out md:static md:translate-x-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="p-4 pt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Orbit Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="font-bold text-lg tracking-tight">오빗 에이전트</h1>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-white md:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-4 py-2">
          <button 
            onClick={() => { onNewTask(); onClose(); }}
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
              onClick={() => { onSelectTask(task.id); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors group ${activeTaskId === task.id ? 'bg-[#2a2d3d] text-white' : 'text-slate-300 hover:bg-[#202336]'}`}
            >
              <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeTaskId === task.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
              <span className="truncate flex-1">{task.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('이 작업을 삭제하시겠습니까?')) {
                    onDeleteTask(task.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="작업 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2f334d]">
          <button 
            onClick={() => { onOpenSettings(); onClose(); }}
            className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors w-full cursor-pointer group"
          >
            <Settings className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
            시스템 설정
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
