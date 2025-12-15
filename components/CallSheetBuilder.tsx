
import React, { useState, useEffect, useRef } from 'react';
import { CallSheet, ScheduleItem, CrewMember, WeatherData } from '../types';
import { useContacts } from '../ContactsContext';

// Coordenadas aproximadas para API de Clima (Fallback)
const CITY_COORDS: Record<string, { lat: number; long: number }> = {
    'São Paulo': { lat: -23.5505, long: -46.6333 },
    'Rio de Janeiro': { lat: -22.9068, long: -43.1729 },
    'Belo Horizonte': { lat: -19.9167, long: -43.9345 },
    'Salvador': { lat: -12.9777, long: -38.5016 },
    'Brasília': { lat: -15.7801, long: -47.9292 },
    'Curitiba': { lat: -25.4284, long: -49.2733 },
    'Recife': { lat: -8.05428, long: -34.8813 },
    'Porto Alegre': { lat: -30.0346, long: -51.2177 },
    'Fortaleza': { lat: -3.71722, long: -38.5434 },
    'Manaus': { lat: -3.11903, long: -60.0217 },
    'Florianópolis': { lat: -27.5954, long: -48.548 },
};

// Mapa de códigos WMO para ícones/descrições
const WEATHER_CODES: Record<number, { desc: string; icon: string }> = {
    0: { desc: 'Céu Limpo', icon: 'sunny' },
    1: { desc: 'Predom. Ensolarado', icon: 'partly_cloudy_day' },
    2: { desc: 'Parcialmente Nublado', icon: 'partly_cloudy_day' },
    3: { desc: 'Nublado', icon: 'cloud' },
    45: { desc: 'Neblina', icon: 'foggy' },
    48: { desc: 'Neblina com Geada', icon: 'foggy' },
    51: { desc: 'Garoa Leve', icon: 'rainy' },
    53: { desc: 'Garoa Moderada', icon: 'rainy' },
    55: { desc: 'Garoa Densa', icon: 'rainy' },
    61: { desc: 'Chuva Leve', icon: 'rainy' },
    63: { desc: 'Chuva Moderada', icon: 'rainy' },
    65: { desc: 'Chuva Forte', icon: 'thunderstorm' },
    80: { desc: 'Pancadas de Chuva', icon: 'rainy' },
    95: { desc: 'Tempestade', icon: 'thunderstorm' },
    96: { desc: 'Tempestade com Granizo', icon: 'thunderstorm' }
};

interface AddressSuggestion {
    display_name: string;
    lat: string;
    lon: string;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
    };
}

