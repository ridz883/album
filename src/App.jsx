import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { 
  Heart, Plus, Trash2, Sparkles, Calendar, 
  Camera, Send, Loader2, X, Image as ImageIcon, 
  Upload, Film, Play, Clock, Eye, Maximize2, Video
} from 'lucide-react';

// --- CONFIGURASI OTOMATIS (Ridho tidak perlu ubah ini) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ridho-keyla-ultimate-v4';

// API Keys
const TELE_BOT_TOKEN = "8560011254:AAGl8MrvU0jFlkSjMM3drFRPrwju8tMYf70"; 
const TELE_CHAT_ID = "5519975035"; 
const GROQ_API_KEY = "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";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";
const apiKey = ""; 

const App = () => {
  const [user, setUser] = useState(null);
  const [moments, setMoments] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState(null); 
  const [loading, setLoading] = useState(false);
  
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileType, setFileType] = useState('image');
  const [description, setDescription] = useState('');
  const [daysTogether, setDaysTogether] = useState(0);
  const fileInputRef = useRef(null);

  // 1. Hitung Hari Jadian (19 Oktober 2025)
  useEffect(() => {
    const anniversary = new Date('2025-10-19');
    const today = new Date();
    const diffTime = today - anniversary;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    setDaysTogether(diffDays > 0 ? diffDays : 0);
  }, []);

  // 2. Auth Otomatis
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => u && setUser(u));
    return () => unsubscribe();
  }, []);

  // 3. Ambil Data (Shared - Ridho & Keyla bisa lihat bersama)
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'shared_moments');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMoments(data.sort((a, b) => b.timestamp - a.timestamp));
    });
    return () => unsubscribe();
  }, [user]);

  // 4. Kirim ke Telegram
  const sendToTele = async (media, desc, type, aiStory) => {
    try {
      const blob = await (await fetch(media)).blob();
      const formData = new FormData();
      formData.append('chat_id', TELE_CHAT_ID);
      formData.append('caption', `💖 MOMEN BARU RIDHO & KEYLA 💖\n\n📝 Cerita: ${desc}\n\n✨ AI Story: ${aiStory}`);
      const endpoint = type === 'video' ? 'sendVideo' : 'sendPhoto';
      formData.append(type === 'video' ? 'video' : 'photo', blob, `file.${type === 'video' ? 'mp4' : 'jpg'}`);
      await fetch(`https://api.telegram.org/bot${TELE_BOT_TOKEN}/${endpoint}`, { method: 'POST', body: formData });
    } catch (e) { console.error("Tele error", e); }
  };

  // 5. AI Vision & Story
  const processAI = async (base64Data, userDesc, type) => {
    setLoading(true);
    try {
      let visualInfo = userDesc;
      if (type === 'image') {
        const base64Clean = base64Data.split(',')[1];
        const vRes = await fetch(`${GEMINI_API_URL}${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Lihat foto Ridho & Keyla ini. Deskripsikan aktivitas, lokasi, dan suasana secara detail." }, { inlineData: { mimeType: "image/png", data: base64Clean } }] }]
          })
        });
        const vData = await vRes.json();
        visualInfo = vData.candidates?.[0]?.content?.parts?.[0]?.text || userDesc;
      }

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: "Buat 3 kalimat romantis puitis untuk Ridho & Keyla berdasarkan aktivitas mereka." }, { role: "user", content: visualInfo }]
        })
      });
      const groqData = await groqRes.json();
      return { activity: visualInfo, story: groqData.choices[0].message.content };
    } catch (err) { return { activity: userDesc, story: "Indahnya momen Ridho & Keyla." }; }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!previewUrl || !user) return;
    const analysis = await processAI(previewUrl, description, fileType);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shared_moments'), {
        mediaData: previewUrl,
        mediaType: fileType,
        userDescription: description,
        aiActivity: analysis.activity,
        aiStory: analysis.story,
        timestamp: Date.now()
      });
      sendToTele(previewUrl, description, fileType, analysis.story);
      setIsUploadModalOpen(false);
      setPreviewUrl('');
      setDescription('');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-rose-50 text-slate-800 font-sans pb-10">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-rose-100 px-6 py-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
             <Heart className="text-white fill-current animate-pulse" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-rose-600 uppercase">Ridho & Keyla</h1>
            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">{daysTogether} Hari Bahagia</p>
          </div>
        </div>
        <button onClick={() => setIsUploadModalOpen(true)} className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md">
          <Plus size={18} /> Abadikan
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-10 text-center">
            <h2 className="text-3xl font-black text-rose-700 italic tracking-tighter uppercase">Our Love Gallery</h2>
            <p className="text-[10px] text-rose-300 font-bold uppercase tracking-[0.4em] mt-2 italic">Connected to Keyla's Heart</p>
        </div>

        {/* Grid 5 Kolom */}
        {moments.length === 0 ? (
          <div className="py-32 bg-white/50 rounded-[3rem] border-2 border-dashed border-rose-200 text-center opacity-60">
            <Video size={48} className="text-rose-200 mx-auto mb-4" />
            <p className="font-bold text-rose-300 uppercase tracking-widest text-xs">Ayo Simpan Foto Pertama Ridho & Keyla!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 animate-in fade-in duration-700">
            {moments.map((moment) => (
              <div key={moment.id} onClick={() => setSelectedMoment(moment)} className="group relative aspect-square bg-white rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:shadow-rose-100 transition-all border border-rose-50">
                {moment.mediaType === 'video' ? (
                  <div className="w-full h-full relative">
                    <video src={moment.mediaData} className="w-full h-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10"><Play className="text-white fill-current" size={32} /></div>
                  </div>
                ) : (
                  <img src={moment.mediaData} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Memory" />
                )}
                <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={14} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedMoment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" onClick={() => setSelectedMoment(null)}>
          <div className="absolute inset-0 bg-rose-900/60 backdrop-blur-md"></div>
          <div className="bg-white w-full max-w-5xl relative z-[110] rounded-[3rem] shadow-2xl overflow-hidden grid md:grid-cols-2 animate-in zoom-in-95 duration-300 max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-50 flex items-center justify-center min-h-[350px]">
               {selectedMoment.mediaType === 'video' ? <video src={selectedMoment.mediaData} controls autoPlay className="max-h-full max-w-full" /> : <img src={selectedMoment.mediaData} className="max-h-full max-w-full object-contain p-4" alt="View" />}
               <button onClick={() => { if(confirm("Hapus?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_moments', selectedMoment.id)).then(() => setSelectedMoment(null))}} className="absolute top-6 left-6 bg-white/90 text-red-500 p-3 rounded-full shadow-lg"><Trash2 size={20} /></button>
            </div>
            <div className="p-8 sm:p-12 flex flex-col justify-center space-y-8 overflow-y-auto">
              <div>
                <span className="bg-rose-100 text-rose-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">{new Date(selectedMoment.timestamp).toLocaleDateString()}</span>
                <h3 className="text-3xl font-black text-slate-800 italic tracking-tighter uppercase leading-tight">"{selectedMoment.userDescription}"</h3>
              </div>
              <div className="space-y-6">
                <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 text-sm italic text-slate-600 leading-relaxed">
                  <Eye className="inline-block mr-2 text-rose-400" size={16} /> {selectedMoment.aiActivity}
                </div>
                <div className="bg-pink-50 p-6 rounded-[2rem] border border-pink-100 text-lg font-serif italic text-slate-700 leading-relaxed">
                  <Sparkles className="inline-block mr-2 text-pink-400" size={18} /> {selectedMoment.aiStory}
                </div>
              </div>
              <button onClick={() => setSelectedMoment(null)} className="w-full py-5 bg-rose-500 text-white rounded-[1.5rem] font-black uppercase shadow-xl hover:bg-rose-600 transition-all">Tutup Galeri</button>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-rose-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-lg relative z-10 p-10 shadow-2xl space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-rose-600 uppercase italic tracking-tighter leading-none mb-1">Momen Baru</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="bg-rose-50 p-2 rounded-full"><X size={20} /></button>
            </div>
            <div onClick={() => fileInputRef.current?.click()} className="aspect-video rounded-3xl border-2 border-dashed border-rose-200 bg-rose-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-rose-50 transition-all overflow-hidden relative">
              {previewUrl ? (fileType === 'video' ? <video src={previewUrl} className="w-full h-full object-cover" /> : <img src={previewUrl} className="w-full h-full object-cover" />) : <Upload className="text-rose-200" size={40} />}
              <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={e => {
                const f = e.target.files[0];
                if (f && f.size < 1100000) {
                  setFileType(f.type.startsWith('video') ? 'video' : 'image');
                  const r = new FileReader(); r.onload = () => setPreviewUrl(r.result); r.readAsDataURL(f);
                } else if (f) alert("Maks 1MB agar lancar!");
              }} />
            </div>
            <textarea required placeholder="Ridho, tuliskan cerita momen ini..." className="w-full bg-rose-50 border border-rose-100 rounded-2xl p-5 outline-none text-sm min-h-[100px]" value={description} onChange={e => setDescription(e.target.value)} />
            <button onClick={handleUpload} disabled={loading || !previewUrl} className="w-full py-5 bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-200 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "ABADIKAN & SHARE KE KEYLA"}
            </button>
          </form>
          </div>
        </div>
      )}

      <footer className="text-center py-16 opacity-30">
        <p className="text-[10px] font-black text-rose-400 tracking-[0.4em] uppercase">Ridho & Keyla Forever • Sejak 19 Oktober 2025</p>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

