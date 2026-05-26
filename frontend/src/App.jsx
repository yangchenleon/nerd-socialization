import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000';

// 教练解析卡片组件
function CoachPanel({ analysis }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!analysis) return null;

  let analysisData = {};
  try {
    analysisData = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
  } catch (e) {
    console.error("Failed to parse coach analysis", e);
    return null;
  }

  return (
    <div className="mt-2 w-full max-w-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm border border-gray-200"
      >
        <span>👀</span> {isOpen ? '收起教练解析' : '查看教练解析'}
      </button>

      {isOpen && (
        <div className="mt-2 bg-gray-800/90 backdrop-blur-md text-white p-4 rounded-xl shadow-lg text-sm border border-gray-700/50 transform transition-all duration-300 origin-top animate-in slide-in-from-top-2 fade-in">
          <div className="space-y-3">
            <div>
              <span className="text-red-400 font-bold block mb-0.5">🎯 你的失误：</span>
              <p className="text-gray-200 leading-relaxed">{analysisData.flaw || '无'}</p>
            </div>
            <div>
              <span className="text-purple-400 font-bold block mb-0.5">🎭 她的潜台词：</span>
              <p className="text-gray-200 leading-relaxed">{analysisData.subtext || '无'}</p>
            </div>
            <div>
              <span className="text-green-400 font-bold block mb-0.5">💡 教练建议：</span>
              <p className="text-gray-200 leading-relaxed">{analysisData.advice || '无'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 聊天气泡组件
function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
            isUser
              ? 'bg-[#95ec69] text-black rounded-tr-sm'
              : 'bg-white text-black rounded-tl-sm border border-gray-100'
          }`}
        >
          {message.content}
        </div>
        {!isUser && message.coach_analysis && (
          <CoachPanel analysis={message.coach_analysis} />
        )}
      </div>
    </div>
  );
}

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 获取所有会话
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sessions`);
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // 当切换会话时获取历史消息
  useEffect(() => {
    if (!currentSessionId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/sessions/${currentSessionId}/messages`);
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
  }, [currentSessionId]);

  // 创建新会话
  const handleNewSession = async () => {
    try {
      const title = `模拟训练 ${new Date().toLocaleTimeString()}`;
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const newSession = await res.json();
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  // 发送消息
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentSessionId || isLoading) return;

    const userText = inputText.trim();
    setInputText('');
    
    // 乐观更新 UI
    const optimisticMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${currentSessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_text: userText }),
      });
      
      const data = await res.json();
      // 追加后端返回的女方回复
      setMessages(prev => [...prev, data.message]);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('发送失败，请检查后端服务是否启动。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* 左侧边栏 (Sidebar) - 25% */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col min-w-[250px]">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={handleNewSession}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors flex justify-center items-center gap-2"
          >
            <span>+</span> 新建模拟训练
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm">暂无会话，请新建</div>
          ) : (
            <div className="flex flex-col">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setCurrentSessionId(session.id)}
                  className={`px-5 py-4 cursor-pointer border-b border-gray-100 transition-colors ${
                    currentSessionId === session.id
                      ? 'bg-gray-100 border-l-4 border-l-blue-600'
                      : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="font-medium text-gray-800 truncate">{session.title}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(session.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧主区域 (Chat Area) - 75% */}
      <div className="w-3/4 flex flex-col bg-[#f5f5f5]">
        {currentSessionId ? (
          <>
            {/* 顶部 Header */}
            <div className="h-16 flex-shrink-0 bg-gray-50 border-b border-gray-200 flex items-center px-6">
              <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                林晚 
                <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  训练中
                </span>
              </h2>
            </div>

            {/* 聊天记录滚动区 */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-20">
                  <p>打个招呼吧，开启你的直男改造之旅~</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
              
              {isLoading && (
                <div className="flex w-full mb-6 justify-start">
                  <div className="flex items-center gap-2 text-gray-500 text-sm px-4 py-2 bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-75">●</span>
                    <span className="animate-pulse delay-150">●</span>
                    <span className="ml-1">对方正在输入...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 底部输入框 */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="输入你想对林晚说的话... (Enter 发送，Shift+Enter 换行)"
                  className="flex-1 resize-none border-none bg-gray-50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-100 text-[15px]"
                  rows={2}
                  disabled={isLoading}
                />
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isLoading || !inputText.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium px-6 py-2.5 rounded-xl transition-colors h-[44px]"
                  >
                    发送
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
            <div className="text-6xl">💬</div>
            <p>请在左侧选择或新建一个模拟训练</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
