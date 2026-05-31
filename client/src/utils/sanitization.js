import DOMPurify from 'dompurify';

/**
 * Input Sanitization Utilities
 * Sanitizes user-generated content to prevent XSS attacks
 */

// Configure DOMPurify
const purifyConfig = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'u', 's', 'strike',
    'p', 'br', 'span', 'div',
    'a', 'code', 'pre',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  // eslint-disable-next-line no-useless-escape
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
};

/**
 * Sanitize HTML content
 */
export const sanitizeHtml = (dirty) => {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, purifyConfig);
};

/**
 * Sanitize plain text (strip all HTML)
 */
export const sanitizeText = (dirty) => {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return 'file';

  // Remove path separators
  filename = filename.replace(/[/\\]/g, '');

  // Remove null bytes
  filename = filename.replace(/\0/g, '');

  // Remove control characters
  // eslint-disable-next-line no-control-regex
  filename = filename.replace(/[\x00-\x1F\x7F]/g, '');

  // Replace dangerous characters
  filename = filename.replace(/[<>:"|?*]/g, '_');

  // Limit length
  if (filename.length > 255) {
    const ext = filename.split('.').pop();
    const name = filename.substring(0, 255 - ext.length - 1);
    filename = `${name}.${ext}`;
  }

  return filename || 'file';
};

/**
 * Sanitize URL
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  // Remove whitespace
  url = url.trim();

  // Check for javascript: protocol
  // eslint-disable-next-line no-script-url
  if (url.toLowerCase().startsWith('javascript:')) {
    return '';
  }

  // Check for data: protocol (can be dangerous)
  if (url.toLowerCase().startsWith('data:')) {
    return '';
  }

  // Only allow http, https, mailto
  const allowedProtocols = ['http:', 'https:', 'mailto:'];
  try {
    const urlObj = new URL(url);
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return '';
    }
  } catch (e) {
    // Invalid URL
    return '';
  }

  return url;
};

/**
 * Sanitize room name
 */
export const sanitizeRoomName = (name) => {
  if (!name || typeof name !== 'string') return '';

  // Remove control characters
  // eslint-disable-next-line no-control-regex
  name = name.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  name = name.trim();

  // Limit length
  if (name.length > 100) {
    name = name.substring(0, 100);
  }

  return name;
};

/**
 * Sanitize user input for display
 */
export const sanitizeUserInput = (input) => {
  if (!input || typeof input !== 'string') return '';

  // Remove null bytes
  input = input.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  input = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  input = input.trim();

  return input;
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';

  // Convert to lowercase
  email = email.toLowerCase().trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '';
  }

  return email;
};

/**
 * Escape HTML entities
 */
export const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Unescape HTML entities
 */
export const unescapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';

  const map = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/'
  };

  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;/g, (entity) => map[entity]);
};

/**
 * Sanitize message content (for chat)
 */
export const sanitizeMessage = (message) => {
  if (!message || typeof message !== 'string') return '';

  // Remove null bytes
  message = message.replace(/\0/g, '');

  // Limit length
  if (message.length > 5000) {
    message = message.substring(0, 5000);
  }

  // Sanitize HTML but allow basic formatting
  return sanitizeHtml(message);
};

/**
 * Check if string contains suspicious patterns
 */
export const containsSuspiciousPatterns = (input) => {
  if (!input || typeof input !== 'string') return false;

  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /data:text\/html/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
};

/**
 * Sanitize object (recursively sanitize all string values)
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeUserInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
};

const sanitizationUtils = {
  sanitizeHtml,
  sanitizeText,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeRoomName,
  sanitizeUserInput,
  sanitizeEmail,
  escapeHtml,
  unescapeHtml,
  sanitizeMessage,
  containsSuspiciousPatterns,
  sanitizeObject
};

export default sanitizationUtils;
