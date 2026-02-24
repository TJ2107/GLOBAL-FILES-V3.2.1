
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { GlobalFileRow } from './types';
import { FileUpload } from './components/FileUpload';
import { DataTable } from './components/DataTable';
import { Dashboard } from './components/Dashboard';
import { DailyStatus } from './components/DailyStatus';
import { TTFAnalysis } from './components/TTFAnalysis';
import { GMSheet } from './components/GMSheet';
import { TASAnalysis } from './components/TASAnalysis';
import { PMTracker } from './components/PMTracker';
import { BatteryTracker } from './components/BatteryTracker';
import { BeltTracker } from './components/BeltTracker';
import { ExportManager } from './components/ExportManager';
import { PredictiveAI } from './components/PredictiveAI';
import { SettingsPanel } from './components/SettingsPanel';
import { MigrationAssistant } from './components/MigrationAssistant';
import { 
  Layout, Database, PieChart, Calendar, Timer, 
  Briefcase, Battery, Settings2, Loader2, 
  Download, Trash2, AlertTriangle,
  CheckCircle2, Settings, Menu, X, ChevronRight, ClipboardList,
  PanelLeftClose, PanelLeftOpen, ClipboardCheck,
  Bell, BrainCircuit, ArrowRight, ShieldAlert
} from 'lucide-react';

