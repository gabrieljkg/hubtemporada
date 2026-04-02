import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { DestinationCard } from '../components/DestinationCard';
import { Destination } from '../data/mockData';
import { motion } from 'motion/react';
import { Footer } from '../components/Footer';
import { supabase } from '../lib/supabase';
import { useAdmin, ADMIN_EMAIL } from '../hooks/useAdmin';

export const Home = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';
  const { isAdmin } = useAdmin();

  // Sales filters
  const [cidadeFilter, setCidadeFilter] = useState('');
  const [bairroFilter, setBairroFilter] = useState('');
  const [quartosFilter, setQuartosFilter] = useState('');
  const [valorMaxFilter, setValorMaxFilter] = useState('');
  const [isSalesMode, setIsSalesMode] = useState(false);

  const filteredDestinations = destinations.filter(dest => {
    if (isSalesMode) {
      return true; // Filtering is done in Supabase query
    } else {
      // Normal search mode
      return dest.title.toLowerCase().includes(searchQuery) || 
             dest.location.toLowerCase().includes(searchQuery) ||
             dest.description.toLowerCase().includes(searchQuery) ||
             dest.tags.some(tag => tag.toLowerCase().includes(searchQuery));
    }
  });

  useEffect(() => {
    document.title = "AlugaAki - Aluguel de Temporada em Uberlândia | Chácaras para eventos";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Encontre as melhores chácaras para eventos e casas para aluguel de temporada em Uberlândia. Anuncie seu imóvel ou reserve sua próxima estadia com o AlugaAki.');
    }
    fetchDestinations();
  }, [isSalesMode]);

  const fetchDestinations = async () => {
    try {
      setError(null);
      console.log('Buscando destinos no Supabase...');
      
      let query;
      
      if (isSalesMode) {
        query = supabase.from('imoveis').select('*');
        
        if (cidadeFilter) {
          // Assuming imoveis table might not have location, but we can search by bairro or titulo
          query = query.ilike('bairro', `%${cidadeFilter}%`);
        }
        if (bairroFilter) {
          query = query.ilike('bairro', `%${bairroFilter}%`);
        }
        if (quartosFilter) {
          query = query.gte('quartos', parseInt(quartosFilter));
        }
        if (valorMaxFilter) {
          query = query.lte('valor', parseInt(valorMaxFilter));
        }
      } else {
        query = supabase.from('destinations').select('*');
      }
      
      const { data, error: supabaseError } = await query;
      
      if (supabaseError) {
        console.error('ERRO TÉCNICO SUPABASE (Home):', {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code
        });
        setError(supabaseError.message);
        throw supabaseError;
      }
      if (data) {
        console.log('Destinos carregados com sucesso:', data.length);
        // Map data to match Destination interface
        const mappedData = data.map((item: any) => {
          if (isSalesMode) {
            return {
              id: item.id,
              title: item.titulo || 'Sem Título',
              location: item.bairro || 'Localização não informada',
              description: 'Imóvel disponível para venda.',
              price: 0,
              signalStrength: 0,
              image: Array.isArray(item.image_url) ? (item.image_url[0] || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000') : (item.image_url || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000'),
              images: Array.isArray(item.image_url) ? item.image_url : [item.image_url],
              tags: [],
              features: [],
              valor_venda: item.valor,
              bairro: item.bairro,
              quantidade_quartos: item.quartos,
              status_venda: item.status_venda
            };
          } else {
            return {
              id: item.id,
              title: item.title || 'Sem Título',
              location: item.location || 'Localização não informada',
              description: item.description || '',
              price: item.price_per_night || item.price || 0,
              signalStrength: item.isolation_level !== undefined ? item.isolation_level : (item.signalStrength || 0),
              image: Array.isArray(item.image) ? (item.image[0] || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000') : (item.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000'),
              tags: item.tags || [],
              features: item.features || [],
              valor_venda: item.valor_venda,
              bairro: item.bairro,
              quantidade_quartos: item.quantidade_quartos,
              status_venda: item.status_venda
            };
          }
        });
        setDestinations(mappedData);
      }
    } catch (err: any) {
      console.error('Erro ao carregar destinos:', err);
      setError(err.message || 'Falha na conexão com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    console.log('Iniciando tentativa de exclusão do destino:', id);
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email?.toLowerCase();
    
    if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
      console.error('Tentativa de exclusão negada: Usuário não é administrador', userEmail);
      alert('Acesso negado. Apenas o administrador pode excluir anúncios.');
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este anúncio? Isso removerá também todas as reservas associadas.')) {
      return;
    }

    try {
      setLoading(true);
      
      // First, try to delete associated bookings to avoid foreign key constraints
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('destination_id', id);

      if (bookingsError && !bookingsError.message.includes('relation "bookings" does not exist')) {
        console.warn('Aviso ao excluir reservas:', bookingsError);
      }

      // Now delete the destination
      const { error: deleteError } = await supabase
        .from('destinations')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      // Update local state
      setDestinations(prev => prev.filter(d => d.id !== id));
      alert('Anúncio excluído com sucesso!');
    } catch (err: any) {
      console.error('Erro ao excluir anúncio:', err);
      alert('Erro ao excluir anúncio: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      
      {/* Destinations Section */}
      <section className="py-24 container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-8">
          <div>
            <span className="text-[11px] uppercase tracking-[0.3em] opacity-50 mb-4 block">Santuários Curados</span>
            <h2 className="text-5xl md:text-6xl font-serif">Imóveis Premium Connect</h2>
          </div>
          <div className="max-w-xs text-sm text-ink/60 leading-relaxed">
            Cada local é verificado via dados de satélite para garantir conectividade zero. Sem Wi-Fi. Sem sinal. Apenas você.
          </div>
        </div>

        {/* Search Toggle & Sales Form */}
        <div className="mb-16 bg-ink/5 p-6 rounded-lg">
          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => setIsSalesMode(false)}
              className={`px-6 py-2 text-sm uppercase tracking-widest font-bold transition-colors ${!isSalesMode ? 'bg-ink text-paper' : 'bg-transparent text-ink border border-ink/20'}`}
            >
              Aluguel
            </button>
            <button 
              onClick={() => setIsSalesMode(true)}
              className={`px-6 py-2 text-sm uppercase tracking-widest font-bold transition-colors ${isSalesMode ? 'bg-ink text-paper' : 'bg-transparent text-ink border border-ink/20'}`}
            >
              Comprar Imóvel
            </button>
          </div>

          {isSalesMode && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Cidade</label>
                <input 
                  type="text" 
                  value={cidadeFilter}
                  onChange={(e) => setCidadeFilter(e.target.value)}
                  placeholder="Ex: Uberlândia"
                  className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Bairro</label>
                <input 
                  type="text" 
                  value={bairroFilter}
                  onChange={(e) => setBairroFilter(e.target.value)}
                  placeholder="Ex: Zona Sul"
                  className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Qtd. Quartos (Mínimo)</label>
                <input 
                  type="number" 
                  value={quartosFilter}
                  onChange={(e) => setQuartosFilter(e.target.value)}
                  placeholder="Ex: 3"
                  min="0"
                  className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Valor Máximo (R$)</label>
                <input 
                  type="number" 
                  value={valorMaxFilter}
                  onChange={(e) => setValorMaxFilter(e.target.value)}
                  placeholder="Ex: 500000"
                  min="0"
                  className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => fetchDestinations()}
                  className="w-full bg-ink text-paper py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-ink/90 transition-colors"
                >
                  Buscar Vendas
                </button>
              </div>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="text-[10px] uppercase tracking-widest opacity-50">Carregando Santuários...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 border border-red-100 bg-red-50/30 rounded-lg">
            <span className="text-[10px] uppercase tracking-widest text-red-600 mb-2">Erro de Conexão</span>
            <p className="text-xs text-red-500 font-mono mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-ink text-paper text-[10px] uppercase tracking-widest"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {filteredDestinations.length > 0 ? (
              filteredDestinations.map((dest) => (
                <DestinationCard 
                  key={dest.id} 
                  destination={dest} 
                  isAdmin={isAdmin}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className="text-xl font-serif mb-4">Nenhum santuário encontrado para "{searchQuery}"</p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="text-[10px] uppercase tracking-widest border-b border-ink pb-1"
                >
                  Ver Todos os Santuários
                </button>
              </div>
            )}
          </div>
        )}
      </section>
      
      <Footer />
    </div>
  );
};
