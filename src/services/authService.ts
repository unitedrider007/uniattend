import { uamsFetch } from "../utils/api";

export const authService = {
  async login(emailForm: string, passwordForm: string) {
    const res = await uamsFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailForm, password: passwordForm })
    });
    if (!res.ok) {
      throw new Error("Invalid institutional credentials or unauthorized access request.");
    }
    return res.json();
  },

  async refresh() {
    const res = await uamsFetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    return res;
  },

  async changePassword(currentPassForm: string, newPassForm: string) {
    const res = await uamsFetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPassForm, newPassword: newPassForm })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to update security credentials.");
    }
    return res.json();
  }
};
