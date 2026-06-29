import { performRobustAuthCleanup } from "./authCleanup";

// Durable custom fetch helper to securely communicate with the Express backend using HTTPOnly cookies.
export async function uamsFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const updatedInit: RequestInit = init ? { ...init } : {};
  updatedInit.credentials = "include";

  const response = await fetch(input, updatedInit);

  // If unauthorized or expired session, clear local cached profile and notify app
  if (response.status === 401 || response.status === 403) {
    const urlString = typeof input === "string" 
      ? input 
      : (input instanceof URL ? input.toString() : (input as any).url || "");

    // Avoid infinite redirection/logout loops on core auth requests
    if (!urlString.includes("/api/auth/refresh") && !urlString.includes("/api/auth/login") && !urlString.includes("/api/auth/logout")) {
      performRobustAuthCleanup();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("uams-unauthorized"));
      }
    }
  }

  return response;
}
