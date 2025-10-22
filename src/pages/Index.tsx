import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

interface User {
  id: number;
  name: string;
  avatar: string;
  online: boolean;
  lastMessage?: string;
  time?: string;
  unread?: number;
}

interface Message {
  id: number;
  userId: number;
  text: string;
  time: string;
  isMine: boolean;
}

type Screen = 'auth' | 'chats' | 'chat' | 'contacts' | 'groups' | 'profile' | 'search';

export default function Index() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');

  const users: User[] = [
    { id: 1, name: 'Анна Иванова', avatar: 'АИ', online: true, lastMessage: 'Привет! Как дела?', time: '12:30', unread: 2 },
    { id: 2, name: 'Дмитрий Петров', avatar: 'ДП', online: true, lastMessage: 'Отправил файлы', time: '11:45', unread: 0 },
    { id: 3, name: 'Мария Смирнова', avatar: 'МС', online: false, lastMessage: 'До встречи завтра!', time: 'Вчера', unread: 0 },
    { id: 4, name: 'Александр Козлов', avatar: 'АК', online: true, lastMessage: 'Созвон в 15:00', time: '10:20', unread: 1 },
  ];

  const groups = [
    { id: 1, name: 'Рабочий чат', avatar: '💼', members: 12, lastMessage: 'Новая задача в бэклоге', time: '14:00' },
    { id: 2, name: 'Друзья', avatar: '🎉', members: 8, lastMessage: 'Кто за выходные?', time: '13:30' },
    { id: 3, name: 'Семья', avatar: '👨‍👩‍👧‍👦', members: 5, lastMessage: 'Фото: IMG_2435.jpg', time: 'Вчера' },
  ];

  const messages: Message[] = [
    { id: 1, userId: 1, text: 'Привет! Как дела?', time: '12:28', isMine: false },
    { id: 2, userId: 1, text: 'Всё отлично! Работаю над проектом', time: '12:29', isMine: true },
    { id: 3, userId: 1, text: 'Круто! Какой проект?', time: '12:30', isMine: false },
    { id: 4, userId: 1, text: 'Новый мессенджер, очень интересно', time: '12:31', isMine: true },
  ];

  const AuthScreen = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted to-background">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-purple-cyan flex items-center justify-center">
            <Icon name="MessageCircle" size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gradient">Максограм</h1>
          <p className="text-muted-foreground">Современный мессенджер для общения</p>
        </div>
        
        <div className="space-y-4">
          <Input placeholder="Введите телефон или email" className="h-12 bg-muted/50 border-border" />
          <Input placeholder="Пароль" type="password" className="h-12 bg-muted/50 border-border" />
          
          <Button 
            onClick={() => setScreen('chats')} 
            className="w-full h-12 gradient-purple-cyan hover:opacity-90 transition-all duration-300 hover:scale-[1.02] font-semibold text-white"
          >
            Войти
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12 border-primary/50 hover:bg-primary/10"
          >
            Создать аккаунт
          </Button>
        </div>
      </Card>
    </div>
  );

  const ChatsList = () => (
    <div className="space-y-2 animate-fade-in">
      {users.map((user) => (
        <Card 
          key={user.id}
          onClick={() => {
            setSelectedUserId(user.id);
            setScreen('chat');
          }}
          className="p-4 hover:bg-muted/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg border-border/50"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-14 h-14 border-2 border-primary/20">
                <AvatarFallback className="gradient-purple-cyan text-white font-semibold">
                  {user.avatar}
                </AvatarFallback>
              </Avatar>
              {user.online && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-secondary rounded-full border-2 border-card animate-pulse" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold truncate">{user.name}</h3>
                <span className="text-xs text-muted-foreground">{user.time}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{user.lastMessage}</p>
            </div>
            
            {user.unread! > 0 && (
              <Badge className="gradient-purple-cyan text-white border-0">
                {user.unread}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  const ChatScreen = () => {
    const user = users.find(u => u.id === selectedUserId);
    if (!user) return null;

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
                {user.avatar}
              </AvatarFallback>
            </Avatar>
            {user.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-card" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-xs text-muted-foreground">{user.online ? 'в сети' : 'не в сети'}</p>
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
            {messages.filter(m => m.userId === selectedUserId).map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.isMine ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[70%] ${message.isMine ? 'order-2' : 'order-1'}`}>
                  <div className={`rounded-2xl p-4 ${
                    message.isMine 
                      ? 'gradient-purple-cyan text-white' 
                      : 'bg-card border border-border'
                  }`}>
                    <p>{message.text}</p>
                  </div>
                  <p className={`text-xs text-muted-foreground mt-1 ${message.isMine ? 'text-right' : 'text-left'}`}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 bg-card border-t border-border">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Icon name="Paperclip" size={20} />
            </Button>
            <Input 
              placeholder="Сообщение..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 bg-muted/50 border-border"
            />
            <Button 
              size="icon"
              className="gradient-purple-cyan hover:opacity-90 text-white"
              disabled={!messageText.trim()}
            >
              <Icon name="Send" size={20} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const ContactsScreen = () => (
    <div className="space-y-2 animate-fade-in">
      <Button className="w-full gradient-blue-cyan hover:opacity-90 text-white mb-4 h-12 font-semibold">
        <Icon name="UserPlus" size={20} className="mr-2" />
        Добавить контакт
      </Button>
      
      {users.map((user) => (
        <Card 
          key={user.id}
          className="p-4 hover:bg-muted/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] border-border/50"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarFallback className="gradient-purple-cyan text-white font-semibold">
                  {user.avatar}
                </AvatarFallback>
              </Avatar>
              {user.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-card" />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.online ? 'в сети' : 'не в сети'}</p>
            </div>
            
            <Button 
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedUserId(user.id);
                setScreen('chat');
              }}
              className="border-primary/50 hover:bg-primary/10"
            >
              <Icon name="MessageCircle" size={16} className="mr-2" />
              Написать
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );

  const GroupsScreen = () => (
    <div className="space-y-2 animate-fade-in">
      <Button className="w-full gradient-purple-pink hover:opacity-90 text-white mb-4 h-12 font-semibold">
        <Icon name="Users" size={20} className="mr-2" />
        Создать группу
      </Button>
      
      {groups.map((group) => (
        <Card 
          key={group.id}
          className="p-4 hover:bg-muted/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] border-border/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl">
              {group.avatar}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold truncate">{group.name}</h3>
                <span className="text-xs text-muted-foreground">{group.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{group.members} участников</span>
                <span className="text-muted-foreground">•</span>
                <p className="text-sm text-muted-foreground truncate flex-1">{group.lastMessage}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const SearchScreen = () => (
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
          {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map((user) => (
            <Card 
              key={user.id}
              className="p-4 hover:bg-muted/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] border-border/50"
            >
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 border-2 border-primary/20">
                  <AvatarFallback className="gradient-purple-cyan text-white font-semibold">
                    {user.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.online ? 'в сети' : 'не в сети'}</p>
                </div>
                <Button size="sm" className="gradient-purple-cyan hover:opacity-90 text-white">
                  Добавить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const ProfileScreen = () => (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6 border-border/50">
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-24 h-24 border-4 border-primary/20 mb-4">
            <AvatarFallback className="gradient-purple-cyan text-white text-3xl font-bold">
              ВП
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold mb-1">Вы</h2>
          <p className="text-muted-foreground mb-4">+7 (900) 123-45-67</p>
          <Button variant="outline" className="border-primary/50 hover:bg-primary/10">
            <Icon name="Edit" size={16} className="mr-2" />
            Редактировать профиль
          </Button>
        </div>
      </Card>

      <Card className="p-4 border-border/50">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="Bell" size={20} className="text-primary" />
              <span>Уведомления</span>
            </div>
            <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
          </div>
          
          <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="Lock" size={20} className="text-primary" />
              <span>Приватность</span>
            </div>
            <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
          </div>
          
          <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="Palette" size={20} className="text-primary" />
              <span>Оформление</span>
            </div>
            <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
          </div>
          
          <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="HelpCircle" size={20} className="text-primary" />
              <span>Помощь</span>
            </div>
            <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderScreen = () => {
    if (screen === 'auth') return <AuthScreen />;
    if (screen === 'chat') return <ChatScreen />;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="max-w-4xl mx-auto p-4">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gradient">Максограм</h1>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-6">
            <Button 
              variant={screen === 'chats' ? 'default' : 'outline'}
              onClick={() => setScreen('chats')}
              className={screen === 'chats' ? 'gradient-purple-cyan text-white' : 'border-border hover:bg-muted/50'}
            >
              <Icon name="MessageCircle" size={18} />
            </Button>
            <Button 
              variant={screen === 'contacts' ? 'default' : 'outline'}
              onClick={() => setScreen('contacts')}
              className={screen === 'contacts' ? 'gradient-purple-cyan text-white' : 'border-border hover:bg-muted/50'}
            >
              <Icon name="Users" size={18} />
            </Button>
            <Button 
              variant={screen === 'groups' ? 'default' : 'outline'}
              onClick={() => setScreen('groups')}
              className={screen === 'groups' ? 'gradient-purple-cyan text-white' : 'border-border hover:bg-muted/50'}
            >
              <Icon name="UsersRound" size={18} />
            </Button>
            <Button 
              variant={screen === 'search' ? 'default' : 'outline'}
              onClick={() => setScreen('search')}
              className={screen === 'search' ? 'gradient-purple-cyan text-white' : 'border-border hover:bg-muted/50'}
            >
              <Icon name="Search" size={18} />
            </Button>
            <Button 
              variant={screen === 'profile' ? 'default' : 'outline'}
              onClick={() => setScreen('profile')}
              className={screen === 'profile' ? 'gradient-purple-cyan text-white' : 'border-border hover:bg-muted/50'}
            >
              <Icon name="User" size={18} />
            </Button>
          </div>

          {screen === 'chats' && <ChatsList />}
          {screen === 'contacts' && <ContactsScreen />}
          {screen === 'groups' && <GroupsScreen />}
          {screen === 'search' && <SearchScreen />}
          {screen === 'profile' && <ProfileScreen />}
        </div>
      </div>
    );
  };

  return renderScreen();
}