const CallSheetBuilder: React.FC = () => {
    const { contacts } = useContacts();
    const [mode, setMode] = useState<'list' | 'edit'>('list');
    const [callSheets, setCallSheets] = useState<CallSheet[]>(() => {
        const saved = localStorage.getItem('finflow_callsheets');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('finflow_callsheets', JSON.stringify(callSheets));
    }, [callSheets]);

    // Estado do Formulário
    const [formData, setFormData] = useState<CallSheet>({
        id: '',
        productionTitle: '',
        date: new Date().toISOString().split('T')[0],
        locationName: '',
        locationAddress: '',
        nearestHospital: '',
        city: 'São Paulo',
        generalCallTime: '08:00',
        lunchTime: '13:00',
        wrapTimeEstimate: '18:00',
        director: '',
        producer: '',
        schedule: [],
        crew: [],
        notes: ''
    });

    // Estados para Autocomplete de Endereço
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeoutRef = useRef<any>(null);

    // Estado local para adicionar itens
    const [schedTime, setSchedTime] = useState('');
    const [schedActivity, setSchedActivity] = useState('');
    const [selectedCrewContact, setSelectedCrewContact] = useState('');
    const [customCrewName, setCustomCrewName] = useState('');
    const [customCrewRole, setCustomCrewRole] = useState('');
    const [customCrewCall, setCustomCrewCall] = useState('');

    // Efeito para buscar clima baseado na DATA e CIDADE
    const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null);

    // Lógica de Busca de Endereço (Nominatim / OpenStreetMap)
    const handleAddressSearch = (query: string) => {
        setFormData(prev => ({ ...prev, locationAddress: query }));
        
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        
        if (query.length < 4) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=br`);
                const data = await response.json();
                setAddressSuggestions(data);
                setShowSuggestions(true);
            } catch (error) {
                console.error("Erro ao buscar endereço:", error);
            }
        }, 500); // Debounce de 500ms
    };

    const selectAddress = (suggestion: AddressSuggestion) => {
        // Tenta extrair a cidade para atualizar o clima
        const city = suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || suggestion.address?.state || formData.city;
        
        // Verifica se temos coordenadas da cidade buscada para o clima (se não estiver na lista fixa)
        if (!CITY_COORDS[city]) {
            // Adiciona temporariamente ao mapa de coordenadas para o clima funcionar
            CITY_COORDS[city] = { lat: parseFloat(suggestion.lat), long: parseFloat(suggestion.lon) };
        }

        setFormData(prev => ({
            ...prev,
            locationAddress: suggestion.display_name,
            city: city
        }));
        setShowSuggestions(false);
    };

    // Efeito de Clima
    useEffect(() => {
        const fetchWeather = async () => {
            if (!formData.date) return;

            const coords = CITY_COORDS[formData.city];
            if (!coords) {
                setLiveWeather(null);
                return;
            }

            try {
                // Busca Daily Forecast para a data específica
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.long}&daily=weather_code,temperature_2m,max_temperature_2m_min&timezone=auto&start_date=${formData.date}&end_date=${formData.date}`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.daily && data.daily.weather_code && data.daily.weather_code.length > 0) {
                    setLiveWeather({
                        minTemp: data.daily.temperature_2m_min[0],
                        maxTemp: data.daily.temperature_2m_max[0],
                        weatherCode: data.daily.weather_code[0],
                        description: WEATHER_CODES[data.daily.weather_code[0]]?.desc || 'Variável'
                    });
                } else {
                    setLiveWeather(null);
                }
            } catch (error) {
                console.error("Erro ao buscar clima:", error);
                setLiveWeather(null);
            }
        };

        if (mode === 'edit') {
            fetchWeather();
        }
    }, [formData.city, formData.date, mode]);

    const handleCreateNew = () => {
        setFormData({
            id: Date.now().toString(),
            productionTitle: '',
            date: new Date().toISOString().split('T')[0],
            locationName: '',
            locationAddress: '',
            nearestHospital: '',
            city: 'São Paulo',
            generalCallTime: '08:00',
            lunchTime: '13:00',
            wrapTimeEstimate: '18:00',
            director: '',
            producer: '',
            schedule: [
                { id: '1', time: '08:00', activity: 'Café da Manhã / Chegada da Equipe' },
                { id: '2', time: '09:00', activity: 'Início das Gravações' }
            ],
            crew: [],
            notes: 'Não esquecer protetor solar e repelente.'
        });
        setMode('edit');
    };

    const handleEdit = (cs: CallSheet) => {
        setFormData(cs);
        setMode('edit');
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta ordem do dia?")) {
            setCallSheets(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleSave = () => {
        if (!formData.productionTitle) {
            alert("Preencha o título da produção.");
            return;
        }

        const dataToSave = {
            ...formData,
            weather: liveWeather || undefined
        };

        setCallSheets(prev => {
            const exists = prev.find(c => c.id === dataToSave.id);
            if (exists) {
                return prev.map(c => c.id === dataToSave.id ? dataToSave : c);
            }
            return [dataToSave, ...prev];
        });
        setMode('list');
    };

    const addScheduleItem = () => {
        if (!schedTime || !schedActivity) return;
        setFormData(prev => ({
            ...prev,
            schedule: [...prev.schedule, { id: Date.now().toString(), time: schedTime, activity: schedActivity }].sort((a,b) => a.time.localeCompare(b.time))
        }));
        setSchedTime('');
        setSchedActivity('');
    };

    const removeScheduleItem = (id: string) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.filter(s => s.id !== id)
        }));
    };

    const addCrewMember = () => {
        let newMember: CrewMember;

        if (selectedCrewContact) {
            const contact = contacts.find(c => c.id === selectedCrewContact);
            if (!contact) return;
            newMember = {
                id: Date.now().toString(),
                name: contact.name,
                role: contact.role || 'Equipe',
                callTime: customCrewCall || formData.generalCallTime,
                dailyRate: 0, daysWorked: 1, totalValue: 0, workDate: '', paymentDate: '', status: 'pending' // Defaults
            };
        } else {
            if (!customCrewName || !customCrewRole) return;
            newMember = {
                id: Date.now().toString(),
                name: customCrewName,
                role: customCrewRole,
                callTime: customCrewCall || formData.generalCallTime,
                dailyRate: 0, daysWorked: 1, totalValue: 0, workDate: '', paymentDate: '', status: 'pending' // Defaults
            };
        }

        setFormData(prev => ({ ...prev, crew: [...prev.crew, newMember] }));
        setCustomCrewName('');
        setCustomCrewRole('');
        setCustomCrewCall('');
        setSelectedCrewContact('');
    };

    const removeCrewMember = (id: string) => {
        setFormData(prev => ({ ...prev, crew: prev.crew.filter(c => c.id !== id) }));
    };

    const handleSavePDF = () => {
        const element = document.getElementById('callsheet-print');
        if (!element) return;

        // Adiciona classe para forçar cores claras (PDF Mode) antes de gerar
        element.classList.add('pdf-export');

        const opt = {
            margin: 0,
            filename: `CallSheet_${formData.productionTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'sem_titulo'}_${formData.date}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        if (window.html2pdf) {
            // @ts-ignore
            window.html2pdf()
                .from(element)
                .set(opt)
                .save()
                .then(() => {
                    element.classList.remove('pdf-export');
                })
                .catch((err: any) => {
                    console.error("Erro ao gerar PDF", err);
                    element.classList.remove('pdf-export');
                });
        } else {
            // Fallback para impressão nativa
            window.print();
            element.classList.remove('pdf-export');
        }
    };

    // --- RENDER ---

    const printStyles = `
        @media print {
            body * { visibility: hidden; }
            #callsheet-print, #callsheet-print * { visibility: visible; }
            #callsheet-print { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%; 
                background: white !important; 
                color: black !important; 
                padding: 0px; 
                margin: 0px;
                z-index: 9999;
                border: none !important;
                box-shadow: none !important;
            }
            /* Forçar cores claras para impressão, sobrescrevendo dark mode */
            .force-light-bg { background-color: #f3f4f6 !important; color: black !important; border-color: #e5e7eb !important; }
            .force-white-bg { background-color: white !important; }
            .force-dark-text { color: black !important; }
            .force-border { border-color: #000 !important; }
            
            /* Inputs should look like text */
            input, textarea, select {
                border: none !important;
                background: transparent !important;
                color: black !important;
                padding: 0 !important;
            }
            
            .no-print { display: none !important; }
        }

        /* Estilos para exportação PDF via html2canvas (captura de tela) */
        .pdf-export {
            background-color: white !important;
            color: black !important;
        }
        .pdf-export .force-light-bg { background-color: #f3f4f6 !important; border-color: #e5e7eb !important; color: black !important; }
        .pdf-export .force-white-bg { background-color: white !important; }
        .pdf-export .force-dark-text { color: black !important; }
        .pdf-export .force-border { border-color: #000 !important; }
        
        .pdf-export .dark\\:bg-\\[\\#1e232e\\] { background-color: white !important; }
        .pdf-export .dark\\:text-white { color: black !important; }
        .pdf-export .dark\\:text-gray-200 { color: black !important; }
        .pdf-export .dark\\:text-gray-400 { color: #666 !important; }
        .pdf-export .dark\\:border-gray-500 { border-color: black !important; }
        .pdf-export .dark\\:bg-gray-800 { background-color: #f3f4f6 !important; color: black !important; }
        
        .pdf-export input, .pdf-export textarea, .pdf-export select {
            color: black !important;
            background-color: transparent !important;
            border: none !important;
        }
    `;

    const getGoogleMapsLink = (address: string) => {
        if (!address) return '#';
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    };

    if (mode === 'list') {
        return (
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">assignment</span>
                            Ordens do Dia
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie e imprima as diárias de gravação.</p>
                    </div>
                    <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Nova Call Sheet
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {callSheets.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800">
                            Nenhuma Ordem do Dia criada.
                        </div>
                    )}
                    {callSheets.map(cs => (
                        <div key={cs.id} className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between h-[200px]">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{cs.productionTitle}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{new Date(cs.date).toLocaleDateString('pt-BR')} - {cs.city}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {cs.crew.length} Membros
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        Início: {cs.generalCallTime}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-4">
                                <button onClick={() => handleDelete(cs.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                                <button onClick={() => handleEdit(cs)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    Abrir
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
            <style>{printStyles}</style>
            
            {/* Toolbar No-Print */}
            <div className="flex justify-between items-center no-print bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-4 z-20">
                <button onClick={() => setMode('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                    <span className="material-symbols-outlined">arrow_back</span> Voltar
                </button>
                <div className="flex gap-3">
                    <button onClick={handleSavePDF} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <span className="material-symbols-outlined">picture_as_pdf</span> Salvar PDF
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold shadow-lg shadow-primary/20 transition-all">
                        <span className="material-symbols-outlined">save</span> Salvar
                    </button>
                </div>
            </div>

            {/* CALL SHEET LAYOUT (Printable Area) */}
            {/* Adicionado suporte a Dark Mode na visualização (bg-white dark:bg-[#1e232e] text-black dark:text-gray-200) */}
            <div id="callsheet-print" className="bg-white dark:bg-[#1e232e] text-black dark:text-gray-200 p-8 md:p-12 shadow-2xl rounded-none md:rounded-lg min-h-[297mm] mx-auto w-full relative transition-colors force-white-bg">
                
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-4 border-black dark:border-gray-500 pb-6 mb-8 force-border">
                    <div className="w-full">
                        {mode === 'edit' ? (
                            <input 
                                className="w-full text-4xl font-black uppercase tracking-tight mb-2 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-black dark:focus:border-white outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 dark:text-white force-dark-text"
                                placeholder="TÍTULO DA PRODUÇÃO"
                                value={formData.productionTitle}
                                onChange={e => setFormData({...formData, productionTitle: e.target.value})}
                            />
                        ) : (
                            <h1 className="text-4xl font-black uppercase tracking-tight mb-2 dark:text-white force-dark-text">{formData.productionTitle}</h1>
                        )}
                        <p className="text-xl font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 force-dark-text">Ordem do Dia</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                        <div className="text-sm font-bold bg-black dark:bg-white dark:text-black text-white px-3 py-1 inline-block mb-2 force-light-bg rounded-sm">DATA</div>
                        <div className="text-2xl font-bold dark:text-white force-dark-text">
                            {mode === 'edit' ? (
                                <input 
                                    type="date" 
                                    className="bg-transparent border-none outline-none text-right w-40 p-0 dark:text-white cursor-pointer force-dark-text"
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                />
                            ) : new Date(formData.date).toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    
                    {/* Col 1: Horários */}
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 force-light-bg">
                        <h3 className="font-black text-sm uppercase mb-3 border-b border-gray-300 dark:border-gray-600 pb-1 force-border">Horários Chave</h3>
                        <div className="space-y-2 text-sm dark:text-gray-300 force-dark-text">
                            <div className="flex justify-between items-center">
                                <span className="font-bold">Geral:</span>
                                {mode === 'edit' ? <input type="time" value={formData.generalCallTime} onChange={e => setFormData({...formData, generalCallTime: e.target.value})} className="w-20 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-1 rounded dark:text-white force-dark-text" /> : formData.generalCallTime}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold">Almoço:</span>
                                {mode === 'edit' ? <input type="time" value={formData.lunchTime} onChange={e => setFormData({...formData, lunchTime: e.target.value})} className="w-20 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-1 rounded dark:text-white force-dark-text" /> : formData.lunchTime}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold">Wrap Estimado:</span>
                                {mode === 'edit' ? <input type="time" value={formData.wrapTimeEstimate} onChange={e => setFormData({...formData, wrapTimeEstimate: e.target.value})} className="w-20 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-1 rounded dark:text-white force-dark-text" /> : formData.wrapTimeEstimate}
                            </div>
                        </div>
                    </div>

                    {/* Col 2: Local & Clima */}
                    <div className="md:col-span-2 border border-gray-200 dark:border-gray-700 p-4 force-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-black text-sm uppercase mb-3 border-b border-gray-300 dark:border-gray-600 pb-1 force-border dark:text-gray-200 force-dark-text">Locação</h3>
                                {mode === 'edit' ? (
                                    <div className="space-y-2">
                                        <input placeholder="Nome do Local" value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} className="w-full text-sm font-bold border-b border-gray-300 dark:border-gray-600 dark:bg-transparent dark:text-white outline-none force-dark-text" />
                                        
                                        {/* AUTOCOMPLETE ADDRESS INPUT */}
                                        <div className="relative">
                                            <textarea 
                                                placeholder="Endereço Completo (Digite para buscar)" 
                                                value={formData.locationAddress} 
                                                onChange={e => handleAddressSearch(e.target.value)} 
                                                className="w-full text-sm resize-none border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white p-2 rounded focus:ring-1 focus:ring-black force-dark-text" 
                                                rows={2} 
                                            />
                                            {showSuggestions && addressSuggestions.length > 0 && (
                                                <ul className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto no-print">
                                                    {addressSuggestions.map((suggestion, index) => (
                                                        <li 
                                                            key={index}
                                                            onClick={() => selectAddress(suggestion)}
                                                            className="px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 dark:text-white"
                                                        >
                                                            {suggestion.display_name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <p className="font-bold text-sm dark:text-white force-dark-text">{formData.locationName}</p>
                                        <div className="flex items-start gap-2">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 force-dark-text flex-1">{formData.locationAddress}</p>
                                            {formData.locationAddress && (
                                                <a 
                                                    href={getGoogleMapsLink(formData.locationAddress)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 dark:text-blue-400 hover:underline text-xs flex items-center gap-1 font-bold no-print"
                                                    title="Abrir no Google Maps"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">map</span>
                                                    Maps
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <h3 className="font-black text-sm uppercase mb-3 border-b border-gray-300 dark:border-gray-600 pb-1 flex items-center gap-2 dark:text-gray-200 force-dark-text force-border">
                                    <span className="material-symbols-outlined text-[18px]">thermostat</span>
                                    Previsão ({new Date(formData.date).toLocaleDateString('pt-BR').slice(0, 5)})
                                </h3>
                                {mode === 'edit' ? (
                                    <div className="mb-2">
                                        <select value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded mb-2 force-dark-text">
                                            {Object.keys(CITY_COORDS).map(city => <option key={city} value={city}>{city}</option>)}
                                            {/* Opção dinâmica se a cidade não estiver na lista fixa */}
                                            {!CITY_COORDS[formData.city] && <option value={formData.city}>{formData.city}</option>}
                                        </select>
                                    </div>
                                ) : null}
                                
                                {liveWeather ? (
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-4xl text-gray-700 dark:text-gray-300 force-dark-text">
                                            {WEATHER_CODES[liveWeather.weatherCode]?.icon || 'question_mark'}
                                        </span>
                                        <div>
                                            <div className="flex items-end gap-2">
                                                <p className="text-2xl font-bold dark:text-white force-dark-text">{liveWeather.maxTemp?.toFixed(0)}°C</p>
                                                {liveWeather.minTemp !== undefined && <span className="text-sm text-gray-500 dark:text-gray-400 force-dark-text mb-1">/ {liveWeather.minTemp?.toFixed(0)}°C</span>}
                                            </div>
                                            <p className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 force-dark-text">{liveWeather.description}</p>
                                            <p className="text-[10px] text-gray-400 force-dark-text">Em {formData.city}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Sem previsão para esta data.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Schedule Table */}
                <div className="mb-8">
                    <h3 className="font-black text-lg uppercase mb-2 border-b-2 border-black dark:border-gray-500 pb-1 dark:text-white force-dark-text force-border">Cronograma</h3>
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-black dark:bg-gray-700 text-white uppercase text-xs force-light-bg">
                                <th className="p-2 w-24 border border-black dark:border-gray-600 force-border">Horário</th>
                                <th className="p-2 border border-black dark:border-gray-600 force-border">Atividade</th>
                                {mode === 'edit' && <th className="p-2 w-10 border border-black dark:border-gray-600 text-center no-print">Del</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {formData.schedule.map(item => (
                                <tr key={item.id} className="border-b border-gray-300 dark:border-gray-700 force-border">
                                    <td className="p-2 font-bold border-r border-gray-300 dark:border-gray-700 dark:text-gray-200 force-dark-text force-border">{item.time}</td>
                                    <td className="p-2 uppercase dark:text-gray-200 force-dark-text">{item.activity}</td>
                                    {mode === 'edit' && (
                                        <td className="p-2 text-center no-print">
                                            <button onClick={() => removeScheduleItem(item.id)} className="text-red-500 font-bold">X</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {/* Input Row for Schedule */}
                            {mode === 'edit' && (
                                <tr className="bg-gray-50 dark:bg-gray-800 no-print">
                                    <td className="p-2">
                                        <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1 rounded" />
                                    </td>
                                    <td className="p-2">
                                        <input placeholder="Nova Atividade" value={schedActivity} onChange={e => setSchedActivity(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1 rounded" />
                                    </td>
                                    <td className="p-2 text-center">
                                        <button onClick={addScheduleItem} className="bg-black dark:bg-white dark:text-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">+</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Crew List */}
                <div className="mb-8">
                    <h3 className="font-black text-lg uppercase mb-2 border-b-2 border-black dark:border-gray-500 pb-1 dark:text-white force-dark-text force-border">Equipe</h3>
                    
                    {mode === 'edit' && (
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 mb-4 rounded border border-gray-200 dark:border-gray-700 no-print flex flex-wrap gap-2 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Selecionar do Banco</label>
                                <select value={selectedCrewContact} onChange={e => setSelectedCrewContact(e.target.value)} className="w-full text-sm border border-gray-300 dark:border-gray-600 p-1.5 bg-white dark:bg-gray-700 dark:text-white rounded">
                                    <option value="">Selecione...</option>
                                    {contacts.filter(c => c.type === 'Fornecedor').map(c => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.role || 'Geral'}</option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-xs font-bold text-gray-400 pb-2">OU</span>
                            <div className="flex-1 min-w-[150px]">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nome Manual</label>
                                <input value={customCrewName} onChange={e => setCustomCrewName(e.target.value)} className="w-full text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1.5 rounded" />
                            </div>
                            <div className="w-32">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Função</label>
                                <input value={customCrewRole} onChange={e => setCustomCrewRole(e.target.value)} className="w-full text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1.5 rounded" />
                            </div>
                            <div className="w-24">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Call Time</label>
                                <input type="time" value={customCrewCall} onChange={e => setCustomCrewCall(e.target.value)} className="w-full text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-1.5 rounded" />
                            </div>
                            <button onClick={addCrewMember} className="bg-black dark:bg-white dark:text-black hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded h-[34px]">ADICIONAR</button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        {formData.crew.map(c => (
                            <div key={c.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-1 force-border">
                                <div>
                                    <span className="font-bold uppercase text-xs w-24 inline-block dark:text-gray-300 force-dark-text">{c.role}</span>
                                    <span className="uppercase dark:text-white force-dark-text">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono font-bold bg-gray-100 dark:bg-gray-700 px-1 text-xs dark:text-white force-light-bg">Call: {c.callTime || formData.generalCallTime}</span>
                                    {mode === 'edit' && <button onClick={() => removeCrewMember(c.id)} className="text-red-500 text-xs font-bold no-print">X</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notes & Footer */}
                <div className="mt-auto">
                    <div className="border border-gray-300 dark:border-gray-700 p-4 min-h-[100px] mb-6 bg-yellow-50/50 dark:bg-yellow-900/20 force-border force-light-bg">
                        <h4 className="font-bold text-xs uppercase text-gray-500 dark:text-gray-400 mb-2 force-dark-text">Notas de Produção / Hospitais / Segurança</h4>
                        {mode === 'edit' ? (
                            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full h-full bg-transparent border-none outline-none text-sm resize-none dark:text-white force-dark-text" rows={3} />
                        ) : (
                            <p className="text-sm whitespace-pre-wrap dark:text-white force-dark-text">{formData.notes}</p>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 text-xs text-gray-500 dark:text-gray-400 uppercase force-dark-text">
                        <div>
                            <span className="font-bold block mb-1">Direção</span>
                            {mode === 'edit' ? <input value={formData.director} onChange={e => setFormData({...formData, director: e.target.value})} className="w-full border-b border-gray-300 dark:border-gray-600 dark:bg-transparent dark:text-white force-dark-text" placeholder="Nome" /> : <span className="dark:text-white force-dark-text">{formData.director}</span>}
                        </div>
                        <div>
                            <span className="font-bold block mb-1">Produção</span>
                            {mode === 'edit' ? <input value={formData.producer} onChange={e => setFormData({...formData, producer: e.target.value})} className="w-full border-b border-gray-300 dark:border-gray-600 dark:bg-transparent dark:text-white force-dark-text" placeholder="Nome" /> : <span className="dark:text-white force-dark-text">{formData.producer}</span>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CallSheetBuilder;
