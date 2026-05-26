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
        className="text-xs bg-white hover:bg-gray-50 text-gray-500 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-sm border border-gray-200"
      >
        <span className="text-sm">👁️</span> 
        <span className="font-medium">{isOpen ? '收起教练解析' : '查看教练解析'}</span>
      </button>

      {isOpen && (
        <div className="mt-2 bg-white/95 backdrop-blur-md text-gray-800 p-4 rounded-xl shadow-md border border-gray-100 transform transition-all duration-300 origin-top animate-fade-in slide-in-from-top-2">
          <div className="space-y-4">
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <span className="text-red-500 font-bold flex items-center gap-1.5 mb-1 text-sm">
                <span>🎯</span> 你的失误
              </span>
              <p className="text-gray-700 leading-relaxed text-[13px]">{analysisData.flaw || '无'}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <span className="text-purple-500 font-bold flex items-center gap-1.5 mb-1 text-sm">
                <span>🎭</span> 她的潜台词
              </span>
              <p className="text-gray-700 leading-relaxed text-[13px]">{analysisData.subtext || '无'}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <span className="text-emerald-600 font-bold flex items-center gap-1.5 mb-1 text-sm">
                <span>💡</span> 教练建议
              </span>
              <p className="text-gray-700 leading-relaxed text-[13px]">{analysisData.advice || '无'}</p>
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
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-bubble-in`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl mr-3 shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
          👧
        </div>
      )}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div
          className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
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
      {isUser && (
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl ml-3 shadow-sm border border-blue-100 overflow-hidden flex-shrink-0">
          👦
        </div>
      )}
    </div>
  );
}

// 角色选择弹窗
function CharacterModal({ isOpen, onClose, characters, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up mx-4">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">选择陪练对象</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            ✕
          </button>
        </div>
        <div className="p-6">
          {characters.length === 0 ? (
            <div className="text-center py-10 text-gray-400">正在加载角色库...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map(char => (
                <div 
                  key={char.id} 
                  onClick={() => onSelect(char.id)}
                  className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#95ec69] hover:shadow-md transition-all group bg-white"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {char.name === '苏甜' ? '🎀' : '❄️'}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{char.name}</h4>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full line-clamp-1 mt-0.5">
                        {char.personality}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    "{char.greeting}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
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
  
  // 角色和弹窗状态
  const [characters, setCharacters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 获取所有会话和角色
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessRes, charRes] = await Promise.all([
          fetch(`${API_BASE_URL}/sessions`),
          fetch(`${API_BASE_URL}/characters`)
        ]);
        const sessData = await sessRes.json();
        const charData = await charRes.json();
        
        setSessions(sessData);
        setCharacters(charData);

        if (sessData.length > 0 && !currentSessionId) {
          setCurrentSessionId(sessData[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    fetchData();
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
  const handleCreateSession = async (characterId) => {
    try {
      const char = characters.find(c => c.id === characterId);
      const title = `与 ${char?.name || '未知角色'} 的对话`;
      
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, character_id: characterId }),
      });
      const newSession = await res.json();
      
      // 更新会话列表
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('创建对话失败');
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

  // 获取当前会话对象
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentCharacter = currentSession?.character || {};

  return (
    <div className="flex h-screen bg-[#f3f3f3] font-sans selection:bg-green-200">
      
      <CharacterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        characters={characters}
        onSelect={handleCreateSession}
      />

      {/* 左侧边栏 (Sidebar) - 25% */}
      <div className="w-[300px] bg-[#f7f7f7] border-r border-[#e5e5e5] flex flex-col flex-shrink-0 z-10 shadow-[2px_0_15px_rgba(0,0,0,0.03)]">
        <div className="p-5 border-b border-[#e5e5e5] bg-[#f7f7f7] flex-shrink-0 flex items-center justify-between">
          <h1 className="font-bold text-gray-800 tracking-tight">对话列表</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#95ec69] hover:bg-[#86d95f] text-black w-8 h-8 rounded-md shadow-sm transition-colors flex justify-center items-center font-bold text-xl leading-none border border-[#7ed753]"
            title="新建对话"
          >
            +
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar custom-scroll">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm">暂无会话，请点击右上角新建</div>
          ) : (
            <div className="flex flex-col">
              {sessions.map((session) => {
                const char = session.character || {};
                const isActive = currentSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#e5e5e5]/50 ${
                      isActive ? 'bg-[#e5e5e5]' : 'hover:bg-[#ebebeb]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                      {char.name === '苏甜' ? '🎀' : '❄️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-medium text-[15px] text-gray-900 truncate">
                          {char.name || '未知角色'}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(session.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[13px] text-gray-500 truncate">
                        {session.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 右侧主区域 (Chat Area) - 75% */}
      <div className="flex-1 flex flex-col bg-[#f5f5f5] relative">
        {currentSessionId ? (
          <>
            {/* 顶部 Header */}
            <div className="h-[60px] flex-shrink-0 bg-[#f5f5f5] border-b border-[#e5e5e5] flex items-center px-6 justify-between z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium text-gray-900 tracking-tight">
                  {currentCharacter.name || '林晚'}
                </h2>
                {currentCharacter.personality && (
                  <span className="text-[11px] font-normal bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full max-w-[200px] truncate">
                    {currentCharacter.personality.split('、')[0]}
                  </span>
                )}
              </div>
              <div className="text-gray-400">···</div>
            </div>

            {/* 聊天记录滚动区 */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scroll">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-20 flex flex-col items-center gap-3 animate-fade-in">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm">👋</div>
                  <p>打个招呼吧，开启你的直男改造之旅</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
              
              {isLoading && (
                <div className="flex w-full mb-6 justify-start animate-bubble-in">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl mr-3 shadow-sm border border-gray-200 flex-shrink-0">
                    👧
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm px-5 py-3 bg-white rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-75">●</span>
                    <span className="animate-bounce delay-150">●</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* 底部输入框 */}
            <div className="bg-[#f5f5f5] border-t border-[#e5e5e5] p-4">
              <form onSubmit={handleSendMessage} className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-200 focus-within:border-[#95ec69] focus-within:ring-1 focus-within:ring-[#95ec69]/50 transition-all">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="发消息... (Enter 发送，Shift+Enter 换行)"
                  className="flex-1 resize-none border-none bg-transparent p-2 focus:outline-none text-[15px] max-h-32 min-h-[40px] custom-scroll leading-relaxed"
                  rows={1}
                  disabled={isLoading}
                />
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isLoading || !inputText.trim()}
                    className="bg-[#95ec69] hover:bg-[#86d95f] disabled:bg-gray-100 disabled:text-gray-400 text-black font-medium px-5 py-2 rounded-xl transition-colors h-[40px] border border-[#7ed753] disabled:border-transparent"
                  >
                    发送
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-5 bg-gray-50/50 animate-fade-in">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-5xl shadow-sm border border-gray-100 rotate-3">
              💬
            </div>
            <p className="tracking-wide">请在左侧新建一个模拟训练</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
