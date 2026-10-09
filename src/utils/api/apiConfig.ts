export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL!,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

export const ENDPOINTS = {
  chatbotLead: {
    create: '/chatbot-leads/create',
  },
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

export const STORAGE_KEYS = {
  CHATBOT_LEAD_ID: 'chatbotLeadId',
};
