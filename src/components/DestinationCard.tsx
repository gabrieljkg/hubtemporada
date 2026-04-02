import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, WifiOff, Trash2, X } from 'lucide-react';
import { Destination } from '../data/mockData';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Props {
  destination: Destination;
  isAdmin?: boolean;
  onDelete?: (id: string | number) => void;
  key?: string | number;
}

export const DestinationCard = ({ destination, isAdmin, onDelete }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = destination.images && destination.images.length > 0 
    ? destination.images 
    : [destination.image];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (images.length <= 1) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const segmentWidth = width / images.length;
    const index = Math.floor(x / segmentWidth);
    
    if (index >= 0 && index < images.length && index !== currentImageIndex) {
      setCurrentImageIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setCurrentImageIndex(0);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && window.confirm('Tem certeza que deseja excluir este anúncio?')) {
      onDelete(destination.id);
    }
  };

  const handleInterestClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Salvar no Supabase (Tabela leads_vendas)
      const { error: supabaseError } = await supabase
        .from('leads_vendas')
        .insert([{
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          imovel_id: String(destination.id),
          imovel_titulo: destination.title
        }]);

      if (supabaseError) {
        console.error('Erro ao salvar lead no Supabase:', supabaseError);
        // Não vamos travar o envio do email se o supabase falhar, mas logamos o erro.
      }

      // 2. Enviar Email via FormSubmit (AJAX)
      const response = await fetch("https://formsubmit.co/ajax/gabrielcalid@gmail.com", {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            _subject: `Novo Interesse de Compra: ${destination.title}`,
            Imóvel: destination.title,
            Valor: destination.valor_venda ? `R$ ${destination.valor_venda}` : 'Não informado',
            Nome: formData.nome,
            Email: formData.email,
            Telefone: formData.telefone,
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar o e-mail.');
      }

      setSuccess(true);
      setFormData({ nome: '', email: '', telefone: '' });
      
      // Fechar modal após 3 segundos
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
      }, 3000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao enviar seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div 
        whileHover={{ y: -10 }}
        className="group relative"
      >
        {isAdmin && (
          <button 
            onClick={handleDelete}
            className="absolute top-4 left-4 z-20 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
            title="Excluir Anúncio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <Link to={`/imovel/${destination.id}/${destination.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
          <div 
            className="relative aspect-[3/4] overflow-hidden mb-6 cursor-pointer"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <img 
              src={images[currentImageIndex]} 
              alt={destination.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            
            {/* Indicadores de Imagem (Barrinhas no topo) */}
            {images.length > 1 && (
              <div className="absolute top-2 left-0 right-0 flex gap-1 px-2 z-10 pointer-events-none">
                {images.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1 flex-1 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30'}`}
                  />
                ))}
              </div>
            )}

            <div className="absolute top-4 right-4 bg-paper/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-2">
              <WifiOff className="w-3 h-3 text-ink" />
              <span className="text-[9px] uppercase tracking-wider font-semibold">
                {destination.signalStrength === 0 ? 'Sinal Zero' : 'Detox Radical'}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-ink/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
              <div 
                className="w-full py-3 bg-paper text-ink text-[10px] uppercase tracking-widest text-center hover:bg-white transition-colors"
              >
                Ver Detalhes
              </div>
              <div 
                className="w-full py-3 bg-ink text-paper text-[10px] uppercase tracking-widest text-center hover:bg-ink/90 transition-colors"
              >
                Reservar Agora
              </div>
              {destination.valor_venda && (
                <button 
                  onClick={handleInterestClick}
                  className="w-full py-3 bg-green-600 text-white text-[10px] uppercase tracking-widest text-center hover:bg-green-700 transition-colors"
                >
                  Tenho Interesse
                </button>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest opacity-50 mb-1">
                <MapPin className="w-3 h-3" />
                {destination.location}
              </div>
              <h3 className="text-xl mb-2">{destination.title}</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-widest opacity-50 block">A partir de</span>
              <span className="text-lg font-serif italic">${destination.price}</span>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Modal de Interesse */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-paper p-8 rounded-xl w-full max-w-md relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-ink/50 hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-2xl font-serif mb-2">Tenho Interesse</h3>
              <p className="text-sm opacity-60 mb-6">
                Preencha seus dados abaixo e entraremos em contato sobre o imóvel <strong>{destination.title}</strong>.
              </p>

              {success ? (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center">
                  <p className="font-bold mb-1">Mensagem enviada!</p>
                  <p className="text-sm">Em breve entraremos em contato.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitLead} className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={formData.nome}
                      onChange={e => setFormData({...formData, nome: e.target.value})}
                      className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink rounded"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">E-mail</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink rounded"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Telefone / WhatsApp</label>
                    <input 
                      required
                      type="tel" 
                      value={formData.telefone}
                      onChange={e => setFormData({...formData, telefone: e.target.value})}
                      className="w-full bg-white border border-ink/10 p-3 text-sm outline-none focus:ring-1 focus:ring-ink rounded"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-red-500 text-xs text-center">{errorMsg}</p>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-ink text-paper py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-ink/90 transition-colors rounded mt-2 disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar Interesse'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
