import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GlobalFileRow } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Setup file logging to debug crashes
const logStream = fs.createWriteStream(path.join(__dirname, 'server-debug.log'), { flags: 'a' });
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => {
  const msg = new Date().toISOString() + ' LOG: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n';
  logStream.write(msg);
  originalLog(...args);
};
console.error = (...args) => {
  const msg = new Date().toISOString() + ' ERR: ' + args.map(a => typeof a === 'object' ? (a.stack || JSON.stringify(a)) : a).join(' ') + '\n';
  logStream.write(msg);
  originalError(...args);
};

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

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
const mapJsonToDb = (row: Partial<GlobalFileRow> | null | undefined): Record<string, string | number | null> => {
  const safeRow = row || {};
  return {
    swo_number: safeRow["N° SWO"] ?? null,
    id: safeRow["ID"] ?? null,
    site_name: safeRow["Nom du site"] ?? null,
    region: safeRow["Region"] ?? null,
    priority: safeRow["Priorité"] ?? null,
    assigned_to: safeRow["Assigned to"] ?? null,
    short_description: safeRow["Short description"] ?? null,
    description: safeRow["Description"] ?? null,
    swo_creation_date: safeRow["Date de création du SWO"] ?? null,
    report_date: safeRow["Date de remontée"] ?? null,
    swo_closing_date: safeRow["Date de Clôture"] ?? null,
    planning_date: safeRow["Date de planification"] ?? null,
    intervenant: safeRow["Intervenant"] ?? null,
    fit_dp_number: safeRow["N° FIT &/ou DP"] ?? null,
    client_transmission_date: safeRow["Date de transmission au client"] ?? null,
    client_validation_date: safeRow["Date de validation Client"] ?? null,
    comments_reco: safeRow["Comments Reco"] ?? null,
    commentary: safeRow["Commentaire"] ?? null,
    closing_date: safeRow["Closing date"] ?? null,
    swo_state: safeRow["State SWO"] ?? null,
    x_status: safeRow["X"] ?? null,
    mro_number: safeRow["N°MRO"] ?? null,
    amount_fcfa: safeRow["Montant (Fcfa)"] ?? null,
    pm_date: safeRow["PM Date"] ?? null,
    pm_types: safeRow["Types de PM"] ?? null,
    battery_swap: safeRow["SWAP BATTERIE"] ?? null,
    belt_swap: safeRow["SWAP COURROIE"] ?? null,
    swo_to_cancel: safeRow["SWO A CANCELLE"] ?? null,
    cm_removed: safeRow["CM RETIRES"] ?? null,
    pm_removed: safeRow["PM RETIRES"] ?? null,
    tas_status: safeRow["TAS Status"] ?? null,
    comment: safeRow["Comment"] ?? null,
    fdwo: safeRow["FDWO"] ?? null,
    names_site: safeRow["Names site"] ?? null,
    refuelers_reason: safeRow["Raison des refuelleurs"] ?? null,
    executed_date: safeRow["Date executee"] ?? null,
    planned_qty: safeRow["Qte Prevue"] ?? null,
    delivered_qty: safeRow["Qte Livres"] ?? null,
    statuses: safeRow["Statuts"] ?? null,
    cph: safeRow["CPH"] ?? null,
    site_application: safeRow["Application Site"] ?? null,
    grid_status: safeRow["Grid statut"] ?? null,
    pm_number: safeRow["PM number"] ?? null,
    pm_planned: safeRow["PM Planned"] ?? null,
    pm_executed_date: safeRow["PM date execute"] ?? null,
    pm_rescheduled_date: safeRow["PM date replanifiée"] ?? null,
    fe_names: safeRow["FE names"] ?? null,
    rescheduling_reason: safeRow["Raison des replanificatio"] ?? null,
    status: safeRow["status"] ?? null,
    dg_service_01_number: safeRow["DG Service 01 Number"] ?? null,
    dg_service_01_executed: safeRow["DG Service 01 Executée"] ?? null,
    dg_service_01_status: safeRow["DG Service 01 Status"] ?? null,
    dg_service_02_status: safeRow["DG Service 02 Status"] ?? null,
    dg_service_02_status2: safeRow["DG Service 02 Status2"] ?? null,
    dg_service_03_executed: safeRow["DG Service 03 Executée"] ?? null,
    dg_service_03_status: safeRow["DG Service 03 Status"] ?? null,
    pm_aircon_number: safeRow["PM aircon Number"] ?? null,
    pm_aircon_executed: safeRow["PM aircon Executée"] ?? null,
    pm_aircon_status: safeRow["PM aircon Statut"] ?? null,
    pm_aircon_executed_alt: safeRow["PM AIRCON Executée"] ?? null,
    pm_aircon_status_alt: safeRow["PM AIRCON Status"] ?? null,
  };
};

