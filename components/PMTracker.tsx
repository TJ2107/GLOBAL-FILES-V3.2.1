
import React, { useMemo, useState } from 'react';
import { GlobalFileRow } from '../types';
import { 
  ClipboardCheck, MapPin, Search, Filter, 
  CheckCircle2, AlertTriangle, Clock, ListFilter, 
  Download, Activity, User, Settings2, Info, CalendarDays,
  ChevronLeft, ChevronRight, Target, Hash
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PMTrackerProps {
  data: GlobalFileRow[];
  onFilterChange: (column: string, value: string) => void;
  onSwitchToData: () => void;
}

const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const formatDateDisplay = (val: any): string => {
  const d = parseDate(val);
  if (!d) return typeof val === 'string' ? val : '-';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const toInputDate = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const PMTracker: React.FC<PMTrackerProps> = ({ data, onFilterChange, onSwitchToData }) => {
  const [selectedDate, setSelectedDate] = useState(() => toInputDate(new Date()));
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const regions = useMemo(() => {
    const regs = new Set<string>();
    data.forEach(row => {
      if (row["Region"]) regs.add(String(row["Region"]).trim().toUpperCase());
    });
    return Array.from(regs).sort();
  }, [data]);

  const pmTypes = useMemo(() => {
    const types = new Set<string>();
    data.forEach(row => {
      if (row["Types de PM"]) types.add(String(row["Types de PM"]).trim());
    });
    return Array.from(types).sort();
  }, [data]);

  const pmStats = useMemo(() => {
    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    
    const plannedSet = new Set<string>();
    const doneOkSet = new Set<string>();
    const doneLateSet = new Set<string>();
    const processedPmNumbers = new Set<string>();

    const detailList: (GlobalFileRow & { pmStatus: 'OK' | 'LATE' | 'PENDING' })[] = [];

    data.forEach(row => {
      // On ignore strictement les lignes sans PM number pour ce tracker
      const pmNum = String(row["PM number"] || "").trim();
      if (!pmNum) return;

      const pmDate = parseDate(row["PM Date"]);
      const region = String(row["Region"] || "").trim().toUpperCase();
      const type = String(row["Types de PM"] || "").trim();

      // Vérification du jour
      if (!pmDate) return;
      const compareDate = new Date(pmDate);
      compareDate.setHours(0,0,0,0);
      
      if (compareDate.getTime() !== targetDate.getTime()) return;
      if (selectedRegion !== 'ALL' && region !== selectedRegion) return;
      if (selectedType !== 'ALL' && type !== selectedType) return;

      if (!processedPmNumbers.has(pmNum)) {
        plannedSet.add(pmNum);

        const hasExecutionDate = !!row["PM date execute"] || !!row["Date executee"];
        const hasReplanDate = !!row["PM date replanifiée"];
        
        let status: 'OK' | 'LATE' | 'PENDING' = 'PENDING';

        if (hasExecutionDate) {
          doneOkSet.add(pmNum);
          status = 'OK';
        } else if (hasReplanDate) {
          doneLateSet.add(pmNum);
          status = 'LATE';
        }

        detailList.push({ ...row, pmStatus: status });
        processedPmNumbers.add(pmNum);
      }
    });

    const planned = plannedSet.size;
    const doneOk = doneOkSet.size;
    const doneLate = doneLateSet.size;
    const remaining = Math.max(0, planned - (doneOk + doneLate));

    return { planned, doneOk, doneLate, remaining, detailList };
  }, [data, selectedDate, selectedRegion, selectedType]);

  const filteredList = useMemo(() => {
    if (!searchTerm) return pmStats.detailList;
    const s = searchTerm.toLowerCase();
    return pmStats.detailList.filter(row => 
      String(row["Nom du site"]).toLowerCase().includes(s) ||
      String(row["PM number"]).toLowerCase().includes(s) ||
      String(row["FE names"]).toLowerCase().includes(s) ||
      String(row["ID"]).toLowerCase().includes(s)
    );
  }, [pmStats.detailList, searchTerm]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toInputDate(d));
  };

  const exportPMReport = () => {
    const exportData = pmStats.detailList.map(row => ({
      "ID Site": row["ID"],
      "PM Number": row["PM number"],
      "Site": row["Nom du site"],
      "Région": row["Region"],
      "Type PM": row["Types de PM"],
      "FE Names": row["FE names"],
      "Date Prévue": formatDateDisplay(row["PM Date"]),
      "Date Exécutée": formatDateDisplay(row["PM date execute"]),
      "Date Replanifiée": formatDateDisplay(row["PM date replanifiée"]),
      "Status": row["status"],
      "Diagnostic": row.pmStatus === 'OK' ? 'CONFORME' : row.pmStatus === 'LATE' ? 'REPLANIFIÉ' : 'À RÉALISER'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal_PM");
    XLSX.writeFile(wb, `JOURNAL_PM_${selectedDate}.xlsx`);
  };

  const KPICard = ({ title, value, icon: Icon, colorClass, bgColor }: any) => (
    <div className={`${bgColor} p-8 rounded-[3rem] shadow-sm border border-white flex flex-col justify-between relative overflow-hidden group hover:shadow-xl transition-all duration-500 min-h-[180px]`}>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{title}</p>
        <h4 className={`text-5xl font-black tracking-tighter ${colorClass}`}>{value}</h4>
      </div>
      <div className={`absolute -right-6 -bottom-6 opacity-10 group-hover:opacity-20 transition-all duration-700`}>
        <Icon className={`w-32 h-32 rotate-12 ${colorClass}`} />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 bg-[#F8FAFC] min-h-full font-sans">
      {/* HEADER AVEC FILTRE JOURNALIER */}
      <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-600 p-5 rounded-[2rem] shadow-xl shadow-indigo-100">
            <CalendarDays className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
              PM <span className="text-indigo-600">Daily Ops</span>
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Audit journalier par PM Number unique</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date d'exécution</span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-1 shadow-inner">
               <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronLeft className="w-5 h-5" /></button>
               <input 
                 type="date" 
                 value={selectedDate} 
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="bg-transparent border-none text-sm font-black text-indigo-600 outline-none focus:ring-0 cursor-pointer text-center"
               />
               <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone</span>
            <select 
              value={selectedRegion} 
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">TOUTES ZONES</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Type PM</span>
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">TOUS TYPES</option>
              {pmTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex gap-2 lg:mt-5">
            <button 
              onClick={() => setSelectedDate(toInputDate(new Date()))}
              className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all shadow-sm"
              title="Aujourd'hui"
            >
              <Target className="w-5 h-5" />
            </button>
            <button 
              onClick={exportPMReport}
              className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
              title="Exporter le journal"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <KPICard title="PM Planifiés (Jour)" value={pmStats.planned} icon={CalendarDays} colorClass="text-indigo-600" bgColor="bg-white" />
        <KPICard title="Exécutés (OK)" value={pmStats.doneOk} icon={CheckCircle2} colorClass="text-emerald-600" bgColor="bg-emerald-50/30" />
        <KPICard title="Replanifiés" value={pmStats.doneLate} icon={AlertTriangle} colorClass="text-amber-600" bgColor="bg-amber-50/30" />
        <KPICard title="Restants" value={pmStats.remaining} icon={Clock} colorClass="text-rose-600" bgColor="bg-rose-50/30" />
      </div>

      <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 shrink-0 gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-3 rounded-2xl">
              <ListFilter className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Registre Journalier : {new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Visualisation par PM Number unique</p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input 
              type="text" 
              placeholder="Chercher ID, PM Number, Site ou FE..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="py-5 px-4">ID Site</th>
                <th className="py-5 px-4">PM Number / Site</th>
                <th className="py-5 px-4">Date Planifiée</th>
                <th className="py-5 px-4">Type de PM</th>
                <th className="py-5 px-4">FE Names (Intervenant)</th>
                <th className="py-5 px-4 text-center">Exécution</th>
                <th className="py-5 px-4 text-center">Replanifié</th>
                <th className="py-5 px-4 text-center">Statut</th>
                <th className="py-5 px-4 text-right">Diagnostic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredList.map((row, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/30 cursor-pointer group transition-colors" onClick={() => { onFilterChange("N° SWO", String(row["N° SWO"])); onSwitchToData(); }}>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[11px] font-black text-slate-500 uppercase">{row["ID"] || "N/A"}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex flex-col">
                      <span className="font-black text-indigo-600 text-[10px] tracking-wider">{row["PM number"]}</span>
                      <span className="text-xs font-black text-slate-800 uppercase leading-tight mt-1">{row["Nom du site"]}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {row["Region"]}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <span className="text-[11px] font-bold text-slate-700">
                      {formatDateDisplay(row["PM Date"])}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-lg text-slate-500 border border-slate-200 uppercase">
                      {row["Types de PM"] || "Standard"}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <User className="w-3 h-3 text-slate-400" />
                      </div>
                      <span className="text-[10px] font-black text-slate-600 uppercase truncate max-w-[120px]">{row["FE names"] || "-"}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4 text-center">
                    <span className="text-[11px] font-black text-emerald-600">
                      {formatDateDisplay(row["PM date execute"])}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-center">
                    <span className="text-[11px] font-black text-amber-600">
                      {formatDateDisplay(row["PM date replanifiée"])}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                      {row["status"] || row["State SWO"] || "OPEN"}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-right">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-xl uppercase border shadow-sm ${
                      row.pmStatus === 'OK' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      row.pmStatus === 'LATE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {row.pmStatus === 'OK' ? 'Conforme' : row.pmStatus === 'LATE' ? 'Replanifié' : 'À Faire'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-32 text-center text-slate-300 italic">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Activity className="w-16 h-16" />
                      <p className="text-sm font-black uppercase tracking-[0.3em]">Aucun PM identifié ce jour</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
