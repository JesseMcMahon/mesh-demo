import { View, TextInput, TextInputProps } from "react-native";
import { CountryCodeSelector, Country } from "./CountryCodeSelector";
import { INPUT } from "@/constants/colors";

interface MeshPhoneInputProps
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  phoneNumber: string;
  countryCode: Country;
  onPhoneNumberChange: (phone: string) => void;
  onCountryCodeChange: (country: Country) => void;
}

export function MeshPhoneInput({
  phoneNumber,
  countryCode,
  onPhoneNumberChange,
  onCountryCodeChange,
  className = "",
  style,
  ...textInputProps
}: MeshPhoneInputProps) {
  const isUsNumber =
    String(countryCode?.code || "").toUpperCase() === "US" ||
    String(countryCode?.dialCode || "") === "+1";

  const formatUsPhone = (value: string) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
    const area = digits.slice(0, 3);
    const mid = digits.slice(3, 6);
    const last = digits.slice(6, 10);
    if (!digits) return "";
    if (digits.length <= 3) return area;
    if (digits.length <= 6) return `${area}-${mid}`;
    return `${area}-${mid}-${last}`;
  };

  return (
    <View className="relative">
      <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
        <CountryCodeSelector
          selectedCountry={countryCode}
          onSelectCountry={onCountryCodeChange}
        />
      </View>
      <TextInput
        className={`w-full pl-32 pr-4 py-4 rounded-lg text-white ${className}`}
        placeholderTextColor={INPUT.placeholderColor}
        value={phoneNumber}
        onChangeText={(value) => {
          if (isUsNumber) {
            onPhoneNumberChange(formatUsPhone(value));
            return;
          }
          onPhoneNumberChange(value);
        }}
        keyboardType="phone-pad"
        style={[{ backgroundColor: INPUT.background }, style]}
        {...textInputProps}
      />
    </View>
  );
}
