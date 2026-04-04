import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { TopNavigation } from "@/components/TopNavigation";
import { MeshButton } from "@/components/MeshButton";
import { MeshTextInput } from "@/components/MeshTextInput";
import { SettingsSection } from "@/components/SettingsSection";
import { useLeagueData } from "@/contexts/league-data";
import { useNotification } from "@/contexts/notification";
import {
  useBatchSimulationRun,
  useSimulationRunLogs,
  useSimulationRunStatus,
  useStartSimulationRun,
  useStepSimulationRun,
} from "@/hooks/useFantasyV2";
import { getUserErrorMessage } from "@/lib/errorMessages";
import { backOrReplace } from "@/lib/navigation";
import { ACCENT, BORDER, BRAND, SEMANTIC, SURFACE, TEXT } from "@/constants/colors";

function parseCsv(input: string): string[] {
  return String(input || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function statusColor(status?: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return SEMANTIC.success;
  if (normalized === "failed") return SEMANTIC.error;
  if (normalized === "running") return BRAND.primary;
  if (normalized === "queued") return BRAND.gold;
  return TEXT.secondary;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

const SIMULATION_UI_ENABLED = true;

export default function SimulationConsoleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const leagueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { userProfile, seasonId, currentSeason } = useLeagueData();
  const { showNotification } = useNotification();

  const isLeagueAdmin = useMemo(() => {
    const roles = (userProfile as any)?.roles;
    return Array.isArray(roles) && roles.includes("LeagueAdmin");
  }, [userProfile]);

  const [sportsSeasonInput, setSportsSeasonInput] = useState(
    String((currentSeason as any)?.year || new Date().getFullYear())
  );
  const [seedInput, setSeedInput] = useState("123");
  const [runIdInput, setRunIdInput] = useState("");
  const [batchLeagueIds, setBatchLeagueIds] = useState(leagueId || "");
  const [batchSeasonsInput, setBatchSeasonsInput] = useState("");
  const [maxLeaguesInput, setMaxLeaguesInput] = useState("10");
  const [dryRun, setDryRun] = useState(false);

  const startRunMutation = useStartSimulationRun();
  const stepRunMutation = useStepSimulationRun();
  const batchRunMutation = useBatchSimulationRun();

  const {
    data: runStatusData,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useSimulationRunStatus(runIdInput || undefined, SIMULATION_UI_ENABLED && !!runIdInput);

  const {
    data: runLogsData,
    isLoading: isLogsLoading,
    refetch: refetchLogs,
  } = useSimulationRunLogs(runIdInput || undefined, 200, SIMULATION_UI_ENABLED && !!runIdInput);

  const run = (runStatusData as any)?.run;
  const logs = ((runLogsData as any)?.events || []) as any[];

  const handleBack = () => {
    backOrReplace(router, `/(tabs)/league/${leagueId}/edit` as any);
  };

  const handleStartRun = async () => {
    try {
      if (!leagueId) {
        showNotification("League id missing.", "error");
        return;
      }
      const response = await startRunMutation.mutateAsync({
        leagueId,
        seasonId: seasonId || undefined,
        sportsSeason: Number(sportsSeasonInput || 0) || undefined,
        seed: Number(seedInput || 0) || undefined,
        dryRun,
      });
      const createdRunId = (response as any)?.run?.runId;
      if (createdRunId) {
        setRunIdInput(createdRunId);
      }
      showNotification("Simulation run created.", "success");
    } catch (error: any) {
      showNotification(getUserErrorMessage(error, "Failed to start simulation run."), "error");
    }
  };

  const handleStepRun = async () => {
    try {
      if (!runIdInput) {
        showNotification("Enter a run id first.", "error");
        return;
      }
      await stepRunMutation.mutateAsync({
        runId: runIdInput,
        action: "advance_week",
      });
      await refetchStatus();
      await refetchLogs();
      showNotification("Advanced one week.", "success");
    } catch (error: any) {
      showNotification(getUserErrorMessage(error, "Failed to step run."), "error");
    }
  };

  const handleBatchRun = async () => {
    try {
      const leagueIds = parseCsv(batchLeagueIds);
      if (!leagueIds.length) {
        showNotification("Enter at least one league id.", "error");
        return;
      }
      const seasons = parseCsv(batchSeasonsInput)
        .map((year) => Number(year))
        .filter((year) => Number.isFinite(year));

      await batchRunMutation.mutateAsync({
        leagueIds,
        seasons: seasons.length ? seasons : undefined,
        maxLeagues: Math.max(1, Math.min(Number(maxLeaguesInput || 10), 10)),
        seed: Number(seedInput || 0) || undefined,
        dryRun,
      });

      showNotification("Batch simulation completed.", "success");
    } catch (error: any) {
      showNotification(getUserErrorMessage(error, "Failed to execute batch run."), "error");
    }
  };

  if (!SIMULATION_UI_ENABLED) {
    return (
      <View style={styles.container}>
        <TopNavigation title="Simulation Console" showBackButton onBackPress={handleBack} />
        <View style={styles.emptyState}>
          <MaterialIcons name="build-circle" size={44} color={TEXT.secondary} />
          <Text style={styles.emptyTitle}>Simulation tools are disabled</Text>
          <Text style={styles.emptySubtitle}>
            Enable this UI in development with EXPO_PUBLIC_ENABLE_SIMULATION_CONSOLE=true.
          </Text>
        </View>
      </View>
    );
  }

  if (!isLeagueAdmin) {
    return (
      <View style={styles.container}>
        <TopNavigation title="Simulation Console" showBackButton onBackPress={handleBack} />
        <View style={styles.emptyState}>
          <MaterialIcons name="lock" size={42} color={TEXT.secondary} />
          <Text style={styles.emptyTitle}>Admin only</Text>
          <Text style={styles.emptySubtitle}>
            Only league admins can use simulation controls.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavigation title="Simulation Console" showBackButton onBackPress={handleBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.warningBanner}>
          <MaterialIcons name="science" size={18} color={BRAND.gold} />
          <Text style={styles.warningText}>
            Dev/Admin only. Backend must have ENABLE_SIMULATION_TOOLS=true.
          </Text>
        </View>

        <SettingsSection title="Run Setup" icon="play-circle" showDivider>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>League ID</Text>
            <MeshTextInput value={leagueId || ""} editable={false} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Season ID</Text>
            <MeshTextInput value={seasonId || "(active season fallback)"} editable={false} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sports Season Year</Text>
            <MeshTextInput
              value={sportsSeasonInput}
              onChangeText={setSportsSeasonInput}
              keyboardType="number-pad"
              placeholder="2024"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Seed</Text>
            <MeshTextInput
              value={seedInput}
              onChangeText={setSeedInput}
              keyboardType="number-pad"
              placeholder="123"
            />
          </View>

          <TouchableOpacity
            onPress={() => setDryRun((prev) => !prev)}
            style={[styles.toggleRow, dryRun && styles.toggleRowActive]}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.toggleTitle}>Dry Run</Text>
              <Text style={styles.toggleSubtitle}>No state mutation, validates orchestration path.</Text>
            </View>
            <View style={[styles.toggleDot, dryRun && styles.toggleDotActive]}>
              {dryRun ? <MaterialIcons name="check" size={14} color="#FFF" /> : null}
            </View>
          </TouchableOpacity>

          <MeshButton
            title="Start Run"
            onPress={handleStartRun}
            loading={startRunMutation.isPending}
            disabled={startRunMutation.isPending}
            startIcon={{ name: "play-arrow" }}
          />
        </SettingsSection>

        <SettingsSection title="Step Controls" icon="fast-forward" showDivider>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Run ID</Text>
            <MeshTextInput
              value={runIdInput}
              onChangeText={setRunIdInput}
              placeholder="Paste runId from start response"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.rowButtons}>
            <View style={styles.rowButtonItem}>
              <MeshButton
                title="Advance Week"
                onPress={handleStepRun}
                variant="primary"
                loading={stepRunMutation.isPending}
                disabled={stepRunMutation.isPending || !runIdInput}
                startIcon={{ name: "skip-next" }}
              />
            </View>
            <View style={styles.rowButtonItem}>
              <MeshButton
                title="Refresh"
                onPress={() => {
                  refetchStatus();
                  refetchLogs();
                }}
                variant="secondary"
                disabled={!runIdInput}
                startIcon={{ name: "refresh" }}
              />
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="Batch Controls" icon="view-list" showDivider>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>League IDs (comma-separated)</Text>
            <MeshTextInput
              value={batchLeagueIds}
              onChangeText={setBatchLeagueIds}
              placeholder="leagueId1,leagueId2"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Season Years (comma-separated, optional)</Text>
            <MeshTextInput
              value={batchSeasonsInput}
              onChangeText={setBatchSeasonsInput}
              placeholder="2021,2022,2023"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Max Leagues (1-10)</Text>
            <MeshTextInput
              value={maxLeaguesInput}
              onChangeText={setMaxLeaguesInput}
              keyboardType="number-pad"
              placeholder="10"
            />
          </View>

          <MeshButton
            title="Run Batch"
            onPress={handleBatchRun}
            variant="secondary"
            loading={batchRunMutation.isPending}
            disabled={batchRunMutation.isPending}
            startIcon={{ name: "playlist-play" }}
          />
        </SettingsSection>

        <SettingsSection title="Run Status" icon="analytics" showDivider>
          {!runIdInput ? (
            <Text style={styles.mutedText}>Enter or start a run to view status and logs.</Text>
          ) : isStatusLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={BRAND.primary} />
              <Text style={styles.mutedText}>Loading run status...</Text>
            </View>
          ) : run ? (
            <>
              <View style={styles.statusHeader}>
                <Text style={styles.statusTitle}>Run {run.runId}</Text>
                <View style={[styles.statusBadge, { borderColor: statusColor(run.status) }]}> 
                  <Text style={[styles.statusBadgeText, { color: statusColor(run.status) }]}> 
                    {String(run.status || "unknown").toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Week</Text>
                  <Text style={styles.metricValue}>{Number(run.currentWeek || 0)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Phase</Text>
                  <Text style={styles.metricValueSmall}>{String(run.phase || "-")}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Seed</Text>
                  <Text style={styles.metricValue}>{Number(run.seed || 0)}</Text>
                </View>
              </View>

              <View style={styles.jsonCard}>
                <Text style={styles.jsonTitle}>Result Summary</Text>
                <Text style={styles.jsonText}>{prettyJson(run.resultSummary || {})}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.mutedText}>Run not found or inaccessible.</Text>
          )}
        </SettingsSection>

        <SettingsSection title="Run Logs" icon="receipt-long">
          {!runIdInput ? (
            <Text style={styles.mutedText}>No run selected.</Text>
          ) : isLogsLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={BRAND.primary} />
              <Text style={styles.mutedText}>Loading logs...</Text>
            </View>
          ) : logs.length === 0 ? (
            <Text style={styles.mutedText}>No events yet.</Text>
          ) : (
            <View style={styles.logList}>
              {logs.slice(-80).reverse().map((event: any, index: number) => (
                <View key={`${event._id || event.createdAt || index}`} style={styles.logRow}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logType}>{String(event.type || "event")}</Text>
                    <Text style={styles.logWeek}>W{event.week ?? "-"}</Text>
                  </View>
                  <Text style={styles.logMeta}>
                    {new Date(event.createdAt || Date.now()).toLocaleString()}
                  </Text>
                  <Text style={styles.logPayload} numberOfLines={4}>
                    {prettyJson(event.payload || {})}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 56,
  },
  warningBanner: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${BRAND.gold}50`,
    borderRadius: 12,
    backgroundColor: `${BRAND.gold}15`,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningText: {
    color: BRAND.gold,
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: TEXT.secondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 8,
    gap: 8,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  toggleRow: {
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 12,
    backgroundColor: SURFACE.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  toggleRowActive: {
    borderColor: BRAND.primary,
    backgroundColor: ACCENT.redBg,
  },
  toggleTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  toggleSubtitle: {
    color: TEXT.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleDotActive: {
    borderColor: BRAND.primary,
    backgroundColor: BRAND.primary,
  },
  rowButtons: {
    flexDirection: "row",
    gap: 10,
  },
  rowButtonItem: {
    flex: 1,
  },
  mutedText: {
    color: TEXT.secondary,
    fontSize: 13,
  },
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 10,
    backgroundColor: SURFACE.card,
    padding: 10,
    minHeight: 72,
  },
  metricLabel: {
    color: TEXT.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  metricValueSmall: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  jsonCard: {
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 12,
    backgroundColor: "#0A0E18",
    padding: 10,
  },
  jsonTitle: {
    color: TEXT.light,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  jsonText: {
    color: "#AFC5FF",
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "Courier",
  },
  logList: {
    gap: 8,
  },
  logRow: {
    borderWidth: 1,
    borderColor: BORDER.medium,
    borderRadius: 10,
    backgroundColor: SURFACE.card,
    padding: 10,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  logType: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  logWeek: {
    color: BRAND.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  logMeta: {
    color: TEXT.secondary,
    fontSize: 11,
    marginBottom: 4,
  },
  logPayload: {
    color: TEXT.light,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Courier",
  },
});
