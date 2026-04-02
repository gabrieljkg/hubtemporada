import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

export const Hero = () => {
  return (
    <header className="relative h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2000" 
          alt="Mountain Landscape" 
          className="w-full h-full object-cover opacity-80"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-paper/20 via-transparent to-paper"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[11px] uppercase tracking-[0.4em] mb-6 block">
              O Marketplace Premium para Desconexão Radical
            </span>
            <h1 className="text-[8vw] md:text-[5vw] leading-[1.1] font-serif font-light mb-8">
              Do silêncio da chácara ao conforto da cidade: <br />
              <span className="italic text-[6vw] md:text-[4vw]">seu momento de pausa está aqui.</span>
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <button className="px-10 py-5 bg-ink text-paper rounded-full text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-ink/90 transition-all group">
                Encontre seu santuário
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="flex items-center gap-4 border-l border-ink/20 pl-6 h-12">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-paper overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] uppercase tracking-wider opacity-60">
                  Mais de 1.200 buscadores <br /> desconectados este mês
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      <div className="absolute right-12 bottom-12 hidden lg:flex flex-col items-center gap-8">
        <span className="vertical-text text-[10px] uppercase tracking-[0.3em] opacity-40">
          Role para descobrir
        </span>
        <div className="w-px h-24 bg-ink/20 relative overflow-hidden">
          <motion.div 
            animate={{ y: [0, 96] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-1/2 bg-ink"
          />
        </div>
      </div>
    </header>
  );
};
