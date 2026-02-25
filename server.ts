import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GlobalFileRow } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Database
const db = new Database('global-files.db');
db.pragma('journal_mode = WAL');

// Apply migrations
const migrationPath = path.join(__dirname, 'migrations', '0001_create_swo_table.sql');
if (fs.existsSync(migrationPath)) {
  const migration = fs.readFileSync(migrationPath, 'utf-8');
  db.exec(migration);
}

// Helper to map JSON to DB
const mapJsonToDb = (row: Partial<GlobalFileRow>): Record<string, string | number | null> => ({
    swo_number: row["N° SWO"] ?? null,
    id: row["ID"] ?? null,
    site_name: row["Nom du site"] ?? null,
    region: row["Region"] ?? null,
    priority: row["Priorité"] ?? null,
    assigned_to: row["Assigned to"] ?? null,
    short_description: row["Short description"] ?? null,
    description: row["Description"] ?? null,
    swo_creation_date: row["Date de création du SWO"] ?? null,
    report_date: row["Date de remontée"] ?? null,
    swo_closing_date: row["Date de Clôture"] ?? null,
    planning_date: row["Date de planification"] ?? null,
    intervenant: row["Intervenant"] ?? null,
    fit_dp_number: row["N° FIT &/ou DP"] ?? null,
    client_transmission_date: row["Date de transmission au client"] ?? null,
    client_validation_date: row["Date de validation Client"] ?? null,
    comments_reco: row["Comments Reco"] ?? null,
    commentary: row["Commentaire"] ?? null,
    closing_date: row["Closing date"] ?? null,
    swo_state: row["State SWO"] ?? null,
    x_status: row["X"] ?? null,
    mro_number: row["N°MRO"] ?? null,
    amount_fcfa: row["Montant (Fcfa)"] ?? null,
    pm_date: row["PM Date"] ?? null,
    pm_types: row["Types de PM"] ?? null,
    battery_swap: row["SWAP BATTERIE"] ?? null,
    belt_swap: row["SWAP COURROIE"] ?? null,
    swo_to_cancel: row["SWO A CANCELLE"] ?? null,
    cm_removed: row["CM RETIRES"] ?? null,
    pm_removed: row["PM RETIRES"] ?? null,
    tas_status: row["TAS Status"] ?? null,
    comment: row["Comment"] ?? null,
    fdwo: row["FDWO"] ?? null,
    names_site: row["Names site"] ?? null,
    refuelers_reason: row["Raison des refuelleurs"] ?? null,
    executed_date: row["Date executee"] ?? null,
    planned_qty: row["Qte Prevue"] ?? null,
    delivered_qty: row["Qte Livres"] ?? null,
    statuses: row["Statuts"] ?? null,
    cph: row["CPH"] ?? null,
    site_application: row["Application Site"] ?? null,
    grid_status: row["Grid statut"] ?? null,
    pm_number: row["PM number"] ?? null,
    pm_planned: row["PM Planned"] ?? null,
    pm_executed_date: row["PM date execute"] ?? null,
    pm_rescheduled_date: row["PM date replanifiée"] ?? null,
    fe_names: row["FE names"] ?? null,
    rescheduling_reason: row["Raison des replanificatio"] ?? null,
    status: row["status"] ?? null,
    dg_service_01_number: row["DG Service 01 Number"] ?? null,
    dg_service_01_executed: row["DG Service 01 Executée"] ?? null,
    dg_service_01_status: row["DG Service 01 Status"] ?? null,
    dg_service_02_status: row["DG Service 02 Status"] ?? null,
    dg_service_02_status2: row["DG Service 02 Status2"] ?? null,
    dg_service_03_executed: row["DG Service 03 Executée"] ?? null,
    dg_service_03_status: row["DG Service 03 Status"] ?? null,
    pm_aircon_number: row["PM aircon Number"] ?? null,
    pm_aircon_executed: row["PM aircon Executée"] ?? null,
    pm_aircon_status: row["PM aircon Statut"] ?? null,
    pm_aircon_executed_alt: row["PM AIRCON Executée"] ?? null,
    pm_aircon_status_alt: row["PM AIRCON Status"] ?? null,
});

