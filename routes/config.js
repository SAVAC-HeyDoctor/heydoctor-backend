import express from "express";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

export default router;