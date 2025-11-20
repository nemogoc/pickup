import express from "express";
import { addPlayer, getPlayerId, removePlayer } from "../controllers/playerController.js";
import { createGame, currentGameId } from "../controllers/gameController.js";
import { respond } from "../controllers/responseController.js";
import { broadcastEmail } from "../controllers/emailController.js";
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
router.post("/get-player-id", getPlayerId);

// Game endpoints
router.post("/create-game", createGame);
router.get("/current-game", currentGameId);

// RSVP respond
router.get("/respond", respond);

// email endpoints
router.post("/broadcast-email", broadcastEmail)

export default router;
