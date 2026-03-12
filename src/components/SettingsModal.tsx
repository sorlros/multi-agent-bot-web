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
  const [theme, setTheme] = useState('manual');

  // Provider-Model Mapping
  const PRVOIDER_MODELS: Record<string, {value: string, label: string}[]> = {
    openrouter: [
      { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash' },
      { value: 'openai/gpt-4o', label: 'openai/gpt-4o' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'anthropic/claude-3.5-sonnet' }
    ],
    openai: [
      { value: 'gpt-4o', label: 'gpt-4o' },
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
      { value: 'gpt-4-turbo', label: 'gpt-4-turbo' }
    ],
    google: [
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
      { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro' }
    ],
    anthropic: [
      { value: 'claude-3-5-sonnet-20240620', label: 'claude-3-5-sonnet' },
      { value: 'claude-3-opus-20240229', label: 'claude-3-opus' }
    ]
  };

  const THEMES = [
    { id: 'quality', label: '고성능 (Quality)', desc: 'Claude 3.5 Sonnet 기반 최고의 코드 품질', icon: '✨' },
    { id: 'balanced', label: '밸런스 (Balanced)', desc: 'Gemini 1.5 Pro 기반 속도와 품질의 조화', icon: '⚖️' },
    { id: 'economy', label: '절약형 (Economy)', desc: 'Gemini 1.5 Flash 기반 최고의 속도와 저가격', icon: '⚡' },
    { id: 'manual', label: '수동 설정 (Manual)', desc: '제공자와 모델을 직접 선택합니다.', icon: '🛠️' }
  ];

  // Handle Provider Change
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    // Auto-select the first available model for the new provider
    const availableModels = PRVOIDER_MODELS[newProvider] || [];
    if (availableModels.length > 0) {
      setModel(availableModels[0].value);
    }
  };

  // Load from Supabase
  useEffect(() => {
    if (isOpen) {
      const fetchSettings = async () => {
        const { data } = await supabase.from('user_settings').select('*').limit(1).maybeSingle();
        if (data) {
          setProvider(data.provider || 'openrouter');
          setModel(data.model || 'google/gemini-2.5-flash');
          setTemperature(data.temperature?.toString() || '0.7');
          setIsYoloMode(data.is_yolo_mode !== false);
          setWorkspaceName(data.workspace_name || 'NovelAIne');
          setTheme(data.theme || 'manual');
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
      workspace_name: workspaceName,
      theme: theme
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
      
      <div className="relative w-[90%] md:w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#151724] border border-[#2f334d] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
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
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0 md:h-[500px]">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-48 bg-[#1a1c29]/50 border-b md:border-b-0 md:border-r border-[#2f334d] p-3 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible shrink-0 custom-scrollbar">
            <button 
              onClick={() => setActiveTab('model')}
              className={`flex-1 md:w-full flex justify-center md:justify-start items-center gap-2 md:gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'model' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-[#202336] hover:text-slate-200'}`}
            >
              <Cpu className="w-4 h-4" /> <span className="hidden sm:inline md:inline">AI 모델 설정</span><span className="sm:hidden">모델</span>
            </button>
            <button 
              onClick={() => setActiveTab('keys')}
              className={`flex-1 md:w-full flex justify-center md:justify-start items-center gap-2 md:gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'keys' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-[#202336] hover:text-slate-200'}`}
            >
              <Key className="w-4 h-4" /> <span className="hidden sm:inline md:inline">API 인증키</span><span className="sm:hidden">키</span>
            </button>
            <button 
              onClick={() => setActiveTab('workspace')}
              className={`flex-1 md:w-full flex justify-center md:justify-start items-center gap-2 md:gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'workspace' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-[#202336] hover:text-slate-200'}`}
            >
              <Folder className="w-4 h-4" /> <span className="hidden sm:inline md:inline">작업 환경</span><span className="sm:hidden">작업실</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
            
            {activeTab === 'model' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">모델 테마 선택 (Auto Themes)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`flex flex-col items-start p-3 rounded-xl border transition-all ${
                          theme === t.id 
                            ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500' 
                            : 'bg-[#0f111a] border-[#2f334d] hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{t.icon}</span>
                          <span className={`text-sm font-semibold ${theme === t.id ? 'text-blue-400' : 'text-slate-200'}`}>
                            {t.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 text-left line-clamp-1">{t.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className={`transition-all duration-300 ${theme !== 'manual' ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                    <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                      추론 엔진 (LLM Provider) 
                      {theme !== 'manual' && <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Theme Auto</span>}
                    </h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400">제공자 (Provider)</label>
                      <select 
                        className="w-full bg-[#0f111a] border border-[#2f334d] text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        value={provider}
                        onChange={(e) => handleProviderChange(e.target.value)}
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
                        {(PRVOIDER_MODELS[provider] || []).map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
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
                </div>

                <div className="h-px bg-[#2f334d] w-full my-6" />

                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">에이전트 행동 제어</h3>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5 shrink-0">
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
                      <p className="text-xs text-slate-500 mt-1">에이전트가 위험 행동 수행 시 승인 없이 끝까지 작업을 완수합니다.</p>
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
                    **보안 알림:** 현재 API 인증키는 <strong>에이전트 백엔드(.env 파일)</strong>에서 관리되고 있습니다.<br/><br/>클라이언트 측 노출을 시키지 않기 위해 UI 변경은 비활성화 되어있습니다.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-sm font-semibold text-slate-200 mb-4">작업 환경 (Workspace Binding)</h3>
                <div className="space-y-3">
                  <label className="text-xs font-medium text-slate-400">타겟 프로젝트 이름 (Folder)</label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0 bg-[#0f111a] border border-[#2f334d] rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all overflow-hidden p-2">
                    <span className="text-slate-500 font-mono text-xs sm:text-sm px-2 bg-[#1a1c29] py-2 sm:py-1 rounded-md sm:rounded-r-none border sm:border-r-0 border-[#2f334d] shrink-0 truncate max-w-[200px] sm:max-w-none">/Users/choi/Desktop/workspace/</span>
                    <input 
                      type="text" 
                      className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none placeholder:text-slate-600 font-mono px-3 py-2 sm:py-1"
                      placeholder="NovelAIne"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    백엔드 에이전트가 코드를 읽고 쓸 실제 프로젝트 폴더명입니다.
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
