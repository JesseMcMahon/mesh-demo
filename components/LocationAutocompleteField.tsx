import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MeshTextInput } from "@/components/MeshTextInput";
import {
  locationApi,
  LocationCaptureMode,
  StructuredLocationPayload,
} from "@/lib/api";
import { BORDER, BRAND, SURFACE, TEXT } from "@/constants/colors";

type SuggestionItem = {
  placeId: string;
  description: string;
  primaryText: string;
  secondaryText: string;
};

interface LocationAutocompleteFieldProps {
  mode: LocationCaptureMode;
  value: string;
  accessToken?: string | null;
  placeholder?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onLocationResolved: (location: StructuredLocationPayload) => void;
  onLocationCleared?: () => void;
}

const MIN_QUERY_LENGTH = Math.max(
  3,
  Number(process.env.EXPO_PUBLIC_LOCATION_AUTOCOMPLETE_MIN_CHARS || 3)
);
const CITY_DEBOUNCE_MS = Math.max(
  150,
  Number(process.env.EXPO_PUBLIC_LOCATION_AUTOCOMPLETE_DEBOUNCE_CITY_MS || 400)
);
const STREET_DEBOUNCE_MS = Math.max(
  150,
  Number(process.env.EXPO_PUBLIC_LOCATION_AUTOCOMPLETE_DEBOUNCE_STREET_MS || 500)
);
const CACHE_TTL_MS = Math.max(
  5000,
  Number(process.env.EXPO_PUBLIC_LOCATION_AUTOCOMPLETE_CACHE_TTL_MS || 300000)
);
const SESSION_IDLE_MS = Math.max(
  10000,
  Number(process.env.EXPO_PUBLIC_LOCATION_SESSION_IDLE_MS || 180000)
);
const MAX_SUGGESTIONS = 5;
const DEBUG_LOCATION_AUTOCOMPLETE =
  process.env.EXPO_PUBLIC_LOCATION_AUTOCOMPLETE_DEBUG === "true";

