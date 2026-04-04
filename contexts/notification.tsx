import { createContext, useContext, useState, ReactNode } from "react";
import {
  MeshNotification,
  NotificationType,
  NotificationOptions,
} from "@/components/MeshNotification";
import { View } from "react-native";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  iconName?: NotificationOptions["iconName"];
  badgeText?: string;
  variant?: NotificationOptions["variant"];
  duration?: number;
}

interface NotificationContextType {
  showNotification: (
    message: unknown,
    type: NotificationType,
    options?: NotificationOptions
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const OBJECT_STRING_RE = /^\[object Object\]$/i;

  const normalizeMessage = (value: unknown, type: NotificationType): string => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed && !OBJECT_STRING_RE.test(trimmed)) {
        return trimmed;
      }
    }
    return type === "error"
      ? "Something went wrong. Please retry."
      : "Update complete.";
  };

  const showNotification = (
    message: unknown,
    type: NotificationType,
    options?: NotificationOptions
  ) => {
    const id = Date.now().toString();
    const normalizedMessage = normalizeMessage(message, type);
    setNotifications((prev) => [
      ...prev,
      {
        id,
        message: normalizedMessage,
        type,
        title: options?.title,
        subtitle: options?.subtitle,
        imageUrl: options?.imageUrl,
        iconName: options?.iconName,
        badgeText: options?.badgeText,
        variant: options?.variant,
        duration: options?.duration,
      },
    ]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      >
        {notifications.map((notification) => (
          <MeshNotification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            title={notification.title}
            subtitle={notification.subtitle}
            imageUrl={notification.imageUrl}
            iconName={notification.iconName}
            badgeText={notification.badgeText}
            variant={notification.variant}
            duration={notification.duration}
            onDismiss={() => removeNotification(notification.id)}
          />
        ))}
      </View>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
