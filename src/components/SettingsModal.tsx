import React, { useState, useEffect } from 'react';
import { X, Save, Key, Cpu, Settings2, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'model' | 'keys' | 'workspace';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('model');
  
  // Settings State
  const [provider, setProvider] = useState('openrouter');
  const [model, setModel] = useState('gemini');
  const [temperature, setTemperature] = useState('0.7');
  const [isYoloMode, setIsYoloMode] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('NovelAIne');

  // Load from Supabase
  useEffect(() => {
    if (isOpen) {
      const fetchSettings = async () => {
        const { data } = await supabase.from('user_settings').select('*').limit(1).maybeSingle();
        if (data) {
          setProvider(data.provider || 'openrouter');
          setModel(data.model || 'gemini-2.5-flash');
          setTemperature(data.temperature?.toString() || '0.7');
          setIsYoloMode(data.is_yolo_mode !== false);
          setWorkspaceName(data.workspace_name || 'NovelAIne');
        }
      };
      fetchSettings();
    }
  }, [isOpen]);

  const handleSave = async () => {
    const { data: existing } = await supabase.from('user_settings').select('id').limit(1).maybeSingle();
    
    const payload = {
      provider,
      model,
      temperature: parseFloat(temperature),
      is_yolo_mode: isYoloMode,
      workspace_name: workspaceName
    };

    if (existing) {
      await supabase.from('user_settings').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('user_settings').insert([payload]);
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-[#151724] border border-[#2f334d] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f334d] bg-[#1a1c29]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-400" />
            시스템 설정 (System Settings)
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#202336] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex h-[500px]">
          {/* Sidebar Tabs */}
          <div className="w-48 bg-[#1a1c29]/50 border-r border-[#2f334d] p-3 space-y-1">
            <button 
              onClick={() => setActiveTab('model')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'model' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-[#202336] hover:text-slate-200'}`}
            >
              <Cpu className="w-4 h-4" /> AI 모델 설정
            </button>
            <button 
              onClick={() => setActiveTab('keys')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'keys' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-[#202336] hover:text-slate-200'}`}
            >
              <Key className="w-4 h-4" /> API 인증키 
            </button>
            <button 
              onClick={() => setActiveTab('workspace')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'workspace' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-[#202336] hover:text-slate-200'}`}
            >
              <Folder className="w-4 h-4" /> 작업 환경
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            
            {activeTab === 'model' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">추론 엔진 (LLM Provider)</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400">제공자 (Provider)</label>
                      <select 
                        className="w-full bg-[#0f111a] border border-[#2f334d] text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                      >
                        <option value="openrouter">OpenRouter (추천)</option>
                        <option value="openai">OpenAI (직접 연결)</option>
                        <option value="google">Google AI Studio</option>
                        <option value="anthropic">Anthropic</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400">모델 (Model Name)</label>
                      <select 
                        className="w-full bg-[#0f111a] border border-[#2f334d] text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                      >
                        <option value="gemini-2.5-flash">google/gemini-2.5-flash</option>
                        <option value="gpt-4o">openai/gpt-4o</option>
                        <option value="claude-3-5-sonnet">anthropic/claude-3.5-sonnet</option>
                      </select>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-slate-400">창의성 (Temperature)</label>
                        <span className="text-xs text-blue-400 font-mono">{temperature}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.1" 
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        className="w-full accent-blue-500 cursor-pointer" 
                      />
                      <p className="text-[11px] text-slate-500">값이 높을수록 응답이 창의적/변동성이 커집니다. (0.2~0.7 권장)</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#2f334d] w-full my-6" />

                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">에이전트 행동 제어</h3>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isYoloMode} 
                        onChange={(e) => setIsYoloMode(e.target.checked)}
                      />
                      <div className="w-10 h-5 bg-slate-600 rounded-full peer peer-checked:bg-blue-600 transition-colors duration-200"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">완전 자율 모드 (YOLO Mode)</p>
                      <p className="text-xs text-slate-500 mt-1">에이전트가 터미널 명령어 등 위험 행동 수행 시 승인 없이 끝까지 작업을 완수합니다.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'keys' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-sm font-semibold text-slate-200 mb-4">API 인증키 관리</h3>
                <div className="bg-[#202336] rounded-lg p-4 border border-[#2f334d]">
                  <p className="text-sm text-slate-400 leading-relaxed">
                    **보안 알림:** 현재 API 인증키는 브라우저 DB가 아닌 <strong>에이전트 백엔드(.env 파일)</strong>에서 관리되고 있습니다.<br/><br/>클라이언트 측 노출을 시키지 않기 위해 UI를 통한 변경은 비활성화 되어있습니다.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-sm font-semibold text-slate-200 mb-4">작업 환경 (Workspace Binding)</h3>
                <div className="space-y-3">
                  <label className="text-xs font-medium text-slate-400">타겟 프로젝트 이름 (Target Project Folder)</label>
                  <div className="flex items-center gap-0 bg-[#0f111a] border border-[#2f334d] rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all overflow-hidden p-2">
                    <span className="text-slate-500 font-mono text-sm px-2 bg-[#1a1c29] py-1 rounded-md border border-[#2f334d]">/Users/choi/Desktop/workspace/</span>
                    <input 
                      type="text" 
                      className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none placeholder:text-slate-600 font-mono px-3 py-1"
                      placeholder="NovelAIne"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    백엔드 에이전트가 코드를 읽고 쓸 실제 프로젝트 폴더명입니다. (예: <code>NovelAIne</code>, <code>AgentWebClient</code>)<br/>
                    변경 후 새 작업을 지시하면 에이전트가 즉각 해당 폴더로 진입합니다.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2f334d] bg-[#1a1c29]">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            취소
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-all active:scale-95 shadow-md shadow-blue-500/20"
          >
            <Save className="w-4 h-4" />
            저장하기
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