const US_STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function createSessionToken() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeQuery(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatLocationLabel(
  mode: LocationCaptureMode,
  location: StructuredLocationPayload
) {
  if (location.scope === "nationwide") {
    return "Nationwide";
  }
  if (mode === "city_state") {
    const city = String(location.city || "").trim();
    const stateCode = String(location.stateCode || "").trim().toUpperCase();
    return [city, stateCode].filter(Boolean).join(", ");
  }
  const formatted = String(location.formattedAddress || "").trim();
  if (formatted) return formatted;
  return [
    String(location.street1 || "").trim(),
    String(location.city || "").trim(),
    String(location.stateCode || "").trim().toUpperCase(),
    String(location.postalCode || "").trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

function deriveStateCode(location: StructuredLocationPayload, suggestion?: SuggestionItem) {
  const normalized = String(location.stateCode || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;

  const fallbackTargets = [
    String(suggestion?.secondaryText || ""),
    String(suggestion?.description || ""),
    String(location.formattedAddress || ""),
  ];

  for (const target of fallbackTargets) {
    const trimmed = target.trim();
    if (!trimmed) continue;
    const leadingCodeMatch = trimmed.match(/^([A-Z]{2})(?:\b|,|\s)/);
    if (leadingCodeMatch?.[1]) return leadingCodeMatch[1].toUpperCase();
    const delimitedCodeMatch = trimmed.match(/(?:,\s*|\s)([A-Z]{2})(?:\b|,)/);
    if (delimitedCodeMatch?.[1]) return delimitedCodeMatch[1].toUpperCase();
    const lowercase = trimmed.toLowerCase();
    for (const [stateName, stateCode] of Object.entries(US_STATE_NAME_TO_CODE)) {
      if (lowercase.includes(stateName)) {
        return stateCode;
      }
    }
  }

  return normalized;
}

function getSuggestionDisplayValue(mode: LocationCaptureMode, suggestion: SuggestionItem) {
  const primary = String(suggestion.primaryText || "").trim();
  const secondary = String(suggestion.secondaryText || "").trim();
  if (mode === "city_state") {
    const stateCodeMatch = secondary.match(/(?:^|,\s*|\s)([A-Z]{2})(?:\b|,|\s|$)/);
    const stateCode = stateCodeMatch?.[1]?.toUpperCase() || "";
    if (primary && stateCode) return `${primary}, ${stateCode}`;
    return primary || String(suggestion.description || "").trim();
  }
  return String(suggestion.description || primary).trim();
}

export function LocationAutocompleteField({
  mode,
  value,
  accessToken,
  placeholder,
  disabled = false,
  onValueChange,
  onLocationResolved,
  onLocationCleared,
}: LocationAutocompleteFieldProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightAutocompleteRef = useRef<AbortController | null>(null);
  const inFlightDetailsRef = useRef<AbortController | null>(null);
  const isSelectingSuggestionRef = useRef(false);
  const requestCounterRef = useRef(0);
  const sessionTokenRef = useRef<string>("");
  const suggestionCacheRef = useRef<
    Map<string, { expiresAt: number; suggestions: SuggestionItem[] }>
  >(new Map());
  const sessionStatsRef = useRef({
    startedAt: 0,
    requests: 0,
    selections: 0,
  });
  const featureEnabled =
    process.env.EXPO_PUBLIC_ENABLE_GOOGLE_LOCATION_AUTOCOMPLETE !== "false";
  const debounceMs = mode === "street" ? STREET_DEBOUNCE_MS : CITY_DEBOUNCE_MS;

  const shouldShowSuggestions = useMemo(() => {
    if (!featureEnabled || disabled) return false;
    if (!isFocused) return false;
    return suggestions.length > 0;
  }, [disabled, featureEnabled, isFocused, suggestions.length]);

  const clearDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const abortInFlightAutocomplete = () => {
    if (inFlightAutocompleteRef.current) {
      inFlightAutocompleteRef.current.abort();
      inFlightAutocompleteRef.current = null;
    }
  };

  const abortInFlightDetails = () => {
    if (inFlightDetailsRef.current) {
      inFlightDetailsRef.current.abort();
      inFlightDetailsRef.current = null;
    }
  };

  const flushSessionStats = (reason: string) => {
    if (!DEBUG_LOCATION_AUTOCOMPLETE) return;
    const stats = sessionStatsRef.current;
    if (!stats.startedAt || (stats.requests === 0 && stats.selections === 0)) return;
    const elapsedMs = Date.now() - stats.startedAt;
    // eslint-disable-next-line no-console
    console.debug("[LocationAutocomplete] session_end", {
      reason,
      elapsedMs,
      requests: stats.requests,
      selections: stats.selections,
      abandoned: stats.selections === 0 && stats.requests > 0,
    });
  };

  const rotateSessionToken = (reason: string) => {
    flushSessionStats(reason);
    sessionTokenRef.current = createSessionToken();
    sessionStatsRef.current = {
      startedAt: Date.now(),
      requests: 0,
      selections: 0,
    };
  };

  const ensureSessionToken = () => {
    if (!sessionTokenRef.current) {
      rotateSessionToken("create");
    }
    return sessionTokenRef.current;
  };

  const touchSession = () => {
    ensureSessionToken();
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      rotateSessionToken("idle_timeout");
    }, SESSION_IDLE_MS);
  };

  const getCachedSuggestions = (cacheKey: string) => {
    const cached = suggestionCacheRef.current.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      suggestionCacheRef.current.delete(cacheKey);
      return null;
    }
    return cached.suggestions;
  };

  const setCachedSuggestions = (cacheKey: string, nextSuggestions: SuggestionItem[]) => {
    suggestionCacheRef.current.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      suggestions: nextSuggestions,
    });
  };

  useEffect(() => {
    rotateSessionToken("mount");
    return () => {
      clearDebounce();
      clearIdleTimer();
      abortInFlightAutocomplete();
      abortInFlightDetails();
      flushSessionStats("unmount");
    };
  }, []);

  useEffect(() => {
    if (!featureEnabled || disabled) {
      clearDebounce();
      abortInFlightAutocomplete();
      setSuggestions([]);
      return;
    }

    const query = String(value || "").trim();
    if (!isFocused || query.length < MIN_QUERY_LENGTH) {
      clearDebounce();
      abortInFlightAutocomplete();
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    clearDebounce();

    const normalizedQuery = normalizeQuery(query);
    const cacheKey = `${mode}:${normalizedQuery}`;
    const cached = getCachedSuggestions(cacheKey);
    if (cached) {
      setSuggestions(cached.slice(0, MAX_SUGGESTIONS));
      setErrorText("");
      setIsLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestCounterRef.current;
      abortInFlightAutocomplete();
      const controller = new AbortController();
      inFlightAutocompleteRef.current = controller;

      touchSession();
      sessionStatsRef.current.requests += 1;
      setIsLoading(true);
      try {
        const response = await locationApi.autocomplete(
          query,
          mode,
          ensureSessionToken(),
          accessToken,
          {
            signal: controller.signal,
          }
        );
        if (requestId !== requestCounterRef.current) return;
        const payload = response?.data || response;
        const nextSuggestions = Array.isArray(payload?.suggestions)
          ? payload.suggestions.slice(0, MAX_SUGGESTIONS)
          : [];
        setCachedSuggestions(cacheKey, nextSuggestions);
        setSuggestions(nextSuggestions);
        setErrorText("");
      } catch (error: any) {
        if (controller.signal.aborted) return;
        if (requestId !== requestCounterRef.current) return;
        setSuggestions([]);
        setErrorText(
          error?.code === "GOOGLE_PLACES_NOT_CONFIGURED"
            ? "Location autocomplete is not configured yet."
            : "Unable to load suggestions. You can still type manually."
        );
      } finally {
        if (requestId === requestCounterRef.current) {
          setIsLoading(false);
          if (inFlightAutocompleteRef.current === controller) {
            inFlightAutocompleteRef.current = null;
          }
        }
      }
    }, debounceMs);
  }, [value, mode, accessToken, featureEnabled, disabled, debounceMs, isFocused]);

  const handleSelectSuggestion = async (suggestion: SuggestionItem) => {
    if (!suggestion?.placeId) return;
    isSelectingSuggestionRef.current = true;
    abortInFlightAutocomplete();
    abortInFlightDetails();
    touchSession();
    const detailsController = new AbortController();
    inFlightDetailsRef.current = detailsController;

    // Optimistically set the tapped suggestion so the input always updates on tap.
    const optimisticValue = getSuggestionDisplayValue(mode, suggestion);
    if (optimisticValue) {
      onValueChange(optimisticValue);
    }
    setSuggestions([]);
    setErrorText("");

    setIsResolving(true);
    try {
      const response = await locationApi.getPlaceDetails(
        suggestion.placeId,
        mode,
        ensureSessionToken(),
        accessToken,
        {
          signal: detailsController.signal,
        }
      );
      const payload = response?.data || response;
      const rawLocation = payload?.location as StructuredLocationPayload | undefined;

      if (!rawLocation) {
        throw new Error("No location details returned");
      }

      const location: StructuredLocationPayload = {
        ...rawLocation,
        stateCode: deriveStateCode(rawLocation, suggestion),
      };
      if (mode === "city_state" && !/^[A-Z]{2}$/.test(String(location.stateCode || "").trim().toUpperCase())) {
        setErrorText("Please select a city with state.");
        return;
      }

      const label = formatLocationLabel(mode, location);
      onValueChange(label);
      onLocationResolved(location);
      setSuggestions([]);
      setErrorText("");
      setIsFocused(false);
      sessionStatsRef.current.selections += 1;
      rotateSessionToken("selection");
    } catch (error: any) {
      if (detailsController.signal.aborted) return;
      setErrorText(
        error?.message || "Unable to resolve selected location. Please retry."
      );
    } finally {
      if (inFlightDetailsRef.current === detailsController) {
        inFlightDetailsRef.current = null;
      }
      setIsResolving(false);
      setTimeout(() => {
        isSelectingSuggestionRef.current = false;
      }, 0);
    }
  };

  return (
    <View style={styles.container}>
      <MeshTextInput
        placeholder={
          placeholder ||
          (mode === "street" ? "Search exact address" : "Search city, state")
        }
        value={value}
        onFocus={() => {
          setIsFocused(true);
          touchSession();
        }}
        onBlur={() => {
          setTimeout(() => {
            if (isSelectingSuggestionRef.current || inFlightDetailsRef.current) {
              return;
            }
            setIsFocused(false);
            setSuggestions([]);
            rotateSessionToken("blur");
          }, 240);
        }}
        onChangeText={(nextText) => {
          setIsFocused(true);
          onValueChange(nextText);
          onLocationCleared?.();
          setErrorText("");
          if (String(nextText || "").trim().length === 0) {
            clearDebounce();
            abortInFlightAutocomplete();
            setSuggestions([]);
            rotateSessionToken("clear");
          } else {
            touchSession();
          }
        }}
        editable={!disabled}
        startIcon={{ name: "location-on" }}
        endElement={
          isResolving || isLoading ? (
            <ActivityIndicator size="small" color={BRAND.primary} />
          ) : undefined
        }
      />

      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : null}

      {shouldShowSuggestions ? (
        <View style={styles.dropdown}>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.placeId}
              style={styles.option}
              onPressIn={() => {
                isSelectingSuggestionRef.current = true;
              }}
              onPress={() => handleSelectSuggestion(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionPrimary} numberOfLines={1}>
                {item.primaryText || item.description}
              </Text>
              {!!item.secondaryText && (
                <Text style={styles.optionSecondary} numberOfLines={1}>
                  {item.secondaryText}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    zIndex: 20,
  },
  errorText: {
    color: "#FFB74D",
    fontSize: 12,
    marginTop: 6,
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    overflow: "hidden",
    backgroundColor: SURFACE.card,
    zIndex: 30,
    elevation: 6,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.light,
  },
  optionPrimary: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  optionSecondary: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
  },
});
