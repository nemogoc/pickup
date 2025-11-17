import express from "express";
import { addPlayer, removePlayer } from "../controllers/playerController.js";
import { createGame} from "../controllers/gameController.js";
import { respond } from "../controllers/responseController.js";
import { adminPage } from "../views/adminView.js";
import { dashboardPage } from "../views/dashboardView.js";

const router = express.Router();

// Admin UI
router.get("/admin", adminPage);

// Dashboard UI
router.get("/dashboard", dashboardPage);

// Player endpoints
router.post("/add-player", addPlayer);
router.post("/remove-player", removePlayer);

// Game endpoints
router.post("/create-game", createGame);

// RSVP respond
router.get("/respond", respond);

export default router;
