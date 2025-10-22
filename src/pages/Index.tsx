import { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const API_AUTH = 'https://functions.poehali.dev/7d91b22d-765f-4e87-a2d6-5521016e62af';
const API_MESSAGES = 'https://functions.poehali.dev/65694831-a2ba-48f5-be3b-29ec9666d002';
const API_PROFILE = 'https://functions.poehali.dev/725bd01e-9bdf-451d-ab23-bf01e7c91a91';

interface User {
  id: number;
  username: string;
  avatar_initials: string;
  online: boolean;
  email?: string;
  phone?: string;
  avatar_url?: string;
  birth_date?: string;
  username_last_changed?: string;
}

interface Chat {
  id: number;
  username: string;
  avatar_initials: string;
  online: boolean;
  last_message: string;
  last_message_is_voice: boolean;
  last_message_time: string;
  unread_count: number;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message_text?: string;
  voice_url?: string;
  voice_duration?: number;
  is_voice: boolean;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
}

type Screen = 'auth' | 'register' | 'chats' | 'chat' | 'contacts' | 'groups' | 'profile' | 'search' | 'settings';

export default function Index() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentUser && screen === 'chats') {
      loadChats();
    }
  }, [currentUser, screen]);

  useEffect(() => {
    if (currentUser && selectedUserId && screen === 'chat') {
      loadMessages(selectedUserId);
    }
  }, [currentUser, selectedUserId, screen]);

  const loadChats = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(API_MESSAGES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_chats', user_id: currentUser.id })
      });
      const data = await response.json();
      if (response.ok) {
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadMessages = async (otherUserId: number) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`${API_MESSAGES}?user_id=${currentUser.id}&other_user_id=${otherUserId}`);
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleRegister = async () => {
    if (!authForm.username || !authForm.password) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(authForm.username)) {
      toast({ title: 'Ошибка', description: 'Юзернейм: только английские буквы, цифры и _ (3-20 символов)', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          username: authForm.username,
          email: authForm.email,
          password: authForm.password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setCurrentUser(data.user);
        toast({ title: 'Успешно', description: data.message });
        setScreen('chats');
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось зарегистрироваться', variant: 'destructive' });
    }
  };

  const handleLogin = async () => {
    if (!authForm.username || !authForm.password) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: authForm.username,
          password: authForm.password
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setCurrentUser(data.user);
        toast({ title: 'Успешно', description: data.message });
        setScreen('chats');
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось войти', variant: 'destructive' });
    }
  };

  const sendMessage = async () => {
    if (!currentUser || !selectedUserId || !messageText.trim()) return;

    try {
      const response = await fetch(API_MESSAGES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          sender_id: currentUser.id,
          receiver_id: selectedUserId,
          message_text: messageText,
          is_voice: false
        })
      });

      if (response.ok) {
        setMessageText('');
        loadMessages(selectedUserId);
        loadChats();
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось получить доступ к микрофону', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!currentUser || !selectedUserId) return;

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      
      try {
        const response = await fetch(API_MESSAGES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            sender_id: currentUser.id,
            receiver_id: selectedUserId,
            voice_url: base64Audio,
            voice_duration: recordingTime,
            is_voice: true
          })
        });

        if (response.ok) {
          loadMessages(selectedUserId);
          loadChats();
          toast({ title: 'Голосовое сообщение отправлено' });
        }
      } catch (error) {
        toast({ title: 'Ошибка', description: 'Не удалось отправить голосовое', variant: 'destructive' });
      }
    };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const AuthScreen = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted to-background">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-purple-cyan flex items-center justify-center">
            <Icon name="MessageCircle" size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gradient">Максограм</h1>
          <p className="text-muted-foreground">Современный мессенджер для общения</p>
        </div>
        
        <div className="space-y-4">
          <Input 
            placeholder="Имя пользователя" 
            className="h-12 bg-muted/50 border-border"
            value={authForm.username}
            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
          />
          <div className="relative">
            <Input 
              placeholder="Пароль" 
              type={showPassword ? "text" : "password"}
              className="h-12 bg-muted/50 border-border pr-12"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? "EyeOff" : "Eye"} size={20} className="text-muted-foreground" />
            </Button>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full h-12 gradient-purple-cyan hover:opacity-90 transition-all duration-300 hover:scale-[1.02] font-semibold text-white"
          >
            Войти
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setScreen('register')}
            className="w-full h-12 border-primary/50 hover:bg-primary/10"
          >
            Создать аккаунт
          </Button>
        </div>
      </Card>
    </div>
  );

  const RegisterScreen = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted to-background">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-purple-cyan flex items-center justify-center">
            <Icon name="UserPlus" size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Регистрация</h1>
          <p className="text-muted-foreground">Создайте новый аккаунт</p>
        </div>
        
        <div className="space-y-4">
          <Input 
            placeholder="Имя пользователя" 
            className="h-12 bg-muted/50 border-border"
            value={authForm.username}
            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
          />
          <Input 
            placeholder="Email (необязательно)" 
            type="email"
            className="h-12 bg-muted/50 border-border"
            value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
          />
          <div className="relative">
            <Input 
              placeholder="Пароль" 
              type={showPassword ? "text" : "password"}
              className="h-12 bg-muted/50 border-border pr-12"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? "EyeOff" : "Eye"} size={20} className="text-muted-foreground" />
            </Button>
          </div>
          
          <Button 
            onClick={handleRegister}
            className="w-full h-12 gradient-purple-cyan hover:opacity-90 transition-all duration-300 hover:scale-[1.02] font-semibold text-white"
          >
            Зарегистрироваться
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setScreen('auth')}
            className="w-full h-12 border-primary/50 hover:bg-primary/10"
          >
            Уже есть аккаунт
          </Button>
        </div>
      </Card>
    </div>
  );

  const ChatsList = () => (
    <div className="space-y-2 animate-fade-in">
      {chats.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="MessageCircle" size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Нет чатов. Найдите пользователей в поиске!</p>
        </div>
      ) : (
        chats.map((chat) => (
          <Card 
            key={chat.id}
            onClick={() => {
              setSelectedUserId(chat.id);
              setScreen('chat');
            }}
            className="p-4 hover:bg-muted/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg border-border/50"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-14 h-14 border-2 border-primary/20">
                  <AvatarFallback className="gradient-purple-cyan text-white font-semibold">
                    {chat.avatar_initials}
                  </AvatarFallback>
                </Avatar>
                {chat.online && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-secondary rounded-full border-2 border-card animate-pulse" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold truncate">{chat.username}</h3>
                  <span className="text-xs text-muted-foreground">{formatTime(chat.last_message_time)}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {chat.last_message_is_voice ? '🎤 Голосовое сообщение' : chat.last_message}
                </p>
              </div>
              
              {chat.unread_count > 0 && (
                <Badge className="gradient-purple-cyan text-white border-0">
                  {chat.unread_count}
                </Badge>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );

  const ChatScreen = () => {
    const selectedChat = chats.find(c => c.id === selectedUserId);
    if (!selectedChat || !currentUser) return null;

    return (
      <div className="flex flex-col h-screen animate-slide-in-right">
        <div className="bg-card border-b border-border p-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setScreen('chats')}
            className="hover:bg-muted"
          >
            <Icon name="ArrowLeft" size={24} />
          </Button>
          
          <div className="relative">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarFallback className="gradient-purple-cyan text-white font-semibold">
                {selectedChat.avatar_initials}
              </AvatarFallback>
            </Avatar>
            {selectedChat.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-card" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold">{selectedChat.username}</h3>
            <p className="text-xs text-muted-foreground">{selectedChat.online ? 'в сети' : 'не в сети'}</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Icon name="Phone" size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Icon name="Video" size={20} />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-background to-muted/20">
          <div className="space-y-4">
            {messages.map((message) => {
              const isMine = message.sender_id === currentUser.id;
              return (
                <div 
                  key={message.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                    <div className={`rounded-2xl p-4 ${
                      isMine 
                        ? 'gradient-purple-cyan text-white' 
                        : 'bg-card border border-border'
                    }`}>
                      {message.is_voice ? (
                        <div className="flex items-center gap-3">
                          <Icon name="Mic" size={20} />
                          <audio controls src={message.voice_url} className="max-w-full" />
                          <span className="text-sm">{message.voice_duration}s</span>
                        </div>
                      ) : (
                        <p>{message.message_text}</p>
                      )}
                    </div>
                    <p className={`text-xs text-muted-foreground mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-4 bg-card border-t border-border">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Icon name="Paperclip" size={20} />
            </Button>
            {!isRecording ? (
              <>
                <Input 
                  placeholder="Сообщение..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 bg-muted/50 border-border"
                />
                <Button 
                  size="icon"
                  onClick={sendMessage}
                  className="gradient-purple-cyan hover:opacity-90 text-white"
                  disabled={!messageText.trim()}
                >
                  <Icon name="Send" size={20} />
                </Button>
                <Button 
                  size="icon"
                  onClick={startRecording}
                  className="gradient-purple-pink hover:opacity-90 text-white"
                >
                  <Icon name="Mic" size={20} />
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1 flex items-center gap-3 px-4 bg-muted/50 rounded-lg">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-mono">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                  <span className="text-muted-foreground">Запись голосового...</span>
                </div>
                <Button 
                  size="icon"
                  onClick={stopRecording}
                  className="gradient-purple-cyan hover:opacity-90 text-white"
                >
                  <Icon name="Check" size={20} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SearchScreen = () => {
    const [allUsers, setAllUsers] = useState<User[]>([]);

    useEffect(() => {
      const loadAllUsers = async () => {
        try {
          const response = await fetch(`${API_MESSAGES}?action=get_all_users`);
          if (response.ok) {
            const data = await response.json();
            setAllUsers(data.users || []);
          }
        } catch (error) {
          console.error('Error loading users');
        }
      };
      
      if (screen === 'search') {
        loadAllUsers();
      }
    }, [screen]);

    const filteredUsers = allUsers.filter(u => 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) && u.id !== currentUser?.id
    );

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="relative">
          <Icon name="Search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Искать людей, группы..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-muted/50 border-border"
          />
        </div>
        
        {searchQuery && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-2">Результаты</h3>
            {filteredUsers.map((user) => (
              <Card 
                key={user.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] border-border/50"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarFallback className="gradient-purple-cyan text-white font-semibold">
                      {user.avatar_initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{user.username}</h3>
                    <p className="text-sm text-muted-foreground">{user.online ? 'в сети' : 'не в сети'}</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setScreen('chat');
                    }}
                    className="gradient-purple-cyan hover:opacity-90 text-white"
                  >
                    Написать
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ProfileScreen = () => (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 border-border/50">
        <div className="flex flex-col items-center text-center">
          {currentUser?.avatar_url ? (
            <img src={currentUser.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-primary/20 mb-4 object-cover" />
          ) : (
            <Avatar className="w-24 h-24 border-4 border-primary/20 mb-4">
              <AvatarFallback className="gradient-purple-cyan text-white text-3xl font-bold">
                {currentUser?.avatar_initials}
              </AvatarFallback>
            </Avatar>
          )}
          <h2 className="text-2xl font-bold mb-1">@{currentUser?.username}</h2>
          <p className="text-muted-foreground mb-2">{currentUser?.email || currentUser?.phone || 'Не указано'}</p>
          {currentUser?.birth_date && (
            <p className="text-sm text-muted-foreground mb-4">🎂 {new Date(currentUser.birth_date).toLocaleDateString('ru-RU')}</p>
          )}
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline"
              onClick={() => setScreen('settings')}
              className="border-primary/50 hover:bg-primary/10"
            >
              <Icon name="Settings" size={16} className="mr-2" />
              Настройки
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setCurrentUser(null);
                setScreen('auth');
                toast({ title: 'Вы вышли из аккаунта' });
              }}
              className="border-primary/50 hover:bg-primary/10"
            >
              <Icon name="LogOut" size={16} className="mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const SettingsScreen = () => {
    const [settingsForm, setSettingsForm] = useState({
      username: currentUser?.username || '',
      avatar_url: currentUser?.avatar_url || '',
      birth_date: currentUser?.birth_date || ''
    });
    const [usernameError, setUsernameError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast({ title: 'Ошибка', description: 'Только PNG и JPG файлы', variant: 'destructive' });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Ошибка', description: 'Максимальный размер 5MB', variant: 'destructive' });
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSettingsForm({ ...settingsForm, avatar_url: base64 });
      };
    };

    const handleUpdateProfile = async () => {
      if (settingsForm.username && !/^[a-zA-Z0-9_]{3,20}$/.test(settingsForm.username)) {
        setUsernameError('Только английские буквы, цифры и _ (3-20 символов)');
        return;
      }
      setUsernameError('');

      try {
        const response = await fetch(API_PROFILE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_profile',
            user_id: currentUser?.id,
            new_username: settingsForm.username !== currentUser?.username ? settingsForm.username : undefined,
            avatar_url: settingsForm.avatar_url,
            birth_date: settingsForm.birth_date
          })
        });

        const data = await response.json();

        if (response.ok) {
          setCurrentUser(data.user);
          toast({ title: 'Успешно', description: data.message });
          setScreen('profile');
        } else {
          toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        }
      } catch (error) {
        toast({ title: 'Ошибка', description: 'Не удалось обновить профиль', variant: 'destructive' });
      }
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setScreen('profile')}
              className="hover:bg-muted"
            >
              <Icon name="ArrowLeft" size={24} />
            </Button>
            <h2 className="text-2xl font-bold">Настройки профиля</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Юзернейм</label>
              <Input
                placeholder="username"
                value={settingsForm.username}
                onChange={(e) => setSettingsForm({ ...settingsForm, username: e.target.value })}
                className="bg-muted/50 border-border"
              />
              {usernameError && <p className="text-xs text-destructive mt-1">{usernameError}</p>}
              {currentUser?.username_last_changed && (
                <p className="text-xs text-muted-foreground mt-1">
                  Последнее изменение: {new Date(currentUser.username_last_changed).toLocaleDateString('ru-RU')}
                  {' '}(можно менять раз в 3 дня)
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Аватар</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-border hover:bg-muted/50"
                >
                  <Icon name="Upload" size={16} className="mr-2" />
                  Загрузить файл
                </Button>
                <Input
                  placeholder="или вставь URL"
                  value={settingsForm.avatar_url.startsWith('data:') ? '' : settingsForm.avatar_url}
                  onChange={(e) => setSettingsForm({ ...settingsForm, avatar_url: e.target.value })}
                  className="bg-muted/50 border-border flex-1"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileUpload}
                className="hidden"
              />
              {settingsForm.avatar_url && (
                <div className="mt-3 flex items-center gap-3">
                  <img src={settingsForm.avatar_url} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettingsForm({ ...settingsForm, avatar_url: '' })}
                    className="text-destructive hover:text-destructive"
                  >
                    <Icon name="Trash2" size={16} className="mr-1" />
                    Удалить
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">День рождения</label>
              <Input
                type="date"
                value={settingsForm.birth_date}
                onChange={(e) => setSettingsForm({ ...settingsForm, birth_date: e.target.value })}
                className="bg-muted/50 border-border"
              />
            </div>

            <Button
              onClick={handleUpdateProfile}
              className="w-full gradient-purple-cyan hover:opacity-90 text-white"
            >
              Сохранить изменения
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  const authScreen = useMemo(() => <AuthScreen />, [authForm, showPassword]);
  const registerScreen = useMemo(() => <RegisterScreen />, [authForm, showPassword]);
  const chatScreen = useMemo(() => <ChatScreen />, [selectedUserId, messages, messageText, isRecording, recordingTime]);

  const renderScreen = () => {
    if (screen === 'auth') return authScreen;
    if (screen === 'register') return registerScreen;
    if (screen === 'chat') return chatScreen;
    if (screen === 'settings') return <SettingsScreen />;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gradient">Максограм</h1>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <Button 
              variant={screen === 'chats' ? 'default' : 'outline'}
              onClick={() => setScreen('chats')}
              className={screen === 'chats' ? 'gradient-purple-cyan text-white' : 'border-border hover:bg-muted/50'}
            >
              <Icon name="MessageCircle" size={18} className="mr-2" />
              Чаты
            </Button>
            <Button 
              variant={screen === 'search' ? 'default' : 'outline'}
              onClick={() => setScreen('search')}
              className={screen === 'search' ? 'gradient-purple-cyan text-white' : 'border-border hover:bg-muted/50'}
            >
              <Icon name="Search" size={18} className="mr-2" />
              Поиск
            </Button>
            <Button 
              variant={screen === 'profile' ? 'default' : 'outline'}
              onClick={() => setScreen('profile')}
              className={screen === 'profile' ? 'gradient-purple-cyan text-white' : 'border-border hover:bg-muted/50'}
            >
              <Icon name="User" size={18} className="mr-2" />
              Профиль
            </Button>
          </div>

          {screen === 'chats' && <ChatsList />}
          {screen === 'search' && <SearchScreen />}
          {screen === 'profile' && <ProfileScreen />}
        </div>
      </div>
    );
  };

  return renderScreen();
}