// Helper to map DB to JSON
const mapDbToJson = (row: Record<string, unknown>): Partial<GlobalFileRow> => ({
    "N° SWO": row.swo_number as string | number | null,
    "ID": row.id as string | null,
    "Nom du site": row.site_name as string | null,
    "Region": row.region as string | null,
    "Priorité": row.priority as string | null,
    "Assigned to": row.assigned_to as string | null,
    "Short description": row.short_description as string | null,
    "Description": row.description as string | null,
    "Date de création du SWO": row.swo_creation_date as string | number | null,
    "Date de remontée": row.report_date as string | number | null,
    "Date de Clôture": row.swo_closing_date as string | number | null,
    "Date de planification": row.planning_date as string | null,
    "Intervenant": row.intervenant as string | null,
    "N° FIT &/ou DP": row.fit_dp_number as string | null,
    "Date de transmission au client": row.client_transmission_date as string | null,
    "Date de validation Client": row.client_validation_date as string | null,
    "Comments Reco": row.comments_reco as string | null,
    "Commentaire": row.commentary as string | null,
    "Closing date": row.closing_date as string | number | null,
    "State SWO": row.swo_state as string | null,
    "X": row.x_status as string | null,
    "N°MRO": row.mro_number as string | null,
    "Montant (Fcfa)": row.amount_fcfa as string | number | null,
    "PM Date": row.pm_date as string | null,
    "Types de PM": row.pm_types as string | null,
    "SWAP BATTERIE": row.battery_swap as string | null,
    "SWAP COURROIE": row.belt_swap as string | null,
    "SWO A CANCELLE": row.swo_to_cancel as string | null,
    "CM RETIRES": row.cm_removed as string | null,
    "PM RETIRES": row.pm_removed as string | null,
    "TAS Status": row.tas_status as string | null,
    "Comment": row.comment as string | null,
    "FDWO": row.fdwo as string | null,
    "Names site": row.names_site as string | null,
    "Raison des refuelleurs": row.refuelers_reason as string | null,
    "Date executee": row.executed_date as string | null,
    "Qte Prevue": row.planned_qty as string | number | null,
    "Qte Livres": row.delivered_qty as string | number | null,
    "Statuts": row.statuses as string | null,
    "CPH": row.cph as string | null,
    "Application Site": row.site_application as string | null,
    "Grid statut": row.grid_status as string | null,
    "PM number": row.pm_number as string | null,
    "PM Planned": row.pm_planned as string | null,
    "PM date execute": row.pm_executed_date as string | null,
    "PM date replanifiée": row.pm_rescheduled_date as string | null,
    "FE names": row.fe_names as string | null,
    "Raison des replanificatio": row.rescheduling_reason as string | null,
    "status": row.status as string | null,
    "DG Service 01 Number": row.dg_service_01_number as string | null,
    "DG Service 01 Executée": row.dg_service_01_executed as string | null,
    "DG Service 01 Status": row.dg_service_01_status as string | null,
    "DG Service 02 Status": row.dg_service_02_status as string | null,
    "DG Service 02 Status2": row.dg_service_02_status2 as string | null,
    "DG Service 03 Executée": row.dg_service_03_executed as string | null,
    "DG Service 03 Status": row.dg_service_03_status as string | null,
    "PM aircon Number": row.pm_aircon_number as string | null,
    "PM aircon Executée": row.pm_aircon_executed as string | null,
    "PM aircon Statut": row.pm_aircon_status as string | null,
    "PM AIRCON Executée": row.pm_aircon_executed_alt as string | null,
    "PM AIRCON Status": row.pm_aircon_status_alt as string | null,
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
      res.setHeader('Content-Type', 'application/json');
      res.write('[');
      
      const stmt = db.prepare('SELECT * FROM swo_data');
      const iterator = stmt.iterate();
      let isFirst = true;
      
      const sendChunk = () => {
        try {
          let count = 0;
          let chunk = '';
          
          while (count < 1000) {
            const { value: row, done } = iterator.next();
            
            if (done) {
              res.write(chunk + ']');
              res.end();
              return;
            }
            
            if (!isFirst) {
              chunk += ',';
            }
            isFirst = false;
            chunk += JSON.stringify(mapDbToJson(row as Record<string, unknown>));
            count++;
          }
          
          if (!res.write(chunk)) {
            res.once('drain', sendChunk);
          } else {
            setImmediate(sendChunk);
          }
        } catch (err) {
          console.error('Error while streaming data:', err);
          res.end();
        }
      };
      
      sendChunk();
    } catch (e) {
      console.error('Error in GET /api/data:', e);
      if (!res.headersSent) {
        res.status(500).json({ error: (e as Error).message });
      } else {
        res.end();
      }
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
