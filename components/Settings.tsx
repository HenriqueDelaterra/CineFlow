
import React, { useRef, useState } from 'react';
import { useUser } from '../UserContext';

const Settings: React.FC = () => {
  const { user, updateUser } = useUser();
  
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { if (typeof reader.result === 'string') { updateUser({ avatar: reader.result }); } };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
      if (!name || !email) { alert("Nome e Email são obrigatórios"); return; }
      updateUser({ name, email }); alert("Perfil atualizado com sucesso!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
      <div><h1 className="text-3xl font-bold text-white font-display">Configurações</h1><p className="text-text-muted mt-1">Gerencie suas preferências e dados do sistema.</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            
            <div className="glass-panel rounded-[30px] border border-white/5 p-8">
                <h3 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-4">Informações Pessoais</h3>
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full bg-cover bg-center border-4 border-surface-light shadow-inner" style={{ backgroundImage: `url('${user.avatar}')` }}></div>
                            <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium backdrop-blur-sm"><span className="material-symbols-outlined text-3xl">photo_camera</span></div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} className="text-sm text-primary font-bold hover:underline uppercase tracking-wide">Alterar Foto</button>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                        <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Nome de Exibição</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Email Principal</label><input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-surface-light/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                        <div className="pt-2 flex justify-end"><button onClick={handleSaveProfile} className="px-6 py-2 bg-primary hover:bg-primary-hover text-black rounded-xl font-bold shadow-neon active:scale-95 transition-all">Salvar Alterações</button></div>
                    </div>
                </div>
            </div>

        </div>

        <div className="space-y-6">
            <div className="glass-panel rounded-[30px] border border-white/5 p-8">
                <h3 className="text-lg font-bold text-white mb-4">Aparência</h3>
                <p className="text-sm text-text-muted mb-6">O CineFlow utiliza um tema Neon Dark exclusivo para melhor experiência visual.</p>
                <div className="w-full h-32 bg-[#0e1015] rounded-xl border border-primary/30 flex flex-col overflow-hidden relative shadow-neon-sm"><div className="h-3 w-full bg-surface-light border-b border-white/5"></div><div className="flex-1 flex"><div className="w-6 bg-surface-light border-r border-white/5"></div><div className="flex-1 p-3"><div className="w-12 h-2 bg-white/10 rounded mb-2"></div><div className="w-full h-12 bg-gradient-to-r from-surface-light to-transparent rounded border border-white/5"></div></div></div><div className="absolute bottom-2 right-2 text-primary flex items-center gap-1 text-xs font-bold uppercase"><span className="material-symbols-outlined text-[16px]">check_circle</span> Ativo</div></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
