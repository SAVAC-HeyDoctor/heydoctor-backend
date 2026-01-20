import QRCode from "qrcode";

export async function generateQR(url) {
  try {
    return await QRCode.toBuffer(url, {
      errorCorrectionLevel: "H",
      type: "png",
      width: 300,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });
  } catch (err) {
    console.error("Error generando QR:", err);
    return null;
  }
}

