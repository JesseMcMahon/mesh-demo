import React, { createContext, useContext, useState, ReactNode } from "react";

interface CreateSquadData {
  squadName: string;
  joinability: "public" | "private" | null;
}

interface CreateSquadContextType {
  data: CreateSquadData;
  setSquadName: (name: string) => void;
  setJoinability: (type: "public" | "private" | null) => void;
  resetData: () => void;
}

const CreateSquadContext = createContext<CreateSquadContextType | undefined>(
  undefined
);

const initialData: CreateSquadData = {
  squadName: "",
  joinability: "public",
};

export function CreateSquadProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CreateSquadData>(initialData);

  const setSquadName = (name: string) => {
    setData((prev) => ({ ...prev, squadName: name }));
  };

  const setJoinability = (type: "public" | "private" | null) => {
    setData((prev) => ({ ...prev, joinability: type }));
  };

  const resetData = () => {
    setData(initialData);
  };

  return (
    <CreateSquadContext.Provider
      value={{
        data,
        setSquadName,
        setJoinability,
        resetData,
      }}
    >
      {children}
    </CreateSquadContext.Provider>
  );
}

export function useCreateSquad() {
  const context = useContext(CreateSquadContext);
  if (context === undefined) {
    throw new Error("useCreateSquad must be used within a CreateSquadProvider");
  }
  return context;
}
