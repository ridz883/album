import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Heart, Plus, Trash2, Sparkles, Calendar, 
  Camera, Send, Loader2, X, Image as ImageIcon, 
  Upload, Film, Play, Clock, Eye, Maximize2, CheckCircle2
} from 'lucide-react';

// --- KONFIGURASI TELEGRAM & AI ---
const TELE_BOT_TOKEN = "8560011254:AAGl8MrvU0jFlkSjMM3drFRPrwju8tMYf70"; 
const TELE_CHAT_ID = "5519975035"; 

const GROQ_API_KEY = "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";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";
const apiKey = ""; // API Key Gemini dikelola oleh environment

const App = () => {
  const [moments, setMoments] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState(null); 
  const [loading, setLoading] = useState(false);
  
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileType, setFileType] = useState('image');
  const [description, setDescription] = useState('');
  const [daysTogether, setDaysTogether] = useState(0);
  const fileInputRef = useRef(null);

  // 1. Inisialisasi & Hitung Hari Jadian (19 Oktober 2025)
  useEffect(() => {
    const anniversary = new Date('2025-10-19');
    const today = new Date();
    const diffTime = today - anniversary;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    setDaysTogether(diffDays > 0 ? diffDays : 0);

    // Ambil data dari LocalStorage (Ingatan Browser HP)
    const savedData = localStorage.getItem('ridho_keyla_v3');
    if (savedData) {
      setMoments(JSON.parse(savedData));
    }
  }, []);

  // 2. Fungsi Simpan Local
  const updateGallery = (newList) => {
    setMoments(newList);
    localStorage.setItem('ridho_keyla_v3', JSON.stringify(newList));
  };

  // 3. Kirim ke Telegram Bot
  const sendToTelegram = async (base64Data, userCaption, type, aiStory) => {
    try {
      const blob = await (await fetch(base64Data)).blob();
      const formData = new FormData();
      formData.append('chat_id', TELE_CHAT_ID);
      formData.append('caption', `💖 MOMEN BARU RIDHO & KEYLA 💖\n\n📝 Cerita: ${userCaption}\n\n✨ AI Story: ${aiStory}`);
      
      const endpoint = type === 'video' ? 'sendVideo' : 'sendPhoto';
      formData.append(type === 'video' ? 'video' : 'photo', blob, `moment.${type === 'video' ? 'mp4' : 'jpg'}`);

      await fetch(`https://api.telegram.org/bot${TELE_BOT_TOKEN}/${endpoint}`, {
        method: 'POST',
        body: formData
      });
    } catch (err) {
      console.error("Telegram Error:", err);
    }
  };

  // 4. Analisis Aktivitas (AI Vision + Groq)
  const processAI = async (base64Data, userDesc, type) => {
    setLoading(true);
    try {
      let visualInfo = userDesc;
      
      // AI Melihat Foto (Gemini Vision)
      if (type === 'image') {
        const base64Clean = base64Data.split(',')[1];
        const vRes = await fetch(`${GEMINI_API_URL}${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: `Analisis foto Ridho & Keyla ini. Jelaskan secara detail mereka sedang apa (aktivitas, lokasi, suasana). Konteks: "${userDesc}"` },
              { inlineData: { mimeType: "image/png", data: base64Clean } }
            ]}]
          })
        });
        const vData = await vRes.json();
        visualInfo = vData.candidates?.[0]?.content?.parts?.[0]?.text || userDesc;
      }

      // Groq Merangkai Cerita Romantis
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Kamu adalah AI Jurnal Cinta Ridho & Keyla. Buat 3 kalimat romantis puitis dalam Bahasa Indonesia berdasarkan aktivitas mereka." },
            { role: "user", content: visualInfo }
          ]
        })
      });
      const groqData = await groqRes.json();
      return { activity: visualInfo, story: groqData.choices[0].message.content };
    } catch (err) {
      return { activity: userDesc, story: "Momen ini terlalu indah untuk dijelaskan dengan kata-kata AI." };
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!previewUrl) return;

    const analysis = await processAI(previewUrl, description, fileType);
    
    const newMoment = {
      id: Date.now(),
      mediaData: previewUrl,
      mediaType: fileType,
      userDescription: description,
      aiActivity: analysis.activity,
      aiStory: analysis.story,
      timestamp: Date.now()
    };

    const newList = [newMoment, ...moments];
    updateGallery(newList);
    sendToTelegram(previewUrl, description, fileType, analysis.story);

    setIsUploadModalOpen(false);
    setPreviewUrl('');
    setDescription('');
  };

  return (
    <div className="min-h-screen bg-rose-50 text-slate-800 font-sans pb-20 selection:bg-rose-200">
      {/* Pink Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-rose-100 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
              <Heart className="text-white fill-current animate-pulse" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-rose-600 uppercase tracking-tighter">Ridho & Keyla</h1>
              <div className="flex items-center gap-2 text-[9px] font-bold text-rose-400 uppercase tracking-widest">
                <Clock size={12} /> {daysTogether} Hari Berdua
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-rose-100"
          >
            <Plus size={18} /> ABADIKAN
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-rose-700 italic uppercase leading-none tracking-tighter">Gallery of Love</h2>
            <div className="w-16 h-1 bg-rose-200 mx-auto mt-3 rounded-full"></div>
            <p className="text-[9px] text-rose-300 font-bold uppercase tracking-[0.4em] mt-2">Saved Forever to Telegram</p>
        </div>

        {/* Grid 5 Kolom (Responsive) */}
        {moments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white/50 rounded-[3rem] border-2 border-dashed border-rose-200 opacity-60">
            <Camera size={48} className="text-rose-200 mb-4" />
            <p className="font-bold text-rose-300 uppercase tracking-widest text-xs">Belum ada momen Ridho & Keyla</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 animate-in fade-in duration-700">
            {moments.map((moment) => (
              <div 
                key={moment.id} 
                onClick={() => setSelectedMoment(moment)}
                className="group relative aspect-square bg-white rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:shadow-rose-100 transition-all hover:-translate-y-1 border border-rose-50"
              >
                {moment.mediaType === 'video' ? (
                  <div className="w-full h-full relative bg-rose-50">
                    <video src={moment.mediaData} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <div className="w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
                        <Play className="text-white fill-current" size={20} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img src={moment.mediaData} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Memory" />
                )}
                <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={14} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Pop-up (Lightbox) Analisis Aktivitas */}
      {selectedMoment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-rose-900/70 backdrop-blur-md" onClick={() => setSelectedMoment(null)}></div>
          <div className="bg-white w-full max-w-5xl relative z-[110] rounded-[3rem] shadow-2xl overflow-hidden grid md:grid-cols-2 animate-in zoom-in-95 duration-300 max-h-[90vh]">
            
            {/* Visual Media */}
            <div className="bg-rose-50 flex items-center justify-center relative min-h-[350px]">
               {selectedMoment.mediaType === 'video' ? (
                  <video src={selectedMoment.mediaData} controls autoPlay className="max-h-full max-w-full" />
               ) : (
                  <img src={selectedMoment.mediaData} className="max-h-full max-w-full object-contain p-4 shadow-xl" alt="Full view" />
               )}
               <button 
                  onClick={() => {
                    if(confirm("Hapus kenangan ini dari galeri HP, Ridho? (Data di Telegram tetap ada)")) {
                        const newList = moments.filter(m => m.id !== selectedMoment.id);
                        updateGallery(newList);
                        setSelectedMoment(null);
                    }
                  }}
                  className="absolute top-6 left-6 bg-white/90 hover:bg-red-500 hover:text-white text-red-500 p-3 rounded-full shadow-lg transition-all"
               >
                 <Trash2 size={20} />
               </button>
            </div>

            {/* AI Analysis Section */}
            <div className="p-8 sm:p-12 flex flex-col justify-center space-y-8 overflow-y-auto">
              <div>
                <span className="bg-rose-100 text-rose-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                  {new Date(selectedMoment.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <h3 className="text-3xl font-black text-slate-800 leading-tight italic tracking-tighter">"{selectedMoment.userDescription}"</h3>
              </div>

              <div className="space-y-6">
                <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                  <div className="flex items-center gap-2 mb-3 text-rose-500 font-bold text-[10px] uppercase tracking-[0.2em]">
                    <Eye size={16} /> AI Visual Detection :
                  </div>
                  <p className="text-sm text-slate-600 italic leading-relaxed">
                    {selectedMoment.aiActivity}
                  </p>
                </div>

                <div className="bg-pink-50 p-6 rounded-[2rem] border border-pink-100 relative">
                  <Sparkles className="absolute -top-3 -right-3 text-pink-400 bg-white rounded-full p-1" size={28} />
                  <div className="flex items-center gap-2 mb-3 text-pink-500 font-bold text-[10px] uppercase tracking-[0.2em]">
                    <Sparkles size={16} /> AI Romantic Story :
                  </div>
                  <p className="text-xl font-serif italic text-slate-700 leading-relaxed">
                    {selectedMoment.aiStory}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedMoment(null)}
                className="w-full py-5 bg-rose-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-rose-200 transition-all hover:bg-rose-600 active:scale-95"
              >
                Kembali ke Galeri
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-rose-900/50 backdrop-blur-md" onClick={() => setIsUploadModalOpen(false)}></div>
          <div className="bg-white rounded-[3rem] w-full max-w-lg relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-rose-100">
            <div className="p-10 bg-gradient-to-br from-rose-500 to-pink-500 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none mb-1">Upload Momen</h2>
                <p className="text-[10px] opacity-80 uppercase font-bold tracking-widest">Abadikan Ridho & Keyla</p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="bg-white/20 p-2 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleUpload} className="p-10 space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video rounded-[2.5rem] border-2 border-dashed border-rose-200 bg-rose-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-rose-50 transition-all overflow-hidden relative"
              >
                {previewUrl ? (
                  fileType === 'video' ? <video src={previewUrl} className="w-full h-full object-cover" /> : <img src={previewUrl} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload size={48} className="text-rose-300 mb-2" />
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Pilih Foto atau Video</p>
                    <p className="text-[9px] text-slate-400 mt-1 italic">Maksimum ukuran: 1MB</p>
                  </>
                )}
                <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={e => {
                  const f = e.target.files[0];
                  if (f && f.size < 1100000) {
                    setFileType(f.type.startsWith('video') ? 'video' : 'image');
                    const r = new FileReader(); r.onload = () => setPreviewUrl(r.result); r.readAsDataURL(f);
                  } else if (f) alert("Maks 1MB ya Ridho, agar bot telegramnya lancar!");
                }} />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Cerita Pendek</label>
                 <textarea 
                    required
                    placeholder="Ridho, tuliskan sesuatu..."
                    className="w-full bg-rose-50/50 border border-rose-100 rounded-[2rem] p-6 focus:ring-4 focus:ring-rose-100 outline-none text-sm min-h-[120px]"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
              </div>

              <button 
                type="submit" 
                disabled={loading || !previewUrl}
                className="w-full py-6 bg-rose-500 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 shadow-2xl shadow-rose-200 disabled:opacity-50 uppercase tracking-widest text-xs"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    <CheckCircle2 size={18} /> SIMPAN & KIRIM TELEGRAM
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-16 opacity-30">
        <p className="text-[10px] font-black text-rose-400 tracking-[0.5em] uppercase">Ridho & Keyla Forever • Sejak 19 Oktober 2025</p>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

