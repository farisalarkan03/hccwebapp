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
  const normalized = number.replace(/[\s+\-()]/g, '');

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
} as const;
