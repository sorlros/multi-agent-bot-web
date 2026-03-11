import React, { useState, useEffect } from 'react';
import { X, Save, Key, Cpu, Settings2, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState('openrouter');
  const [model, setModel] = useState('gemini');
  const [temperature, setTemperature] = useState('0.7');
  const [isYoloMode, setIsYoloMode] = useState(true);

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
      is_yolo_mode: isYoloMode
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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
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
          {/* Settings Tabs (Sidebar inside modal) */}
          <div className="w-48 bg-[#1a1c29]/50 border-r border-[#2f334d] p-3 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600/10 text-blue-400">
              <Cpu className="w-4 h-4" /> AI 모델 설정
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:bg-[#202336] hover:text-slate-200 transition-colors">
              <Key className="w-4 h-4" /> API 인증키 
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:bg-[#202336] hover:text-slate-200 transition-colors">
              <Folder className="w-4 h-4" /> 작업 환경
            </button>
          </div>

          {/* Settings Content Area */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            
            {/* Section: AI Model */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-4">추론 엔진 (LLM Provider)</h3>
                <div className="space-y-4">
                  
                  {/* Provider Select */}
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

                  {/* Model Select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">모델 (Model Name)</label>
                    <select 
                      className="w-full bg-[#0f111a] border border-[#2f334d] text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    >
                      <option value="gemini">google/gemini-2.5-flash</option>
                      <option value="gpt4o">openai/gpt-4o</option>
                      <option value="claude">anthropic/claude-3.5-sonnet</option>
                    </select>
                  </div>

                  {/* Temperature Slider */}
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
                    <p className="text-[11px] text-slate-500">값이 높을수록 코드가 창의적으로(불안정하게) 변합니다. 0.2~0.7 사이를 권장합니다.</p>
                  </div>
                  
                </div>
              </div>

              <div className="h-px bg-[#2f334d] w-full my-6" />

              {/* Section: Autonomy */}
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
                    <p className="text-xs text-slate-500 mt-1">에이전트가 터미널 명령어(패키지 설치, 스크립트 실행 등) 수행 시 사용자의 승인 없이 백그라운드에서 즉시 실행합니다.</p>
                  </div>
                </label>
              </div>

            </div>
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
