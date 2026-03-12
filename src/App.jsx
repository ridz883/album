import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Heart, Plus, Trash2, Sparkles, Camera, Send, Loader2, X, Upload, Play, Clock, Eye, Maximize2, AlertTriangle } from 'lucide-react';

// --- LOGIKA AMBIL CONFIG ---
let firebaseConfig = null;
const configRaw = import.meta.env.VITE_FIREBASE_CONFIG;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

try {
  if (configRaw) firebaseConfig = JSON.parse(configRaw);
} catch (e) {
  console.error("Format VITE_FIREBASE_CONFIG salah!");
}

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

  // Jika config tidak ada, tampilkan pesan error di layar (bukan blank putih)
  if (!firebaseConfig || !GROQ_API_KEY) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-10 text-center">
        <AlertTriangle size={64} className="text-rose-500 mb-4" />
        <h1 className="text-2xl font-black text-rose-600 uppercase">Akses Terhenti</h1>
        <p className="text-slate-600 mt-2 max-w-md">
          Ridho, sepertinya kamu belum mengatur <b>Environment Variables</b> di Vercel. 
          Aplikasi tidak bisa berjalan tanpa API Key.
        </p>
        <div className="mt-6 bg-white p-4 rounded-2xl text-xs text-left font-mono border border-rose-100">
          Cek Settings Vercel: <br/>
          - VITE_FIREBASE_CONFIG <br/>
          - VITE_GROQ_API_KEY
        </div>
      </div>
    );
  }

  // Firebase Init (Hanya jika config ada)
  const app = initializeApp(firebaseConfig);
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
    const appId = "ridho-keyla-ultimate";
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'moments');
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

      await addDoc(collection(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments'), {
        mediaData: previewUrl,
        mediaType: fileType,
        userDescription: description,
        aiStory: story,
        timestamp: Date.now()
      });
      setIsUploadModalOpen(false);
      setPreviewUrl('');
      setDescription('');
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-rose-50 text-slate-800 p-4 sm:p-8">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10 bg-white p-6 rounded-3xl shadow-sm border border-rose-100">
        <div className="flex items-center gap-3">
          <Heart className="text-rose-500 fill-current animate-pulse" />
          <div>
            <h1 className="font-black text-rose-600 uppercase tracking-tighter">Ridho & Keyla</h1>
            <p className="text-[10px] font-bold text-rose-300 tracking-widest uppercase">{daysTogether} Hari Berdua</p>
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
              <img src={m.mediaData} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
            )}
            <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      {selectedMoment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedMoment(null)}>
          <div className="bg-white rounded-[3rem] overflow-hidden max-w-5xl w-full grid md:grid-cols-2 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-50 flex items-center justify-center min-h-[300px]">
              {selectedMoment.mediaType === 'video' ? <video src={selectedMoment.mediaData} controls autoPlay className="max-h-[80vh] w-full" /> : <img src={selectedMoment.mediaData} className="max-h-[80vh] w-full object-contain p-4" />}
            </div>
            <div className="p-10 flex flex-col justify-center space-y-6">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.3em]">{new Date(selectedMoment.timestamp).toLocaleDateString()}</span>
              <h3 className="text-3xl font-black text-slate-800 italic leading-tight">"{selectedMoment.userDescription}"</h3>
              <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 italic text-sm text-slate-600">
                <Sparkles className="inline-block mr-2 text-rose-400" size={16} />
                {selectedMoment.aiStory}
              </div>
              <button onClick={() => { if(confirm("Hapus?")) deleteDoc(doc(db, 'artifacts', 'ridho-keyla-ultimate', 'public', 'data', 'moments', selectedMoment.id)).then(() => setSelectedMoment(null))}} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"><Trash2 size={14}/> Hapus dari Memori</button>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/50 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-rose-600 uppercase italic tracking-tighter text-xl">Upload Momen Baru</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="bg-rose-50 p-2 rounded-full"><X size={20}/></button>
            </div>
            <div onClick={() => fileInputRef.current.click()} className="aspect-video bg-rose-50 border-2 border-dashed border-rose-100 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
              {previewUrl ? (
                fileType === 'video' ? <video src={previewUrl} className="h-full w-full object-cover"/> : <img src={previewUrl} className="h-full w-full object-cover"/>
              ) : (
                <>
                  <Upload className="text-rose-200 group-hover:text-rose-400 transition-colors" size={48} />
                  <p className="text-[10px] font-bold text-rose-300 mt-2 uppercase">Pilih Foto/Video (Max 1MB)</p>
                </>
              )}
              <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*,video/*" />
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tuliskan ceritanya..." className="w-full p-6 bg-rose-50 rounded-3xl outline-none text-sm min-h-[120px] focus:ring-4 focus:ring-rose-100 transition-all" />
            <button onClick={saveMoment} disabled={loading || !previewUrl} className="w-full bg-rose-500 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-rose-200 disabled:opacity-50 uppercase text-xs tracking-widest">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "Abadikan Sekarang"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- LOGIKA MOUNTING KE HTML ---
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

