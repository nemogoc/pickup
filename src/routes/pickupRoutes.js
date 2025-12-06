import express from "express";
import { addPlayer, getPlayerId, removePlayer } from "../controllers/playerController.js";
import { createGame, editMostRecentGame, currentGameDetails, currentGameId } from "../controllers/gameController.js";
import { respond, addGuest } from "../controllers/responseController.js";
import { broadcastEmail } from "../controllers/emailController.js";
import { getLogs } from "../controllers/logsController.js";
import { adminPage } from "../views/adminView.js";
import { dashboardPage } from "../views/dashboardView.js";

const router = express.Router();

// Admin UI
router.get("/admin", adminPage);
router.get("/logs", getLogs);

// Dashboard UI
router.get("/dashboard", dashboardPage);

// Player endpoints
router.post("/add-player", addPlayer);
router.post("/remove-player", removePlayer);
router.post("/get-player-id", getPlayerId);

// Game endpoints
router.post("/create-game", createGame);
router.post("/edit-game", editMostRecentGame);
router.get("/current-game-details", currentGameDetails);
router.get("/current-game", currentGameId);

// RSVP respond
router.get("/respond", respond);
router.post("/add-guest", addGuest);

// email endpoints
router.post("/broadcast-email", broadcastEmail);

export default router;
