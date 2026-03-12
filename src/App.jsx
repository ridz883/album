import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Heart, Plus, Trash2, Sparkles, Camera, Send, Loader2, X, Upload, Play, Clock, Eye, Maximize2 } from 'lucide-react';

// --- MASUKKAN KUNCI DISINI (HARDCODE) ---
// Ridho, ganti teks di bawah ini dengan config Firebase kamu (yang ada kurung kurawal { })
const FIREBASE_CONFIG_MANUAL = PASTE_KODE_JSON_FIREBASE_KAMU_DISINI; 

// API Key Groq sudah saya masukkan langsung
const GROQ_API_KEY = "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";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";

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

  // Init Firebase
  const app = initializeApp(FIREBASE_CONFIG_MANUAL);
  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    const anniversary = new Date('2025-10-19');
    const diff = Math.floor((new Date() - anniversary) / (1000 * 60 * 60 * 24));
    setDaysTogether(diff > 0 ? diff : 0);
  }, []);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMoments(data.sort((a, b) => b.timestamp - a.timestamp));
    });
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 1200000) {
      setFileType(file.type.startsWith('video') ? 'video' : 'image');
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
    } else if (file) alert("Maksimal 1MB ya!");
  };

  const saveMoment = async (e) => {
    e.preventDefault();
    if (!previewUrl || !user) return;
    setLoading(true);
    try {
      let visualInfo = description;
      if (fileType === 'image') {
        const base64Clean = previewUrl.split(',')[1];
        const vRes = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Analisis foto ini Ridho & Keyla sedang apa?" }, { inlineData: { mimeType: "image/png", data: base64Clean } }] }]
          })
        });
        const vData = await vRes.json();
        visualInfo = vData.candidates?.[0]?.content?.parts?.[0]?.text || description;
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: "Buat 1 kalimat romantis puitis untuk Ridho & Keyla." }, { role: "user", content: visualInfo }]
        })
      });
      const data = await res.json();
      const story = data.choices[0].message.content;

      await addDoc(collection(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments'), {
        mediaData: previewUrl,
        mediaType: fileType,
        userDescription: description,
        aiActivity: visualInfo,
        aiStory: story,
        timestamp: Date.now()
      });
      setIsUploadModalOpen(false);
      setPreviewUrl('');
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-rose-50 text-slate-800 p-4 sm:p-8">
      {/* Pink UI Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10 bg-white p-6 rounded-[2rem] shadow-sm border border-rose-100">
        <div className="flex items-center gap-3">
          <Heart className="text-rose-500 fill-current animate-pulse" />
          <div>
            <h1 className="font-black text-rose-600 uppercase tracking-tighter">Ridho & Keyla</h1>
            <p className="text-[10px] font-bold text-rose-300 tracking-widest uppercase">{daysTogether} Hari Bahagia</p>
          </div>
        </div>
        <button onClick={() => setIsUploadModalOpen(true)} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95">ABADIKAN</button>
      </header>

      {/* Grid 5 Kolom */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {moments.map(m => (
          <div key={m.id} onClick={() => setSelectedMoment(m)} className="group relative aspect-square bg-white rounded-3xl overflow-hidden shadow-sm border border-rose-50 cursor-pointer hover:-translate-y-1 transition-all">
            {m.mediaType === 'video' ? (
              <div className="h-full w-full flex items-center justify-center bg-rose-50">
                <Play className="text-rose-400 opacity-50" size={32} />
              </div>
            ) : (
              <img src={m.mediaData} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
            )}
            <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      {/* Pop-up Foto Membesar (Sedang Apa) */}
      {selectedMoment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/40 backdrop-blur-md" onClick={() => setSelectedMoment(null)}>
          <div className="bg-white rounded-[3rem] overflow-hidden max-w-5xl w-full grid md:grid-cols-2 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-50 flex items-center justify-center min-h-[300px]">
              {selectedMoment.mediaType === 'video' ? <video src={selectedMoment.mediaData} controls autoPlay className="max-h-[80vh] w-full" /> : <img src={selectedMoment.mediaData} className="max-h-[80vh] w-full object-contain p-4" />}
            </div>
            <div className="p-10 flex flex-col justify-center space-y-6">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.3em]">{new Date(selectedMoment.timestamp).toLocaleDateString()}</span>
              <h3 className="text-2xl font-black text-slate-800 italic leading-tight">"{selectedMoment.userDescription}"</h3>
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Analisis Aktivitas:</p>
                <p className="text-sm text-slate-600 italic leading-relaxed">{selectedMoment.aiActivity}</p>
                <div className="h-[1px] bg-rose-100 w-full" />
                <p className="text-xs text-rose-400 font-bold uppercase tracking-widest">Narasi AI:</p>
                <p className="text-lg font-serif italic text-rose-600 leading-relaxed">"{selectedMoment.aiStory}"</p>
              </div>
              <button onClick={() => deleteDoc(doc(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments', selectedMoment.id)).then(() => setSelectedMoment(null))} className="text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mt-4"><Trash2 size={14}/> Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/50 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-rose-600 uppercase italic tracking-tighter text-xl">Momen Baru</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="bg-rose-50 p-2 rounded-full"><X size={20}/></button>
            </div>
            <div onClick={() => fileInputRef.current.click()} className="aspect-video bg-rose-50 border-2 border-dashed border-rose-100 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
              {previewUrl ? (
                fileType === 'video' ? <video src={previewUrl} className="h-full w-full object-cover"/> : <img src={previewUrl} className="h-full w-full object-cover"/>
              ) : (
                <div className="text-center">
                  <Upload className="text-rose-200 mx-auto mb-2" size={40} />
                  <p className="text-[10px] font-black text-rose-300 uppercase">Pilih Foto/Video (Max 1MB)</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*,video/*" />
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Apa ceritanya..." className="w-full p-6 bg-rose-50 rounded-[2rem] outline-none text-sm min-h-[100px]" />
            <button onClick={saveMoment} disabled={loading || !previewUrl} className="w-full bg-rose-500 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-rose-200 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "SIMPAN MOMEN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

