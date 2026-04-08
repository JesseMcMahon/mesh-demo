import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AVATAR_YOU = require("../../assets/demo-assets/home-hero-character.png");
const AVATAR_JAXON = require("../../assets/demo-assets/presence/presence-avatar-3.png");
const AVATAR_DRAFTWIZ = require("../../assets/demo-assets/presence/presence-avatar-2.png");
const AVATAR_BENCH = require("../../assets/demo-assets/presence/presence-avatar-1.png");
const AVATAR_SLEEPER = require("../../assets/demo-assets/presence/presence-avatar-4.png");

type Message =
  | { id: string; kind: "text"; sender: string; mine?: boolean; text: string; avatar?: any }
  | { id: string; kind: "emote"; sender: string; label: string; emoji: string };

function toggleCounter(current: number, on: boolean) {
  return on ? Math.max(0, current - 1) : current + 1;
}

export default function SquadRecapScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [firedEmote, setFiredEmote] = useState<string | null>(null);
  const burstAnim = useRef(new Animated.Value(0)).current;
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);

  const [topReactions, setTopReactions] = useState([
    { emoji: "🔥", count: 5, on: true },
    { emoji: "👑", count: 3, on: false },
    { emoji: "💪", count: 2, on: false },
  ]);
  const [miniLeft, setMiniLeft] = useState([
    { emoji: "💪", count: 7, on: true },
    { emoji: "⚡", count: 2, on: false },
  ]);
  const [miniRight, setMiniRight] = useState([
    { emoji: "👏", count: 4, on: false },
    { emoji: "😤", count: 1, on: false },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      kind: "text",
      sender: "JaxonPlay",
      text: "Mahomes just went OFF. That's what I'm talking about 🔥",
      avatar: AVATAR_JAXON,
    },
    { id: "m2", kind: "emote", sender: "JaxonPlay", label: "Crown", emoji: "👑" },
    {
      id: "m3",
      kind: "text",
      sender: "DraftWiz",
      text: "BenchWarmer leaving 22 pts on the bench is so criminal 😂",
      avatar: AVATAR_DRAFTWIZ,
    },
    {
      id: "m4",
      kind: "text",
      sender: "You",
      text: "We're still 2nd in the league though, let's go! Week 15 lineup is already locked 💪",
      mine: true,
    },
    {
      id: "m5",
      kind: "text",
      sender: "SleeperKing",
      text: "CMC killing me rn 😭 picking up a replacement tonight",
      avatar: AVATAR_SLEEPER,
    },
  ]);

  const emoteOptions = useMemo(
    () => [
      { emoji: "🎉", label: "Party" },
      { emoji: "🔥", label: "Fire" },
      { emoji: "👑", label: "Crown" },
      { emoji: "💪", label: "Beast" },
      { emoji: "😂", label: "Clown" },
      { emoji: "💀", label: "RIP" },
    ],
    []
  );

  const fireBurst = (emoji: string) => {
    setBurstEmoji(emoji);
    burstAnim.stopAnimation();
    burstAnim.setValue(0);
    Animated.timing(burstAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start(() => setBurstEmoji(null));
  };

  const onSendEmote = (emoji: string, label: string) => {
    Haptics.selectionAsync().catch(() => {});
    setFiredEmote(emoji);
    setTimeout(() => setFiredEmote((v) => (v === emoji ? null : v)), 450);
    fireBurst(emoji);
    setMessages((prev) => [
      ...prev,
      {
        id: `em-${Date.now()}`,
        kind: "emote",
        sender: "You",
        label,
        emoji,
      },
    ]);
  };

  const onSendText = () => {
    const txt = inputText.trim();
    if (!txt) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMessages((prev) => [
      ...prev,
      { id: `tx-${Date.now()}`, kind: "text", sender: "You", text: txt, mine: true },
    ]);
    setInputText("");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topNav}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                router.back();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.navMid}>
              <Text style={styles.navEyebrow}>Wolf Pack · Week 14</Text>
              <Text style={styles.navTitle}>SQUAD RECAP</Text>
            </View>
            <View style={styles.navBtn}>
              <Text style={styles.navBtnText}>↗</Text>
            </View>
          </View>

          <View style={styles.resultBlock}>
            <View style={styles.resultRow}>
              <View style={styles.resultLeft}>
                <Text style={styles.resultOutcome}>WIN</Text>
                <Text style={styles.resultOpp}>
                  vs <Text style={styles.resultOppStrong}>Blitz Kings</Text> · Week 14
                </Text>
              </View>
              <View style={styles.resultScoreWrap}>
                <Text style={styles.resultScore} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                  <Text style={styles.resultScoreWin}>148.4</Text> – 121.6
                </Text>
                <Text style={styles.resultScoreSub}>+26.8 margin</Text>
              </View>
            </View>

            <View style={styles.statPills}>
              <View style={styles.statPill}>
                <Text style={[styles.spVal, styles.spGreen]}>87%</Text>
                <Text style={styles.spLbl}>Accuracy</Text>
              </View>
              <View style={styles.statPill}>
                <Text
                  style={[styles.spVal, styles.spAmber, styles.spValTight]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  +340
                </Text>
                <Text style={styles.spLbl}>XP Earned</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={[styles.spVal, styles.spPurple]}>#2</Text>
                <Text style={styles.spLbl}>League Rank</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={[styles.spVal, styles.spGreen]}>8–6</Text>
                <Text style={styles.spLbl}>Record</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>Top Contributors</Text>
            <Text style={styles.sectionHeaderLink}>See all 5</Text>
          </View>

          <View style={styles.contributorsWrap}>
            <View style={styles.contribFirst}>
              <View style={styles.avWrap}>
                <Image source={AVATAR_JAXON} style={styles.firstAvatar} resizeMode="contain" />
                <View style={[styles.rankDot, styles.rankGold, styles.rankTopContributor]}>
                  <Text style={styles.rankTextDark}>1</Text>
                </View>
              </View>
              <View style={styles.contribBody}>
                <Text style={styles.contribName}>JaxonPlay 👑</Text>
                <Text style={styles.contribSub}>Mahomes 34.2 · 6 starters hit 20+</Text>
                <View style={styles.contribStats}>
                  <View>
                    <Text style={[styles.csVal, styles.spAmber]}>94%</Text>
                    <Text style={styles.csLbl}>Accuracy</Text>
                  </View>
                  <View>
                    <Text style={styles.csVal}>148</Text>
                    <Text style={styles.csLbl}>Points</Text>
                  </View>
                  <View>
                    <Text style={[styles.csVal, styles.spPurple]}>3.1k</Text>
                    <Text style={styles.csLbl}>XP</Text>
                  </View>
                </View>
                <View style={styles.reactionsRow}>
                  {topReactions.map((r, idx) => (
                    <TouchableOpacity
                      key={`${r.emoji}-${idx}`}
                      style={[styles.reactChip, r.on && styles.reactChipOn]}
                      onPress={() =>
                        setTopReactions((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, on: !p.on, count: toggleCounter(p.count, p.on) } : p
                          )
                        )
                      }
                    >
                      <Text style={styles.reactEmoji}>{r.emoji}</Text>
                      <Text style={[styles.reactCount, r.on && styles.reactCountOn]}>{r.count}</Text>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.addReact}>
                    <Text style={styles.addReactText}>+</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.contribRestRow}>
              <View style={[styles.contribMini, styles.contribMiniSilver]}>
                <View style={styles.cmTopRow}>
                  <View style={styles.avWrap}>
                    <Image source={AVATAR_YOU} style={styles.miniAvatar} resizeMode="contain" />
                    <View style={[styles.rankDot, styles.rankSilver, styles.rankMini]}>
                      <Text style={styles.rankTextDark}>2</Text>
                    </View>
                  </View>
                  <Text style={styles.cmName}>You</Text>
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                </View>
                <View style={styles.cmStatsRow}>
                  <View>
                    <Text style={[styles.cmStatValue, styles.spGreen]}>87%</Text>
                    <Text style={styles.cmStatLabel}>Acc</Text>
                  </View>
                  <View>
                    <Text style={styles.cmStatValue}>141</Text>
                    <Text style={styles.cmStatLabel}>Pts</Text>
                  </View>
                  <View>
                    <Text style={[styles.cmStatValue, styles.spPurple]}>2.4k</Text>
                    <Text style={styles.cmStatLabel}>XP</Text>
                  </View>
                </View>
                <View style={styles.cmReactions}>
                  {miniLeft.map((r, idx) => (
                    <TouchableOpacity
                      key={`${r.emoji}-${idx}`}
                      style={[styles.reactMini, r.on && styles.reactChipOn]}
                      onPress={() =>
                        setMiniLeft((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, on: !p.on, count: toggleCounter(p.count, p.on) } : p
                          )
                        )
                      }
                    >
                      <Text style={styles.reactEmoji}>{r.emoji}</Text>
                      <Text style={[styles.reactCount, r.on && styles.reactCountOn]}>{r.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.contribMini, styles.contribMiniBronze]}>
                <View style={styles.cmTopRow}>
                  <View style={styles.avWrap}>
                    <Image source={AVATAR_DRAFTWIZ} style={styles.miniAvatar} resizeMode="contain" />
                    <View style={[styles.rankDot, styles.rankBronze, styles.rankMini]}>
                      <Text style={styles.rankTextLight}>3</Text>
                    </View>
                  </View>
                  <Text style={styles.cmName}>DraftWiz</Text>
                </View>
                <View style={styles.cmStatsRow}>
                  <View>
                    <Text style={[styles.cmStatValue, styles.spAmber]}>79%</Text>
                    <Text style={styles.cmStatLabel}>Acc</Text>
                  </View>
                  <View>
                    <Text style={styles.cmStatValue}>138</Text>
                    <Text style={styles.cmStatLabel}>Pts</Text>
                  </View>
                  <View>
                    <Text style={[styles.cmStatValue, styles.spPurple]}>1.8k</Text>
                    <Text style={styles.cmStatLabel}>XP</Text>
                  </View>
                </View>
                <View style={styles.cmReactions}>
                  {miniRight.map((r, idx) => (
                    <TouchableOpacity
                      key={`${r.emoji}-${idx}`}
                      style={[styles.reactMini, r.on && styles.reactChipOn]}
                      onPress={() =>
                        setMiniRight((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, on: !p.on, count: toggleCounter(p.count, p.on) } : p
                          )
                        )
                      }
                    >
                      <Text style={styles.reactEmoji}>{r.emoji}</Text>
                      <Text style={[styles.reactCount, r.on && styles.reactCountOn]}>{r.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.chatHeader}>
            <View style={styles.chatTitleRow}>
              <Text style={styles.chatSectionTitle}>Squad Chat</Text>
              <View style={styles.livePip} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emoteBar}>
            {emoteOptions.map((em) => (
              <TouchableOpacity
                key={em.label}
                onPress={() => onSendEmote(em.emoji, em.label)}
                style={[styles.emoteChip, firedEmote === em.emoji && styles.emoteChipFired]}
              >
                <Text style={styles.emoteChipEmoji}>{em.emoji}</Text>
                <Text style={styles.emoteChipLabel}>{em.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.messagesWrap}>
            <Text style={styles.timeDivider}>Sunday 4:42 PM</Text>
            {messages.map((msg) => {
              if (msg.kind === "emote") {
                return (
                  <View key={msg.id} style={styles.msgEmoteRow}>
                    <Text style={styles.msgEmoteIcon}>{msg.emoji}</Text>
                    <Text style={styles.msgEmoteLabel}>
                      <Text style={styles.msgEmoteBold}>{msg.sender}</Text> sent a {msg.label}
                    </Text>
                  </View>
                );
              }
              return (
                <View key={msg.id} style={[styles.msgRow, msg.mine && styles.msgRowMine]}>
                  {!msg.mine ? (
                    <View style={styles.msgAvatar}>
                      {msg.avatar ? (
                        <Image source={msg.avatar} style={styles.msgAvatarImage} resizeMode="contain" />
                      ) : (
                        <Text style={styles.msgAvatarEmoji}>⚡</Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.msgAvatarSpacer} />
                  )}
                  <View style={styles.msgBubbleWrap}>
                    <Text style={[styles.msgSender, msg.mine && styles.msgSenderMine]}>{msg.sender}</Text>
                    <View style={[styles.bubble, msg.mine ? styles.bubbleMine : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, msg.mine && styles.bubbleTextMine]}>{msg.text}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.chatInputRow}>
            <View style={styles.selfAvatarWrap}>
              <Image source={AVATAR_YOU} style={styles.selfAvatar} resizeMode="contain" />
            </View>
            <TextInput
              placeholder="Message your squad…"
              placeholderTextColor="#4a5263"
              value={inputText}
              onChangeText={setInputText}
              style={styles.chatInput}
              onSubmitEditing={onSendText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={onSendText}>
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.lineupNudge}>
            <View style={styles.lineupTop}>
              <View style={styles.lineupIconWrap}>
                <Text style={styles.lineupIcon}>🏈</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineupEyebrow}>Lineup Nudge</Text>
                <Text style={styles.lineupTitle}>Week 15 lineup lock in 18h</Text>
                <Text style={styles.lineupSub}>2 players are within projection swing range.</Text>
              </View>
            </View>
            <View style={styles.deadlineRow}>
              <View style={styles.deadlineLeft}>
                <Text style={styles.deadlineIcon}>⏱</Text>
                <Text style={styles.deadlineText}>
                  Lock deadline <Text style={styles.deadlineTextStrong}>Sun 12:00 PM</Text>
                </Text>
              </View>
              <View style={styles.deadlineBadge}>
                <Text style={styles.deadlineBadgeText}>Priority</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.lineupCta}>
              <Text style={styles.lineupCtaText}>Open lineup suggestions ↗</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {burstEmoji ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.burstOverlay,
              {
                opacity: burstAnim.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0, 1, 0],
                }),
                transform: [
                  {
                    translateY: burstAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, -110],
                    }),
                  },
                  {
                    scale: burstAnim.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [0.4, 1.2, 0.8],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.burstEmoji}>{burstEmoji}</Text>
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0c0e12" },
  root: { flex: 1, backgroundColor: "#0c0e12" },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  statusTime: { color: "#edf0f4", fontSize: 13, fontWeight: "600" },
  statusRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  signalBars: { flexDirection: "row", alignItems: "flex-end", height: 11, gap: 2 },
  signalBar: { width: 3, borderRadius: 1, backgroundColor: "#edf0f4" },
  battery: {
    width: 21,
    height: 11,
    borderWidth: 1.5,
    borderColor: "#edf0f4",
    borderRadius: 3,
    padding: 1.5,
    justifyContent: "center",
  },
  batteryFill: { width: "72%", height: "100%", backgroundColor: "#edf0f4", borderRadius: 1 },
  scroll: { flex: 1 },

  topNav: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#191d26",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnText: { color: "#8892a0", fontSize: 18, lineHeight: 19 },
  navMid: { alignItems: "center" },
  navEyebrow: {
    color: "#34c99a",
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 1,
  },
  navTitle: {
    color: "#edf0f4",
    fontSize: 22,
    letterSpacing: 1.8,
    fontWeight: "800",
  },

  resultBlock: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(52,201,154,0.22)",
    backgroundColor: "rgba(22,28,36,0.95)",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 8,
  },
  resultLeft: { flex: 1, minWidth: 0, paddingRight: 6 },
  resultOutcome: { fontSize: 42, color: "#34c99a", fontWeight: "900", lineHeight: 42, letterSpacing: 1.2 },
  resultOpp: { fontSize: 12, color: "#8892a0" },
  resultOppStrong: { color: "#edf0f4", fontWeight: "700" },
  resultScoreWrap: { alignItems: "flex-end", flexShrink: 1, minWidth: 0, maxWidth: "62%" },
  resultScore: { color: "#edf0f4", fontSize: 30, fontWeight: "800", lineHeight: 30, letterSpacing: 1, textAlign: "right" },
  resultScoreWin: { color: "#34c99a" },
  resultScoreSub: { color: "#8892a0", fontSize: 11, marginTop: 2 },
  statPills: { flexDirection: "row", gap: 8 },
  statPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  spVal: { color: "#edf0f4", fontSize: 24, fontWeight: "800", lineHeight: 24 },
  spValTight: {
    width: "100%",
    textAlign: "center",
    includeFontPadding: false,
  },
  spGreen: { color: "#34c99a" },
  spAmber: { color: "#e2b34a" },
  spPurple: { color: "#8b6fd4" },
  spLbl: {
    marginTop: 3,
    color: "#4a5263",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderTitle: { color: "#8892a0", fontSize: 11, fontWeight: "700", letterSpacing: 1.3, textTransform: "uppercase" },
  sectionHeaderLink: { color: "#34c99a", fontSize: 11, fontWeight: "600" },

  contributorsWrap: { paddingHorizontal: 20, marginBottom: 20 },
  contribFirst: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "#12151b",
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 8,
  },
  avWrap: { position: "relative" },
  firstAvatar: { width: 56, height: 70, borderRadius: 12, backgroundColor: "#1f2330" },
  miniAvatar: { width: 34, height: 42, borderRadius: 8, backgroundColor: "#1f2330" },
  rankDot: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#12151b",
  },
  rankGold: { backgroundColor: "#e2b34a" },
  rankSilver: { backgroundColor: "#8a9ab0" },
  rankBronze: { backgroundColor: "#8b6fd4" },
  rankTopContributor: { bottom: 2, right: 2 },
  rankMini: { width: 16, height: 16, borderRadius: 8, bottom: -3, right: -3 },
  rankTextDark: { color: "#000", fontSize: 10, fontWeight: "800" },
  rankTextLight: { color: "#fff", fontSize: 10, fontWeight: "800" },
  contribBody: { flex: 1 },
  contribName: { color: "#edf0f4", fontSize: 15, fontWeight: "700", marginBottom: 3 },
  contribSub: { color: "#8892a0", fontSize: 12, marginBottom: 10 },
  contribStats: { flexDirection: "row", gap: 14 },
  csVal: { color: "#edf0f4", fontSize: 22, fontWeight: "800", lineHeight: 22 },
  csLbl: { color: "#4a5263", fontSize: 9, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  reactionsRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reactChip: {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "#191d26",
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  reactChipOn: {
    backgroundColor: "rgba(52,201,154,0.12)",
    borderColor: "rgba(52,201,154,0.3)",
  },
  reactEmoji: { fontSize: 13 },
  reactCount: { color: "#8892a0", fontSize: 11, fontWeight: "700" },
  reactCountOn: { color: "#34c99a" },
  addReact: {
    marginLeft: "auto",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "#191d26",
    alignItems: "center",
    justifyContent: "center",
  },
  addReactText: { color: "#4a5263", fontSize: 14, fontWeight: "700" },

  contribRestRow: { flexDirection: "row", gap: 8 },
  contribMini: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#12151b",
    padding: 13,
  },
  contribMiniSilver: { borderLeftWidth: 3, borderLeftColor: "#8a9ab0" },
  contribMiniBronze: { borderLeftWidth: 3, borderLeftColor: "#8b6fd4" },
  cmTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  cmName: { color: "#edf0f4", fontSize: 12, fontWeight: "700", flex: 1 },
  youBadge: { backgroundColor: "rgba(52,201,154,0.12)", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  youBadgeText: { color: "#34c99a", fontSize: 9, fontWeight: "700", letterSpacing: 0.9 },
  cmStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  cmStatValue: { color: "#edf0f4", fontSize: 18, fontWeight: "800", lineHeight: 18 },
  cmStatLabel: { color: "#4a5263", fontSize: 8, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 1 },
  cmReactions: {
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    gap: 4,
  },
  reactMini: {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#191d26",
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  chatHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chatSectionTitle: { color: "#8892a0", fontSize: 11, fontWeight: "700", letterSpacing: 1.3, textTransform: "uppercase" },
  livePip: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34c99a" },
  emoteBar: { paddingHorizontal: 20, paddingBottom: 10, gap: 6 },
  emoteChip: {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "#191d26",
    paddingHorizontal: 11,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  emoteChipFired: { backgroundColor: "rgba(52,201,154,0.12)", borderColor: "rgba(52,201,154,0.3)" },
  emoteChipEmoji: { fontSize: 14 },
  emoteChipLabel: { color: "#8892a0", fontSize: 10, fontWeight: "600" },

  messagesWrap: { paddingHorizontal: 20, gap: 2, marginBottom: 10 },
  timeDivider: { color: "#4a5263", textAlign: "center", fontSize: 10, fontWeight: "600", letterSpacing: 0.8, marginVertical: 6 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 7, paddingVertical: 2 },
  msgRowMine: { flexDirection: "row-reverse" },
  msgAvatar: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "#1f2330",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  msgAvatarImage: { width: "100%", height: "100%" },
  msgAvatarEmoji: { fontSize: 13 },
  msgAvatarSpacer: { width: 26 },
  msgBubbleWrap: { maxWidth: "74%" },
  msgSender: { color: "#8892a0", fontSize: 10, fontWeight: "600", marginBottom: 3, paddingLeft: 2 },
  msgSenderMine: { textAlign: "right", paddingRight: 2, paddingLeft: 0 },
  bubble: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleOther: { backgroundColor: "#191d26", borderWidth: 1, borderColor: "rgba(255,255,255,0.11)", borderBottomLeftRadius: 5 },
  bubbleMine: { backgroundColor: "#34c99a", borderBottomRightRadius: 5 },
  bubbleText: { color: "#edf0f4", fontSize: 13, lineHeight: 19 },
  bubbleTextMine: { color: "#0a1a14", fontWeight: "500" },
  msgEmoteRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 6 },
  msgEmoteIcon: { fontSize: 24 },
  msgEmoteLabel: { color: "#8892a0", fontSize: 12 },
  msgEmoteBold: { color: "#edf0f4", fontWeight: "700" },

  chatInputRow: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selfAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "#1f2330",
    overflow: "hidden",
  },
  selfAvatar: { width: "100%", height: "100%" },
  chatInput: {
    flex: 1,
    backgroundColor: "#191d26",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    borderRadius: 99,
    paddingHorizontal: 15,
    paddingVertical: 9,
    color: "#edf0f4",
    fontSize: 13,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#34c99a",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { color: "#0a1a14", fontSize: 14, fontWeight: "900" },

  lineupNudge: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "#12151b",
    padding: 18,
  },
  lineupTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  lineupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(139,111,212,0.14)",
    borderWidth: 1,
    borderColor: "rgba(139,111,212,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  lineupIcon: { fontSize: 20 },
  lineupEyebrow: { color: "#8b6fd4", fontSize: 9, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3 },
  lineupTitle: { color: "#edf0f4", fontSize: 15, fontWeight: "700", marginBottom: 3 },
  lineupSub: { color: "#8892a0", fontSize: 12, lineHeight: 17 },
  deadlineRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "#191d26",
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  deadlineLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  deadlineIcon: { fontSize: 16 },
  deadlineText: { color: "#8892a0", fontSize: 12 },
  deadlineTextStrong: { color: "#edf0f4", fontWeight: "700" },
  deadlineBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(226,179,74,0.25)",
    backgroundColor: "rgba(226,179,74,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deadlineBadgeText: { color: "#e2b34a", fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  lineupCta: {
    borderRadius: 13,
    backgroundColor: "#8b6fd4",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  lineupCtaText: { color: "#fff", fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(12,14,18,0.96)",
    flexDirection: "row",
    paddingTop: 12,
  },
  navItem: { flex: 1, alignItems: "center", gap: 4 },
  navItemIcon: { color: "#4a5263", fontSize: 20 },
  navItemLabel: { color: "#4a5263", fontSize: 10, fontWeight: "500" },
  navItemActive: { color: "#34c99a" },

  burstOverlay: {
    position: "absolute",
    top: 260,
    left: "50%",
    marginLeft: -16,
    zIndex: 50,
  },
  burstEmoji: { fontSize: 32 },
});
