import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useInvestorDemo } from "@/contexts/investor-demo";

const COLORS = {
  bg: "#0e1014",
  bg2: "#13161c",
  bg3: "#1a1e27",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  green: "#3ab298",
  purple: "#7f65c0",
  light: "#f0f0f0",
  muted: "#6b7280",
  muted2: "#9ca3af",
  amber: "#f59e0b",
  rare: "#60a5fa",
};

type TabId = "progress" | "customize" | "store";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "progress", label: "Progress" },
  { id: "customize", label: "Customize" },
  { id: "store", label: "Store" },
];

const GEM_BUNDLES = [
  { id: "g100", amount: "100", price: "$0.99", popular: false, best: false },
  { id: "g500", amount: "500", price: "$3.99", popular: true, best: false },
  { id: "g1200", amount: "1,200", price: "$7.99", popular: false, best: false },
  { id: "g2800", amount: "2,800", price: "$14.99", popular: false, best: true },
];

const STORE_ACCESSORIES = [
  {
    id: "acc-nike",
    name: "Nike Fantasy Pro 2's",
    type: "Accessory",
    rarity: "Legendary",
    price: "350",
    urgency: "2 DAYS LEFT",
    image: require("../../assets/demo-assets/html-locker/accessory-nike.png"),
    badge: null as string | null,
  },
  {
    id: "acc-mask",
    name: "Cry Face Mask",
    type: "Accessory",
    rarity: "Epic",
    price: "150",
    urgency: null as string | null,
    image: require("../../assets/demo-assets/html-locker/accessory-cry-mask.png"),
    badge: "NEW",
  },
  {
    id: "acc-soon",
    name: "Coming Soon",
    type: "Accessory",
    rarity: "Rare",
    price: "100",
    urgency: null as string | null,
    image: require("../../assets/demo-assets/html-locker/accessory-coming-soon.png"),
    badge: null as string | null,
  },
];

const STORE_SKINS = [
  {
    id: "skin-coach",
    name: "Coach",
    type: "Skin",
    rarity: "Epic",
    price: "200",
    urgency: "3 DAYS LEFT",
    image: require("../../assets/demo-assets/html-locker/skin-coach.png"),
    badge: null as string | null,
  },
  {
    id: "skin-pikapp",
    name: "Pi Kapp Man",
    type: "Skin",
    rarity: "Rare",
    price: "150",
    urgency: null as string | null,
    image: require("../../assets/demo-assets/html-locker/skin-pikapp-man.png"),
    badge: "NEW",
  },
  {
    id: "skin-soon",
    name: "Coming Soon",
    type: "Skin",
    rarity: "Legendary",
    price: "500",
    urgency: null as string | null,
    image: require("../../assets/demo-assets/html-locker/skin-coming-soon.png"),
    badge: null as string | null,
  },
];

const STORE_EMOTES = [
  {
    id: "emo-fire",
    name: "🔥 Fire",
    type: "Emote",
    rarity: "Common",
    price: "50",
    urgency: null as string | null,
    image: require("../../assets/demo-assets/html-locker/emote-fire.png"),
    badge: "NEW",
    emoji: "🔥",
  },
  {
    id: "emo-ggez",
    name: "💀 GG EZ",
    type: "Emote",
    rarity: "Epic",
    price: "120",
    urgency: "1 DAY LEFT",
    image: require("../../assets/demo-assets/html-locker/emote-ggez.png"),
    badge: null as string | null,
    emoji: "💀",
  },
  {
    id: "emo-crown",
    name: "👑 Crown Up",
    type: "Emote",
    rarity: "Rare",
    price: "80",
    urgency: null as string | null,
    image: require("../../assets/demo-assets/html-locker/emote-crown-up.png"),
    badge: null as string | null,
    emoji: "👑",
  },
];

const HERO_IMAGE = require("../../assets/demo-assets/html-locker/avatar-main.png");

function rarityColor(rarity: string) {
  if (rarity === "Legendary") return COLORS.amber;
  if (rarity === "Epic") return COLORS.purple;
  if (rarity === "Rare") return COLORS.rare;
  return COLORS.muted2;
}

