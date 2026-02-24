// functions/api/[[catchall]].ts
import { Router, IRequest } from 'itty-router';
import { GlobalFileRow } from '../../types';

// Déclarez le type pour l'environnement du Worker
export interface Env {
  DB: 0aa1af56-9d63-4cd1-aad3-f0ff68f51ac8;
}

// Fonction pour mapper les clés JSON en noms de colonnes SQL
const mapJsonToDb = (row: GlobalFileRow): Record<string, any> => ({
    swo_number: row["N° SWO"],
    id: row["ID"],
    site_name: row["Nom du site"],
    region: row["Region"],
    priority: row["Priorité"],
    assigned_to: row["Assigned to"],
    short_description: row["Short description"],
    description: row["Description"],
    swo_creation_date: row["Date de création du SWO"],
    report_date: row["Date de remontée"],
    swo_closing_date: row["Date de Clôture"],
    planning_date: row["Date de planification"],
    intervenant: row["Intervenant"],
    fit_dp_number: row["N° FIT &/ou DP"],
    client_transmission_date: row["Date de transmission au client"],
    client_validation_date: row["Date de validation Client"],
    comments_reco: row["Comments Reco"],
    commentary: row["Commentaire"],
    closing_date: row["Closing date"],
    swo_state: row["State SWO"],
    x_status: row["X"],
    mro_number: row["N°MRO"],
    amount_fcfa: row["Montant (Fcfa)"],
    pm_date: row["PM Date"],
    pm_types: row["Types de PM"],
    battery_swap: row["SWAP BATTERIE"],
    belt_swap: row["SWAP COURROIE"],
    swo_to_cancel: row["SWO A CANCELLE"],
    cm_removed: row["CM RETIRES"],
    pm_removed: row["PM RETIRES"],
    tas_status: row["TAS Status"],
    comment: row["Comment"],
    fdwo: row["FDWO"],
    names_site: row["Names site"],
    refuelers_reason: row["Raison des refuelleurs"],
    executed_date: row["Date executee"],
    planned_qty: row["Qte Prevue"],
    delivered_qty: row["Qte Livres"],
    statuses: row["Statuts"],
    cph: row["CPH"],
    site_application: row["Application Site"],
    grid_status: row["Grid statut"],
    pm_number: row["PM number"],
    pm_planned: row["PM Planned"],
    pm_executed_date: row["PM date execute"],
    pm_rescheduled_date: row["PM date replanifiée"],
    fe_names: row["FE names"],
    rescheduling_reason: row["Raison des replanificatio"],
    status: row["status"],
    dg_service_01_number: row["DG Service 01 Number"],
    dg_service_01_executed: row["DG Service 01 Executée"],
    dg_service_01_status: row["DG Service 01 Status"],
    dg_service_02_status: row["DG Service 02 Status"],
    dg_service_02_status2: row["DG Service 02 Status2"],
    dg_service_03_executed: row["DG Service 03 Executée"],
    dg_service_03_status: row["DG Service 03 Status"],
    pm_aircon_number: row["PM aircon Number"],
    pm_aircon_executed: row["PM aircon Executée"],
    pm_aircon_status: row["PM aircon Statut"],
    pm_aircon_executed_alt: row["PM AIRCON Executée"],
    pm_aircon_status_alt: row["PM AIRCON Status"],
});

const router = Router();

// Middleware pour gérer les requêtes CORS
const withCors = (request: IRequest) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Pour le développement, '*' est acceptable.
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  // Pour les autres requêtes, nous attacherons les en-têtes plus tard
};

router.all('*', withCors);

// GET /api/data - Récupérer toutes les données
router.get('/api/data', async (request: IRequest, env: Env) => {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM swo_data').all();
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    return new Response(JSON.stringify(results), { headers });
  } catch (e: any) {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
});

// POST /api/data - Insérer/Mettre à jour des données
router.post('/api/data', async (request: IRequest, env: Env) => {
  try {
    const data: GlobalFileRow[] = await request.json();
    if (!Array.isArray(data)) throw new Error('Le corps de la requête doit être un tableau.');

    const stmt = env.DB.prepare(
      `INSERT OR REPLACE INTO swo_data (${Object.keys(mapJsonToDb({}))
        .join(', ')}) VALUES (${Object.keys(mapJsonToDb({}))
        .map(() => '?')
        .join(', ')})`
    );

    const batch = data.map(row => {
        const dbRow = mapJsonToDb(row);
        return stmt.bind(...Object.values(dbRow));
    });
    
    await env.DB.batch(batch);
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    return new Response(JSON.stringify({ success: true, count: data.length }), { status: 201, headers });
  } catch (e: any) {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers });
  }
});

// DELETE /api/data - Purger toutes les données
router.delete('/api/data', async (request: IRequest, env: Env) => {
    try {
        await env.DB.prepare('DELETE FROM swo_data').run();
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
        return new Response(JSON.stringify({ success: true, message: 'Toutes les données ont été purgées.' }), { status: 200, headers });
    } catch (e: any) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
});

// Fallback pour toutes les autres routes
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default {
  fetch: router.handle,
};
