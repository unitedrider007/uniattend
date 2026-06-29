/**
 * Robust cleanup helper to completely clear local storage, session storage,
 * and browser cookies across all paths and subdomains.
 */
export function performRobustAuthCleanup(): void {
  // 1. Clear all localStorage
  try {
    localStorage.clear();
  } catch (err) {
    console.error("Failed to clear localStorage:", err);
  }

  // 2. Clear all sessionStorage
  try {
    sessionStorage.clear();
  } catch (err) {
    console.error("Failed to clear sessionStorage:", err);
  }

  // 3. Clear all non-HttpOnly cookies across subdomains and paths
  try {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      if (!name) continue;

      // Try clearing with no path, root path, and sub-paths
      const pathParts = window.location.pathname.split('/');
      let path = '';
      
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=;`;
      
      for (let j = 0; j < pathParts.length; j++) {
        if (pathParts[j]) {
          path += '/' + pathParts[j];
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}/;`;
        }
      }
      
      // Try clearing with domains
      const hostParts = window.location.hostname.split('.');
      let domain = '';
      for (let k = hostParts.length - 1; k >= 0; k--) {
        domain = hostParts[k] + (domain ? '.' + domain : '');
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=.${domain};path=/;`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${domain};path=/;`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=.${domain};path=;`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${domain};path=;`;
      }
    }
  } catch (err) {
    console.error("Failed to clear browser cookies:", err);
  }
}