function StoreRow({
  items,
}: {
  items: Array<{
    id: string;
    name: string;
    type: string;
    rarity: string;
    price: string;
    urgency: string | null;
    image: any;
    badge: string | null;
    emoji?: string;
  }>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.storeRowContent}
    >
      {items.map((item) => {
        const rarity = rarityColor(item.rarity);
        return (
          <TouchableOpacity key={item.id} style={styles.storeCard} activeOpacity={0.88}>
            {item.badge ? (
              <View style={styles.storeBadge}>
                <Text style={styles.storeBadgeText}>{item.badge}</Text>
              </View>
            ) : null}

            <View style={styles.storeCardImageWrap}>
              {item.image ? (
                <Image source={item.image} style={styles.storeCardImage} resizeMode="contain" />
              ) : item.emoji ? (
                <LinearGradient
                  colors={["#2a1f1a", "#1a1f33", "#2b230e"]}
                  style={styles.emojiWrap}
                >
                  <Text style={styles.emojiText}>{item.emoji}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.lockedWrap}>
                  <MaterialIcons name="lock" size={36} color="#9ca3af" />
                </View>
              )}
            </View>

            <View style={styles.storeCardBody}>
              {item.urgency ? (
                <Text style={styles.storeUrgency}>⏳ {item.urgency}</Text>
              ) : (
                <View style={styles.storeUrgencySpacer} />
              )}
              <Text style={styles.storeCardName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.storeCardType}>{item.type}</Text>

              <View style={styles.storeCardFooter}>
                <View style={[styles.storeRarityDot, { backgroundColor: rarity }]} />
                <Text style={[styles.storeRarityLabel, { color: rarity }]}>{item.rarity}</Text>
                <View style={styles.storePricePill}>
                  <Text style={styles.storePriceText}>💎 {item.price}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function GemBundles() {
  return (
    <View style={styles.gemRow}>
      {GEM_BUNDLES.map((bundle) => (
        <TouchableOpacity
          key={bundle.id}
          style={[
            styles.gemCard,
            bundle.popular && styles.gemCardPopular,
            bundle.best && styles.gemCardBest,
          ]}
          activeOpacity={0.88}
        >
          {bundle.popular ? (
            <View style={[styles.gemTag, styles.gemTagPopular]}>
              <Text style={styles.gemTagText}>MOST POPULAR</Text>
            </View>
          ) : null}
          {bundle.best ? (
            <View style={[styles.gemTag, styles.gemTagBest]}>
              <Text style={styles.gemTagText}>BEST VALUE</Text>
            </View>
          ) : null}

          <View style={styles.gemTop}>
            <Text style={styles.gemIcon}>💎</Text>
            <Text style={styles.gemAmount}>{bundle.amount}</Text>
            <Text style={styles.gemLabel}>GEMS</Text>
          </View>

          <View style={styles.gemPriceWrap}>
            <Text style={styles.gemPrice}>{bundle.price}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function MyLockerV2Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useInvestorDemo();
  const [activeTab, setActiveTab] = useState<TabId>("store");

  const gemCount = useMemo(() => state?.lifetimeGems ?? 640, [state?.lifetimeGems]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.screenContent,
          { paddingBottom: 96 + Math.max(insets.bottom, 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusBarRow}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.statusRight}>
            <View style={styles.signalBars}>
              <View style={[styles.signalBar, { height: 4 }]} />
              <View style={[styles.signalBar, { height: 6 }]} />
              <View style={[styles.signalBar, { height: 9 }]} />
              <View style={[styles.signalBar, { height: 12 }]} />
            </View>
            <View style={styles.battery}>
              <View style={styles.batteryFill} />
            </View>
          </View>
        </View>

        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.85}
            onPress={() => router.replace("/(investor-demo)/home-v2" as any)}
          >
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>LOCKER ROOM</Text>

          <View style={styles.gemsCounter}>
            <Text style={styles.gemsEmoji}>💎</Text>
            <Text style={styles.gemsCounterText}>{gemCount}</Text>
          </View>
        </View>

        <View style={styles.leagueRow}>
          <Text style={styles.leagueEyebrow}>SELECTED LEAGUE AVATAR</Text>
          <TouchableOpacity style={styles.leagueChip} activeOpacity={0.9}>
            <Text style={styles.leagueChipText}>🏈 2026 ABC Frat League</Text>
            <Text style={styles.leagueChevron}>⌄</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <LinearGradient
            colors={["rgba(58,178,152,0.14)", "rgba(127,101,192,0.08)", "rgba(58,178,152,0.02)"]}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.avatarRing}
          >
            <Image source={HERO_IMAGE} style={styles.avatarImage} resizeMode="contain" />
            <View style={styles.levelBadge}>
              <View style={styles.levelDot} />
              <Text style={styles.levelBadgeText}>LVL 12 · 3,420 XP</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.tabsWrap}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                activeOpacity={0.9}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab(tab.id);
                }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === "store" ? (
          <View style={[styles.panel, styles.panelContent]}>
            <View style={styles.sectionHeadCol}>
              <Text style={styles.sectionTitle}>GEM BUNDLES</Text>
              <Text style={styles.sectionSub}>Buy gems · spend on anything in the store</Text>
            </View>

            <GemBundles />

            <View style={styles.divider} />

            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>ACCESSORIES</Text>
              <View style={styles.refreshPill}>
                <Text style={styles.refreshText}>🕐 Refreshes in 2d 14h</Text>
              </View>
            </View>
            <StoreRow items={STORE_ACCESSORIES} />

            <View style={styles.divider} />

            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>SKINS</Text>
              <View style={styles.refreshPill}>
                <Text style={styles.refreshText}>🕐 Refreshes in 2d 14h</Text>
              </View>
            </View>
            <StoreRow items={STORE_SKINS} />

            <View style={styles.divider} />

            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>EMOTES</Text>
              <View style={styles.refreshPill}>
                <Text style={styles.refreshText}>🕐 Refreshes in 2d 14h</Text>
              </View>
            </View>
            <StoreRow items={STORE_EMOTES} />
          </View>
        ) : activeTab === "progress" ? (
          <View style={[styles.panel, styles.panelContent, styles.placeholderWrap]}>
            <Text style={styles.placeholderTitle}>Progress</Text>
            <Text style={styles.placeholderSub}>Season progression, XP track, and milestone unlock flow.</Text>
          </View>
        ) : (
          <View style={[styles.panel, styles.panelContent, styles.placeholderWrap]}>
            <Text style={styles.placeholderTitle}>Customize</Text>
            <Text style={styles.placeholderSub}>Equip loadouts and taunts from your unlocked inventory.</Text>
          </View>
        )}

      </ScrollView>

      <View style={[styles.bottomNavWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.bottomNav}>
          {[
            { key: "home", label: "Home", icon: "home-filled", active: false },
            { key: "leagues", label: "Leagues", icon: "flag", active: false },
            { key: "explore", label: "Explore", icon: "explore", active: false },
            { key: "avatar", label: "Avatar", icon: "diamond", active: true },
            { key: "profile", label: "Profile", icon: "person", active: false },
          ].map((item) => (
            <View key={item.key} style={styles.navItem}>
              <MaterialIcons
                name={item.icon as any}
                size={20}
                color={item.active ? COLORS.green : COLORS.muted}
              />
              <Text style={[styles.navLabel, item.active && styles.navLabelActive]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screenContent: {
    paddingBottom: 8,
  },
  statusBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 4,
  },
  statusTime: {
    color: COLORS.light,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.25,
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  signalBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 12,
    gap: 2,
  },
  signalBar: {
    width: 3,
    borderRadius: 1,
    backgroundColor: COLORS.light,
  },
  battery: {
    width: 22,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: COLORS.light,
    padding: 1.5,
    justifyContent: "center",
  },
  batteryFill: {
    width: "75%",
    height: "100%",
    borderRadius: 1,
    backgroundColor: COLORS.light,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg2,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    color: COLORS.muted2,
    fontSize: 22,
    lineHeight: 22,
    marginTop: -1,
  },
  pageTitle: {
    color: COLORS.light,
    fontSize: 26,
    letterSpacing: 2,
    fontWeight: "700",
  },
  gemsCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gemsEmoji: {
    fontSize: 13,
  },
  gemsCounterText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: "700",
  },
  leagueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  leagueEyebrow: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  leagueChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(127,101,192,0.12)",
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.25)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  leagueChipText: {
    fontSize: 13,
    color: COLORS.purple,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  leagueChevron: {
    color: COLORS.purple,
    opacity: 0.7,
    fontSize: 11,
    marginTop: 1,
  },
  avatarSection: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  avatarRing: {
    width: 220,
    height: 300,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(58,178,152,0.25)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarImage: {
    width: 210,
    height: 286,
  },
  levelBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },
  levelBadgeText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.55,
  },
  tabsWrap: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg2,
    padding: 4,
    flexDirection: "row",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 9,
  },
  tabBtnActive: {
    backgroundColor: COLORS.bg3,
  },
  tabText: {
    color: COLORS.muted2,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.light,
  },
  panel: {
    flex: 1,
    marginTop: 12,
  },
  panelContent: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  sectionHeadCol: {
    marginBottom: 12,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.light,
    fontSize: 18,
    letterSpacing: 1,
    fontWeight: "700",
  },
  sectionSub: {
    color: COLORS.muted2,
    fontSize: 12,
    marginTop: 4,
  },
  refreshPill: {
    backgroundColor: COLORS.bg3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  refreshText: {
    color: COLORS.muted2,
    fontSize: 10,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },

  gemRow: {
    flexDirection: "row",
    gap: 6,
  },
  gemCard: {
    flex: 1,
    minWidth: 0,
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg2,
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  gemCardPopular: {
    borderColor: "rgba(58,178,152,0.4)",
    backgroundColor: "rgba(58,178,152,0.06)",
  },
  gemCardBest: {
    borderColor: "rgba(245,158,11,0.35)",
    backgroundColor: "rgba(245,158,11,0.05)",
  },
  gemTag: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: 3,
    borderBottomWidth: 1,
  },
  gemTagPopular: {
    backgroundColor: "rgba(58,178,152,0.25)",
    borderBottomColor: "rgba(58,178,152,0.3)",
  },
  gemTagBest: {
    backgroundColor: "rgba(245,158,11,0.2)",
    borderBottomColor: "rgba(245,158,11,0.3)",
  },
  gemTagText: {
    fontSize: 7,
    fontWeight: "700",
    color: COLORS.light,
    letterSpacing: 0.5,
  },
  gemTop: {
    marginTop: 8,
    alignItems: "center",
    gap: 1,
  },
  gemIcon: {
    fontSize: 18,
    lineHeight: 18,
  },
  gemAmount: {
    color: COLORS.light,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 20,
  },
  gemLabel: {
    color: COLORS.muted,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  gemPriceWrap: {
    width: "90%",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.2)",
    backgroundColor: "rgba(58,178,152,0.1)",
  },
  gemPrice: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: "700",
  },

  storeRowContent: {
    gap: 8,
    paddingRight: 20,
  },
  storeCard: {
    width: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg2,
    overflow: "hidden",
    position: "relative",
  },
  storeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 10,
    backgroundColor: "rgba(58,178,152,0.2)",
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.3)",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  storeBadgeText: {
    color: COLORS.green,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  storeCardImageWrap: {
    width: "100%",
    height: 100,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  storeCardImage: {
    width: "100%",
    height: "100%",
  },
  emojiWrap: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 42,
    lineHeight: 44,
  },
  lockedWrap: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  storeCardBody: {
    paddingHorizontal: 9,
    paddingTop: 8,
    paddingBottom: 10,
  },
  storeUrgency: {
    color: "#ef4444",
    fontSize: 8,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.45,
  },
  storeUrgencySpacer: {
    height: 12,
    marginBottom: 4,
  },
  storeCardName: {
    color: COLORS.light,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 13,
    marginBottom: 1,
  },
  storeCardType: {
    color: COLORS.muted,
    fontSize: 9,
    marginBottom: 6,
  },
  storeCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  storeRarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  storeRarityLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: "700",
  },
  storePricePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  storePriceText: {
    color: COLORS.light,
    fontSize: 10,
    fontWeight: "700",
  },

  placeholderWrap: {
    minHeight: 360,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderTitle: {
    color: COLORS.light,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  placeholderSub: {
    color: COLORS.muted2,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },

  bottomNavWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: "rgba(19,22,28,0.97)",
  },
  bottomNav: {
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 0,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  navLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  navLabelActive: {
    color: COLORS.green,
  },
});
