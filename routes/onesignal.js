// routes/onesignal.js
import express from "express";
import OneSignal from "@onesignal/node-onesignal";

const router = express.Router();

const appId = process.env.ONESIGNAL_APP_ID;
const restKey = process.env.ONESIGNAL_REST_API_KEY;

// ❗ Validación segura para evitar errores en Railway
let client = null;

if (!appId || !restKey) {
  console.warn("⚠️ OneSignal no configurado correctamente. Notificaciones deshabilitadas.");
} else {
  const config = OneSignal.createConfiguration({
    userAuthKey: "",
    restApiKey: restKey,
  });

  client = new OneSignal.DefaultApi(config);
}

// Función segura (no rompe el servidor si OneSignal no está configurado)
async function sendNotification({ title, message, url }) {
  if (!client) {
    console.warn("⚠️ Notificación no enviada: OneSignal no está configurado.");
    return { ok: false, warn: true };
  }

  try {
    const notification = new OneSignal.Notification();
    notification.app_id = appId;
    notification.included_segments = ["All"];
    notification.headings = { en: title };
    notification.contents = { en: message };
    notification.url = url;
    notification.chrome_web_icon = "https://heydoctor.health/icon.png";

    const result = await client.createNotification(notification);
    console.log("🔔 Notificación enviada:", result.id);

    return { ok: true };
  } catch (err) {
    console.error("❌ Error enviando notificación:", err);
    return { ok: false };
  }
}

// --- Rutas ---
router.post("/send", async (req, res) => {
  const { title, message, url } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "title y message son requeridos" });
  }

  const result = await sendNotification({
    title,
    message,
    url: url || "https://heydoctor.health",
  });

  res.json(result);
});

router.post("/verified", async (req, res) => {
  const { tipo, pais, title, message } = req.body;

  const payload = title && message
    ? { title, message, url: "https://heydoctor.health" }
    : {
        title: "Documento HeyDoctor verificado",
        message: `Un ${tipo || "documento"} fue verificado desde ${pais || "—"}. Estado: válido ✓`,
        url: "https://heydoctor.health/dashboard/auditoria",
      };

  const result = await sendNotification(payload);
  res.json(result);
});

router.post("/interconsulta", async (req, res) => {
  const { paciente } = req.body;

  const result = await sendNotification({
    title: "Nueva interconsulta registrada",
    message: `Se generó una interconsulta para ${paciente}.`,
    url: "https://heydoctor.health/dashboard/interconsultas",
  });

  res.json(result);
});

router.post("/receta", async (req, res) => {
  const { paciente } = req.body;

  const result = await sendNotification({
    title: "Receta digital emitida",
    message: `Una nueva receta para ${paciente} está disponible.`,
    url: "https://heydoctor.health/dashboard/documentos",
  });

  res.json(result);
});

export default router;
