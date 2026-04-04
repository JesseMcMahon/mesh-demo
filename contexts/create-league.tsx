import React, { createContext, useContext, useState, ReactNode } from "react";

interface CreateLeagueLocationPayload {
  scope: "local" | "nationwide";
  captureMode: "city_state" | "street";
  source?: "google_places" | "legacy_parse" | "manual";
  placeId?: string;
  formattedAddress?: string;
  street1?: string;
  city?: string;
  stateCode?: string;
  stateName?: string;
  countryCode?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  geo?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
}

interface CreateLeagueData {
  leagueName: string;
  leagueImageUrl: string;
  leagueSize: number | null;
  leagueType: "squad" | "solo";
  waiverType: "faab" | "reverse_standings";
  faabBudgetDefault: number;
  communityType: string | null;
  joinability: "public" | "private" | null;
  privatePasskey: string;
  locationType: "local" | "nationwide" | null;
  cityState: string;
  businessName: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  locationPayload: CreateLeagueLocationPayload | null;
}

interface CreateLeagueContextType {
  data: CreateLeagueData;
  setLeagueName: (name: string) => void;
  setLeagueImageUrl: (url: string) => void;
  setLeagueSize: (size: number | null) => void;
  setLeagueType: (type: "squad" | "solo") => void;
  setWaiverType: (type: "faab" | "reverse_standings") => void;
  setFaabBudgetDefault: (value: number) => void;
  setCommunityType: (type: string | null) => void;
  setJoinability: (type: "public" | "private" | null) => void;
  setPrivatePasskey: (passkey: string) => void;
  setLocationType: (type: "local" | "nationwide" | null) => void;
  setCityState: (cityState: string) => void;
  setBusinessName: (name: string) => void;
  setStreetAddress: (address: string) => void;
  setCity: (city: string) => void;
  setState: (state: string) => void;
  setZip: (zip: string) => void;
  setLocationPayload: (payload: CreateLeagueLocationPayload | null) => void;
  clearLocationPayload: () => void;
  resetData: () => void;
}

const CreateLeagueContext = createContext<CreateLeagueContextType | undefined>(
  undefined
);

const initialData: CreateLeagueData = {
  leagueName: "",
  leagueImageUrl: "",
  leagueSize: 10,
  leagueType: "squad",
  waiverType: "reverse_standings",
  faabBudgetDefault: 100,
  communityType: null,
  joinability: "public",
  privatePasskey: "",
  locationType: null,
  cityState: "",
  businessName: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  locationPayload: null,
};

export function CreateLeagueProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CreateLeagueData>(initialData);

  const setLeagueName = (name: string) => {
    setData((prev) => ({ ...prev, leagueName: name }));
  };

  const setLeagueImageUrl = (url: string) => {
    setData((prev) => ({ ...prev, leagueImageUrl: url }));
  };

  const setLeagueSize = (size: number | null) => {
    setData((prev) => ({ ...prev, leagueSize: size }));
  };

  const setLeagueType = (type: "squad" | "solo") => {
    setData((prev) => ({ ...prev, leagueType: type }));
  };

  const setWaiverType = (type: "faab" | "reverse_standings") => {
    setData((prev) => ({ ...prev, waiverType: type }));
  };

  const setFaabBudgetDefault = (value: number) => {
    const numeric = Number.isFinite(Number(value)) ? Number(value) : 100;
    setData((prev) => ({
      ...prev,
      faabBudgetDefault: Math.max(0, Math.floor(numeric)),
    }));
  };

  const setCommunityType = (type: string | null) => {
    setData((prev) => ({ ...prev, communityType: type }));
  };

  const setJoinability = (type: "public" | "private" | null) => {
    setData((prev) => ({ ...prev, joinability: type }));
  };

  const setPrivatePasskey = (passkey: string) => {
    setData((prev) => ({ ...prev, privatePasskey: passkey }));
  };

  const setLocationType = (type: "local" | "nationwide" | null) => {
    setData((prev) => ({ ...prev, locationType: type }));
  };

  const setCityState = (cityState: string) => {
    setData((prev) => ({ ...prev, cityState }));
  };

  const setBusinessName = (name: string) => {
    setData((prev) => ({ ...prev, businessName: name }));
  };

  const setStreetAddress = (address: string) => {
    setData((prev) => ({ ...prev, streetAddress: address }));
  };

  const setCity = (city: string) => {
    setData((prev) => ({ ...prev, city }));
  };

  const setState = (state: string) => {
    setData((prev) => ({ ...prev, state }));
  };

  const setZip = (zip: string) => {
    setData((prev) => ({ ...prev, zip }));
  };

  const setLocationPayload = (payload: CreateLeagueLocationPayload | null) => {
    setData((prev) => ({ ...prev, locationPayload: payload }));
  };

  const clearLocationPayload = () => {
    setData((prev) => ({ ...prev, locationPayload: null }));
  };

  const resetData = () => {
    setData(initialData);
  };

  return (
    <CreateLeagueContext.Provider
      value={{
        data,
        setLeagueName,
        setLeagueImageUrl,
        setLeagueSize,
        setLeagueType,
        setWaiverType,
        setFaabBudgetDefault,
        setCommunityType,
        setJoinability,
        setPrivatePasskey,
        setLocationType,
        setCityState,
        setBusinessName,
        setStreetAddress,
        setCity,
        setState,
        setZip,
        setLocationPayload,
        clearLocationPayload,
        resetData,
      }}
    >
      {children}
    </CreateLeagueContext.Provider>
  );
}

export function useCreateLeague() {
  const context = useContext(CreateLeagueContext);
  if (context === undefined) {
    throw new Error(
      "useCreateLeague must be used within a CreateLeagueProvider"
    );
  }
  return context;
}
