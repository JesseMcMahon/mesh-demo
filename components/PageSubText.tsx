import { Text } from "react-native";

interface PageSubTextProps {
  children: React.ReactNode;
}

export function PageSubText({ children }: PageSubTextProps) {
  return (
    <Text className="text-[#909398] text-base mb-6 leading-6">{children}</Text>
  );
}
