// WhatsApp Cloud API helpers

const WA_API_VERSION = 'v23.0';
const WA_API_BASE = 'https://graph.facebook.com';

/**
 * Send a text message
 */
export async function sendText(accessToken, phoneNumberId, to, text) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  return response.json();
}

/**
 * Send an image message
 */
export async function sendImage(accessToken, phoneNumberId, to, imageUrl, caption) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const imagePayload = { link: imageUrl };
  if (caption) imagePayload.caption = caption;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: imagePayload,
    }),
  });

  return response.json();
}

/**
 * Send interactive buttons message (max 3 buttons)
 */
export async function sendButtons(accessToken, phoneNumberId, to, bodyText, buttons, headerText, footerText) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const interactive = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.slice(0, 3).map((btn) => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.title.substring(0, 20), // Max 20 chars
        },
      })),
    },
  };

  if (headerText) {
    interactive.header = { type: 'text', text: headerText };
  }
  if (footerText) {
    interactive.footer = { text: footerText };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive,
    }),
  });

  return response.json();
}

/**
 * Send interactive list message
 */
export async function sendList(accessToken, phoneNumberId, to, bodyText, buttonText, sections, headerText, footerText) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const interactive = {
    type: 'list',
    body: { text: bodyText },
    action: {
      button: buttonText.substring(0, 20), // Max 20 chars
      sections: sections.map((section) => ({
        title: section.title?.substring(0, 24), // Max 24 chars
        rows: section.rows.slice(0, 10).map((row) => ({
          id: row.id,
          title: row.title.substring(0, 24), // Max 24 chars
          description: row.description?.substring(0, 72), // Max 72 chars
        })),
      })),
    },
  };

  if (headerText) {
    interactive.header = { type: 'text', text: headerText };
  }
  if (footerText) {
    interactive.footer = { text: footerText };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive,
    }),
  });

  return response.json();
}

/**
 * Mark message as read
 */
export async function markAsRead(accessToken, phoneNumberId, messageId) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
}

/**
 * Send a video message
 */
export async function sendVideo(accessToken, phoneNumberId, to, videoUrl, caption) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const videoPayload = { link: videoUrl };
  if (caption) videoPayload.caption = caption;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'video',
      video: videoPayload,
    }),
  });

  return response.json();
}

/**
 * Send an audio message
 */
export async function sendAudio(accessToken, phoneNumberId, to, audioUrl) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'audio',
      audio: { link: audioUrl },
    }),
  });

  return response.json();
}

/**
 * Send a document message
 */
export async function sendDocument(accessToken, phoneNumberId, to, documentUrl, filename, caption) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const documentPayload = { link: documentUrl };
  if (filename) documentPayload.filename = filename;
  if (caption) documentPayload.caption = caption;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: documentPayload,
    }),
  });

  return response.json();
}

/**
 * Send a location message
 */
export async function sendLocation(accessToken, phoneNumberId, to, latitude, longitude, name, address) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const locationPayload = {
    latitude: String(latitude),
    longitude: String(longitude),
  };
  if (name) locationPayload.name = name;
  if (address) locationPayload.address = address;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'location',
      location: locationPayload,
    }),
  });

  return response.json();
}

/**
 * Send a contact message
 */
export async function sendContact(accessToken, phoneNumberId, to, contacts) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'contacts',
      contacts: contacts.map((c) => ({
        name: {
          formatted_name: c.name,
          first_name: c.firstName || c.name,
          last_name: c.lastName || '',
        },
        phones: c.phone ? [{ phone: c.phone, type: 'CELL' }] : [],
        emails: c.email ? [{ email: c.email, type: 'WORK' }] : [],
      })),
    }),
  });

  return response.json();
}

/**
 * Send a sticker message
 */
export async function sendSticker(accessToken, phoneNumberId, to, stickerUrl) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'sticker',
      sticker: { link: stickerUrl },
    }),
  });

  return response.json();
}

/**
 * Send enhanced text with header/footer (using interactive template)
 */
export async function sendTextEnhanced(accessToken, phoneNumberId, to, bodyText, headerText, footerText) {
  const url = `${WA_API_BASE}/${WA_API_VERSION}/${phoneNumberId}/messages`;

  // If no header/footer, send regular text
  if (!headerText && !footerText) {
    return sendText(accessToken, phoneNumberId, to, bodyText);
  }

  // Use interactive message with no buttons for header/footer support
  const interactive = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: [], // Empty - will show as text with header/footer
    },
  };

  if (headerText) {
    interactive.header = { type: 'text', text: headerText };
  }
  if (footerText) {
    interactive.footer = { text: footerText };
  }

  // Actually, WhatsApp requires at least 1 button for interactive
  // So for text with header/footer without buttons, we need template
  // For now, just send regular text with header/footer embedded
  let fullText = '';
  if (headerText) fullText += `*${headerText}*\n\n`;
  fullText += bodyText;
  if (footerText) fullText += `\n\n_${footerText}_`;

  return sendText(accessToken, phoneNumberId, to, fullText);
}