const parseDate = (val: string | number | Date | null | undefined): Date | null => {
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

const App: React.FC = () => {
  const [data, setData] = useState<GlobalFileRow[]>([]);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // State for alert thresholds
  const [batteryThreshold, setBatteryThreshold] = useState<number>(7);
  const [beltThreshold, setBeltThreshold] = useState<number>(180);
  const [needsMigration, setNeedsMigration] = useState(false);

  // LOGIQUE DE CENTRALISATION DES ALERTES
  const globalAlerts = useMemo(() => {
    const alerts: { id: string; type: 'CRITICAL' | 'WARNING'; category: string; title: string; desc: string; swo?: string }[] = [];
    const now = new Date();

    if (data.length === 0) return alerts;

    const batterySites: Record<string, { date: Date, swo: string }> = {};
    const beltSites: Record<string, { date: Date, swo: string }> = {};

    data.forEach(row => {
      const desc = String(row["Description"] || "").toLowerCase();
      const site = String(row["Nom du site"] || "Unknown").trim().toUpperCase();
      const date = parseDate(row["Closing date"]) || parseDate(row["Date de Clôture"]);
      const swo = String(row["N° SWO"]);
      const swoState = String(row["State SWO"] || "").toLowerCase();
      
      if (!date) return;

      if (desc.includes("remplacement batterie ge") && swoState === 'closed') {
        if (!batterySites[site] || date > batterySites[site].date) {
          batterySites[site] = { date, swo };
        }
      }
      
      if (desc.includes("courroie")) {
        if (!beltSites[site] || date > beltSites[site].date) beltSites[site] = { date, swo };
      }
    });

    // Alertes Batteries
    Object.entries(batterySites).forEach(([site, info]) => {
      const months = (now.getFullYear() - info.date.getFullYear()) * 12 + (now.getMonth() - info.date.getMonth());
      if (months >= batteryThreshold) {
        alerts.push({ id: `bat-${site}`, type: 'CRITICAL', category: 'Batterie', title: site, desc: `Expirée (${months} mois)`, swo: info.swo });
      }
    });

    // Alertes Courroies
    Object.entries(beltSites).forEach(([site, info]) => {
      const diffDays = Math.floor((now.getTime() - info.date.getTime()) / (1000 * 3600 * 24));
      if (diffDays >= beltThreshold) {
        alerts.push({ id: `belt-${site}`, type: 'CRITICAL', category: 'Courroie', title: site, desc: `Seuil 1000h dépassé (${diffDays}j)`, swo: info.swo });
      }
    });

    return alerts;
  }, [data, batteryThreshold, beltThreshold]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, filterValue]) => {
        const val = filterValue as string;
        if (!val) return true;
        if (val.startsWith('DATE_RANGE|')) return true; 

        const cellValue = row[key];
        const cellString = cellValue !== null && cellValue !== undefined ? String(cellValue) : '';
        return cellString.toLowerCase().includes(val.toLowerCase());
      });
    });
  }, [data, filters]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('Failed to fetch data');
        const dbData = await response.json();
        if (Array.isArray(dbData) && dbData.length > 0) {
          setData(dbData);
          setActiveTab('dashboard');
        }
      } catch (error) {
        console.error('Error fetching data from API:', error);
        // If API fails, check for local data to offer migration
        const savedData = localStorage.getItem('globalFiles_data');
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setNeedsMigration(true);
            }
          } catch {}
        }
      }
    };
    fetchData();
  }, []);



  useEffect(() => {
    const savedSettings = localStorage.getItem('globalFiles_settings');
    if (savedSettings) {
      try {
        const { batteryThreshold, beltThreshold } = JSON.parse(savedSettings);
        if (typeof batteryThreshold === 'number') setBatteryThreshold(batteryThreshold);
        if (typeof beltThreshold === 'number') setBeltThreshold(beltThreshold);
      } catch (e) { 
        console.error("Failed to parse settings from localStorage", e); 
      }
    }
  }, []);

  const handleDataLoaded = async (newData: GlobalFileRow[]) => {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
      if (!response.ok) throw new Error('Failed to save data');
      
      // Re-fetch data to ensure consistency
      const fetchResponse = await fetch('/api/data');
      const dbData = await fetchResponse.json();
      setData(dbData);

    } catch (error) {
      console.error('Error saving data:', error);
      // Optionally, show an error message to the user
    }
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
  };

  const handleAlertClick = (swo?: string) => {
    if (swo) {
      setFilters({ "N° SWO": swo });
      setActiveTab('data');
    }
    setIsNotifOpen(false);
  };

  const handleSaveSettings = (newBattery: number, newBelt: number) => {
    setBatteryThreshold(newBattery);
    setBeltThreshold(newBelt);
    localStorage.setItem('globalFiles_settings', JSON.stringify({ batteryThreshold: newBattery, beltThreshold: newBelt }));
    setActiveTab('dashboard');
  };

  const NavButton = ({ id, label, icon: Icon, colorClass, isNew }: { id: string, label: string, icon: React.ElementType, colorClass?: string, isNew?: boolean }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full group flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-4 rounded-2xl text-[11px] font-black transition-all duration-300 ${
          isActive 
            ? (colorClass || 'bg-white text-indigo-700 shadow-xl translate-x-1') 
            : 'text-indigo-100 hover:bg-white/10'
        }`}
      >
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-4'}`}>
          <div className="relative">
            <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-indigo-200'}`} />
            {isNew && !isActive && <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>}
          </div>
          {!isSidebarCollapsed && <span className="uppercase tracking-widest truncate">{label}</span>}
        </div>
        {!isSidebarCollapsed && isActive && <ChevronRight className="w-4 h-4 text-indigo-400" />}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {needsMigration && <MigrationAssistant onMigrationComplete={() => window.location.reload()} />}
      {/* NOTIFICATION DRAWER */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)}></div>
           <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
              <div className="p-6 bg-indigo-700 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                   <Bell className="w-6 h-6" /> Alertes Critiques
                 </h3>
                 <button onClick={() => setIsNotifOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50/50">
                 {globalAlerts.length > 0 ? globalAlerts.map(alert => (
                   <div key={alert.id} onClick={() => handleAlertClick(alert.swo)} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-rose-500 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black px-2 py-1 bg-rose-50 text-rose-600 rounded-lg uppercase tracking-widest">{alert.category}</span>
                        <ShieldAlert className="w-4 h-4 text-rose-300 group-hover:text-rose-500 transition-colors" />
                      </div>
                      <h4 className="font-black text-slate-800 uppercase text-xs">{alert.title}</h4>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">{alert.desc}</p>
                      <div className="mt-3 pt-2 border-t border-dashed flex justify-between items-center">
                         <span className="text-[9px] font-mono text-slate-400">SWO: {alert.swo}</span>
                         <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                   </div>
                 )) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                      <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                      <p className="font-black uppercase tracking-widest text-xs">Aucune alerte active</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 bg-indigo-800 bg-gradient-to-b from-indigo-800 to-indigo-950 z-[70] transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col shrink-0 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-24' : 'w-72'}`}>
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:flex absolute -right-3 top-24 bg-white text-indigo-800 p-1 rounded-full border border-indigo-200 shadow-lg z-[80] hover:scale-110 active:scale-90 transition-all">
          {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <div className={`p-8 pb-10 flex flex-col items-center transition-all ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <div className={`bg-white/10 p-4 rounded-[2rem] border border-white/20 flex items-center justify-center relative shadow-2xl group cursor-pointer hover:bg-white/20 transition-all ${isSidebarCollapsed ? 'w-14 h-14 p-2' : 'w-20 h-20'}`}>
            <Settings className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-12 h-12'} text-white animate-[spin_12s_linear_infinite]`} />
          </div>
          {!isSidebarCollapsed && (
            <div className="text-center mt-6">
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none">GLOBAL <span className="text-indigo-300">FILES</span></h1>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
          <NavButton id="upload" label="Import Excel" icon={Database} />
          {data.length > 0 && (
            <>
              <div className="h-px bg-white/5 mx-4 my-4"></div>
              <NavButton id="dashboard" label="Analytics" icon={PieChart} />
              <NavButton id="predictive" label="Predictive IA" icon={BrainCircuit} colorClass="bg-indigo-950 text-indigo-300 border border-indigo-700" isNew={true} />
              <NavButton id="data" label="Base de Données" icon={Layout} />
              <NavButton id="daily" label="Daily Status" icon={Calendar} />
              <NavButton id="ttf" label="TTF Analysis" icon={Timer} />
              <NavButton id="gm" label="GM Sheet" icon={Briefcase} />
              <NavButton id="tas" label="TAS Analysis" icon={ClipboardList} />
              <NavButton id="pm" label="PM Statut" icon={ClipboardCheck} />
              <NavButton id="battery" label="Parc Batteries" icon={Battery} />
              <NavButton id="belt" label="Audit Courroies" icon={Settings2} />
              <div className="h-px bg-white/5 mx-4 my-4"></div>
              <NavButton id="export" label="Centre d'Export" icon={Download} />
              <NavButton id="clear" label="Reset Système" icon={Trash2} colorClass="bg-red-500/20 text-red-200" />
            </>
          )}
        </nav>

        {/* SIDEBAR NOTIFICATION CENTER BUTTON */}
        {data.length > 0 && (
          <div className="p-4 px-6 border-t border-white/5 bg-black/10">
             <button 
                onClick={() => setIsNotifOpen(true)}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-4'} p-3 rounded-2xl bg-indigo-900/50 hover:bg-indigo-600 transition-all group border border-white/5`}
             >
                <div className="relative">
                   <Bell className="w-5 h-5 text-indigo-300 group-hover:text-white" />
                   {globalAlerts.length > 0 && (
                     <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[8px] font-black text-white shadow-lg">
                        {globalAlerts.length}
                     </span>
                   )}
                </div>
                {!isSidebarCollapsed && (
                  <div className="text-left">
                    <p className="text-[10px] font-black text-white uppercase tracking-wider">Centre d'alertes</p>
                    <p className="text-[8px] font-bold text-indigo-300 uppercase">{globalAlerts.length} urgences actives</p>
                  </div>
                )}
             </button>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="lg:hidden bg-indigo-800 p-4 flex justify-between items-center shadow-lg z-50">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white"><Menu className="w-6 h-6" /></button>
          <h1 className="text-lg font-black text-white uppercase">Global Files</h1>
          <button onClick={() => setIsNotifOpen(true)} className="relative p-2 text-white">
            <Bell className="w-6 h-6" />
            {globalAlerts.length > 0 && <span className="absolute top-1 right-1 h-3 w-3 bg-rose-600 rounded-full border-2 border-indigo-800"></span>}
          </button>
        </header>

        <main className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
          <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>}>
            {activeTab === 'upload' && <div className="h-full flex items-center justify-center p-6"><FileUpload existingDataCount={data.length} onDataLoaded={handleDataLoaded} /></div>}
            {data.length > 0 && (
              <div className="h-full">
                {activeTab === 'dashboard' && <div className="overflow-auto h-full"><Dashboard data={data} onFilterChange={(col, val) => setFilters(prev => ({ ...prev, [col]: val }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                {activeTab === 'predictive' && <div className="overflow-auto h-full"><PredictiveAI data={data} /></div>}
                {activeTab === 'data' && <div className="p-6 h-full"><DataTable data={data} setData={setData} onUpdateRow={(idx, f, v) => setData(prev => { const n = [...prev]; n[idx] = { ...n[idx], [f]: v }; return n; })} filters={filters} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onApplyFilters={setFilters} /></div>}
                {activeTab === 'daily' && <div className="overflow-auto h-full"><DailyStatus data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                {activeTab === 'ttf' && <div className="overflow-auto h-full"><TTFAnalysis data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                {activeTab === 'gm' && <div className="overflow-auto h-full"><GMSheet data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                {activeTab === 'tas' && <div className="overflow-auto h-full"><TASAnalysis data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                {activeTab === 'pm' && <div className="overflow-auto h-full"><PMTracker data={data} onFilterChange={(c, v) => setFilters(prev => ({ ...prev, [c]: v }))} onSwitchToData={() => setActiveTab('data')} /></div>}
                {activeTab === 'battery' && <div className="overflow-auto h-full"><BatteryTracker data={data} /></div>}
                {activeTab === 'belt' && <div className="overflow-auto h-full"><BeltTracker data={data} /></div>}
                {activeTab === 'export' && <div className="overflow-auto h-full"><ExportManager allData={data} filteredData={filteredData} /></div>}
                {activeTab === 'clear' && (
                  <div className="h-full flex items-center justify-center p-6 bg-red-50/10">
                    <div className="max-w-md w-full bg-white p-12 rounded-[4rem] shadow-2xl text-center space-y-10">
                      <AlertTriangle className="w-14 h-14 text-red-600 mx-auto animate-pulse" />
                      <h3 className="text-3xl font-black uppercase italic">Purger tout</h3>
                      <button onClick={async () => { 
                        try {
                          await fetch('/api/data', { method: 'DELETE' });
                          setData([]); 
                          setFilters({}); 
                          setActiveTab('upload'); 
                        } catch (e) {
                          console.error("Failed to clear data", e);
                        }
                      }} className="w-full py-6 bg-red-600 text-white rounded-3xl font-black hover:bg-red-700 transition-all">CONFIRMER</button>
                    </div>
                  </div>
                )}
                {activeTab === 'settings' && 
                  <SettingsPanel 
                    initialBatteryThreshold={batteryThreshold}
                    initialBeltThreshold={beltThreshold}
                    onSave={handleSaveSettings}
                    onCancel={() => setActiveTab('dashboard')}
                  />
                }
              </div>
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;
