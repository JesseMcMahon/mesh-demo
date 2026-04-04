import { Text } from "react-native";

interface PageHeaderTextProps {
  children: React.ReactNode;
}

export function PageHeaderText({ children }: PageHeaderTextProps) {
  return <Text className="text-white text-2xl font-bold mb-3">{children}</Text>;
}
