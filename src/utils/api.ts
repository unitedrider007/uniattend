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

  const response = await fetch(input, updatedInit);

  // If unauthorized (token expired), try silent JWT token refresh
  if (response.status === 401) {
    const urlString = typeof input === "string" 
      ? input 
      : (input instanceof URL ? input.toString() : (input as any).url || "");

    // Do not attempt auto-refresh on endpoints related to authentication itself to avoid infinite loops
    if (!urlString.includes("/api/auth/refresh") && !urlString.includes("/api/auth/login")) {
      try {
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include"
        });

        if (refreshResponse.ok) {
          const body = await refreshResponse.json();
          if (body.accessToken) {
            localStorage.setItem("uams_access_token", body.accessToken);
            if (body.user) {
              localStorage.setItem("uams_user", JSON.stringify(body.user));
            }

            // Retry original request with the fresh token
            const retryInit = { ...updatedInit };
            const retryHeaders = new Headers(retryInit.headers || {});
            retryHeaders.set("Authorization", `Bearer ${body.accessToken}`);
            retryInit.headers = retryHeaders;
            return fetch(input, retryInit);
          }
        }
      } catch (err) {
        console.error("Auto token refresh failed:", err);
      }

      // If refresh failed or returns non-ok, clear stale user state and flag unauthorized event.
      localStorage.removeItem("uams_access_token");
      localStorage.removeItem("uams_user");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("uams-unauthorized"));
      }
    }
  }

  return response;
}

