import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { initDb } from "./db/index.js";

import "./services/cronService.js";

const PORT = process.env.PORT || 3000;

(async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`✅ Pickup app listening on port ${PORT}`);
    console.log(`Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  });
})();
