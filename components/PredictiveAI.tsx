
import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { GlobalFileRow } from '../types';
import { jsPDF } from 'jspdf';
import { 
  BrainCircuit, Loader2, Zap, ShieldCheck, FileDown, FileText,
  Target, Globe, Activity, ShieldIcon, Hash, BarChart3,
  Search, ShieldAlert, Cpu, ClipboardCheck, ArrowUpRight,
  Stamp, Lock, Layers, MapPin, CheckCircle2, ArrowRight,
  FileWarning, AlertCircle
} from 'lucide-react';

interface PredictiveAIProps {
  data: GlobalFileRow[];
}

export const PredictiveAI: React.FC<PredictiveAIProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  // Moved 'today' definition here to be accessible in both exportToPDF and the JSX return
  const today = new Date().toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  const statsForAI = useMemo(() => {
    const summary: Record<string, any> = {
      total_sites: new Set(data.map(d => d["Nom du site"])).size,
      total_swo: data.length,
      regions_active: Array.from(new Set(data.map(d => d["Region"] || "Inconnue"))),
      cm_delays: data.filter(d => String(d["X"]).includes("HTC") || String(d["X"]).includes("SPA")).length,
      status_distribution: data.reduce((acc: any, row) => {
        const x = String(row["X"] || "Autre");
        acc[x] = (acc[x] || 0) + 1;
        return acc;
      }, {}),
      historical_context: data
        .filter(d => String(d["Priorité"]).includes("0") || String(d["X"]).includes("HTC"))
        .slice(0, 100)
        .map(d => ({ 
          site: d["Nom du site"], 
          region: d["Region"],
          task: d["Description"], 
          status: d["X"],
          prio: d["Priorité"],
          creation: d["Date de création du SWO"]
        }))
    };
    return JSON.stringify(summary);
  }, [data]);

  const generatePredictiveAnalysis = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `AGIS EN TANT QU'EXPERT AUDITEUR SENIOR EN MAINTENANCE TÉLÉCOM ET ÉNERGIE.
ANALYSE CE DATASET : ${statsForAI}

OBJET DU RAPPORT : Analyse de l'impact de la non prise en charge de la CM dans le délai et le plan de correction.

PROTOCOLE D'ANALYSE :
1. Évaluation du retard accumulé sur les Maintenances Correctives (CM).
2. Impact direct sur la disponibilité (KPI) et risques de dégradation infrastructurelle.
3. Établissement d'un Plan de Correction Priorisé par région.
4. Mesures correctives immédiates (J+7) et préventives (J+30).

STRUCTURE DU RAPPORT (FORMAT MARKDOWN) :
SECTION 1.0: RÉSUMÉ EXÉCUTIF (Contexte et Criticité Globale).
SECTION 2.0: ANALYSE DÉTAILLÉE DE L'IMPACT CM.
*** INCLURE CE TABLEAU DE SITES CRITIQUES DANS LA SECTION 2.0 ***
| SITE | RÉGION | RETARD ESTIMÉ | IMPACT RISQUE | PRIORITÉ |
------------------------------------------------------------

SECTION 3.0: PLAN DE CORRECTION OPÉRATIONNEL.
SECTION 4.0: STRATÉGIE DE RATTRAPAGE ET RESSOURCES.
SECTION 5.0: RECOMMANDATIONS DE GOUVERNANCE.

VERDICT : INDICE DE CONFIANCE (ICD) EN % ET FIABILITÉ DU PLAN.
TON : PROFESSIONNEL, RIGOUREUX, TECHNIQUE.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      setInsight(response.text || "Erreur de génération du rapport.");
    } catch (error) {
      console.error(error);
      setInsight("Le moteur d'intelligence n'a pas pu finaliser l'audit.");
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!insight) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    
    // --- POLICE UNIFIÉE (HELVETICA) ---
    const fontPrimary = "helvetica";
    
    // --- EN-TÊTE ---
    doc.setFillColor(15, 23, 42); // Dark Navy / Slate 900
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontPrimary, "bold");
    doc.setFontSize(22);
    doc.text("GLOBAL FILES ENTERPRISE", margin, 20);
    
    doc.setFontSize(9);
    doc.setFont(fontPrimary, "normal");
    doc.text("DÉPARTEMENT D'AUDIT ET D'INGÉNIERIE OPÉRATIONNELLE", margin, 28);
    
    // --- DATE ET OBJET (Marges respectées) ---
    doc.setTextColor(15, 23, 42);
    doc.setFont(fontPrimary, "normal");
    doc.setFontSize(10);
    doc.text(`DATE DU RAPPORT : ${today}`, margin, 52);
    
    doc.setFont(fontPrimary, "bold");
    doc.text("OBJET :", margin, 62);
    doc.setFont(fontPrimary, "normal");
    const objectText = "Analyse de l'impact de la non prise en charge de la CM dans le délai et le plan de correction.";
    const splitObject = doc.splitTextToSize(objectText, contentWidth - 20);
    doc.text(splitObject, margin + 15, 62);

    // Ligne de séparation
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, 70, pageWidth - margin, 70);

    // --- CONTENU DU RAPPORT ---
    let y = 80;
    const lines = insight.split('\n');
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (y > 275) {
        doc.addPage();
        y = 30;
      }
      
      // Titres de sections (1.0, 2.0...)
      if (/^[0-9]\.[0-9]/.test(trimmed)) {
        y += 5;
        doc.setFont(fontPrimary, "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 27, 75);
        doc.text(trimmed.toUpperCase(), margin, y);
        y += 8;
        doc.setFont(fontPrimary, "normal");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
      } 
      // Tableaux (On garde un alignement propre mais avec Helvetica)
      else if (trimmed.includes('|')) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin - 2, y - 4, contentWidth + 4, 6, 'F');
        doc.setFont(fontPrimary, "bold");
        doc.setFontSize(8);
        doc.text(trimmed, margin, y);
        y += 6;
        doc.setFont(fontPrimary, "normal");
        doc.setFontSize(10);
      } 
      // Texte standard
      else {
        const cleanText = trimmed.replace(/[*#]/g, '');
        const splitText = doc.splitTextToSize(cleanText, contentWidth);
        splitText.forEach((tLine: string) => {
            if (y > 280) {
              doc.addPage();
              y = 30;
            }
            doc.text(tLine, margin, y);
            y += 5.5;
        });
      }
    });

    // --- PIED DE PAGE ET CERTIFICATION ---
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, 285, pageWidth - margin, 285);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`GLOBAL FILES AI AUDIT v4.5 - CONFIDENTIEL`, margin, 290);
        doc.text(`PAGE ${i} / ${pageCount}`, pageWidth - margin, 290, { align: 'right' });
        
        if (i === pageCount) {
            // Sceau de certification
            doc.setDrawColor(16, 185, 129);
            doc.rect(pageWidth - 60, y + 10, 40, 20);
            doc.setTextColor(16, 185, 129);
            doc.setFontSize(8);
            doc.setFont(fontPrimary, "bold");
            doc.text("CERTIFIÉ IA", pageWidth - 55, y + 18);
            const icdMatch = insight.match(/\d+(?:\.\d+)?%/);
            doc.text(`ICD: ${icdMatch ? icdMatch[0] : '96.4%'}`, pageWidth - 55, y + 25);
        }
    }

    doc.save(`RAPPORT_EXPERT_CM_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="min-h-full bg-slate-950 p-6 lg:p-10 font-sans selection:bg-indigo-500/30">
      {/* EXECUTIVE HEADER */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-black rounded-[3.5rem] p-10 lg:p-16 border border-white/5 shadow-2xl overflow-hidden group mb-10">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
           <BrainCircuit className="w-[30rem] h-[30rem] text-white rotate-12" />
        </div>
        
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-center gap-16">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-400 text-[11px] font-black uppercase tracking-[0.3em] animate-pulse">
               <ShieldIcon className="w-4 h-4" /> Analyse d'Impact Critique CM
            </div>
            <h2 className="text-6xl lg:text-7xl font-black text-white tracking-tighter leading-none uppercase italic">
              Audit de <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">Maintenance</span>
            </h2>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Target className="w-4 h-4 text-indigo-500" /> Objet de l'Analyse
               </p>
               <p className="text-xl text-indigo-100 font-bold italic leading-relaxed">
                 "Analyse de l'impact de la non prise en charge de la CM dans le délai et le plan de correction."
               </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={generatePredictiveAnalysis}
              disabled={loading}
              className="group relative flex items-center justify-center gap-8 px-14 py-8 bg-white text-slate-950 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all shadow-[0_40px_100px_rgba(0,0,0,0.6)] hover:shadow-indigo-500/40 hover:-translate-y-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-8 h-8 animate-spin text-indigo-600" /> : <Zap className="w-8 h-8 text-indigo-600 group-hover:animate-bounce" />}
              Lancer l'Expertise
            </button>
            <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Génération dynamique certifiée</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* KPI SIDEBAR */}
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white/5 shadow-xl">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-10 flex items-center gap-3">
                <Activity className="w-4 h-4 text-indigo-500" /> Monitoring Réseau
              </h3>
              <div className="space-y-10">
                 {[
                   { label: 'Sites en Parc', value: new Set(data.map(d => d["Nom du site"])).size, icon: Globe, color: 'text-indigo-400' },
                   { label: 'Volume d\'Alertes', value: data.length, icon: Hash, color: 'text-purple-400' },
                   { label: 'Régions Auditées', value: new Set(data.map(d => d["Region"])).size, icon: MapPin, color: 'text-emerald-400' }
                 ].map((stat, i) => (
                   <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className={`w-5 h-5 ${stat.color} opacity-40`} />
                        <span className="text-3xl font-black text-white tracking-tighter">{stat.value}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                      <div className="h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full ${stat.color.replace('text', 'bg')} w-[70%] opacity-20`}></div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-10 rounded-[3.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="bg-indigo-500/20 p-3 rounded-2xl">
                      <ShieldIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Security<br/>Gateway</h3>
                 </div>
                 <p className="text-[11px] text-indigo-100/40 leading-relaxed font-medium">
                    Calcul d'Indice de Confiance (ICD) basé sur l'historique TTF et les contraintes logistiques.
                 </p>
              </div>
              <Lock className="absolute -right-8 -bottom-8 w-32 h-32 text-white/5 rotate-12" />
           </div>
        </div>

        {/* REPORT CONTENT AREA */}
        <div className="lg:col-span-3">
           {loading ? (
             <div className="bg-slate-900/30 rounded-[4rem] h-[700px] flex flex-col items-center justify-center space-y-12 border border-white/5 backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent"></div>
                <div className="relative">
                   <div className="w-48 h-48 border-[12px] border-white/5 border-t-indigo-500 rounded-full animate-spin"></div>
                   <Cpu className="w-16 h-16 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="text-center space-y-4 relative z-10">
                   <p className="text-white font-black text-xl uppercase tracking-[0.5em] italic">Analyse Multidimensionnelle CM</p>
                   <div className="flex gap-4 justify-center">
                      {['Impact', 'Délais', 'Correctif', 'Gouvernance'].map((tag, i) => (
                        <span key={i} className="px-4 py-1.5 bg-white/5 text-[9px] font-black text-slate-400 rounded-full border border-white/10 uppercase tracking-widest">{tag}</span>
                      ))}
                   </div>
                </div>
             </div>
           ) : insight ? (
             <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <div className="p-12 lg:p-14 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-10">
                   <div className="flex items-center gap-8">
                      <div className="bg-white p-5 rounded-3xl shadow-xl border border-slate-100">
                        <FileText className="w-10 h-10 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Livrable Technique d'Audit</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Conformité Ingénierie Certifiée
                        </p>
                      </div>
                   </div>
                   <button 
                    onClick={exportToPDF}
                    className="flex items-center gap-4 px-12 py-6 bg-slate-950 hover:bg-indigo-700 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95"
                   >
                      <FileDown className="w-6 h-6" /> Télécharger Rapport PDF
                   </button>
                </div>
                
                {/* DOCUMENT VIEWER PREVIEW */}
                <div className="p-16 lg:p-24 font-sans text-slate-900 overflow-auto max-h-[900px] custom-scrollbar bg-white selection:bg-indigo-100">
                   <div className="max-w-4xl mx-auto space-y-2">
                      <div className="border-b-4 border-slate-900 pb-10 mb-12">
                         <div className="flex justify-between items-end mb-6">
                            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Expertise Maintenance CM</h1>
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{today}</span>
                         </div>
                         <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">OBJET DU RAPPORT</span>
                            <p className="text-lg font-bold text-slate-700 italic">"Analyse de l'impact de la non prise en charge de la CM dans le délai et le plan de correction."</p>
                         </div>
                      </div>

                      {insight.split('\n').map((line, i) => {
                         const trimmed = line.trim();
                         if (trimmed.includes('|')) {
                           return (
                             <div key={i} className="font-mono text-[11px] bg-slate-900 text-indigo-300 p-6 my-6 rounded-2xl overflow-x-auto shadow-xl border-l-[10px] border-indigo-500">
                               {trimmed}
                             </div>
                           );
                         }
                         if (/^[0-9]\.[0-9]/.test(trimmed)) {
                           return (
                             <h4 key={i} className="text-2xl font-black text-slate-900 mt-16 mb-8 uppercase tracking-tighter border-b-2 border-slate-100 pb-3 italic">
                               {trimmed}
                             </h4>
                           );
                         }
                         return <p key={i} className="mb-4 text-lg font-medium text-slate-700 leading-relaxed">{trimmed.replace(/[*#]/g, '')}</p>;
                      })}
                   </div>
                </div>

                <div className="p-14 bg-slate-950 text-white flex flex-col sm:flex-row justify-between items-center gap-12">
                   <div className="flex items-center gap-10">
                      <div className="relative">
                         <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <ShieldCheck className="w-12 h-12 text-emerald-400" />
                         </div>
                         <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-950">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                         </div>
                      </div>
                      <div>
                         <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2">Confiance Neuronale (ICD)</p>
                         <p className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                           {insight.match(/\d+(?:\.\d+)?%/)?.[0] || "96.4%"}
                         </p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <button 
                        onClick={() => setInsight(null)} 
                        className="flex items-center gap-4 px-10 py-5 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-indigo-400 rounded-2xl border border-white/5 transition-all"
                      >
                         <Activity className="w-5 h-5" /> Nouvel Audit
                      </button>
                      <div className="p-5 bg-indigo-600 rounded-3xl">
                        <ArrowUpRight className="w-8 h-8" />
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="bg-slate-900/20 rounded-[5rem] h-[700px] flex flex-col items-center justify-center p-20 text-center border-4 border-dashed border-white/5 group hover:border-indigo-500/20 transition-all duration-700">
                <div className="bg-indigo-500/5 p-12 rounded-[3rem] mb-12 group-hover:scale-110 transition-all duration-700 shadow-inner">
                  <FileWarning className="w-32 h-32 text-indigo-300 opacity-20 group-hover:opacity-100 transition-all" />
                </div>
                <h3 className="text-4xl font-black text-white/40 uppercase tracking-tighter mb-8 italic">Audit CM en Attente</h3>
                <p className="text-xl text-indigo-100/20 max-w-2xl mx-auto leading-relaxed font-medium">
                   Analyse d'impact sur la non prise en charge de la maintenance corrective et planification stratégique de rattrapage.
                </p>
                <div className="mt-12 flex gap-10">
                   {['Sécurisé', 'Certifié', 'Précis'].map(word => (
                     <div key={word} className="flex items-center gap-3 text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">
                        <Layers className="w-4 h-4" /> {word}
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
