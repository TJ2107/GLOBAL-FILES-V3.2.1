
import { GlobalFileRow } from '../types';
import { normalizeRow } from '../utils/dataNormalization';

const API_URL = '/api/proxy/pm-data';

export interface PMDataResponse {
  "ID site"?: string | number;
  "PM number"?: string | number;
  "site names"?: string;
  "date planifié"?: string | number;
  "type de PM"?: string;
  "FE names"?: string;
  "execution"?: string | number;
  "replanifié statut"?: string;
  [key: string]: any;
}

/**
 * Mappe les données de l'API vers le format GlobalFileRow de l'application
 */
const mapApiToGlobalRow = (item: any): GlobalFileRow => {
  // Fonction utilitaire pour chercher une clé de manière flexible
  const getValue = (keys: string[]) => {
    for (const key of keys) {
      if (item[key] !== undefined) return item[key];
      // Test avec underscores au lieu d'espaces
      const underscoreKey = key.replace(/ /g, '_');
      if (item[underscoreKey] !== undefined) return item[underscoreKey];
      // Test en minuscule
      const lowerKey = key.toLowerCase();
      if (item[lowerKey] !== undefined) return item[lowerKey];
    }
    return undefined;
  };

  const rawRow: any = {
    ...item,
    "ID": getValue(["ID site", "site id", "id"]),
    "PM number": getValue(["PM number", "pm no", "pm #"]),
    "Nom du site": getValue(["site names", "site name", "station"]),
    "PM Date": getValue(["date planifié", "planned date", "date planifiee"]),
    "Types de PM": getValue(["type de PM", "pm type"]),
    "FE names": getValue(["FE names", "fe name", "intervenant"]),
    "PM date execute": getValue(["execution", "executed date", "date executee"]),
    "PM date replanifiée": getValue(["replanifié statut", "replanned status", "statut replanifie"])
  };

  return normalizeRow(rawRow);
};

export const fetchPMData = async (): Promise<GlobalFileRow[]> => {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      let errorMessage = `Erreur HTTP: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage += ` - ${errorData.message}`;
        } else if (errorData.details) {
          errorMessage += ` - ${errorData.details}`;
        } else if (errorData.error) {
          errorMessage += ` - ${errorData.error}`;
        }
      } catch (e) {
        // Not a JSON error
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('[API] Raw data received:', typeof data, Array.isArray(data) ? `Array(${data.length})` : 'Object');
    
    if (Array.isArray(data)) {
      console.log('[API] Data is array, mapping...');
      return data.map(mapApiToGlobalRow);
    } else if (data && typeof data === 'object') {
      console.log('[API] Data is object, keys:', Object.keys(data));
      // Si l'API renvoie un objet avec une clé contenant la liste
      const list = data.data || data.items || data.rows || data.pm_data || data.maintenances || data.values || [];
      if (Array.isArray(list)) {
        console.log(`[API] Found list in object with ${list.length} items`);
        return list.map(mapApiToGlobalRow);
      }
      console.warn('[API] No recognizable list found in object');
    }
    
    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération des données PM:', error);
    throw error;
  }
};
