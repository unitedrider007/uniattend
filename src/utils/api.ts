// Durable custom fetch helper to bypass browser iframe cookie blocking and token injection restrictions.
// This is securely integrated into the React-to-Express communication chain.

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

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
      
      if (isRefreshing) {
        // Queue this request during an ongoing token refresh operation to prevent concurrent token rotation conflicts
        return new Promise<Response>((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            const retryInit = { ...updatedInit };
            const retryHeaders = new Headers(retryInit.headers || {});
            retryHeaders.set("Authorization", `Bearer ${newToken}`);
            retryInit.headers = retryHeaders;
            fetch(input, retryInit).then(resolve).catch(reject);
          });
        });
      }

      isRefreshing = true;

      try {
        const localRefreshToken = localStorage.getItem("uams_refresh_token") || "";

        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Refresh-Token": localRefreshToken
          },
          body: JSON.stringify({ refreshToken: localRefreshToken }),
          credentials: "include"
        });

        if (refreshResponse.ok) {
          const body = await refreshResponse.json();
          if (body.accessToken) {
            localStorage.setItem("uams_access_token", body.accessToken);
            if (body.refreshToken) {
              localStorage.setItem("uams_refresh_token", body.refreshToken);
            }
            if (body.user) {
              localStorage.setItem("uams_user", JSON.stringify(body.user));
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("uams-token-refreshed", { detail: body.user }));
              }
            }

            const freshToken = body.accessToken;
            isRefreshing = false;
            onRefreshed(freshToken);

            // Retry original request with the fresh token
            const retryInit = { ...updatedInit };
            const retryHeaders = new Headers(retryInit.headers || {});
            retryHeaders.set("Authorization", `Bearer ${freshToken}`);
            retryInit.headers = retryHeaders;
            return fetch(input, retryInit);
          }
        }
      } catch (err) {
        console.error("Auto token refresh failed:", err);
      } finally {
        if (isRefreshing) {
          isRefreshing = false;
          refreshSubscribers = [];
        }
      }

      // If refresh failed or returns non-ok, clear stale user state and flag unauthorized event.
      localStorage.removeItem("uams_access_token");
      localStorage.removeItem("uams_refresh_token");
      localStorage.removeItem("uams_user");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("uams-unauthorized"));
      }
    }
  }

  return response;
}
