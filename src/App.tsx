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
  const [isLoading, setIsLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
  };

  const handleSendMessage = async (userText: string) => {
    let currentTaskId = activeTaskId;
    
    // Create new task if none is active
    if (!currentTaskId) {
      const title = userText.length > 30 ? userText.substring(0, 30) + '...' : userText;
      const { data } = await supabase.from('tasks').insert([{ title }]).select().single();
      if (data) {
        currentTaskId = data.id;
        setActiveTaskId(currentTaskId);
        setTasks([data, ...tasks]);
      }
    }
    
    const newMessages: MessageData[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    if (currentTaskId) {
      await supabase.from('messages').insert([{ task_id: currentTaskId, role: 'user', content: userText }]);
    }

    try {
      const response = await axios.post('/api/orchestration/run', {
        message: userText
      });

      const responseText = (response.data && response.data.success) ? response.data.result : "작업 진행 중 에러가 발생했습니다.";
      
      setMessages([...newMessages, { role: 'agent', content: responseText }]);
      if (currentTaskId) {
        await supabase.from('messages').insert([{ task_id: currentTaskId, role: 'agent', content: responseText }]);
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || error.message || "오케스트레이션 서버와 통신할 수 없습니다.";
      setMessages([...newMessages, { role: 'agent', content: `🚨 에러: ${errMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTask = async (taskId: string) => {
    setActiveTaskId(taskId);
    setIsLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map((msg: any) => ({ role: msg.role, content: msg.content })));
    }
    setIsLoading(false);
  };

  const handleNewTask = () => {
    setActiveTaskId(null);
    setMessages([]);
  };

  return (
    <>
      <Layout 
        sidebar={
          <Sidebar 
            tasks={tasks}
            onNewTask={handleNewTask} 
            onSelectTask={handleSelectTask} 
            onOpenSettings={() => setIsSettingsOpen(true)}
            activeTaskId={activeTaskId} 
          />
        }
      >
        <ChatArea messages={messages} isLoading={isLoading} />
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      </Layout>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}

export default App;
