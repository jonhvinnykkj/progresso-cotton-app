/**
 * API Client with JWT authentication
 */

// Get stored access token
export function getAccessToken(): string | null {
  return localStorage.getItem("cotton_access_token");
}

// Get auth headers (exported for use in other files)
export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

// Custom fetch wrapper with authentication
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
  });

  // Handle token expiration
  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));

    if (data.code === "TOKEN_EXPIRED") {
      // Token expired - redirect to login
      localStorage.removeItem("cotton_user");
      localStorage.removeItem("cotton_selected_role");
      localStorage.removeItem("cotton_access_token");
      localStorage.removeItem("cotton_refresh_token");
      window.location.href = "/";
      throw new Error("Sessão expirada. Faça login novamente.");
    }
  }

  return response;
}

// Convenience methods
export const apiClient = {
  get: async (url: string, options?: RequestInit) => {
    return authenticatedFetch(url, { ...options, method: "GET" });
  },

  post: async (url: string, body?: any, options?: RequestInit) => {
    return authenticatedFetch(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch: async (url: string, body?: any, options?: RequestInit) => {
    return authenticatedFetch(url, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: async (url: string, body?: any, options?: RequestInit) => {
    return authenticatedFetch(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: async (url: string, options?: RequestInit) => {
    return authenticatedFetch(url, { ...options, method: "DELETE" });
  },
};
