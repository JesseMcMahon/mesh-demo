import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { BRAND, SURFACE, TEXT } from "@/constants/colors";

export interface Country {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
}

const COUNTRIES: Country[] = [
  { code: "US", dialCode: "+1", flag: "\u{1F1FA}\u{1F1F8}", name: "United States" },
  { code: "CA", dialCode: "+1", flag: "\u{1F1E8}\u{1F1E6}", name: "Canada" },
  { code: "GB", dialCode: "+44", flag: "\u{1F1EC}\u{1F1E7}", name: "United Kingdom" },
  { code: "AU", dialCode: "+61", flag: "\u{1F1E6}\u{1F1FA}", name: "Australia" },
  { code: "MX", dialCode: "+52", flag: "\u{1F1F2}\u{1F1FD}", name: "Mexico" },
  { code: "ID", dialCode: "+62", flag: "\u{1F1EE}\u{1F1E9}", name: "Indonesia" },
  { code: "IN", dialCode: "+91", flag: "\u{1F1EE}\u{1F1F3}", name: "India" },
  { code: "BR", dialCode: "+55", flag: "\u{1F1E7}\u{1F1F7}", name: "Brazil" },
  { code: "FR", dialCode: "+33", flag: "\u{1F1EB}\u{1F1F7}", name: "France" },
  { code: "DE", dialCode: "+49", flag: "\u{1F1E9}\u{1F1EA}", name: "Germany" },
  { code: "JP", dialCode: "+81", flag: "\u{1F1EF}\u{1F1F5}", name: "Japan" },
  { code: "CN", dialCode: "+86", flag: "\u{1F1E8}\u{1F1F3}", name: "China" },
];

interface CountryCodeSelectorProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
}

export function CountryCodeSelector({
  selectedCountry,
  onSelectCountry,
}: CountryCodeSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const screenHeight = Dimensions.get("window").height;
  const modalHeight = screenHeight * 0.7;

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center px-3 py-2"
      >
        <Text className="text-lg mr-2">{selectedCountry.flag}</Text>
        <Text className="text-white font-medium">
          {selectedCountry.dialCode}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={20} color={TEXT.placeholder} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View
            className="rounded-t-3xl"
            style={{ height: modalHeight, backgroundColor: SURFACE.card }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-5 border-b border-gray-800">
              <Text className="text-white text-xl font-bold">
                Select Country
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-2 rounded-full bg-gray-800"
              >
                <MaterialIcons name="close" size={20} color={TEXT.placeholder} />
              </TouchableOpacity>
            </View>

            {/* Country List */}
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  onPress={() => {
                    onSelectCountry(country);
                    setModalVisible(false);
                  }}
                  className={`flex-row items-center px-6 py-4 border-b border-gray-800 ${
                    selectedCountry.code === country.code
                      ? "bg-gray-800/50"
                      : "bg-transparent"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className="text-3xl mr-4">{country.flag}</Text>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-base">
                      {country.name}
                    </Text>
                    <Text className="text-gray-400 text-sm mt-1">
                      {country.dialCode}
                    </Text>
                  </View>
                  {selectedCountry.code === country.code && (
                    <View className="ml-2">
                      <MaterialIcons
                        name="check-circle"
                        size={24}
                        color={BRAND.primary}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
