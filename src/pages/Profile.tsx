import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Mail, Phone, Lock, LogOut, Camera, MapPin, ShieldCheck, Copy, Check, Share2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ADMIN_EMAILS } from '../hooks/useAdmin';

export const Profile = () => {
  const [session, setSession] = useState<any>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    fullName: ''
  });

  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    location: '',
    bio: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchBookings(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchBookings(session.user.id);
      } else {
        setProfileData({ fullName: '', phone: '', location: '', bio: '' });
        setBookings([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      } else if (data) {
        setProfileData({
          fullName: data.full_name || '',
          phone: data.phone || '',
          location: data.location || '',
          bio: data.bio || ''
        });
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const fetchBookings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          destinations (
            title,
            image,
            location
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
      } else if (data) {
        setBookings(data);
      }
    } catch (error) {
      console.error('Error in fetchBookings:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: authData.user.id,
                full_name: formData.fullName,
                phone: formData.phone
              }
            ]);
          
          if (profileError) {
            console.error('Error creating profile:', profileError);
          }
        }
        
        setMessage({ type: 'success', text: 'Conta criada com sucesso! Verifique seu e-mail.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ocorreu um erro.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          full_name: profileData.fullName,
          phone: profileData.phone,
          location: profileData.location,
          bio: profileData.bio,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setIsEditing(false);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center px-4 py-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-ink/10"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif mb-2">{isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}</h1>
              <p className="text-sm opacity-60">
                {isLogin ? 'Acesse sua conta para gerenciar reservas' : 'Junte-se a nós para reservar santuários'}
              </p>
            </div>

            {message && (
              <div className={`p-4 rounded-lg mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Nome Completo</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                      <input 
                        type="text" 
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="w-full bg-ink/5 border-none pl-10 pr-4 py-3 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none"
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Telefone</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                      <input 
                        type="tel" 
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-ink/5 border-none pl-10 pr-4 py-3 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-ink/5 border-none pl-10 pr-4 py-3 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-ink/5 border-none pl-10 pr-4 py-3 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-ink text-paper rounded-lg text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 mt-6"
              >
                {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm opacity-60 hover:opacity-100 transition-opacity border-b border-ink/30 pb-1"
              >
                {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
              </button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sidebar - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-ink/10"
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 bg-ink/5 rounded-full flex items-center justify-center mb-4 relative group cursor-pointer">
                  <User className="w-10 h-10 opacity-40" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-serif">{profileData.fullName || 'Usuário'}</h2>
                <p className="text-sm opacity-60">{session.user.email}</p>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Nome Completo</label>
                    <input 
                      type="text" 
                      value={profileData.fullName}
                      onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                      className="w-full bg-ink/5 border-none p-2 rounded text-sm focus:ring-1 focus:ring-ink outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Telefone</label>
                    <input 
                      type="tel" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="w-full bg-ink/5 border-none p-2 rounded text-sm focus:ring-1 focus:ring-ink outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Localização</label>
                    <input 
                      type="text" 
                      value={profileData.location}
                      onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                      className="w-full bg-ink/5 border-none p-2 rounded text-sm focus:ring-1 focus:ring-ink outline-none"
                      placeholder="Ex: São Paulo, SP"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Bio</label>
                    <textarea 
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      className="w-full bg-ink/5 border-none p-2 rounded text-sm focus:ring-1 focus:ring-ink outline-none resize-none h-24"
                      placeholder="Conte um pouco sobre você..."
                    />
                  </div>
                  
                  {message && (
                    <div className={`p-2 rounded text-xs text-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {message.text}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2 border border-ink/20 rounded text-xs uppercase tracking-widest hover:bg-ink/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 bg-ink text-paper rounded text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {profileData.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 opacity-40" />
                      <span>{profileData.phone}</span>
                    </div>
                  )}
                  {profileData.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 opacity-40" />
                      <span>{profileData.location}</span>
                    </div>
                  )}
                  {profileData.bio && (
                    <div className="pt-4 border-t border-ink/10">
                      <p className="text-sm opacity-80 italic">"{profileData.bio}"</p>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full py-3 mt-4 border border-ink/20 rounded-lg text-xs uppercase tracking-widest hover:bg-ink/5 transition-colors"
                  >
                    Editar Perfil
                  </button>
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-ink/10"
            >
              <div className="flex items-center gap-3 mb-4 text-green-700">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-sm">Identidade Verificada</h3>
              </div>
              <p className="text-xs opacity-60 leading-relaxed">
                Seu e-mail foi verificado. Para reservar alguns santuários premium, pode ser necessário verificar um documento de identidade.
              </p>
            </motion.div>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-4 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </div>

          {/* Main Content - Bookings */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif">Minhas Reservas</h2>
                <span className="text-sm opacity-60">{bookings.length} {bookings.length === 1 ? 'reserva' : 'reservas'}</span>
              </div>

              {bookings.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-ink/10 text-center">
                  <div className="w-16 h-16 bg-ink/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-6 h-6 opacity-40" />
                  </div>
                  <h3 className="text-xl font-serif mb-2">Nenhuma reserva ainda</h3>
                  <p className="text-sm opacity-60 mb-6 max-w-md mx-auto">
                    Você ainda não tem nenhuma reserva. Explore nossos santuários e planeje seu próximo detox digital.
                  </p>
                  <Link 
                    to="/"
                    className="inline-block px-8 py-3 bg-ink text-paper text-xs uppercase tracking-widest rounded hover:opacity-90 transition-opacity"
                  >
                    Explorar Santuários
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-ink/10 overflow-hidden flex flex-col sm:flex-row">
                      <div className="w-full sm:w-48 h-48 sm:h-auto relative">
                        <img 
                          src={booking.destinations?.image} 
                          alt={booking.destinations?.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold shadow-sm ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6 flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-serif">{booking.destinations?.title}</h3>
                            <span className="font-serif italic">${booking.total_price}</span>
                          </div>
                          <p className="text-sm opacity-60 flex items-center gap-1 mb-4">
                            <MapPin className="w-3 h-3" /> {booking.destinations?.location}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4 bg-ink/5 p-4 rounded-lg">
                            <div>
                              <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Check-in</span>
                              <span className="text-sm font-medium">{new Date(booking.check_in).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Check-out</span>
                              <span className="text-sm font-medium">{new Date(booking.check_out).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-ink/10">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-widest opacity-50">Reserva ID:</span>
                            <code className="text-xs bg-ink/5 px-2 py-1 rounded font-mono">
                              {booking.id.substring(0, 8)}
                            </code>
                            <button 
                              onClick={() => copyToClipboard(booking.id, booking.id)}
                              className="p-1 hover:bg-ink/10 rounded transition-colors"
                              title="Copiar ID"
                            >
                              {copiedId === booking.id ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 opacity-50" />}
                            </button>
                          </div>
                          
                          <div className="flex-grow"></div>
                          
                          <Link 
                            to={`/destination/${booking.destination_id}`}
                            className="text-xs uppercase tracking-widest font-bold border-b border-ink pb-0.5 hover:opacity-70 transition-opacity"
                          >
                            Ver Detalhes
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-ink/10 mt-8">
                <h3 className="text-xl font-serif mb-4">Precisa de Ajuda?</h3>
                <p className="text-sm opacity-60 mb-6">
                  Nossa equipe está disponível para ajudar com suas reservas ou dúvidas sobre os santuários.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    to="/chat"
                    className="flex-1 py-3 border border-ink text-center text-xs uppercase tracking-widest font-bold hover:bg-ink hover:text-paper transition-colors rounded flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Falar com Suporte
                  </Link>
                  <button className="flex-1 py-3 bg-ink/5 text-center text-xs uppercase tracking-widest font-bold hover:bg-ink/10 transition-colors rounded">
                    Central de Ajuda
                  </button>
                </div>

                {ADMIN_EMAILS.includes(session.user.email?.toLowerCase()) && (
                  <div className="p-6 bg-ink text-paper flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-red-400" />
                        <div>
                          <h3 className="font-bold uppercase tracking-widest text-sm">Painel do Administrador</h3>
                          <p className="text-xs opacity-70">Acesso restrito</p>
                        </div>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto">
                        <Link 
                          to="/admin/reservas"
                          className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded text-xs uppercase tracking-widest font-bold text-center"
                        >
                          Gerenciar Reservas
                        </Link>
                        <Link 
                          to="/admin/chat"
                          className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded text-xs uppercase tracking-widest font-bold text-center flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Atender Clientes
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};
