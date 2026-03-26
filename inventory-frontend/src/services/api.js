import axios from 'axios';

const DEFAULT_DEV_API_URL = 'http://localhost:5000';
const DEFAULT_PROD_API_URL = 'https://inventory-backend-n3vi.onrender.com';

function normalizeApiUrl(url) {
  return url.replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (configuredUrl) {
    return `${normalizeApiUrl(configuredUrl)}/api`;
  }

  if (import.meta.env.DEV) {
    return `${DEFAULT_DEV_API_URL}/api`;
  }

  return `${DEFAULT_PROD_API_URL}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function getApiErrorMessage(error) {
  const validationErrors = error?.response?.data?.errors;

  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    return validationErrors.map((item) => item.message ?? item.msg ?? String(item)).join(', ');
  }

  if (validationErrors && typeof validationErrors === 'object') {
    const firstMessage = Object.values(validationErrors)[0];

    if (typeof firstMessage === 'string') {
      return firstMessage;
    }

    if (firstMessage?.message) {
      return firstMessage.message;
    }
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Something went wrong while talking to the API.'
  );
}

export default api;
