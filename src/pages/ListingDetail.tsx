import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Destination } from '../data/mockData';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { motion } from 'motion/react';
import { WifiOff, ShieldCheck, Calendar as CalendarIcon, MapPin, ArrowLeft, Camera, Notebook, Map as MapIcon, Plus, Trash2, ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAdmin, ADMIN_EMAIL } from '../hooks/useAdmin';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval, 
  addMonths, 
  subMonths,
  isBefore,
  startOfToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartTotal } = useCart();
  const { isAdmin } = useAdmin();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        console.log(`Buscando destino ID: ${id} no Supabase...`);
        
        // Tenta buscar na tabela destinations primeiro
        let { data, error } = await supabase
          .from('destinations')
          .select('*')
          .eq('id', id)
          .single();
        
        // Se não encontrar ou der erro, tenta na tabela imoveis
        if (error || !data) {
          const { data: saleData, error: saleError } = await supabase
            .from('imoveis')
            .select('*')
            .eq('id', id)
            .single();
          
          if (saleError) {
            console.error('Erro ao buscar em ambas as tabelas:', saleError);
            throw saleError;
          }
          data = saleData;
        }
        
        if (data) {
          console.log('Destino carregado com sucesso:', data.title || data.titulo);
          
          // Verifica se veio da tabela imoveis (campos em português)
          const isFromImoveis = data.titulo !== undefined;

          // Map data to match Destination interface
          const mappedData: Destination = isFromImoveis ? {
            id: data.id,
            title: data.titulo || 'Sem Título',
            location: data.bairro || 'Localização não informada',
            description: 'Imóvel disponível para venda.',
            price: 0,
            signalStrength: 0,
            image: Array.isArray(data.image_url) ? (data.image_url[0] || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000') : (data.image_url || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000'),
            images: Array.isArray(data.image_url) ? data.image_url : [data.image_url],
            tags: [],
            features: [],
            valor_venda: data.valor,
            bairro: data.bairro,
            quantidade_quartos: data.quartos
          } : {
            id: data.id,
            title: data.title || 'Sem Título',
            location: data.location || 'Localização não informada',
            description: data.description || '',
            price: data.price_per_night || data.price || 0,
            signalStrength: data.isolation_level !== undefined ? data.isolation_level : (data.signalStrength || 0),
            image: Array.isArray(data.image) ? (data.image[0] || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000') : (data.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000'),
            images: Array.isArray(data.image) ? data.image : (data.images || []),
            tags: data.tags || [],
            features: data.features || []
          };
          
          setDestination(mappedData);
          setSelectedImage(mappedData.image);
          
          // Update SEO dynamically
          document.title = `${mappedData.title} - Aluguel de Temporada em Uberlândia | AlugaAki`;
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', `${mappedData.title}. ${mappedData.description.substring(0, 150)}... Aluguel de chácaras e casas de temporada em Uberlândia.`);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar destino:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDestination();
  }, [id]);

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bookedDates, setBookedDates] = useState<{id: string, check_in: string, check_out: string}[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (destination?.images) {
      setLightboxIndex((prev) => (prev + 1) % destination.images!.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (destination?.images) {
      setLightboxIndex((prev) => (prev - 1 + destination.images!.length) % destination.images!.length);
    }
  };
  
  // Lead form state
  const [leadForm, setLeadForm] = useState({ nome: '', email: '', telefone: '' });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;
    setLeadLoading(true);
    setLeadError(null);

    try {
      // 1. Salvar no Supabase
      const { error: supabaseError } = await supabase
        .from('leads_vendas')
        .insert([{
          nome: leadForm.nome,
          email: leadForm.email,
          telefone: leadForm.telefone,
          imovel_id: String(destination.id),
          imovel_titulo: destination.title
        }]);

      if (supabaseError) console.error('Erro Supabase Lead:', supabaseError);

      // 2. Enviar Email
      const response = await fetch("https://formsubmit.co/ajax/gabrielcalid@gmail.com", {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            _subject: `Novo Interesse (Detalhes): ${destination.title}`,
            Imóvel: destination.title,
            Valor: destination.valor_venda ? `R$ ${destination.valor_venda}` : 'Não informado',
            Nome: leadForm.nome,
            Email: leadForm.email,
            Telefone: leadForm.telefone,
        })
      });

      if (!response.ok) throw new Error('Falha ao enviar e-mail.');

      setLeadSuccess(true);
      setLeadForm({ nome: '', email: '', telefone: '' });
    } catch (err: any) {
      setLeadError(err.message || 'Erro ao enviar dados.');
    } finally {
      setLeadLoading(false);
    }
  };

  const isDateReserved = (date: Date) => {
    return bookedDates.some(period => {
      const start = parseISO(period.check_in);
      const end = parseISO(period.check_out);
      return isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end);
    });
  };

  const isDateSelected = (date: Date) => {
    if (!checkIn) return false;
    const start = parseISO(checkIn);
    if (!checkOut) return isSameDay(date, start);
    const end = parseISO(checkOut);
    return (isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end));
  };

  const handleDateClick = (date: Date) => {
    if (isBefore(date, startOfToday())) return;
    if (isDateReserved(date)) return;

    const dateStr = format(date, 'yyyy-MM-dd');

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr);
      setCheckOut('');
    } else {
      const start = parseISO(checkIn);
      if (isBefore(date, start)) {
        setCheckIn(dateStr);
        setCheckOut('');
      } else {
        // Check if any date in between is reserved
        const days = eachDayOfInterval({ start, end: date });
        const hasReserved = days.some(d => isDateReserved(d));
        if (hasReserved) {
          setCheckIn(dateStr);
          setCheckOut('');
        } else {
          setCheckOut(dateStr);
        }
      }
    }
  };

  useEffect(() => {
    if (!destination?.id) return;

    const fetchBookedDates = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('id, check_in, check_out')
          .eq('destination_id', destination.id)
          .in('status', ['confirmed', 'pending']);
        
        if (error && !error.message.includes('does not exist')) {
          console.error('Error fetching booked dates:', error);
        } else if (data) {
          setBookedDates(data);
        }
      } catch (err) {
        console.error('Error in fetchBookedDates:', err);
      }
    };

    fetchBookedDates();
  }, [destination?.id]);

  const isDateRangeAvailable = () => {
    if (!checkIn || !checkOut) return true;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    for (const period of bookedDates) {
      const pStart = new Date(period.check_in);
      const pEnd = new Date(period.check_out);
      
      // Check for overlap
      if (start < pEnd && end > pStart) {
        return false;
      }
    }
    return true;
  };

  const calculateTotal = () => {
    if (!checkIn || !checkOut || !destination) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;
    
    const subtotal = nights * destination.price;
    const serviceFee = (subtotal + cartTotal) * 0.25;
    return subtotal + cartTotal + serviceFee;
  };

  const handleBooking = async () => {
    if (!checkIn || !checkOut || !destination) {
      setBookingStatus('error');
      return;
    }

    if (!isDateRangeAvailable()) {
      setBookingStatus('error');
      alert('As datas selecionadas entram em conflito com reservas existentes. Por favor, escolha outro período.');
      return;
    }
    
    setBookingStatus('loading');
    try {
      // Check for conflicts
      const { data: existingBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('destination_id', destination.id)
        .lte('check_in', checkOut)
        .gte('check_out', checkIn);

      if (fetchError && !fetchError.message.includes('does not exist')) {
        console.warn('Could not check availability on client:', fetchError);
      } else if (existingBookings && existingBookings.length > 0) {
        setBookingStatus('error');
        alert('Estas datas já estão reservadas. Por favor, escolha outro período.');
        return;
      }

      // Navigate to checkout with data
      setTimeout(() => {
        setBookingStatus('success');
        navigate('/checkout', {
          state: {
            destination,
            checkIn,
            checkOut,
            total: calculateTotal()
          }
        });
      }, 800);
    } catch (err) {
      console.error('Booking error:', err);
      setBookingStatus('error');
    }
  };

  const handleDelete = async () => {
    if (!destination) return;
    console.log('Iniciando tentativa de exclusão do destino:', destination.id);

    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email?.toLowerCase();
    
    if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
      console.error('Tentativa de exclusão negada: Usuário não é administrador', userEmail);
      alert('Acesso negado. Apenas o administrador pode excluir anúncios.');
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este anúncio permanentemente? Isso removerá também todas as reservas associadas.')) {
      return;
    }

    try {
      setLoading(true);
      
      // First, try to delete associated bookings to avoid foreign key constraints
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('destination_id', destination.id);

      if (bookingsError && !bookingsError.message.includes('relation "bookings" does not exist')) {
        console.warn('Aviso ao excluir reservas:', bookingsError);
      }

      // Now delete the destination
      const { error } = await supabase
        .from('destinations')
        .delete()
        .eq('id', destination.id);

      if (error) throw error;
      
      alert('Anúncio excluído com sucesso!');
      navigate('/');
    } catch (err: any) {
      console.error('Erro ao excluir anúncio:', err);
      alert('Erro ao excluir anúncio: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta reserva?')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
      
      setBookedDates(prev => prev.filter(b => b.id !== bookingId));
      alert('Reserva excluída com sucesso!');
    } catch (err: any) {
      console.error('Erro ao excluir reserva:', err);
      alert('Erro ao excluir reserva: ' + err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-[10px] uppercase tracking-widest opacity-50">Carregando Santuário...</span>
    </div>
  );

  if (!destination) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-serif">Santuário não encontrado</h2>
      <Link to="/" className="text-[10px] uppercase tracking-widest border-b border-ink">Voltar para a Coleção</Link>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-6 py-12">
        <Link to="/" className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-50 mb-12 hover:opacity-100 transition-opacity">
          <ArrowLeft className="w-4 h-4" />
          Voltar para a Coleção
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div 
              className="relative aspect-[4/5] overflow-hidden cursor-zoom-in group"
              onClick={() => {
                const index = destination.images?.indexOf(selectedImage || destination.image) || 0;
                openLightbox(index >= 0 ? index : 0);
              }}
            >
              <img 
                src={selectedImage || destination.image} 
                alt={destination.title} 
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <Camera className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12" />
              </div>
              <div className="absolute top-8 left-8 bg-paper/90 backdrop-blur px-6 py-3 rounded-full flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-ink" />
                <span className="text-xs uppercase tracking-widest font-bold">
                  Sinal Zero Verificado
                </span>
              </div>
            </div>

            {destination.images && destination.images.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {destination.images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedImage(img)}
                    className={`aspect-square overflow-hidden bg-ink/5 border-2 transition-colors ${selectedImage === img ? 'border-ink' : 'border-transparent hover:border-ink/30'}`}
                  >
                    <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-ink/5 p-6">
                <ShieldCheck className="w-6 h-6 mb-4 opacity-40" />
                <h4 className="text-[10px] uppercase tracking-widest mb-2">Certificação</h4>
                <p className="text-xs opacity-70">Selo de Ouro Digital Detox</p>
              </div>
              <div className="bg-ink/5 p-6">
                <CalendarIcon className="w-6 h-6 mb-4 opacity-40" />
                <h4 className="text-[10px] uppercase tracking-widest mb-2">Disponibilidade</h4>
                <p className="text-xs opacity-70">Vagas Sazonais Curadas</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] opacity-50 mb-6">
                <MapPin className="w-4 h-4" />
                {destination.location}
              </div>
              <div className="flex justify-between items-start gap-4 mb-8">
                <h1 className="text-6xl md:text-7xl font-serif">{destination.title}</h1>
                {isAdmin && (
                  <button 
                    onClick={handleDelete}
                    className="mt-4 p-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all rounded-full shadow-sm"
                    title="Excluir Anúncio"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                )}
              </div>
              <p className="text-lg text-ink/70 leading-relaxed mb-12">
                {destination.description}
              </p>
              
              <div className="space-y-6 mb-12">
                <h4 className="text-[11px] uppercase tracking-widest opacity-50">Características do Santuário</h4>
                <ul className="grid grid-cols-2 gap-4">
                  {destination.features?.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-ink/20" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="border-t border-ink/10 pt-12">
              {destination.valor_venda ? (
                <div className="bg-white border border-ink/10 p-8">
                  <div className="mb-8">
                    <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Valor de Venda</span>
                    <span className="text-5xl font-serif italic text-green-700">R$ {destination.valor_venda.toLocaleString('pt-BR')}</span>
                  </div>

                  <h3 className="text-2xl font-serif mb-6">Tenho Interesse neste Imóvel</h3>
                  
                  {leadSuccess ? (
                    <div className="bg-green-50 text-green-700 p-6 rounded-lg text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                      <p className="font-bold text-lg mb-2">Mensagem enviada!</p>
                      <p className="text-sm">Recebemos seu interesse. Em breve entraremos em contato para agendar uma visita.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitLead} className="space-y-6">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Nome Completo</label>
                        <input 
                          required
                          type="text" 
                          value={leadForm.nome}
                          onChange={e => setLeadForm({...leadForm, nome: e.target.value})}
                          className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none"
                          placeholder="Seu nome completo"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">E-mail</label>
                        <input 
                          required
                          type="email" 
                          value={leadForm.email}
                          onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                          className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none"
                          placeholder="seu@email.com"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Telefone / WhatsApp</label>
                        <input 
                          required
                          type="tel" 
                          value={leadForm.telefone}
                          onChange={e => setLeadForm({...leadForm, telefone: e.target.value})}
                          className="w-full bg-ink/5 border-none p-4 text-sm focus:ring-1 focus:ring-ink outline-none"
                          placeholder="(00) 00000-0000"
                        />
                      </div>

                      {leadError && (
                        <p className="text-red-500 text-xs text-center">{leadError}</p>
                      )}

                      <button 
                        type="submit"
                        disabled={leadLoading}
                        className="w-full py-6 bg-green-600 text-white text-sm uppercase tracking-[0.3em] hover:bg-green-700 transition-all disabled:opacity-50 font-bold"
                      >
                        {leadLoading ? 'Enviando...' : 'Enviar Interesse'}
                      </button>
                    </form>
                  )}
                  
                  <p className="text-center text-[10px] uppercase tracking-widest opacity-40 mt-8">
                    * Ao enviar, você concorda em ser contatado por nossa equipe de vendas.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-8 p-6 bg-white border border-ink/10">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold">Calendário de Disponibilidade</h4>
                      <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-ink/5 rounded">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-serif italic capitalize">
                          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-ink/5 rounded">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                        <div key={idx} className="text-[8px] text-center opacity-40 font-bold">{day}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const start = startOfWeek(startOfMonth(currentMonth));
                        const end = endOfWeek(endOfMonth(currentMonth));
                        const days = eachDayOfInterval({ start, end });

                        return days.map(day => {
                          const isCurrentMonth = isSameDay(startOfMonth(day), startOfMonth(currentMonth));
                          const reserved = isDateReserved(day);
                          const selected = isDateSelected(day);
                          const isToday = isSameDay(day, startOfToday());
                          const isPast = isBefore(day, startOfToday()) && !isToday;

                          return (
                            <button
                              key={day.toString()}
                              onClick={() => handleDateClick(day)}
                              disabled={isPast || reserved}
                              className={`
                                aspect-square flex items-center justify-center text-[10px] transition-all relative
                                ${!isCurrentMonth ? 'opacity-10' : 'opacity-100'}
                                ${reserved ? 'bg-blue-500 text-white cursor-not-allowed' : ''}
                                ${selected ? 'bg-ink text-paper z-10' : ''}
                                ${!reserved && !selected && !isPast ? 'hover:bg-ink/5' : ''}
                                ${isPast ? 'opacity-20 cursor-not-allowed' : ''}
                                ${isToday && !selected ? 'border border-ink/20' : ''}
                              `}
                            >
                              {format(day, 'd')}
                              {reserved && (
                                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-full border border-white" />
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-ink/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500" />
                        <span className="text-[8px] uppercase tracking-widest opacity-50">Reservado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-ink" />
                        <span className="text-[8px] uppercase tracking-widest opacity-50">Sua Seleção</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 border border-ink/20" />
                        <span className="text-[8px] uppercase tracking-widest opacity-50">Hoje</span>
                      </div>
                    </div>
                  </div>

                  {bookedDates.length > 0 && (
                    <div className="mb-8 p-6 bg-ink/5 border border-ink/10">
                      <h4 className="text-[10px] uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-3 h-3" /> Datas Indisponíveis
                      </h4>
                      <ul className="space-y-3">
                        {bookedDates.map((period, idx) => {
                          // Adding timezone offset to prevent date shifting
                          const start = new Date(period.check_in + 'T12:00:00Z').toLocaleDateString('pt-BR');
                          const end = new Date(period.check_out + 'T12:00:00Z').toLocaleDateString('pt-BR');
                          return (
                            <li key={idx} className="text-xs opacity-70 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70" />
                                {start} até {end}
                              </div>
                              {isAdmin && (
                                <button 
                                  onClick={() => handleDeleteBooking(period.id)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Excluir Reserva"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Check-in</label>
                      <input 
                        type="date" 
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full bg-ink/5 border-none p-3 text-sm focus:ring-1 focus:ring-ink outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Check-out</label>
                      <input 
                        type="date" 
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full bg-ink/5 border-none p-3 text-sm focus:ring-1 focus:ring-ink outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest opacity-50 block">Preço por noite</span>
                      <span className="text-4xl font-serif italic">${destination.price}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-widest opacity-50 block">Total (incl. taxa de 15%)</span>
                      <span className="text-2xl font-serif italic">
                        {calculateTotal() > 0 ? `$${calculateTotal().toFixed(2)}` : '--'}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleBooking}
                    disabled={!isDateRangeAvailable()}
                    className="w-full py-6 bg-ink text-paper text-sm uppercase tracking-[0.3em] hover:bg-ink/90 transition-all disabled:opacity-50"
                  >
                    {bookingStatus === 'loading' ? 'Processando...' : 'Solicitar Reserva'}
                  </button>

                  {!isDateRangeAvailable() && (
                    <p className="text-center text-red-600 text-[10px] uppercase tracking-widest mt-4">
                      Período indisponível. Conflito com reservas existentes.
                    </p>
                  )}
                  {bookingStatus === 'error' && (!checkIn || !checkOut) && (
                    <p className="text-center text-red-600 text-[10px] uppercase tracking-widest mt-4">
                      Por favor, selecione as datas de check-in e check-out.
                    </p>
                  )}
                  {bookingStatus === 'error' && checkIn && checkOut && (
                    <p className="text-center text-red-600 text-[10px] uppercase tracking-widest mt-4">
                      Erro ao processar reserva. Tente novamente.
                    </p>
                  )}

                  <p className="text-center text-[10px] uppercase tracking-widest opacity-40 mt-4">
                    * Todas as reservas incluem uma orientação obrigatória livre de dispositivos.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      
      <Footer />

      {/* Lightbox Modal */}
      {isLightboxOpen && destination?.images && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            className="absolute top-8 right-8 text-white hover:scale-110 transition-transform z-[110]"
            onClick={() => setIsLightboxOpen(false)}
          >
            <X className="w-10 h-10" />
          </button>

          <button 
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-[110]"
            onClick={prevImage}
          >
            <ChevronLeft className="w-12 h-12 md:w-16 md:h-16" />
          </button>

          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <motion.img 
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={destination.images[lightboxIndex]} 
              alt={`Gallery Full ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />
            
            <div className="absolute bottom-[-40px] left-0 right-0 text-center text-white/60 text-xs uppercase tracking-widest">
              Imagem {lightboxIndex + 1} de {destination.images.length}
            </div>
          </div>

          <button 
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-[110]"
            onClick={nextImage}
          >
            <ChevronRight className="w-12 h-12 md:w-16 md:h-16" />
          </button>
        </div>
      )}
    </div>
  );
};
