export type NotificationType =
  | "TRIP_REVIEW"
  | "TRIP_APPROVED"
  | "TRIP_REJECTED";

export interface NotificationRecord {
  id: number;
  userId: number;
  type: NotificationType | string | null;
  title: string;
  message: string | null;
  tripId: number | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}
