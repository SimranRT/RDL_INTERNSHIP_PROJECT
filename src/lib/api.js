import { API_BASE_URL } from '../config';
import { getStoredToken, clearSession } from './auth';

function buildHeaders(headers = {}, includeJsonHeader = true) {
  const mergedHeaders = new Headers(headers);
  if (includeJsonHeader && !mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json');
  }

  const token = getStoredToken();
  if (token) {
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  }

  return mergedHeaders;
}

export function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers, !isFormData)
  }).then((response) => {
    if (response.status === 401) {
      clearSession();
    }
    return response;
  });
}
