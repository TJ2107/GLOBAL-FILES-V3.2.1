
import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Loader2, Database, ListPlus, RefreshCcw, X, RefreshCw } from 'lucide-react';
import { GlobalFileRow } from '../types';
import { normalizeRow } from '../utils/dataNormalization';
import { fetchPMData } from '../services/pmApiService';

interface FileUploadProps {
  onDataLoaded: (data: GlobalFileRow[], append: boolean, targetTab?: string) => void;
  existingDataCount: number;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, existingDataCount, className = "" }) => {
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingData, setPendingData] = useState<GlobalFileRow[] | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const processFile = useCallback((file: File) => {
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("No data found");
        
        const workbook = XLSX.read(new Uint8Array(data as ArrayBuffer), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rawData = XLSX.utils.sheet_to_json(sheet) as any[];
        const sanitizedData = rawData.map(row => normalizeRow(row));
        
        if (existingDataCount > 0) {
          setPendingData(sanitizedData);
        } else {
          onDataLoaded(sanitizedData, false);
        }
      } catch (error) {
        console.error("Error parsing file", error);
        alert("Erreur lors de la lecture du fichier Excel. Vérifiez le format.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  }, [onDataLoaded, existingDataCount]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const handleSyncAPI = async () => {
    setIsSyncing(true);
    try {
      const apiData = await fetchPMData();
      if (apiData.length > 0) {
        if (existingDataCount > 0) {
          setPendingData(apiData);
        } else {
          onDataLoaded(apiData, false, 'pm');
        }
      } else {
        alert("Aucune donnée PM trouvée sur l'API.");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la synchronisation des données PM.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={`w-full max-w-2xl relative ${className}`}>
      {/* Modal de choix si données existantes */}
      {pendingData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full border border-indigo-50 animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-indigo-100 p-3 rounded-2xl">
                <Database className="w-6 h-6 text-indigo-600" />
              </div>
              <button onClick={() => setPendingData(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Importation de données</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Le fichier contient <span className="font-bold text-indigo-600">{pendingData.length} lignes</span>. 
              Une base de données de <span className="font-bold text-slate-800">{existingDataCount} lignes</span> existe déjà.
            </p>

            <div className="space-y-3">
              <button 
                onClick={() => { onDataLoaded(pendingData, true, 'pm'); setPendingData(null); }}
                className="w-full flex items-center justify-between p-4 bg-white border-2 border-indigo-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ListPlus className="w-5 h-5 text-indigo-600" />
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Ajouter & Fusionner</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Mise à jour sans perte</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <span className="text-lg font-bold">+</span>
                </div>
              </button>

              <button 
                onClick={() => { onDataLoaded(pendingData, false, 'pm'); setPendingData(null); }}
                className="w-full flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-red-600 hover:bg-red-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <RefreshCcw className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Remplacer (Écraser)</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Réinitialiser la base</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className={`w-full p-12 border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all duration-300
          ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-[1.02] shadow-2xl shadow-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xl shadow-sm'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="flex flex-col items-center text-indigo-600 py-12">
            <div className="relative mb-6">
              <Loader2 className="w-16 h-16 animate-spin" />
              <FileSpreadsheet className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-lg font-black uppercase tracking-widest animate-pulse">Extraction de l'intelligence...</p>
          </div>
        ) : (
          <>
            <div className="bg-indigo-50 p-6 rounded-[2rem] mb-6 shadow-inner transition-transform group-hover:scale-110">
              <FileSpreadsheet className="w-16 h-16 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Charger le Global File</h3>
            <p className="text-slate-400 text-center mb-10 max-w-sm font-medium leading-relaxed">
              Glissez votre fichier <span className="text-indigo-600 font-bold">.xlsx</span> ici ou utilisez le bouton pour mettre à jour vos indicateurs.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <label className="relative cursor-pointer bg-slate-900 text-white px-10 py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl hover:shadow-indigo-200 active:scale-95 flex items-center gap-3 font-black text-sm uppercase tracking-widest">
                <Upload className="w-5 h-5" />
                <span>Parcourir</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".xlsx, .xls, .csv"
                  onChange={handleChange}
                />
              </label>

              <button
                onClick={handleSyncAPI}
                disabled={isSyncing}
                className="bg-white border-2 border-indigo-100 text-indigo-600 px-10 py-5 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all shadow-sm active:scale-95 flex items-center gap-3 font-black text-sm uppercase tracking-widest disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync PM API</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
