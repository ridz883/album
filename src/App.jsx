import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Heart, Plus, Trash2, Sparkles, Camera, Send, Loader2, X, Upload, Play, Clock, Eye, Maximize2 } from 'lucide-react';

// Ambil config dari environment variable Vercel (lebih aman)
// Jika kamu ingin hardcode dulu untuk tes, ganti import.meta.env dengan string config kamu
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || __firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "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";

export default function App() {
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
    const diff = Math.floor((new Date() - anniversary) / (1000 * 60 * 60 * 24));
    setDaysTogether(diff > 0 ? diff : 0);
  }, []);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', (typeof __app_id !== 'undefined' ? __app_id : 'ridho-keyla'), 'public', 'data', 'moments');
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMoments(data.sort((a, b) => b.timestamp - a.timestamp));
    });
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 1100000) {
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
      // Logic AI Groq (disederhanakan untuk contoh deploy)
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: "Buat 1 kalimat romantis untuk Ridho & Keyla." }, { role: "user", content: description }]
        })
      });
      const data = await res.json();
      const story = data.choices[0].message.content;

      await addDoc(collection(db, 'artifacts', (typeof __app_id !== 'undefined' ? __app_id : 'ridho-keyla'), 'public', 'data', 'moments'), {
        mediaData: previewUrl,
        mediaType: fileType,
        userDescription: description,
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
      <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-3xl shadow-sm border border-rose-100">
        <div className="flex items-center gap-3">
          <Heart className="text-rose-500 fill-current animate-pulse" />
          <div>
            <h1 className="font-black text-rose-600 uppercase">Ridho & Keyla</h1>
            <p className="text-[10px] font-bold text-rose-300 tracking-widest">{daysTogether} HARI BERSAMA</p>
          </div>
        </div>
        <button onClick={() => setIsUploadModalOpen(true)} className="bg-rose-500 text-white px-6 py-2 rounded-2xl font-bold text-xs">UPLOAD</button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {moments.map(m => (
          <div key={m.id} onClick={() => setSelectedMoment(m)} className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm border border-rose-100 cursor-pointer hover:scale-105 transition-transform">
            {m.mediaType === 'video' ? <div className="h-full flex items-center justify-center bg-rose-100"><Play className="text-rose-400" /></div> : <img src={m.mediaData} className="h-full w-full object-cover" />}
          </div>
        ))}
      </div>

      {selectedMoment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setSelectedMoment(null)}>
          <div className="bg-white rounded-[2.5rem] overflow-hidden max-w-4xl w-full grid md:grid-cols-2 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-100 flex items-center justify-center">
              {selectedMoment.mediaType === 'video' ? <video src={selectedMoment.mediaData} controls autoPlay className="max-h-[70vh]" /> : <img src={selectedMoment.mediaData} className="max-h-[70vh] object-contain" />}
            </div>
            <div className="p-10 space-y-6">
              <h3 className="text-2xl font-black text-rose-600">"{selectedMoment.userDescription}"</h3>
              <p className="text-slate-600 italic leading-relaxed">AI Story: {selectedMoment.aiStory}</p>
              <button onClick={() => deleteDoc(doc(db, 'artifacts', (typeof __app_id !== 'undefined' ? __app_id : 'ridho-keyla'), 'public', 'data', 'moments', selectedMoment.id)).then(() => setSelectedMoment(null))} className="text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Trash2 size={14}/> Hapus Kenangan</button>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-rose-600 uppercase">Tambah Kenangan</h2>
              <button onClick={() => setIsUploadModalOpen(false)}><X/></button>
            </div>
            <div onClick={() => fileInputRef.current.click()} className="aspect-video bg-rose-50 border-2 border-dashed border-rose-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer overflow-hidden">
              {previewUrl ? (fileType === 'video' ? <video src={previewUrl} className="h-full w-full object-cover"/> : <img src={previewUrl} className="h-full w-full object-cover"/>) : <Upload className="text-rose-200"/>}
              <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*,video/*" />
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Cerita singkat..." className="w-full p-4 bg-rose-50 rounded-2xl outline-none text-sm min-h-[100px]" />
            <button onClick={saveMoment} disabled={loading || !previewUrl} className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "SIMPAN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

