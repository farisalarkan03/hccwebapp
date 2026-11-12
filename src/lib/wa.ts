// WhatsApp link builder utility

/**
 * Build a wa.me link with pre-filled text
 * @param number - WhatsApp number in format 628xxxxxx (no + or spaces)
 * @param template - Message template with {placeholder} syntax
 * @param vars - Object with placeholder values
 */
export function buildWaLink(
  number: string,
  template: string,
  vars: Record<string, string> = {}
): string {
  // Normalize number: strip spaces, dashes, + signs
  let normalized = number.replace(/[\s+\-()]/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  } else if (!normalized.startsWith('62') && normalized.length > 0) {
    normalized = '62' + normalized;
  }

  // Fill in template variables
  let message = template;
  for (const [key, value] of Object.entries(vars)) {
    message = message.replaceAll(`{${key}}`, value);
  }

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encoded}`;
}

/**
 * Default templates for common WhatsApp messages
 */
export const WA_TEMPLATES = {
  toAdmin: (eventName: string, regCode: string, husbandName: string, wifeName: string): string =>
    `Assalamualaikum, saya ${husbandName} & ${wifeName} ingin konfirmasi pembayaran pendaftaran HCC *${eventName}* dengan kode *${regCode}*. Terlampir bukti transfer.`,

  toUser: (eventName: string, regCode: string, ticketUrl: string): string =>
    `Assalamualaikum, pembayaran pendaftaran HCC *${eventName}* (kode *${regCode}*) sudah kami konfirmasi. Berikut link tiket Anda: ${ticketUrl}`,

  reminderPayment: (eventName: string, regCode: string, husbandName: string, wifeName: string): string =>
    `Assalamualaikum Wr. Wb. Halo Bapak/Ibu ${husbandName} & ${wifeName},\n\nKami dari panitia ${eventName} ingin menanyakan terkait pendaftaran dengan kode registrasi *${regCode}*.\n\nApakah sudah melakukan pembayaran? Jika sudah, mohon konfirmasi dengan mengirimkan bukti transfernya agar dapat segera kami verifikasi dan kami kirimkan e-tiketnya.\n\nTerima kasih. 🙏`,
} as const;
