// Durable custom fetch helper to bypass browser iframe cookie blocking and token injection restrictions.
// This is securely integrated into the React-to-Express communication chain.

export async function uamsFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const updatedInit: RequestInit = init ? { ...init } : {};
  updatedInit.credentials = "include";

  const token = localStorage.getItem("uams_access_token");
  if (token) {
    const headers = new Headers(updatedInit.headers || {});
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    updatedInit.headers = headers;
  }

  return fetch(input, updatedInit);
}
