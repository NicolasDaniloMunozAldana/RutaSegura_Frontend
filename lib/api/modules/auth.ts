import { apiCall } from "../core/client";
import type { LoginResponse, ProfileResponse } from "../types/auth";

export const authAPI = {
  login: (email: string, password: string) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }) as Promise<LoginResponse>,

  profile: (token: string) =>
    apiCall("/auth/profile", {
      token,
    }) as Promise<ProfileResponse>,
};
