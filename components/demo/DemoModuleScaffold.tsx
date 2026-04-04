import React from "react";
import {
  ScrollViewProps,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useDemoTheme } from "@/lib/demoTheme";

interface DemoModuleScaffoldProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  kicker?: string;
  scrollViewProps?: Partial<ScrollViewProps>;
}

export function DemoModuleScaffold({
  title,
  subtitle,
  children,
  footer,
  kicker: _kicker,
  scrollViewProps,
}: DemoModuleScaffoldProps) {
  const router = useRouter();
  const theme = useDemoTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.appBackground }]}> 
      <View style={[styles.header, { borderBottomColor: theme.primaryBorder, backgroundColor: theme.surface }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => router.replace("/(investor-demo)/home" as any)}
            style={[
              styles.homeButton,
              {
                borderColor: `${theme.primary}44`,
                backgroundColor: `${theme.primary}20`,
              },
            ]}
          >
            <MaterialIcons name="arrow-back" size={18} color={theme.textPrimary} />
            <Text style={[styles.homeButtonText, { color: theme.textPrimary, fontFamily: theme.buttonFont }]}>
              Demo Home
            </Text>
          </TouchableOpacity>

        </View>

        <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.displayFont }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: theme.bodyFont }]}>
          {subtitle}
        </Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>

      {footer ? <View style={[styles.footer, { borderTopColor: `${theme.primary}33`, backgroundColor: theme.surface }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    gap: 8,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  homeButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  homeButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 22,
  },
  footer: {
    borderTopWidth: 1,
    padding: 14,
  },
});
