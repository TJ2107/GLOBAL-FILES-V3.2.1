
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Proxy Route
  app.get("/api/proxy/pm-data", async (req, res) => {
    const API_URL = 'https://script.google.com/macros/s/AKfycbw_6K2LdY6V0B53t6922XbE3-2GxjxK8xL2gq0w5M8j3yvrtzE0g3Tf5g/exec';
    
    try {
      console.log(`[Proxy] Fetching from: ${API_URL}`);
      const response = await axios.get(API_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 20000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      console.log(`[Proxy] External response status: ${response.status}, URL: ${response.config.url}`);
      
      let data = response.data;

      // Handle cases where axios might not have parsed the JSON if content-type was wrong
      if (typeof data === 'string') {
        const trimmedData = data.trim();
        if (trimmedData.startsWith('<!DOCTYPE html>') || trimmedData.startsWith('<html')) {
          console.warn(`[Proxy] Received HTML instead of JSON. Preview: ${trimmedData.substring(0, 500)}...`);
          return res.status(422).json({ 
            error: "L'API a renvoyé du HTML au lieu de JSON. Le lien est peut-être invalide, expiré ou nécessite une session.",
            preview: trimmedData.substring(0, 300)
          });
        }
        
        try {
          data = JSON.parse(trimmedData);
          console.log("[Proxy] Successfully parsed string data as JSON");
        } catch (e) {
          console.log(`[Proxy] Data is string but not JSON. Length: ${trimmedData.length}`);
        }
      }

      if (Array.isArray(data)) {
        console.log(`[Proxy] Sending array of ${data.length} items`);
      } else if (data && typeof data === 'object') {
        console.log(`[Proxy] Sending object with keys: ${Object.keys(data).join(', ')}`);
      }

      res.json(data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data || error.message;
      
      console.error(`[Proxy] Error ${status}:`, errorData);
      
      res.status(status).json({ 
        error: "Internal Proxy Error", 
        message: typeof errorData === 'string' ? errorData : JSON.stringify(errorData),
        details: error.message
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Test connectivity
    fetch('https://www.google.com', { method: 'HEAD' })
      .then(() => console.log("[System] Internet connectivity verified"))
      .catch(err => console.error("[System] Internet connectivity check failed:", err.message));
  });
}

startServer();
