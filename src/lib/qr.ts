import QRCode from "qrcode";

/**
 * The QR encodes a URL to the check-in page carrying only the opaque
 * qr_token — never a booking ID that maps predictably to sequence, and
 * never any personal data. The check-in page looks the booking up
 * server-side from the token.
 */
export function checkInUrlForToken(token: string, origin: string): string {
  return `${origin}/check-in/${token}`;
}

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
  });
}
