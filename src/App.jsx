import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Heart, Plus, Trash2, Sparkles, Calendar, Camera, Send, Loader2, X, Upload, Play, Clock, Eye, Maximize2 } from 'lucide-react';

// --- CONFIGURASI FIREBASE RIDHO (DIAMBIL DARI SCREENSHOT) ---
const firebaseConfig = {
  apiKey: "AIzaSyDx4Dl4qx_4PJh9f91N3B095fzIDyfbbDQ",
  authDomain: "ridho-keyla.firebaseapp.com",
  projectId: "ridho-keyla",
  storageBucket: "ridho-keyla.firebasestorage.app",
  messagingSenderId: "888787093462",
  appId: "1:888787093462:web:02ecddb10dcdc6a80f0677",
  measurementId: "G-1CTXF49VZB"
};

// Inisialisasi Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// API Keys untuk AI (Groq & Gemini)
const GROQ_API_KEY = "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";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";
const apiKey = ""; // API Key Gemini otomatis dari environment

// Data Bot Telegram Ridho
const TELE_BOT_TOKEN = "8560011254:AAGl8MrvU0jFlkSjMM3drFRPrwju8tMYf70"; 
const TELE_CHAT_ID = "5519975035";

function App() {
  const [user, setUser] = useState(null);
  const [moments, setMoments] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [daysTogether, setDaysTogether] = useState(0);
  
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileType, setFileType] = useState('image');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef(null);

  // 1. Hitung hari sejak 19 Oktober 2025
  useEffect(() => {
    const anniversary = new Date('2025-10-19');
    const updateDays = () => {
      const today = new Date();
      const diff = Math.floor((today - anniversary) / (1000 * 60 * 60 * 24));
      setDaysTogether(diff > 0 ? diff : 0);
    };
    updateDays();
  }, []);

  // 2. Login Anonim ke Firebase
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  // 3. Sinkronisasi Data Real-time (Sync Ridho & Keyla)
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMoments(data.sort((a, b) => b.timestamp - a.timestamp));
    });
  }, [user]);

  // 4. Backup ke Telegram
  const sendToTele = async (media, desc, type, aiStory) => {
    try {
      const blob = await (await fetch(media)).blob();
      const formData = new FormData();
      formData.append('chat_id', TELE_CHAT_ID);
      formData.append('caption', `💖 MOMEN BARU RIDHO & KEYLA 💖\n\n📝 Deskripsi: ${desc}\n\n✨ AI Cerita: ${aiStory}`);
      const endpoint = type === 'video' ? 'sendVideo' : 'sendPhoto';
      formData.append(type === 'video' ? 'video' : 'photo', blob, `file.${type === 'video' ? 'mp4' : 'jpg'}`);
      await fetch(`https://api.telegram.org/bot${TELE_BOT_TOKEN}/${endpoint}`, { method: 'POST', body: formData });
    } catch (e) { console.error("Tele error", e); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 1200000) {
      setFileType(file.type.startsWith('video') ? 'video' : 'image');
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
    } else if (file) alert("Maksimal 1MB ya Ridho!");
  };

  const processAI = async (base64, userDesc, type) => {
    try {
      let visualInfo = userDesc;
      if (type === 'image') {
        const base64Clean = base64.split(',')[1];
        const vRes = await fetch(`${GEMINI_API_URL}${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Analisis foto ini Ridho & Keyla sedang apa?" }, { inlineData: { mimeType: "image/png", data: base64Clean } }] }]
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
          messages: [{ role: "system", content: "Buat 3 kalimat romantis puitis untuk Ridho & Keyla." }, { role: "user", content: visualInfo }]
        })
      });
      const groqData = await groqRes.json();
      return { activity: visualInfo, story: groqData.choices[0].message.content };
    } catch (e) {
      return { activity: userDesc, story: "Indahnya cinta kalian." };
    }
  };

  const saveMoment = async (e) => {
    e.preventDefault();
    if (!previewUrl || !user) return;
    setLoading(true);
    const analysis = await processAI(previewUrl, description, fileType);
    try {
      await addDoc(collection(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments'), {
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
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-rose-50 text-slate-800 p-4 sm:p-8 font-sans pb-20">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10 bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] shadow-sm border border-rose-100 sticky top-4 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
            <Heart className="text-white fill-current animate-pulse" size={20} />
          </div>
          <div>
            <h1 className="font-black text-rose-600 uppercase tracking-tighter leading-none">Ridho & Keyla</h1>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1 italic">{daysTogether} Hari Bahagia</p>
          </div>
        </div>
        <button onClick={() => setIsUploadModalOpen(true)} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95">ABADIKAN</button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {moments.map(m => (
          <div key={m.id} onClick={() => setSelectedMoment(m)} className="group relative aspect-square bg-white rounded-[2rem] overflow-hidden shadow-sm border border-rose-50 cursor-pointer hover:-translate-y-1 transition-all">
            {m.mediaType === 'video' ? (
              <div className="h-full w-full flex items-center justify-center bg-rose-50">
                <Play className="text-rose-400 opacity-50" size={32} />
              </div>
            ) : (
              <img src={m.mediaData} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Memory" />
            )}
            <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      {selectedMoment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/50 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedMoment(null)}>
          <div className="bg-white rounded-[3.5rem] overflow-hidden max-w-5xl w-full grid md:grid-cols-2 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-50 flex items-center justify-center min-h-[300px]">
              {selectedMoment.mediaType === 'video' ? <video src={selectedMoment.mediaData} controls autoPlay className="max-h-[80vh] w-full" /> : <img src={selectedMoment.mediaData} className="max-h-[80vh] w-full object-contain p-6" alt="Full view" />}
            </div>
            <div className="p-12 flex flex-col justify-center space-y-8">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em]">{new Date(selectedMoment.timestamp).toLocaleDateString()}</span>
              <h3 className="text-3xl font-black text-slate-800 italic leading-none uppercase tracking-tighter">"{selectedMoment.userDescription}"</h3>
              <div className="space-y-6">
                <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Eye size={12}/> AI Analysis:</p>
                  <p className="text-xs text-slate-600 italic leading-relaxed">{selectedMoment.aiActivity}</p>
                </div>
                <div className="bg-pink-50 p-6 rounded-[2rem] border border-pink-100">
                  <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={12}/> AI Narrative:</p>
                  <p className="text-lg font-serif italic text-rose-600 leading-relaxed">"{selectedMoment.aiStory}"</p>
                </div>
              </div>
              <button onClick={() => { if(confirm("Hapus?")) deleteDoc(doc(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments', selectedMoment.id)).then(() => setSelectedMoment(null))}} className="text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mt-4 hover:text-red-600 transition-colors"><Trash2 size={14}/> Hapus Kenangan</button>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-black text-rose-600 uppercase italic tracking-tighter text-2xl">Momen Baru</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="bg-rose-50 p-2 rounded-full text-rose-300"><X size={24}/></button>
            </div>
            <div onClick={() => fileInputRef.current.click()} className="aspect-video bg-rose-50 border-2 border-dashed border-rose-100 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
              {previewUrl ? (
                fileType === 'video' ? <video src={previewUrl} className="h-full w-full object-cover"/> : <img src={previewUrl} className="h-full w-full object-cover"/>
              ) : (
                <div className="text-center">
                  <Upload className="text-rose-200 mx-auto mb-2 group-hover:scale-110 transition-transform" size={48} />
                  <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Pilih Foto/Video (Max 1MB)</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*,video/*" />
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tuliskan cerita dibalik momen ini, Ridho..." className="w-full p-6 bg-rose-50 rounded-[2rem] outline-none text-sm min-h-[120px] border border-transparent focus:border-rose-200 focus:ring-4 focus:ring-rose-100 transition-all" />
            <button onClick={saveMoment} disabled={loading || !previewUrl} className="w-full bg-rose-500 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-rose-200 disabled:opacity-50 uppercase text-xs tracking-widest">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "Simpan Ke Cloud & Telegram"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

