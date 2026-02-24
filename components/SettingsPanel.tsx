import React, { useState } from 'react';
import { Settings, Save, X } from 'lucide-react';

interface SettingsPanelProps {
  initialBatteryThreshold: number;
  initialBeltThreshold: number;
  onSave: (batteryThreshold: number, beltThreshold: number) => void;
  onCancel: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  initialBatteryThreshold,
  initialBeltThreshold,
  onSave,
  onCancel,
}) => {
  const [battery, setBattery] = useState(initialBatteryThreshold);
  const [belt, setBelt] = useState(initialBeltThreshold);

  const handleSave = () => {
    onSave(battery, belt);
  };

  return (
    <div className="p-8 bg-white rounded-3xl shadow-2xl max-w-2xl mx-auto my-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200">
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4">
          <Settings className="w-8 h-8 text-indigo-500" />
          <span>Configuration des Seuils</span>
        </h2>
        <button onClick={onCancel} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <X className="w-6 h-6 text-slate-500" />
        </button>
      </div>

      <div className="space-y-8">
        <div>
          <label htmlFor="battery-threshold" className="block text-sm font-bold text-slate-600 mb-2">
            Seuil d'alerte batterie (en mois)
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Déclenche une alerte critique si le dernier remplacement de batterie dépasse ce nombre de mois.
          </p>
          <input
            id="battery-threshold"
            type="number"
            value={battery}
            onChange={(e) => setBattery(parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="Ex: 7"
          />
        </div>

        <div>
          <label htmlFor="belt-threshold" className="block text-sm font-bold text-slate-600 mb-2">
            Seuil d'alerte courroie (en jours)
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Déclenche une alerte critique si le dernier remplacement de courroie dépasse ce nombre de jours.
          </p>
          <input
            id="belt-threshold"
            type="number"
            value={belt}
            onChange={(e) => setBelt(parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="Ex: 180"
          />
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-slate-200 flex justify-end">
        <button
          onClick={handleSave}
          className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5"
        >
          <Save className="w-5 h-5" />
          <span>Enregistrer les modifications</span>
        </button>
      </div>
    </div>
  );
};
