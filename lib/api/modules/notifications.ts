import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type { NotificationRecord } from "../types/notifications";

export const notificationsAPI = {
  findMine: (token: string) =>
    apiCall("/notifications", { token }) as Promise<
      ApiEnvelope<NotificationRecord[]>
    >,

  unreadCount: (token: string) =>
    apiCall("/notifications/unread-count", { token }) as Promise<
      ApiEnvelope<{ count: number }>
    >,

  markRead: (id: number, token: string) =>
    apiCall(`/notifications/${id}/read`, {
      method: "PATCH",
      token,
    }) as Promise<ApiEnvelope<{ id: number }>>,

  markAllRead: (token: string) =>
    apiCall("/notifications/read-all", {
      method: "PATCH",
      token,
    }) as Promise<ApiEnvelope<{ updated: number }>>,
};
