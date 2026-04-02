import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-ink text-paper py-24">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-24">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-4xl font-serif mb-8 tracking-widest uppercase">Hub Temporada</h2>
            <p className="max-w-sm opacity-60 text-sm leading-relaxed">
              Acreditamos que em 2026, o luxo supremo não é mais velocidade, mas mais presença. Junte-se à nossa comunidade de buscadores.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-widest mb-6 opacity-40">Navegação</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/" className="hover:opacity-60 transition-opacity">Destinos</Link></li>
              <li><Link to="/anunciar" className="hover:opacity-60 transition-opacity">Anuncie sua Propriedade</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-widest mb-6 opacity-40">Contato</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:opacity-60 transition-opacity">Concierge</a></li>
              <li><a href="#" className="hover:opacity-60 transition-opacity">Imprensa</a></li>
              <li><a href="#" className="hover:opacity-60 transition-opacity">Parcerias</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-12 border-t border-paper/10 flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="text-[10px] uppercase tracking-widest opacity-40">
            © 2026 Hub Temporada. Todos os direitos reservados.
          </span>
          <div className="flex gap-8">
            <span className="text-[10px] uppercase tracking-widest opacity-40">Termos</span>
            <span className="text-[10px] uppercase tracking-widest opacity-40">Privacidade</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
