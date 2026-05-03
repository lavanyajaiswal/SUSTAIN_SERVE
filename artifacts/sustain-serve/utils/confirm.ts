import { Alert, Platform } from "react-native";

/**
 * Cross-platform confirm dialog.
 *
 * On web: window.confirm and RNW's Alert.alert both rely on window.confirm,
 * which is blocked by browsers inside iframes (e.g. Replit's preview pane).
 * To keep logout and other destructive actions working, we skip the dialog
 * on web and call onConfirm immediately.
 *
 * On native: shows a proper Alert dialog.
 */
export function confirm(
  title: string,
  message: string,
  onConfirm: () => void,
  options?: { confirmText?: string; cancelText?: string; destructive?: boolean }
) {
  if (Platform.OS === "web") {
    // window.confirm is blocked in iframes — proceed without a dialog.
    onConfirm();
    return;
  }

  const confirmText = options?.confirmText ?? "Confirm";
  const cancelText = options?.cancelText ?? "Cancel";

  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    {
      text: confirmText,
      style: options?.destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}
