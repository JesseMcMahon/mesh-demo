import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ACCENT, BORDER, BRAND, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";
import { TradePlayerDisplay, TradePlayerRow } from "./TradePlayerRow";
import { asId } from "./tradeUtils";

interface TradeComposeSheetProps {
  visible: boolean;
  leagueId: string;
  userSquadId: string | null;
  squads: any[];
  rosters: any[];
  reservedPlayerIds: Set<number>;
  onClose: () => void;
  onSubmit: (payload: {
    leagueId: string;
    receiverSquadId: string;
    offeredAssets: { type: "player"; playerId: number; fromSquadId: string }[];
    requestedAssets: { type: "player"; playerId: number; fromSquadId: string }[];
  }) => Promise<void>;
  isSubmitting?: boolean;
  proposalConflict?: {
    message: string;
    lockedPlayerIds: number[];
    conflictingTradeIds: string[];
  } | null;
  clearConflict?: () => void;
  onPlayerPress?: (player: any) => void;
}

const MAX_ASSETS_PER_SIDE = 3;

function normalizePlayer(player: any): TradePlayerDisplay {
  return {
    playerId: Number(player?.playerId ?? player?.PlayerID),
    firstName: player?.firstName || player?.FirstName,
    lastName: player?.lastName || player?.LastName,
    name: player?.name || player?.Name,
    position: player?.position || player?.Position,
    team: player?.team || player?.Team,
  };
}

