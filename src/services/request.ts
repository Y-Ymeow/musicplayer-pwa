import { createRequestManager, createAutoExternalAdapter } from '../framework/requests';

export const requestManager = createRequestManager();
const externalAdapter = createAutoExternalAdapter();

if (externalAdapter) {
  requestManager.register(externalAdapter);
  requestManager.setDefault(externalAdapter.name);
}

export function hasExternalAdapter() {
  return Boolean(externalAdapter);
}

export async function requestJson<T = unknown>(url: string) {
  const response = await requestManager.get<T>(url, { responseType: 'json' });
  return response.data;
}

export async function requestText(url: string) {
  const response = await requestManager.get<string>(url, { responseType: 'text' });
  return response.data;
}
