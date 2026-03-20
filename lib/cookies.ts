"use client";

export const cookieStore = {
  setToken: (token: string) => {
    document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  },

  getToken: (): string | null => {
    if (typeof document === "undefined") return null;
    
    const name = "auth_token=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(";");

    for (let cookie of cookieArray) {
      cookie = cookie.trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length);
      }
    }
    return null;
  },

  removeToken: () => {
    document.cookie = "auth_token=; path=/; max-age=0";
  },
};
