import axios from "axios";

export default async function sendNotification({ title, body, user }) {
  try {
    await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: process.env.ONESIGNAL_APP_ID,
        include_external_user_ids: [user],
        headings: { en: title },
        contents: { en: body },
      },
      {
        headers: {
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
        },
      }
    );

    console.log("🔔 Notificación enviada");
  } catch (err) {
    console.error("❌ Error enviando notificación:", err?.response?.data || err);
  }
}