export function TradeComposeSheet({
  visible,
  leagueId,
  userSquadId,
  squads,
  rosters,
  reservedPlayerIds,
  onClose,
  onSubmit,
  isSubmitting = false,
  proposalConflict,
  clearConflict,
  onPlayerPress,
}: TradeComposeSheetProps) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [partnerSquadId, setPartnerSquadId] = useState<string | null>(null);
  const [receivePlayerIds, setReceivePlayerIds] = useState<number[]>([]);
  const [sendPlayerIds, setSendPlayerIds] = useState<number[]>([]);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [mySearch, setMySearch] = useState("");

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setPartnerSquadId(null);
      setReceivePlayerIds([]);
      setSendPlayerIds([]);
      setPartnerSearch("");
      setMySearch("");
      clearConflict?.();
    }
  }, [visible, clearConflict]);

  const myRoster = useMemo(
    () =>
      rosters.find((roster: any) => asId(roster?.squadId || roster?.squad?._id) === userSquadId) || null,
    [rosters, userSquadId]
  );

  const partnerRoster = useMemo(
    () =>
      rosters.find((roster: any) => asId(roster?.squadId || roster?.squad?._id) === partnerSquadId) || null,
    [rosters, partnerSquadId]
  );

  const partnerCandidates = useMemo(
    () => squads.filter((squad) => asId(squad?._id || squad?.id) && asId(squad?._id || squad?.id) !== userSquadId),
    [squads, userSquadId]
  );

  const partnerPlayers = useMemo(() => {
    const rows = Array.isArray(partnerRoster?.players) ? partnerRoster.players : [];
    const q = partnerSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((player: any) => {
      const name = `${player?.firstName || player?.FirstName || ""} ${player?.lastName || player?.LastName || ""}`.toLowerCase();
      const meta = `${player?.position || player?.Position || ""} ${player?.team || player?.Team || ""}`.toLowerCase();
      return `${name} ${meta}`.includes(q);
    });
  }, [partnerRoster?.players, partnerSearch]);

  const myPlayers = useMemo(() => {
    const rows = Array.isArray(myRoster?.players) ? myRoster.players : [];
    const q = mySearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((player: any) => {
      const name = `${player?.firstName || player?.FirstName || ""} ${player?.lastName || player?.LastName || ""}`.toLowerCase();
      const meta = `${player?.position || player?.Position || ""} ${player?.team || player?.Team || ""}`.toLowerCase();
      return `${name} ${meta}`.includes(q);
    });
  }, [myRoster?.players, mySearch]);

  const canGoNext = useMemo(() => {
    if (step === 1) return Boolean(partnerSquadId);
    if (step === 2) return receivePlayerIds.length > 0;
    if (step === 3) return sendPlayerIds.length > 0;
    return true;
  }, [step, partnerSquadId, receivePlayerIds.length, sendPlayerIds.length]);

  const toggleSelection = (
    playerId: number,
    selectedIds: number[],
    setter: (updater: (prev: number[]) => number[]) => void
  ) => {
    setter((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= MAX_ASSETS_PER_SIDE) {
        return prev;
      }
      return [...prev, playerId];
    });
    clearConflict?.();
  };

  const submit = async () => {
    if (!partnerSquadId || !userSquadId || !receivePlayerIds.length || !sendPlayerIds.length) {
      return;
    }

    await onSubmit({
      leagueId,
      receiverSquadId: partnerSquadId,
      offeredAssets: sendPlayerIds.map((playerId) => ({
        type: "player" as const,
        playerId,
        fromSquadId: userSquadId,
      })),
      requestedAssets: receivePlayerIds.map((playerId) => ({
        type: "player" as const,
        playerId,
        fromSquadId: partnerSquadId,
      })),
    });
  };

  const renderStepBody = () => {
    if (step === 1) {
      return (
        <View>
          <Text style={styles.stepTitle}>Select Trade Partner</Text>
          <Text style={styles.stepSubtitle}>Choose the squad you want to trade with.</Text>
          {partnerCandidates.map((squad: any) => {
            const squadId = asId(squad?._id || squad?.id) || "";
            const selected = squadId === partnerSquadId;
            return (
              <TouchableOpacity
                key={squadId}
                style={[styles.partnerRow, selected && styles.partnerRowSelected]}
                onPress={() => {
                  setPartnerSquadId(squadId);
                  setReceivePlayerIds([]);
                  clearConflict?.();
                }}
              >
                <View>
                  <Text style={styles.partnerName}>{squad?.name || "Squad"}</Text>
                  <Text style={styles.partnerSub}>Tap to continue</Text>
                </View>
                <MaterialIcons
                  name={selected ? "check-circle" : "radio-button-unchecked"}
                  size={20}
                  color={selected ? SEMANTIC.success : TEXT.tertiary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (step === 2) {
      return (
        <View>
          <Text style={styles.stepTitle}>Select Players You Receive</Text>
          <Text style={styles.stepSubtitle}>Choose up to {MAX_ASSETS_PER_SIDE} players.</Text>
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={17} color={TEXT.tertiary} />
            <TextInput
              value={partnerSearch}
              onChangeText={setPartnerSearch}
              style={styles.searchInput}
              placeholder="Search partner roster"
              placeholderTextColor={TEXT.tertiary}
            />
          </View>

          {partnerPlayers.map((player: any) => {
            const normalized = normalizePlayer(player);
            const playerId = Number(normalized.playerId);
            const isReserved = reservedPlayerIds.has(playerId);
            const selected = receivePlayerIds.includes(playerId);
            const conflictHit = Boolean(proposalConflict?.lockedPlayerIds?.includes(playerId));
            return (
              <TradePlayerRow
                key={`receive-${playerId}`}
                player={normalized}
                selected={selected}
                disabled={isReserved}
                badgeText={isReserved ? "In active trade" : undefined}
                onInfoPress={onPlayerPress ? () => onPlayerPress(player) : undefined}
                onPress={() => {
                  if (isReserved) return;
                  toggleSelection(playerId, receivePlayerIds, setReceivePlayerIds);
                }}
                rightAccessory={
                  conflictHit ? (
                    <MaterialIcons name="error-outline" size={18} color={SEMANTIC.error} />
                  ) : undefined
                }
              />
            );
          })}
        </View>
      );
    }

    if (step === 3) {
      return (
        <View>
          <Text style={styles.stepTitle}>Select Players You Send</Text>
          <Text style={styles.stepSubtitle}>Choose up to {MAX_ASSETS_PER_SIDE} players.</Text>
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={17} color={TEXT.tertiary} />
            <TextInput
              value={mySearch}
              onChangeText={setMySearch}
              style={styles.searchInput}
              placeholder="Search your roster"
              placeholderTextColor={TEXT.tertiary}
            />
          </View>

          {myPlayers.map((player: any) => {
            const normalized = normalizePlayer(player);
            const playerId = Number(normalized.playerId);
            const isReserved = reservedPlayerIds.has(playerId);
            const selected = sendPlayerIds.includes(playerId);
            const conflictHit = Boolean(proposalConflict?.lockedPlayerIds?.includes(playerId));
            return (
              <TradePlayerRow
                key={`send-${playerId}`}
                player={normalized}
                selected={selected}
                disabled={isReserved}
                badgeText={isReserved ? "In active trade" : undefined}
                onInfoPress={onPlayerPress ? () => onPlayerPress(player) : undefined}
                onPress={() => {
                  if (isReserved) return;
                  toggleSelection(playerId, sendPlayerIds, setSendPlayerIds);
                }}
                rightAccessory={
                  conflictHit ? (
                    <MaterialIcons name="error-outline" size={18} color={SEMANTIC.error} />
                  ) : undefined
                }
              />
            );
          })}
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.stepTitle}>Confirm Offer</Text>
        <Text style={styles.stepSubtitle}>Review both sides before sending for voting.</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>YOU RECEIVE</Text>
          {receivePlayerIds.map((playerId) => {
            const player = partnerRoster?.players?.find(
              (row: any) => Number(row?.playerId ?? row?.PlayerID) === Number(playerId)
            );
            return (
              <Text key={`r-${playerId}`} style={styles.summaryText}>
                • {normalizePlayer(player || { playerId }).name || `Player #${playerId}`}
              </Text>
            );
          })}

          <View style={styles.summaryDivider} />

          <Text style={styles.summaryLabel}>YOU SEND</Text>
          {sendPlayerIds.map((playerId) => {
            const player = myRoster?.players?.find(
              (row: any) => Number(row?.playerId ?? row?.PlayerID) === Number(playerId)
            );
            return (
              <Text key={`s-${playerId}`} style={styles.summaryText}>
                • {normalizePlayer(player || { playerId }).name || `Player #${playerId}`}
              </Text>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.sheet, { paddingBottom: Math.max(10, insets.bottom) }]}> 
              <View style={styles.grabber} />
              <View style={styles.header}>
                <Text style={styles.title}>Propose Trade</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <MaterialIcons name="close" size={20} color={TEXT.secondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.stepperRow}>
                {[1, 2, 3, 4].map((index) => {
                  const active = step === index;
                  const completed = step > index;
                  return (
                    <View key={`step-${index}`} style={styles.stepperItem}>
                      <View
                        style={[
                          styles.stepperDot,
                          active && styles.stepperDotActive,
                          completed && styles.stepperDotComplete,
                        ]}
                      >
                        <Text style={styles.stepperDotText}>{index}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {proposalConflict ? (
                <View style={styles.conflictBanner}>
                  <MaterialIcons name="warning-amber" size={16} color={SEMANTIC.error} />
                  <View style={styles.conflictBody}>
                    <Text style={styles.conflictTitle}>{proposalConflict.message}</Text>
                    {proposalConflict.lockedPlayerIds?.length ? (
                      <Text style={styles.conflictMeta}>Locked players: {proposalConflict.lockedPlayerIds.join(", ")}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                {renderStepBody()}
              </ScrollView>

              <View style={styles.footer}>
                {step > 1 ? (
                  <TouchableOpacity
                    style={[styles.footerButton, styles.backButton]}
                    onPress={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev))}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.footerSpacer} />
                )}

                {step < 4 ? (
                  <TouchableOpacity
                    style={[styles.footerButton, styles.nextButton, !canGoNext && styles.disabledButton]}
                    disabled={!canGoNext}
                    onPress={() => setStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev))}
                  >
                    <Text style={styles.nextButtonText}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.footerButton, styles.nextButton, isSubmitting && styles.disabledButton]}
                    disabled={isSubmitting}
                    onPress={submit}
                  >
                    <Text style={styles.nextButtonText}>{isSubmitting ? "Sending..." : "Send For Voting"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: SURFACE.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: BORDER.medium,
    maxHeight: "94%",
    minHeight: "72%",
  },
  grabber: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: `${TEXT.tertiary}66`,
    alignSelf: "center",
    marginTop: 9,
    marginBottom: 7,
  },
  header: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER.medium,
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    color: TEXT.primary,
    fontSize: 22,
    fontWeight: "800",
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  stepperItem: {
    flex: 1,
    alignItems: "center",
  },
  stepperDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE.elevated,
  },
  stepperDotActive: {
    borderColor: BRAND.primary,
    backgroundColor: `${BRAND.primary}1f`,
  },
  stepperDotComplete: {
    borderColor: `${SEMANTIC.success}bb`,
    backgroundColor: `${SEMANTIC.success}1f`,
  },
  stepperDotText: {
    color: TEXT.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  conflictBanner: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${SEMANTIC.error}55`,
    backgroundColor: `${SEMANTIC.error}14`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  conflictBody: {
    marginLeft: 7,
    flex: 1,
  },
  conflictTitle: {
    color: TEXT.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  conflictMeta: {
    color: TEXT.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 14,
    paddingBottom: 20,
  },
  stepTitle: {
    color: TEXT.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  stepSubtitle: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 3,
    marginBottom: 10,
  },
  partnerRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  partnerRowSelected: {
    borderColor: `${SEMANTIC.success}aa`,
    backgroundColor: `${SEMANTIC.success}18`,
  },
  partnerName: {
    color: TEXT.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  partnerSub: {
    color: TEXT.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  searchWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: TEXT.primary,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.medium,
    backgroundColor: SURFACE.elevated,
    padding: 12,
  },
  summaryLabel: {
    color: TEXT.tertiary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  summaryText: {
    color: TEXT.primary,
    fontSize: 13,
    marginTop: 6,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: BORDER.medium,
    marginVertical: 10,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: BORDER.medium,
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  footerButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  footerSpacer: {
    flex: 1,
  },
  backButton: {
    backgroundColor: SURFACE.elevated,
    borderColor: BORDER.medium,
    marginRight: 8,
  },
  backButtonText: {
    color: TEXT.secondary,
    fontSize: 13,
    fontWeight: "700",
  },
  nextButton: {
    marginLeft: 8,
    backgroundColor: BRAND.primary,
    borderColor: `${BRAND.primary}aa`,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
