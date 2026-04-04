import React from "react";
import { View, Text, Modal, TouchableWithoutFeedback } from "react-native";
import { MeshButton } from "./MeshButton";
import { SURFACE, BORDER, TEXT, SEMANTIC } from "@/constants/colors";

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: "danger" | "default";
  confirmColor?: string;
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  variant = "default",
  confirmColor,
}: ConfirmationModalProps) {
  const confirmButtonVariant = "primary";
  const resolvedConfirmColor =
    confirmColor || (variant === "danger" ? SEMANTIC.error : undefined);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View
          style={{
            flex: 1,
            backgroundColor: SURFACE.overlay,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              className="rounded-2xl border"
              style={{
                backgroundColor: SURFACE.card,
                borderColor: BORDER.medium,
                width: "100%",
                maxWidth: 400,
                padding: 24,
              }}
            >
              {/* Title */}
              <Text
                style={{
                  color: TEXT.primary,
                  fontSize: 20,
                  fontWeight: "700",
                  marginBottom: 12,
                }}
              >
                {title}
              </Text>

              {/* Message */}
              <Text
                style={{
                  color: TEXT.secondary,
                  fontSize: 14,
                  lineHeight: 20,
                  marginBottom: 24,
                }}
              >
                {message}
              </Text>

              {/* Buttons */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <MeshButton
                    title={cancelText}
                    onPress={onCancel}
                    variant="secondary"
                    disabled={isLoading}
                  />
                </View>
                <View className="flex-1">
                  <MeshButton
                    title={confirmText}
                    onPress={onConfirm}
                    variant={confirmButtonVariant}
                    style={
                      resolvedConfirmColor
                        ? { backgroundColor: resolvedConfirmColor }
                        : undefined
                    }
                    disabled={isLoading}
                    loading={isLoading}
                  />
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