// Helper to map DB to JSON
const mapDbToJson = (row: Record<string, unknown>): Partial<GlobalFileRow> =>({
    "N° SWO": String(row.swo_number || ''),
    "ID": String(row.id || ''),
    "Nom du site": String(row.site_name || ''),
    "Region": String(row.region || ''),
    "Priorité": String(row.priority || ''),
    "Assigned to": String(row.assigned_to || ''),
    "Short description": String(row.short_description || ''),
    "Description": String(row.description || ''),
    "Date de création du SWO": String(row.swo_creation_date || ''),
    "Date de remontée": String(row.report_date || ''),
    "Date de Clôture": String(row.swo_closing_date || ''),
    "Date de planification": String(row.planning_date || ''),
    "Intervenant": String(row.intervenant || ''),
    "N° FIT &/ou DP": String(row.fit_dp_number || ''),
    "Date de transmission au client": String(row.client_transmission_date || ''),
    "Date de validation Client": String(row.client_validation_date || ''),
    "Comments Reco": String(row.comments_reco || ''),
    "Commentaire": String(row.commentary || ''),
    "Closing date": String(row.closing_date || ''),
    "State SWO": String(row.swo_state || ''),
    "X": String(row.x_status || ''),
    "N°MRO": String(row.mro_number || ''),
    "Montant (Fcfa)": String(row.amount_fcfa || ''),
    "PM Date": String(row.pm_date || ''),
    "Types de PM": String(row.pm_types || ''),
    "SWAP BATTERIE": String(row.battery_swap || ''),
    "SWAP COURROIE": String(row.belt_swap || ''),
    "SWO A CANCELLE": String(row.swo_to_cancel || ''),
    "CM RETIRES": String(row.cm_removed || ''),
    "PM RETIRES": String(row.pm_removed || ''),
    "TAS Status": String(row.tas_status || ''),
    "Comment": String(row.comment || ''),
    "FDWO": String(row.fdwo || ''),
    "Names site": String(row.names_site || ''),
    "Raison des refuelleurs": String(row.refuelers_reason || ''),
    "Date executee": String(row.executed_date || ''),
    "Qte Prevue": String(row.planned_qty || ''),
    "Qte Livres": String(row.delivered_qty || ''),
    "Statuts": String(row.statuses || ''),
    "CPH": String(row.cph || ''),
    "Application Site": String(row.site_application || ''),
    "Grid statut": String(row.grid_status || ''),
    "PM number": String(row.pm_number || ''),
    "PM Planned": String(row.pm_planned || ''),
    "PM date execute": String(row.pm_executed_date || ''),
    "PM date replanifiée": String(row.pm_rescheduled_date || ''),
    "FE names": String(row.fe_names || ''),
    "Raison des replanificatio": String(row.rescheduling_reason || ''),
    "status": String(row.status || ''),
    "DG Service 01 Number": String(row.dg_service_01_number || ''),
    "DG Service 01 Executée": String(row.dg_service_01_executed || ''),
    "DG Service 01 Status": String(row.dg_service_01_status || ''),
    "DG Service 02 Status": String(row.dg_service_02_status || ''),
    "DG Service 02 Status2": String(row.dg_service_02_status2 || ''),
    "DG Service 03 Executée": String(row.dg_service_03_executed || ''),
    "DG Service 03 Status": String(row.dg_service_03_status || ''),
    "PM aircon Number": String(row.pm_aircon_number || ''),
    "PM aircon Executée": String(row.pm_aircon_executed || ''),
    "PM aircon Statut": String(row.pm_aircon_status || ''),
    "PM AIRCON Executée": String(row.pm_aircon_executed_alt || ''),
    "PM AIRCON Status": String(row.pm_aircon_status_alt || ''),
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get('/api/test', (req, res) => {
    res.send('Test OK');
  });

  app.get('/api/data', (req, res) => {
    try {
      const results = db.prepare('SELECT * FROM swo_data').all();
      const mappedResults = results.map((row: any) => mapDbToJson(row));
      res.json(mappedResults);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post('/api/data', (req, res) => {
    try {
      const data: GlobalFileRow[] = req.body;
      if (!Array.isArray(data)) throw new Error('Body must be an array');

      const insert = db.prepare(`INSERT OR REPLACE INTO swo_data (${Object.keys(mapJsonToDb({}))
        .join(', ')}) VALUES (${Object.keys(mapJsonToDb({}))
        .map(() => '?')
        .join(', ')})`);

      const insertMany = db.transaction((rows: GlobalFileRow[]) => {
        for (const row of rows) {
          const dbRow = mapJsonToDb(row);
          insert.run(...Object.values(dbRow));
        }
      });

      insertMany(data);
      res.status(201).json({ success: true, count: data.length });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.delete('/api/data', (req, res) => {
    try {
      db.prepare('DELETE FROM swo_data').run();
      res.json({ success: true, message: 'All data purged' });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
