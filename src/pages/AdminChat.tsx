import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { MessageSquare, Send, Search, Clock, CheckCircle2, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ADMIN_EMAILS } from '../hooks/useAdmin';

interface Chat {
  id: string;
  user_id: string;
  user_email: string;
  status: 'active' | 'closed';
  created_at: string;
  updated_at: string;
  unread_admin: number;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_admin: boolean;
}

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';

export const AdminChat = () => {
  const [session, setSession] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatsRef = useRef<Chat[]>([]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session || !session.user.email || !ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
        navigate('/perfil');
      } else {
        fetchChats();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session || !session.user.email || !ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
        navigate('/perfil');
      }
    });

    // Real-time subscription for new chats and unread updates
    const chatsChannel = supabase
      .channel('admin_chats_list')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chats' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newChat = payload.new as Chat;
          setChats(prev => {
            if (prev.find(c => c.id === newChat.id)) return prev;
            return [newChat, ...prev];
          });
          playNotificationSound();
        } else if (payload.eventType === 'UPDATE') {
          const updatedChat = payload.new as Chat;
          setChats(prev => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
          
          // Play sound if unread_admin increased
          const oldChat = chatsRef.current.find(c => c.id === updatedChat.id);
          if (oldChat && updatedChat.unread_admin > oldChat.unread_admin) {
            playNotificationSound();
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(chatsChannel);
    };
  }, [navigate]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      markAsRead(selectedChat.id);

      const messagesChannel = supabase
        .channel(`admin_messages_${selectedChat.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${selectedChat.id}`
        }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          // If it's a user message, play sound and mark as read since we're viewing it
          if (!newMsg.is_admin) {
            playNotificationSound();
            markAsRead(selectedChat.id);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (chatId: string) => {
    try {
      await supabase
        .from('chats')
        .update({ unread_admin: 0 })
        .eq('id', chatId);
        
      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, unread_admin: 0 } : c
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !session) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          chat_id: selectedChat.id,
          sender_id: session.user.id,
          content: messageText,
          is_admin: true
        }]);

      if (error) throw error;
      
      // Update chat unread count for user
      await supabase
        .from('chats')
        .update({ 
          updated_at: new Date().toISOString(),
          unread_user: selectedChat.unread_user ? selectedChat.unread_user + 1 : 1
        })
        .eq('id', selectedChat.id);
        
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
      setNewMessage(messageText); // Restore message
    } finally {
      setSending(false);
    }
  };

  const closeChat = async (chatId: string) => {
    if (!window.confirm('Tem certeza que deseja encerrar este atendimento?')) return;
    
    try {
      const { error } = await supabase
        .from('chats')
        .update({ status: 'closed' })
        .eq('id', chatId);

      if (error) throw error;
      
      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, status: 'closed' } : c
      ));
      
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Error closing chat:', error);
      alert('Erro ao encerrar atendimento.');
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!session || !session.user.email || !ADMIN_EMAILS.includes(session.user.email.toLowerCase())) return null;

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 flex gap-6 h-[calc(100vh-80px)]">
        {/* Sidebar - Chat List */}
        <div className="w-1/3 bg-white border border-ink/10 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-ink/10 bg-ink/5">
            <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Atendimentos
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por e-mail..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-ink/10 rounded text-sm outline-none focus:border-ink/30"
              />
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center opacity-50 text-sm">Carregando...</div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center opacity-50 text-sm">Nenhum atendimento encontrado.</div>
            ) : (
              filteredChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full text-left p-4 border-b border-ink/5 hover:bg-ink/5 transition-colors flex flex-col gap-2 ${selectedChat?.id === chat.id ? 'bg-ink/5 border-l-4 border-l-ink' : ''}`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <User className="w-4 h-4 opacity-50 shrink-0" />
                      <span className="font-medium text-sm truncate">{chat.user_email}</span>
                    </div>
                    {chat.unread_admin > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shrink-0">
                        {chat.unread_admin}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center w-full text-xs opacity-60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(chat.updated_at), "dd/MM HH:mm")}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${chat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-ink/10 text-ink/70'}`}>
                      {chat.status === 'active' ? 'Ativo' : 'Encerrado'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="w-2/3 bg-white border border-ink/10 rounded-xl flex flex-col overflow-hidden shadow-sm">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-ink/10 bg-ink/5 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{selectedChat.user_email}</h3>
                  <p className="text-xs opacity-60">ID: {selectedChat.id.substring(0, 8)}...</p>
                </div>
                {selectedChat.status === 'active' && (
                  <button 
                    onClick={() => closeChat(selectedChat.id)}
                    className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Encerrar Atendimento
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4 bg-paper/30">
                {messages.map((msg, idx) => {
                  const isAdmin = msg.is_admin;
                  const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx-1].created_at).getTime() > 5 * 60 * 1000;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      {showTime && (
                        <span className="text-[10px] opacity-40 mb-2">
                          {format(new Date(msg.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      <div className={`max-w-[80%] p-4 rounded-2xl ${isAdmin ? 'bg-ink text-paper rounded-tr-sm' : 'bg-white border border-ink/10 rounded-tl-sm shadow-sm'}`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              {selectedChat.status === 'active' ? (
                <div className="p-4 border-t border-ink/10 bg-white">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="flex-grow bg-ink/5 border-none p-4 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none"
                      disabled={sending}
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="bg-ink text-paper px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-4 border-t border-ink/10 bg-ink/5 text-center">
                  <p className="text-sm opacity-60">Este atendimento foi encerrado.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center opacity-40">
              <MessageSquare className="w-16 h-16 mb-4" />
              <p className="text-lg font-serif">Selecione um atendimento</p>
              <p className="text-sm">Escolha uma conversa na lista ao lado para responder.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
