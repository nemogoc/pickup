import express from "express";
import pickupRouter from "./routes/pickupRoutes.js";
import path from "path";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static public files
app.use("/pickup/static", express.static(path.join(process.cwd(), "public")));
app.use(express.static(path.join(process.cwd(), "public")));

// Mount pickup routes under /pickup
app.use("/pickup", pickupRouter);

// Root health endpoint
app.get("/", (req, res) => res.send("Pickup attendance app is running. Visit /pickup/dashboard"));

export default app;
