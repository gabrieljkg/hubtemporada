import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Destination } from '../data/mockData';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { motion } from 'motion/react';
import { WifiOff, ShieldCheck, Calendar as CalendarIcon, MapPin, ArrowLeft, Camera, Notebook, Map as MapIcon, Plus, Trash2, ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAdmin, ADMIN_EMAILS } from '../hooks/useAdmin';
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
    
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
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
                <p className="text-xs opacity-70">Aberto o ano todo</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="mb-12">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-50 mb-4">
                <MapPin className="w-3 h-3" />
                {destination.location}
              </div>
              <h1 className="text-5xl font-serif mb-6">{destination.title}</h1>
              <p className="text-ink/70 leading-relaxed">
                {destination.description}
              </p>
            </div>

            {/* Renderiza o formulário de interesse SE for imóvel de venda */}
            {destination.valor_venda ? (
              <div className="bg-ink/5 p-8 mt-auto">
                <h3 className="text-2xl font-serif mb-2">Tenho Interesse</h3>
                <p className="text-sm opacity-60 mb-6">
                  Preencha seus dados abaixo e entraremos em contato sobre o imóvel <strong>{destination.title}</strong>.
                </p>

                {leadSuccess ? (
                  <div className="bg-green-50 text-green-700 p-6 rounded-lg text-center">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-bold mb-1">Mensagem enviada com sucesso!</p>
                    <p className="text-sm">Em breve nossa equipe entrará em contato.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitLead} className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Nome Completo</label>
                      <input 
                        required
                        type="text" 
                        value={leadForm.nome}
                        onChange={e => setLeadForm({...leadForm, nome: e.target.value})}
                        className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink rounded"
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">E-mail</label>
                      <input 
                        required
                        type="email" 
                        value={leadForm.email}
                        onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                        className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink rounded"
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Telefone / WhatsApp</label>
                      <input 
                        required
                        type="tel" 
                        value={leadForm.telefone}
                        onChange={e => setLeadForm({...leadForm, telefone: e.target.value})}
                        className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink rounded"
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    {leadError && (
                      <p className="text-red-500 text-xs text-center">{leadError}</p>
                    )}

                    <button 
                      type="submit"
                      disabled={leadLoading}
                      className="w-full bg-green-600 text-white py-4 text-[10px] uppercase tracking-widest font-bold hover:bg-green-700 transition-colors rounded mt-4 disabled:opacity-50"
                    >
                      {leadLoading ? 'Enviando...' : 'Enviar Interesse'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Renderiza o calendário SE for imóvel de aluguel */
              <div className="bg-ink/5 p-8 mt-auto">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm uppercase tracking-widest font-bold">Selecione as Datas</h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 hover:bg-ink/10 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium min-w-[100px] text-center">
                      {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button 
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-2 hover:bg-ink/10 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-[10px] uppercase tracking-widest opacity-50 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 mb-8">
                  {eachDayOfInterval({
                    start: startOfWeek(startOfMonth(currentMonth)),
                    end: endOfWeek(endOfMonth(currentMonth))
                  }).map((date, i) => {
                    const isSelected = isDateSelected(date);
                    const isReserved = isDateReserved(date);
                    const isPast = isBefore(date, startOfToday());
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

                    return (
                      <button
                        key={i}
                        disabled={isReserved || isPast}
                        onClick={() => handleDateClick(date)}
                        className={`
                          aspect-square flex items-center justify-center text-sm transition-all
                          ${!isCurrentMonth ? 'opacity-20' : ''}
                          ${isPast ? 'opacity-20 cursor-not-allowed' : ''}
                          ${isReserved ? 'bg-red-50 text-red-300 cursor-not-allowed line-through' : ''}
                          ${isSelected ? 'bg-ink text-paper' : 'hover:bg-ink/10'}
                          ${!isReserved && !isPast && !isSelected ? 'cursor-pointer' : ''}
                        `}
                      >
                        {format(date, 'd')}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-ink/10 pt-8">
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
                      Por favor, selecione datas válidas
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {isAdmin && (
              <div className="mt-8 pt-8 border-t border-ink/10">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-red-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Área do Administrador
                </h3>
                
                <button
                  onClick={handleDelete}
                  className="w-full py-4 border-2 border-red-600 text-red-600 text-sm uppercase tracking-widest hover:bg-red-50 transition-colors flex items-center justify-center gap-2 font-bold"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Anúncio Permanentemente
                </button>

                {/* Mostra reservas apenas se for imóvel de aluguel */}
                {!destination.valor_venda && bookedDates.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-4">Reservas Ativas neste Imóvel</h4>
                    <div className="space-y-2">
                      {bookedDates.map(booking => (
                        <div key={booking.id} className="flex items-center justify-between bg-white p-3 border border-ink/10 rounded text-sm">
                          <div>
                            <span className="font-medium">{format(parseISO(booking.check_in), 'dd/MM/yyyy')}</span>
                            <span className="mx-2 opacity-50">até</span>
                            <span className="font-medium">{format(parseISO(booking.check_out), 'dd/MM/yyyy')}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Cancelar Reserva"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Lightbox Modal */}
      {isLightboxOpen && destination.images && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
          <button 
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-50"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="absolute top-6 left-6 text-white/50 text-sm tracking-widest uppercase">
            Imagem {lightboxIndex + 1} de {destination.images.length}
          </div>

          <button 
            onClick={prevImage}
            className="absolute left-6 text-white/50 hover:text-white transition-colors p-4 z-50"
          >
            <ChevronLeft className="w-12 h-12" />
          </button>

          <img 
            src={destination.images[lightboxIndex]} 
            alt="Gallery Fullscreen" 
            className="max-h-[90vh] max-w-[90vw] object-contain"
            referrerPolicy="no-referrer"
          />

          <button 
            onClick={nextImage}
            className="absolute right-6 text-white/50 hover:text-white transition-colors p-4 z-50"
          >
            <ChevronRight className="w-12 h-12" />
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
};
