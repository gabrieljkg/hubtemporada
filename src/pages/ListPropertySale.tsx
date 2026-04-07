import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const ListPropertySale = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    cidade: '',
    bairro: '',
    quartos: '',
    valor_venda: ''
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    document.title = "Cadastrar Imóvel para Venda - Hub Temporada";
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    
    if (imageFiles.length + files.length > 10) {
      alert('Você pode enviar no máximo 10 fotos.');
      return;
    }

    setImageFiles(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    if (!formData.title || !formData.bairro || !formData.quartos || !formData.valor_venda || imageFiles.length === 0) {
      setErrorMsg('Por favor, preencha todos os campos e selecione pelo menos uma imagem.');
      setLoading(false);
      return;
    }

    try {
      const uploadedUrls: string[] = [];

      // 1. Upload all images to Supabase Storage
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `sale_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `sales/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('imoveis')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('imoveis')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      }

      // 2. Save to imoveis table
      const payload = {
        titulo: formData.title,
        cidade: formData.cidade,
        bairro: formData.bairro,
        quartos: parseInt(formData.quartos),
        valor: parseFloat(formData.valor_venda),
        image_url: uploadedUrls // Array of URLs
      };

      const { error: insertError } = await supabase
        .from('imoveis')
        .insert([payload]);

      if (insertError) {
        throw new Error(`Erro ao salvar no banco de dados: ${insertError.message}`);
      }

      setSuccess(true);
      setFormData({ title: '', cidade: '', bairro: '', quartos: '', valor_venda: '' });
      setImageFiles([]);
      setImagePreviews([]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro inesperado ao cadastrar imóvel.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-paper px-4 text-center">
        <CheckCircle className="w-16 h-16 text-green-600" />
        <h2 className="text-3xl font-serif">Imóvel Cadastrado com Sucesso!</h2>
        <p className="text-sm opacity-60 max-w-md">
          Seu imóvel para venda foi salvo no banco de dados e as imagens foram carregadas no Storage.
        </p>
        <div className="flex gap-4 mt-4">
          <button 
            onClick={() => setSuccess(false)}
            className="px-6 py-3 bg-ink text-paper text-[10px] uppercase tracking-widest font-bold hover:bg-ink/90 transition-colors"
          >
            Cadastrar Novo
          </button>
          <Link 
            to="/"
            className="px-6 py-3 border border-ink text-ink text-[10px] uppercase tracking-widest font-bold hover:bg-ink/5 transition-colors"
          >
            Voltar para Início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm opacity-60 hover:opacity-100 mb-8 transition-opacity">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <h1 className="text-3xl font-serif mb-2 text-center">Cadastrar Imóvel para Venda</h1>
        <p className="text-center text-sm opacity-60 mb-8">Preencha os dados abaixo para anunciar seu imóvel para venda.</p>
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-ink/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Título do Imóvel *</label>
              <input 
                required 
                type="text" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Ex: Casa com Piscina" 
                className="w-full bg-ink/5 border-none p-3 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Cidade *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.cidade} 
                  onChange={e => setFormData({...formData, cidade: e.target.value})} 
                  placeholder="Ex: Uberlândia" 
                  className="w-full bg-ink/5 border-none p-3 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Bairro *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.bairro} 
                  onChange={e => setFormData({...formData, bairro: e.target.value})} 
                  placeholder="Ex: Zona Sul" 
                  className="w-full bg-ink/5 border-none p-3 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Quantidade de Quartos *</label>
                <input 
                  required 
                  type="number" 
                  min="0"
                  value={formData.quartos} 
                  onChange={e => setFormData({...formData, quartos: e.target.value})} 
                  placeholder="Ex: 3" 
                  className="w-full bg-ink/5 border-none p-3 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Valor Total do Imóvel (R$) *</label>
                <input 
                  required 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.valor_venda} 
                  onChange={e => setFormData({...formData, valor_venda: e.target.value})} 
                  placeholder="Ex: 500000" 
                  className="w-full bg-ink/5 border-none p-3 rounded-lg text-sm focus:ring-2 focus:ring-ink outline-none" 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><Camera className="w-3 h-3" /> Imagens do Local (Máx 10) *</span>
                <span>{imageFiles.length}/10</span>
              </label>
              <div className="bg-ink/5 p-4 space-y-4 rounded-lg">
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-square rounded overflow-hidden bg-ink/10 group">
                        <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 bg-ink/50 text-paper flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold uppercase tracking-widest"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imageFiles.length < 10 && (
                  <div className="border-2 border-dashed border-ink/20 rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-ink/10 transition-colors">
                    <Upload className="w-8 h-8 opacity-40 mb-2" />
                    <span className="text-sm font-medium mb-1">Clique para selecionar imagens</span>
                    <span className="text-xs opacity-50 mb-4">PNG, JPG, GIF até 5MB</span>
                    <input 
                      required={imageFiles.length === 0}
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                {errorMsg}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-ink text-paper rounded-lg text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 font-medium mt-4 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full animate-spin"></div>
                  Carregando...
                </>
              ) : (
                'Cadastrar Imóvel'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
