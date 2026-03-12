import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Heart, Plus, Trash2, Sparkles, Calendar, Camera, Send, Loader2, X, Upload, Play, Clock, Eye, Maximize2 } from 'lucide-react';

// --- CONFIGURASI FIREBASE RIDHO ---
const firebaseConfig = {
  apiKey: "AIzaSyDx4Dl4qx_4PJh9f91N3B095fzIDyfbbDQ",
  authDomain: "ridho-keyla.firebaseapp.com",
  projectId: "ridho-keyla",
  storageBucket: "ridho-keyla.firebasestorage.app",
  messagingSenderId: "888787093462",
  appId: "1:888787093462:web:02ecddb10dcdc6a80f0677",
  measurementId: "G-1CTXF49VZB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const GROQ_API_KEY = "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";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";
const apiKey = ""; 

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

  useEffect(() => {
    const anniversary = new Date('2025-10-19');
    const updateDays = () => {
      const today = new Date();
      const diff = Math.floor((today - anniversary) / (1000 * 60 * 60 * 24));
      setDaysTogether(diff > 0 ? diff : 0);
    };
    updateDays();
  }, []);

  useEffect(() => {
    signInAnonymously(auth).catch(err => {
        console.error("Auth Error:", err);
        alert("Gagal konek ke Firebase. Cek koneksi atau settingan Firebase kamu.");
    });
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMoments(data.sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => {
      console.error("Firestore Error:", error);
    });
  }, [user]);

  const sendToTele = async (media, desc, type, aiStory) => {
    try {
      const blob = await (await fetch(media)).blob();
      const formData = new FormData();
      formData.append('chat_id', TELE_CHAT_ID);
      formData.append('caption', `💖 MOMEN BARU RIDHO & KEYLA 💖\n\n📝 Cerita: ${desc}\n\n✨ AI: ${aiStory}`);
      const endpoint = type === 'video' ? 'sendVideo' : 'sendPhoto';
      formData.append(type === 'video' ? 'video' : 'photo', blob, `file.${type === 'video' ? 'mp4' : 'jpg'}`);
      await fetch(`https://api.telegram.org/bot${TELE_BOT_TOKEN}/${endpoint}`, { method: 'POST', body: formData });
    } catch (e) { console.error("Tele error", e); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1100000) {
        alert("Waduh, fotonya kegedean Ridho! Harus di bawah 1MB ya.");
        return;
      }
      setFileType(file.type.startsWith('video') ? 'video' : 'image');
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const saveMoment = async (e) => {
    e.preventDefault();
    if (!previewUrl || !user) return;
    
    setLoading(true);
    try {
      let visualInfo = description || "Momen kebersamaan Ridho & Keyla";
      let story = "Setiap detik bersamamu adalah kebahagiaan.";

      // Analisis AI (Groq & Gemini)
      if (fileType === 'image') {
        try {
            const base64Clean = previewUrl.split(',')[1];
            const vRes = await fetch(`${GEMINI_API_URL}${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: "Analisis foto ini Ridho & Keyla sedang apa?" }, { inlineData: { mimeType: "image/png", data: base64Clean } }] }]
              })
            });
            const vData = await vRes.json();
            visualInfo = vData.candidates?.[0]?.content?.parts?.[0]?.text || visualInfo;

            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: "Buat 2 kalimat romantis untuk Ridho & Keyla." }, { role: "user", content: visualInfo }]
                })
            });
            const groqData = await groqRes.json();
            story = groqData.choices?.[0]?.message?.content || story;
        } catch (aiErr) { console.error("AI Error:", aiErr); }
      }

      // Simpan ke Firebase
      await addDoc(collection(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments'), {
        mediaData: previewUrl,
        mediaType: fileType,
        userDescription: description,
        aiActivity: visualInfo,
        aiStory: story,
        timestamp: Date.now()
      });

      // Kirim Notif Telegram
      sendToTele(previewUrl, description, fileType, story);
      
      setIsUploadModalOpen(false);
      setPreviewUrl('');
      setDescription('');
    } catch (err) { 
      console.error("Save error:", err);
      alert("Gagal simpan! Pastikan database Firebase sudah kamu 'Enable' di Test Mode.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 text-slate-800 p-4 sm:p-8 font-sans pb-20">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10 bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-sm border border-rose-100 sticky top-4 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Heart className="text-white fill-current animate-pulse" size={20} />
          </div>
          <div>
            <h1 className="font-black text-rose-600 uppercase tracking-tighter leading-none">Ridho & Keyla</h1>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1 italic">{daysTogether} Hari Bahagia</p>
          </div>
        </div>
        <button onClick={() => setIsUploadModalOpen(true)} className="bg-rose-500 text-white px-6 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95">ABADIKAN</button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {moments.map(m => (
          <div key={m.id} onClick={() => setSelectedMoment(m)} className="group relative aspect-square bg-white rounded-[2rem] overflow-hidden shadow-sm border border-rose-50 cursor-pointer hover:shadow-xl transition-all">
            {m.mediaType === 'video' ? (
              <div className="h-full w-full flex items-center justify-center bg-rose-50"><Play className="text-rose-400 opacity-50" size={32} /></div>
            ) : (
              <img src={m.mediaData} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Memory" />
            )}
          </div>
        ))}
      </div>

      {selectedMoment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedMoment(null)}>
          <div className="bg-white rounded-[3rem] overflow-hidden max-w-5xl w-full grid md:grid-cols-2 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-50 flex items-center justify-center min-h-[300px]">
              {selectedMoment.mediaType === 'video' ? <video src={selectedMoment.mediaData} controls autoPlay className="max-h-[80vh] w-full" /> : <img src={selectedMoment.mediaData} className="max-h-[80vh] w-full object-contain p-6" alt="Full" />}
            </div>
            <div className="p-10 flex flex-col justify-center space-y-8">
              <h3 className="text-3xl font-black text-slate-800 italic leading-none uppercase tracking-tighter">"{selectedMoment.userDescription}"</h3>
              <div className="space-y-4">
                <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 text-sm italic text-slate-600 leading-relaxed"><Eye className="inline-block mr-2" size={16}/> {selectedMoment.aiActivity}</div>
                <div className="bg-pink-50 p-6 rounded-[2rem] border border-pink-100 text-lg font-serif italic text-rose-600 leading-relaxed"><Sparkles className="inline-block mr-2" size={18}/> "{selectedMoment.aiStory}"</div>
              </div>
              <button onClick={() => { if(confirm("Hapus?")) deleteDoc(doc(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments', selectedMoment.id)).then(() => setSelectedMoment(null))}} className="text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mt-4"><Trash2 size={14}/> Hapus</button>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-rose-600 uppercase italic tracking-tighter text-xl">Momen Baru</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="bg-rose-50 p-2 rounded-full"><X size={20}/></button>
            </div>
            <div onClick={() => fileInputRef.current.click()} className="aspect-video bg-rose-50 border-2 border-dashed border-rose-100 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
              {previewUrl ? (
                fileType === 'video' ? <video src={previewUrl} className="h-full w-full object-cover"/> : <img src={previewUrl} className="h-full w-full object-cover"/>
              ) : (
                <div className="text-center"><Upload className="text-rose-200 mx-auto mb-2" size={40} /><p className="text-[10px] font-black text-rose-300 uppercase">Pilih Foto (Max 1MB)</p></div>
              )}
              <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*,video/*" />
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ridho, ceritakan momen ini..." className="w-full p-6 bg-rose-50 rounded-[2rem] outline-none text-sm min-h-[100px] border border-transparent focus:border-rose-100 transition-all" />
            <button onClick={saveMoment} disabled={loading || !previewUrl} className="w-full bg-rose-500 text-white py-5 rounded-[2rem] font-black shadow-xl disabled:opacity-50 uppercase text-xs tracking-widest">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "Abadikan & Share"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