/**
 * Extract message content from webhook payload
 */
export function extractMessageContent(message) {
  const result = {
    type: message.type,
    text: null,
    buttonId: null,
    listRowId: null,
  };

  switch (message.type) {
    case 'text':
      result.text = message.text?.body;
      break;
    case 'interactive':
      if (message.interactive?.type === 'button_reply') {
        result.buttonId = message.interactive.button_reply?.id;
        result.text = message.interactive.button_reply?.title;
      } else if (message.interactive?.type === 'list_reply') {
        result.listRowId = message.interactive.list_reply?.id;
        result.text = message.interactive.list_reply?.title;
      }
      break;
    case 'image':
      result.text = message.image?.caption || '[Image]';
      break;
    case 'document':
      result.text = message.document?.caption || '[Document]';
      break;
    case 'audio':
      result.text = '[Audio]';
      break;
    case 'video':
      result.text = message.video?.caption || '[Video]';
      break;
    case 'location':
      result.text = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
      break;
    default:
      result.text = `[${message.type}]`;
  }

  return result;
}

/**
 * Country codes mapping (common ones)
 */
const COUNTRY_CODES = {
  '1': 'US/CA', '7': 'RU', '20': 'EG', '27': 'ZA', '30': 'GR', '31': 'NL',
  '32': 'BE', '33': 'FR', '34': 'ES', '36': 'HU', '39': 'IT', '40': 'RO',
  '41': 'CH', '43': 'AT', '44': 'GB', '45': 'DK', '46': 'SE', '47': 'NO',
  '48': 'PL', '49': 'DE', '51': 'PE', '52': 'MX', '53': 'CU', '54': 'AR',
  '55': 'BR', '56': 'CL', '57': 'CO', '58': 'VE', '60': 'MY', '61': 'AU',
  '62': 'ID', '63': 'PH', '64': 'NZ', '65': 'SG', '66': 'TH', '81': 'JP',
  '82': 'KR', '84': 'VN', '86': 'CN', '90': 'TR', '91': 'IN', '92': 'PK',
  '93': 'AF', '94': 'LK', '95': 'MM', '98': 'IR', '212': 'MA', '213': 'DZ',
  '216': 'TN', '218': 'LY', '220': 'GM', '221': 'SN', '234': 'NG', '249': 'SD',
  '254': 'KE', '255': 'TZ', '256': 'UG', '260': 'ZM', '263': 'ZW', '351': 'PT',
  '352': 'LU', '353': 'IE', '354': 'IS', '358': 'FI', '370': 'LT', '371': 'LV',
  '372': 'EE', '380': 'UA', '381': 'RS', '385': 'HR', '386': 'SI', '420': 'CZ',
  '421': 'SK', '852': 'HK', '853': 'MO', '855': 'KH', '856': 'LA', '880': 'BD',
  '886': 'TW', '960': 'MV', '961': 'LB', '962': 'JO', '963': 'SY', '964': 'IQ',
  '965': 'KW', '966': 'SA', '967': 'YE', '968': 'OM', '970': 'PS', '971': 'AE',
  '972': 'IL', '973': 'BH', '974': 'QA', '975': 'BT', '976': 'MN', '977': 'NP',
  '992': 'TJ', '993': 'TM', '994': 'AZ', '995': 'GE', '996': 'KG', '998': 'UZ',
};

/**
 * Get country code from phone number
 */
export function getCountryFromPhone(phoneNumber) {
  const cleaned = phoneNumber.replace(/[^0-9]/g, '');

  // Try 3-digit codes first, then 2-digit, then 1-digit
  for (const len of [3, 2, 1]) {
    const prefix = cleaned.substring(0, len);
    if (COUNTRY_CODES[prefix]) {
      return COUNTRY_CODES[prefix];
    }
  }

  return 'Unknown';
}

/**
 * Format phone number in different formats
 */
export function formatPhoneNumber(phoneNumber, format = 'e164') {
  const cleaned = phoneNumber.replace(/[^0-9]/g, '');

  switch (format) {
    case 'e164':
      return '+' + cleaned;
    case 'local':
      // Remove country code (assume first 1-3 digits)
      for (const len of [3, 2, 1]) {
        const prefix = cleaned.substring(0, len);
        if (COUNTRY_CODES[prefix]) {
          return cleaned.substring(len);
        }
      }
      return cleaned;
    case 'international':
      return '+' + cleaned.replace(/(\d{1,3})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
    default:
      return cleaned;
  }
}
