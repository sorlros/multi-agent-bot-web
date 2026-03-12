import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Sidebar, { type TaskItem } from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import type { MessageData } from './components/MessageBubble';
import { supabase } from './lib/supabase';
import axios from 'axios';

function App() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [steps, setSteps] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Supabase Realtime Subscription for Messages
  useEffect(() => {
    if (!activeTaskId) return;

    const channel = supabase
      .channel(`task_messages_${activeTaskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `task_id=eq.${activeTaskId}`
        },
        (payload) => {
          const newMessage = payload.new;
          console.log("Realtime New Message Received:", newMessage);
          
          if (newMessage.role === 'agent_step') {
            setSteps((prev) => {
              const exists = prev.some(m => m.content === newMessage.content);
              if (!exists) return [...prev, { role: 'agent_step', content: newMessage.content }];
              return prev;
            });
            // Failsafe: if a step log indicates a critical error, ensure UI is not stuck
            if (newMessage.content.includes('ERROR') || newMessage.content.includes('실패')) {
              setIsLoading(false);
            }
          } else if (newMessage.role === 'agent') {
            setIsLoading(false); // Stop loading immediately on any agent message
            
            setMessages((prev) => {
              const exists = prev.some(m => m.content === newMessage.content && m.role === 'agent');
              if (!exists) {
                return [...prev, { role: 'agent', content: newMessage.content }];
              }
              console.log("Realtime: Duplicate message skipped in UI", newMessage.content);
              return prev;
            });
          }
        }
      )
      .subscribe(async (status) => {
        console.log(`Supabase Realtime Status for ${activeTaskId}:`, status);
        if (status === 'SUBSCRIBED') {
          // Once subscribed, fetch the latest messages one more time to catch anything missed during the handshake
          const { data } = await supabase.from('messages').select('*').eq('task_id', activeTaskId).order('created_at', { ascending: true });
          if (data) {
            const chatMsgs = data.filter((m: any) => m.role !== 'agent_step').map((msg: any) => ({ role: msg.role, content: msg.content }));
            const progressSteps = data.filter((m: any) => m.role === 'agent_step').map((msg: any) => ({ role: msg.role, content: msg.content }));
            
            setMessages((prev) => {
              // Merge existing and new messages, maintaining order and uniqueness
              const combined = [...prev];
              chatMsgs.forEach(newMsg => {
                if (!combined.some(m => m.content === newMsg.content && m.role === newMsg.role)) {
                  combined.push(newMsg);
                }
              });
              return combined;
            });

            setSteps((prev) => {
              const combined = [...prev];
              progressSteps.forEach(newStep => {
                if (!combined.some(m => m.content === newStep.content)) {
                  combined.push(newStep);
                }
              });
              return combined;
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTaskId]);

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
  };

  const handleSendMessage = async (userText: string) => {
    let currentTaskId = activeTaskId;
    
    // Create new task if none is active
    if (!currentTaskId) {
      const { data: settings } = await supabase.from('user_settings').select('workspace_name').limit(1).maybeSingle();
      const workspace_p_name = settings?.workspace_name || 'NovelAIne';
      const title = userText.length > 30 ? userText.substring(0, 30) + '...' : userText;
      
      const { data } = await supabase.from('tasks').insert([
        { title, workspace_name: workspace_p_name }
      ]).select().single();
      
      if (data) {
        currentTaskId = data.id;
        setActiveTaskId(currentTaskId);
        setTasks([data, ...tasks]);
      }
    }
    
    const userMessage: MessageData = { role: 'user', content: userText };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data: settings } = await supabase.from('user_settings').select('workspace_name, provider, model, temperature, theme').limit(1).maybeSingle();
      const workspace_name = settings?.workspace_name || 'NovelAIne';
      const provider = settings?.provider || 'openrouter';
      const model = settings?.model || 'gemini-1.5-flash';
      const temperature = settings?.temperature || 0.7;
      const theme = settings?.theme || 'manual';

      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      const apiSecret = import.meta.env.VITE_API_SECRET_KEY || '';
      
      const response = await axios.post(`${apiUrl}/api/orchestration/run`, {
        message: userText,
        task_id: currentTaskId,
        workspace_name: workspace_name,
        provider: provider,
        model: model,
        temperature: temperature,
        theme: theme
      }, {
        headers: {
          'X-Api-Secret': apiSecret,
          'ngrok-skip-browser-warning': 'true'
        }
      });

      console.log("API Response:", response.data);

      // Backend returns { success: boolean, result: string }
      if (response.data && response.data.success) {
        setMessages((prev) => {
          // Robust duplication check: if real-time already added the agent message, don't re-add
          const alreadyHasAgent = prev.some(m => m.role === 'agent' && m.content === response.data.result);
          if (alreadyHasAgent) return prev;
          return [...prev, { role: 'agent', content: response.data.result }];
        });
      } else {
        const errorMsg = response.data?.detail || "작업을 시작하지 못했습니다.";
        setMessages((prev) => [...prev, { role: 'agent', content: `🚨 에러: ${errorMsg}` }]);
        setIsLoading(false);
      }

    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || error.message || "오케스트레이션 서버와 통신할 수 없습니다.";
      setMessages((prev) => [...prev, { role: 'agent', content: `🚨 에러: ${errMsg}` }]);
      setIsLoading(false);
    }
  };

  const handleSelectTask = async (taskId: string) => {
    setActiveTaskId(taskId);
    setIsMobileSidebarOpen(false); // Close sidebar on mobile after selection
    setIsLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
    if (data) {
      const chatMsgs = data.filter((m: any) => m.role !== 'agent_step').map((msg: any) => ({ role: msg.role, content: msg.content }));
      const progressSteps = data.filter((m: any) => m.role === 'agent_step').map((msg: any) => ({ role: msg.role, content: msg.content }));
      
      setMessages(chatMsgs);
      setSteps(progressSteps);
    }
    setIsLoading(false);
  };

  const handleNewTask = () => {
    setActiveTaskId(null);
    setMessages([]);
    setSteps([]);
    setIsMobileSidebarOpen(false); // Close sidebar on mobile after new task
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      
      if (error) throw error;

      // Update local state
      setTasks(tasks.filter(t => t.id !== taskId));

      // If the deleted task was the active one, reset the chat
      if (activeTaskId === taskId) {
        handleNewTask();
      }
    } catch (error: any) {
      console.error('Error deleting task:', error);
      alert('작업 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <>
      <Layout 
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        sidebar={
          <Sidebar 
            tasks={tasks}
            onNewTask={handleNewTask} 
            onSelectTask={handleSelectTask} 
            onOpenSettings={() => setIsSettingsOpen(true)}
            activeTaskId={activeTaskId} 
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            onDeleteTask={handleDeleteTask}
          />
        }
      >
        <ChatArea messages={messages} isLoading={isLoading} steps={steps} />
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      </Layout>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}

export default App;
