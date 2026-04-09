import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
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
type CustomizeView = "row" | "grid";

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

const HERO_IMAGE = require("../../assets/demo-assets/home-hero-character.png");
const HERO_IMAGE_CHAIN = require("../../assets/demo-assets/chain-equipped.png");
const PROGRESS_NEXT_IMAGE = require("../../assets/demo-assets/html-locker/progress-next-item.png");
const BWW_SKIN_COST = 50;

const CUSTOMIZE_ACCESSORIES = [
  {
    id: "chain",
    name: "Top Scorer Chain",
    sub2: "Weekly Wearable",
    sub: "Legendary",
    image: require("../../assets/demo-assets/html-locker/customize-chain.png"),
    badge: "OFF",
  },
  {
    id: "mask",
    name: "Cry Face Mask",
    sub2: "Accessory",
    sub: "Epic · Meme",
    image: require("../../assets/demo-assets/html-locker/customize-cry-mask.png"),
    badge: "OFF",
  },
  {
    id: "nike",
    name: "Nike Fantasy Pro 2's",
    sub2: "Accessory",
    sub: "Legendary · Collab",
    image: require("../../assets/demo-assets/html-locker/customize-nike.png"),
    badge: "OFF",
  },
];

const CUSTOMIZE_SKINS = [
  {
    id: "cobra",
    name: "Cobra Unit",
    sub2: null as string | null,
    sub: "Rare · Football",
    image: require("../../assets/demo-assets/html-locker/customize-cobra.png"),
    badge: "ON",
    equipped: true,
  },
  {
    id: "coach",
    name: "Coach",
    sub2: null as string | null,
    sub: "Epic · Football",
    image: require("../../assets/demo-assets/html-locker/skin-coach.png"),
    badge: null as string | null,
  },
  {
    id: "pikapp",
    name: "Pi Kapp Man",
    sub2: null as string | null,
    sub: "Rare · Greek Life",
    image: require("../../assets/demo-assets/html-locker/skin-pikapp-man.png"),
    badge: null as string | null,
  },
];

const CUSTOMIZE_TAUNTS = [
  {
    id: "wha",
    name: "WHAAAAAA",
    sub2: "Taunt",
    sub: "Epic · Football",
    image: require("../../assets/demo-assets/taunt-jefferson-td.gif"),
    badge: "SEL",
    selected: true,
  },
];

const CUSTOMIZE_EMOTES = [
  {
    id: "fire",
    name: "🔥 Fire",
    sub2: "Emote",
    sub: "Common · Football",
    image: require("../../assets/demo-assets/html-locker/emote-fire.png"),
    badge: "SEL",
    selected: true,
  },
  {
    id: "skull",
    name: "💀 GG EZ",
    sub2: "Emote",
    sub: "Epic · Taunt",
    image: require("../../assets/demo-assets/html-locker/emote-ggez.png"),
    badge: null as string | null,
  },
  {
    id: "crown",
    name: "👑 Crown Up",
    sub2: "Emote",
    sub: "Rare · Football",
    image: require("../../assets/demo-assets/html-locker/emote-crown-up.png"),
    badge: null as string | null,
  },
];

function ProgressPanel({
  onPressViewItem,
  bwwOwned,
  bwwEquipped,
}: {
  onPressViewItem: () => void;
  bwwOwned: boolean;
  bwwEquipped: boolean;
}) {
  return (
    <View style={[styles.panel, styles.panelContent]}>
      <View style={styles.xpCard}>
        <View style={styles.xpTopRow}>
          <View>
            <Text style={styles.xpLabel}>XP Progress</Text>
            <Text style={styles.xpLevel}>Level 12</Text>
          </View>
          <View style={styles.xpRight}>
            <Text style={styles.xpNumbers}>
              3,420 <Text style={styles.xpNumbersSub}>/ 5,000 XP</Text>
            </Text>
            <Text style={styles.xpPrestige}>1,580 XP to Prestige</Text>
          </View>
        </View>
        <View style={styles.xpBarTrack}>
          <View style={styles.xpBarFill} />
          <View style={styles.xpBarMarker}>
            <View style={styles.xpMarkerDot} />
          </View>
        </View>
        <View style={styles.xpBarLabels}>
          <Text style={styles.xpBarLabel}>Lv 12</Text>
          <Text style={styles.xpPrestigeLabel}>⬡ Prestige at Lv 15</Text>
          <Text style={styles.xpBarLabel}>Lv 13</Text>
        </View>
      </View>

      <View style={styles.bpCard}>
        <View style={styles.bpHeaderRow}>
          <View>
            <Text style={styles.bpEyebrow}>Current Battle Pass</Text>
            <Text style={styles.bpTitle}>🏈 NFL Football</Text>
          </View>
          <View style={styles.bpTierBadge}>
            <Text style={styles.bpTierBadgeText}>Tier 7 / 20</Text>
          </View>
        </View>

        <View style={styles.bpNextRow}>
          <Text style={styles.bpNextLabel}>Next unlock in</Text>
          <View style={styles.bpNextXpPill}>
            <Text style={styles.bpNextXpText}>+320 XP</Text>
          </View>
        </View>

        <View style={styles.bpTrackWrap}>
          <View style={styles.bpTrackLine} />
          <View style={styles.bpTrackFill} />
          <View style={styles.bpNodes}>
            {[
              { id: "t1", emoji: "🎖", labelA: "T1", labelB: "Badge", state: "done" },
              { id: "t3", emoji: "💎", labelA: "T3", labelB: "50 Gems", state: "done" },
              { id: "t5", emoji: "🔥", labelA: "T5", labelB: "Emote", state: "done" },
              { id: "t7", emoji: "👕", labelA: "T7", labelB: "New Skin", state: "current" },
              { id: "t15", emoji: "👕", labelA: "T15", labelB: "Jersey", state: "locked" },
              { id: "t20", emoji: "🌟", labelA: "T20", labelB: "Skin", state: "locked" },
            ].map((node) => (
              <View key={node.id} style={styles.bpNode}>
                <View
                  style={[
                    styles.bpNodeRing,
                    node.state === "done" && styles.bpNodeRingDone,
                    node.state === "current" && styles.bpNodeRingCurrent,
                    node.state === "locked" && styles.bpNodeRingLocked,
                  ]}
                >
                  <Text style={styles.bpNodeEmoji}>{node.emoji}</Text>
                </View>
                <Text
                  style={[
                    styles.bpNodeLabel,
                    node.state === "done" && styles.bpNodeLabelDone,
                    node.state === "current" && styles.bpNodeLabelCurrent,
                  ]}
                >
                  {node.labelA}
                  {"\n"}
                  {node.labelB}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.bpNextItem} activeOpacity={0.9} onPress={onPressViewItem}>
          <View style={styles.bpNextIcon}>
            <Image source={PROGRESS_NEXT_IMAGE} style={styles.bpNextIconImage} resizeMode="contain" />
          </View>
          <View style={styles.bpNextInfo}>
            <Text style={styles.bpNextName}>BWW Skin</Text>
            <Text style={styles.bpNextSub}>
              {bwwEquipped
                ? "Tier 7 · Skin · Equipped"
                : bwwOwned
                  ? "Tier 7 · Skin · Owned"
                  : "Tier 7 · Skin · Rare"}
            </Text>
          </View>
          <View
            style={[
              styles.bpViewItemPill,
              bwwOwned && styles.bpViewItemPillOwned,
              bwwEquipped && styles.bpViewItemPillEquipped,
            ]}
          >
            <Text
              style={[
                styles.bpViewItemText,
                bwwOwned && styles.bpViewItemTextOwned,
                bwwEquipped && styles.bpViewItemTextEquipped,
              ]}
            >
              {bwwEquipped ? "Equipped" : bwwOwned ? "Owned" : "View Item"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CustomizeCard({
  item,
  mode,
  onPress,
}: {
  item: {
    id: string;
    name: string;
    sub2: string | null;
    sub: string;
    image: any;
    badge: string | null;
    selected?: boolean;
    equipped?: boolean;
  };
  mode: CustomizeView;
  onPress?: () => void;
}) {
  if (mode === "grid") {
    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          item.equipped && styles.gridCardEquipped,
          item.selected && styles.gridCardSelected,
        ]}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <View style={styles.gridImageWrap}>
          <Image source={item.image} style={styles.gridImage} resizeMode="contain" />
        </View>
        <Text style={styles.gridLabel}>
          {item.name}
          {"\n"}
          <Text style={styles.gridSub}>{item.sub}</Text>
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.scrollCard,
        item.equipped && styles.scrollCardEquipped,
        item.selected && styles.scrollCardSelected,
      ]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {item.badge ? (
        <View
          style={[
            styles.scrollCardBadge,
            item.badge === "ON" && styles.scrollCardBadgeOn,
            item.badge === "SEL" && styles.scrollCardBadgeSel,
            item.badge === "OFF" && styles.scrollCardBadgeOff,
          ]}
        >
          <Text
            style={[
              styles.scrollCardBadgeText,
              item.badge === "ON" && styles.scrollCardBadgeTextOn,
              item.badge === "SEL" && styles.scrollCardBadgeTextSel,
            ]}
          >
            {item.badge}
          </Text>
        </View>
      ) : null}
      <View style={styles.scrollCardImageWrap}>
        <Image source={item.image} style={styles.scrollCardImage} resizeMode="contain" />
      </View>
      <View style={styles.scrollCardBody}>
        <Text style={styles.scrollCardName}>{item.name}</Text>
        {item.sub2 ? <Text style={styles.scrollCardSub2}>{item.sub2}</Text> : null}
        <Text style={styles.scrollCardSub}>{item.sub}</Text>
      </View>
    </TouchableOpacity>
  );
}

function CustomizeSection({
  title,
  count,
  subtitle,
  items,
  mode,
  rightPill,
  onPressItem,
}: {
  title: string;
  count: string;
  subtitle: string;
  items: Array<{
    id: string;
    name: string;
    sub2: string | null;
    sub: string;
    image: any;
    badge: string | null;
    selected?: boolean;
    equipped?: boolean;
  }>;
  mode: CustomizeView;
  rightPill?: string;
  onPressItem?: (itemId: string) => void;
}) {
  return (
    <View style={styles.customizeSection}>
      <View style={styles.catSectionRow}>
        <Text style={styles.catLabel}>{title}</Text>
        {rightPill ? (
          <View style={styles.slotCounterPill}>
            <Text style={styles.slotCounterText}>{rightPill}</Text>
          </View>
        ) : (
          <Text style={styles.catCount}>{count}</Text>
        )}
      </View>
      <Text style={styles.catSub}>{subtitle}</Text>

      {mode === "row" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.customizeRowContent}
        >
          {items.map((item) => (
            <CustomizeCard
              key={item.id}
              item={item}
              mode="row"
              onPress={onPressItem ? () => onPressItem(item.id) : undefined}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.gridWrap}>
          {items.map((item) => (
            <CustomizeCard
              key={item.id}
              item={item}
              mode="grid"
              onPress={onPressItem ? () => onPressItem(item.id) : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CustomizePanel({
  customizeView,
  setCustomizeView,
  accessoryItems,
  onPressItem,
}: {
  customizeView: CustomizeView;
  setCustomizeView: (mode: CustomizeView) => void;
  accessoryItems: Array<{
    id: string;
    name: string;
    sub2: string | null;
    sub: string;
    image: any;
    badge: string | null;
    selected?: boolean;
    equipped?: boolean;
  }>;
  onPressItem: (itemId: string) => void;
}) {
  return (
    <View style={[styles.panel, styles.panelContent]}>
      <View style={styles.customizeTopBar}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, customizeView === "row" && styles.viewToggleButtonActive]}
            onPress={() => setCustomizeView("row")}
            activeOpacity={0.9}
          >
            <Text
              style={[styles.viewToggleText, customizeView === "row" && styles.viewToggleTextActive]}
            >
              ≡
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, customizeView === "grid" && styles.viewToggleButtonActive]}
            onPress={() => setCustomizeView("grid")}
            activeOpacity={0.9}
          >
            <Text
              style={[styles.viewToggleText, customizeView === "grid" && styles.viewToggleTextActive]}
            >
              ▩
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <CustomizeSection
        title="Accessories"
        count="3 owned"
        subtitle="Tap to equip or remove"
        items={accessoryItems}
        mode={customizeView}
        onPressItem={onPressItem}
      />

      <CustomizeSection
        title="Skins"
        count="3 owned"
        subtitle="Your active skin for this league"
        items={CUSTOMIZE_SKINS}
        mode={customizeView}
      />

      <CustomizeSection
        title="Taunts"
        count="1 / 5"
        subtitle="Select up to 5 — these are available to fire during matchups"
        items={CUSTOMIZE_TAUNTS}
        mode={customizeView}
        rightPill="Selected: 1 / 5"
      />

      <CustomizeSection
        title="Emotes"
        count="1 / 5"
        subtitle="Select up to 5 — pop these live during matchups as reactions"
        items={CUSTOMIZE_EMOTES}
        mode={customizeView}
        rightPill="Selected: 1 / 5"
      />
    </View>
  );
}

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
                <Text
                  style={[styles.storeRarityLabel, { color: rarity }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {item.rarity}
                </Text>
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
  const { state, recordEconomySpend } = useInvestorDemo();
  const [activeTab, setActiveTab] = useState<TabId>("progress");
  const [customizeView, setCustomizeView] = useState<CustomizeView>("row");
  const [isBwwSheetVisible, setIsBwwSheetVisible] = useState(false);
  const [bwwOwned, setBwwOwned] = useState(false);
  const [bwwEquipped, setBwwEquipped] = useState(false);
  const [bwwError, setBwwError] = useState<string | null>(null);
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);
  const [isChainEquipped, setIsChainEquipped] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  const gemCount = useMemo(() => state?.lifetimeGems ?? 640, [state?.lifetimeGems]);
  const canAffordBww = gemCount >= BWW_SKIN_COST;
  const avatarSource = isChainEquipped ? HERO_IMAGE_CHAIN : HERO_IMAGE;

  const accessoryItems = useMemo(
    () =>
      CUSTOMIZE_ACCESSORIES.map((item) =>
        item.id === "chain"
          ? {
              ...item,
              badge: isChainEquipped ? "ON" : "OFF",
              equipped: isChainEquipped,
              sub: isChainEquipped ? "Legendary · Equipped" : "Legendary",
            }
          : item
      ),
    [isChainEquipped]
  );
  const toastTranslateY = useRef(new Animated.Value(22)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissPurchaseToast = (clearState: boolean = true) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(toastTranslateY, {
        toValue: 28,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (clearState) {
        setPurchaseToast(null);
      }
    });
  };

  useEffect(() => {
    if (!purchaseToast) return;
    toastTranslateY.setValue(18);
    toastOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(toastTranslateY, {
        toValue: 0,
        stiffness: 240,
        damping: 18,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    toastTimerRef.current = setTimeout(() => {
      dismissPurchaseToast(true);
    }, 3000);

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [purchaseToast, toastOpacity, toastTranslateY]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.34, 0.66],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.988, 1.015],
  });

  const toastPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !!purchaseToast && gestureState.dy > 3,
        onPanResponderMove: (_, gestureState) => {
          const dy = Math.max(0, gestureState.dy);
          toastTranslateY.setValue(dy);
          toastOpacity.setValue(Math.max(0.45, 1 - dy / 120));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 40 || gestureState.vy > 0.9) {
            Haptics.selectionAsync().catch(() => {});
            dismissPurchaseToast(true);
            return;
          }
          Animated.parallel([
            Animated.spring(toastTranslateY, {
              toValue: 0,
              stiffness: 260,
              damping: 18,
              mass: 0.8,
              useNativeDriver: true,
            }),
            Animated.timing(toastOpacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [purchaseToast, toastOpacity, toastTranslateY]
  );

  const openBwwSheet = () => {
    Haptics.selectionAsync().catch(() => {});
    setBwwError(null);
    setIsBwwSheetVisible(true);
  };

  const closeBwwSheet = () => {
    setIsBwwSheetVisible(false);
  };

  const handleBwwPrimaryAction = () => {
    if (bwwEquipped) {
      Haptics.selectionAsync().catch(() => {});
      closeBwwSheet();
      return;
    }

    if (bwwOwned) {
      setBwwEquipped(true);
      closeBwwSheet();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }

    if (!canAffordBww) {
      const needed = Math.max(0, BWW_SKIN_COST - gemCount);
      setBwwError(`You need ${needed} more gems to unlock this skin.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    const remaining = Math.max(0, gemCount - BWW_SKIN_COST);
    recordEconomySpend(BWW_SKIN_COST);
    setBwwOwned(true);
    setBwwEquipped(true);
    setBwwError(null);
    closeBwwSheet();
    setPurchaseToast(`💎 ${BWW_SKIN_COST} gems spent · ${remaining} remaining`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const handleCustomizeItemPress = (itemId: string) => {
    if (itemId !== "chain") return;
    setIsChainEquipped((previous) => !previous);
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.screenContent,
          { paddingBottom: 24 + Math.max(insets.bottom, 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
          <View style={styles.avatarPulseWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.avatarGlowHalo,
                { opacity: glowOpacity, transform: [{ scale: glowScale }] },
              ]}
            />
            <LinearGradient
              colors={["rgba(58,178,152,0.14)", "rgba(127,101,192,0.08)", "rgba(58,178,152,0.02)"]}
              start={{ x: 0.2, y: 0.1 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.avatarRing}
            >
              <Image source={avatarSource} style={styles.avatarImage} resizeMode="contain" />
              <View style={styles.levelBadge}>
                <View style={styles.levelDot} />
                <Text style={styles.levelBadgeText}>LVL 12 · 3,420 XP</Text>
              </View>
            </LinearGradient>
          </View>
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
          <ProgressPanel onPressViewItem={openBwwSheet} bwwOwned={bwwOwned} bwwEquipped={bwwEquipped} />
        ) : (
          <CustomizePanel
            customizeView={customizeView}
            setCustomizeView={setCustomizeView}
            accessoryItems={accessoryItems}
            onPressItem={handleCustomizeItemPress}
          />
        )}

      </ScrollView>

      <Modal
        visible={isBwwSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeBwwSheet}
      >
        <View style={styles.bwwSheetOverlay}>
          <Pressable style={styles.bwwSheetBackdrop} onPress={closeBwwSheet} />
          <View style={[styles.bwwSheet, { paddingBottom: Math.max(16, insets.bottom + 4) }]}>
            <View style={styles.bwwSheetHandle} />
            <View style={styles.bwwPreviewTop}>
              <View style={styles.bwwRareTopBadge}>
                <Text style={styles.bwwRareTopBadgeText}>★ RARE</Text>
              </View>
              <Image source={PROGRESS_NEXT_IMAGE} style={styles.bwwPreviewImage} resizeMode="contain" />
            </View>

            <View style={styles.bwwContent}>
              <Text style={styles.bwwTitle}>BWW SKIN</Text>
              <Text style={styles.bwwType}>Skin · Fantasy Football</Text>

              <View style={styles.bwwTagRow}>
                <View style={styles.bwwTagGold}>
                  <Text style={styles.bwwTagGoldText}>★ RARE</Text>
                </View>
                <View style={styles.bwwTagSport}>
                  <Text style={styles.bwwTagSportText}>🏈 NFL FOOTBALL</Text>
                </View>
                <View style={styles.bwwTagPass}>
                  <Text style={styles.bwwTagPassText}>BATTLE PASS</Text>
                </View>
              </View>

              <View style={styles.bwwInfoGrid}>
                <View style={styles.bwwInfoBox}>
                  <Text style={styles.bwwInfoLabel}>SEASON</Text>
                  <Text style={styles.bwwInfoValue}>2026 NFL</Text>
                </View>
                <View style={styles.bwwInfoBox}>
                  <Text style={styles.bwwInfoLabel}>SOURCE</Text>
                  <Text style={styles.bwwInfoValue}>Battle Pass T7</Text>
                </View>
                <View style={styles.bwwInfoBox}>
                  <Text style={styles.bwwInfoLabel}>RARITY</Text>
                  <Text style={styles.bwwInfoValue}>Rare</Text>
                </View>
              </View>

              <Text style={styles.bwwDescription}>
                Limited to the 2026 NFL Season Battle Pass. Reach Tier 7 to unlock.
                Once the season ends, this skin is no longer obtainable.
              </Text>

              <View style={styles.bwwFooterRow}>
                <TouchableOpacity
                  style={styles.bwwSecondaryButton}
                  onPress={closeBwwSheet}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bwwSecondaryButtonText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.bwwPrimaryButton,
                    !canAffordBww && !bwwOwned && styles.bwwPrimaryButtonDisabled,
                    bwwEquipped && styles.bwwPrimaryButtonEquipped,
                  ]}
                  activeOpacity={0.9}
                  onPress={handleBwwPrimaryAction}
                >
                  <Text
                    style={[
                      styles.bwwPrimaryButtonText,
                      bwwEquipped && styles.bwwPrimaryButtonTextEquipped,
                    ]}
                  >
                    {bwwEquipped
                      ? "✓ Equipped"
                      : bwwOwned
                        ? "Equip Now"
                        : canAffordBww
                          ? `⚡ Unlock Now · ${BWW_SKIN_COST} 💎`
                          : `Need ${Math.max(0, BWW_SKIN_COST - gemCount)} 💎`}
                  </Text>
                </TouchableOpacity>
              </View>

              {bwwError ? <Text style={styles.bwwErrorText}>{bwwError}</Text> : null}
            </View>
          </View>
        </View>
      </Modal>

      {purchaseToast ? (
        <Animated.View
          {...toastPanResponder.panHandlers}
          style={[styles.purchaseToastWrap, { bottom: 84 + Math.max(12, insets.bottom) }]}
        >
          <Animated.View
            style={[
              styles.purchaseToastPill,
              { opacity: toastOpacity, transform: [{ translateY: toastTranslateY }] },
            ]}
          >
            <Text style={styles.purchaseToastIcon}>💎</Text>
            <Text style={styles.purchaseToastText}>{purchaseToast.replace("💎 ", "")}</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
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
  avatarPulseWrap: {
    width: 220,
    height: 300,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlowHalo: {
    position: "absolute",
    width: 234,
    height: 314,
    borderRadius: 24,
    backgroundColor: "rgba(58,178,152,0.12)",
    shadowColor: "#3AB298",
    shadowOpacity: 0.72,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
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
    flexWrap: "nowrap",
  },
  storeRarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  storeRarityLabel: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 10,
    includeFontPadding: false,
  },
  storePricePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  storePriceText: {
    color: COLORS.light,
    fontSize: 10,
    fontWeight: "700",
  },

  xpCard: {
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    marginBottom: 14,
  },
  xpTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  xpLabel: {
    fontSize: 10,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "700",
    marginBottom: 3,
  },
  xpLevel: {
    color: COLORS.light,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "800",
  },
  xpRight: {
    alignItems: "flex-end",
  },
  xpNumbers: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  xpNumbersSub: {
    color: COLORS.muted2,
    fontSize: 13,
    fontWeight: "500",
  },
  xpPrestige: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "500",
  },
  xpBarTrack: {
    position: "relative",
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.bg3,
    marginBottom: 7,
    overflow: "visible",
  },
  xpBarFill: {
    width: "68.4%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.green,
  },
  xpBarMarker: {
    position: "absolute",
    left: "68.4%",
    top: "50%",
    transform: [{ translateX: -7 }, { translateY: -7 }],
  },
  xpMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: COLORS.bg2,
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  xpBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpBarLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "600",
  },
  xpPrestigeLabel: {
    color: COLORS.purple,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.35,
  },

  bpCard: {
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 18,
    padding: 16,
  },
  bpHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  bpEyebrow: {
    fontSize: 10,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "700",
    marginBottom: 4,
  },
  bpTitle: {
    color: COLORS.light,
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "800",
  },
  bpTierBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.3)",
    backgroundColor: "rgba(127,101,192,0.15)",
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  bpTierBadgeText: {
    color: COLORS.purple,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  bpNextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  bpNextLabel: {
    fontSize: 12,
    color: COLORS.muted2,
  },
  bpNextXpPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.2)",
    backgroundColor: "rgba(58,178,152,0.1)",
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  bpNextXpText: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: "700",
  },
  bpTrackWrap: {
    position: "relative",
    paddingTop: 4,
    marginBottom: 16,
  },
  bpTrackLine: {
    position: "absolute",
    top: 22,
    left: 18,
    right: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: COLORS.border2,
  },
  bpTrackFill: {
    position: "absolute",
    top: 22,
    left: 18,
    width: "35%",
    height: 2,
    borderRadius: 2,
    backgroundColor: COLORS.green,
  },
  bpNodes: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bpNode: {
    alignItems: "center",
    gap: 6,
  },
  bpNodeRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg3,
    alignItems: "center",
    justifyContent: "center",
  },
  bpNodeRingDone: {
    borderColor: COLORS.green,
    backgroundColor: "rgba(58,178,152,0.12)",
  },
  bpNodeRingCurrent: {
    borderColor: COLORS.purple,
    backgroundColor: "rgba(127,101,192,0.18)",
    shadowColor: COLORS.purple,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  bpNodeRingLocked: {
    opacity: 0.45,
  },
  bpNodeEmoji: {
    fontSize: 17,
    lineHeight: 17,
  },
  bpNodeLabel: {
    fontSize: 9,
    textAlign: "center",
    lineHeight: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },
  bpNodeLabelDone: {
    color: COLORS.green,
  },
  bpNodeLabelCurrent: {
    color: COLORS.purple,
    fontWeight: "700",
  },
  bpNextItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.25)",
    backgroundColor: COLORS.bg3,
  },
  bpNextIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg2,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  bpNextIconImage: {
    width: 40,
    height: 40,
  },
  bpNextInfo: {
    flex: 1,
  },
  bpNextName: {
    fontSize: 14,
    color: COLORS.light,
    fontWeight: "700",
    marginBottom: 2,
  },
  bpNextSub: {
    fontSize: 11,
    color: COLORS.muted2,
  },
  bpViewItemPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: COLORS.green,
  },
  bpViewItemPillOwned: {
    backgroundColor: "rgba(127,101,192,0.2)",
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.32)",
  },
  bpViewItemPillEquipped: {
    backgroundColor: "rgba(58,178,152,0.2)",
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.35)",
  },
  bpViewItemText: {
    fontSize: 11,
    color: "#0e1014",
    fontWeight: "700",
  },
  bpViewItemTextOwned: {
    color: COLORS.purple,
  },
  bpViewItemTextEquipped: {
    color: COLORS.green,
  },

  customizeTopBar: {
    alignItems: "flex-end",
    marginBottom: 18,
  },
  viewToggle: {
    flexDirection: "row",
    gap: 4,
    borderRadius: 8,
    backgroundColor: COLORS.bg3,
    padding: 3,
  },
  viewToggleButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleButtonActive: {
    backgroundColor: COLORS.bg2,
  },
  viewToggleText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 13,
    fontWeight: "700",
  },
  viewToggleTextActive: {
    color: COLORS.light,
  },
  customizeSection: {
    marginBottom: 22,
  },
  catSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  catLabel: {
    color: COLORS.light,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  catCount: {
    color: COLORS.muted,
    fontSize: 11,
  },
  catSub: {
    color: COLORS.muted2,
    fontSize: 11,
    marginBottom: 10,
  },
  slotCounterPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg3,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  slotCounterText: {
    color: COLORS.muted2,
    fontSize: 11,
    fontWeight: "600",
  },
  customizeRowContent: {
    gap: 10,
    paddingBottom: 8,
    paddingRight: 20,
  },
  scrollCard: {
    width: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg2,
    overflow: "hidden",
    position: "relative",
  },
  scrollCardEquipped: {
    borderColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOpacity: 0.2,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  scrollCardSelected: {
    borderColor: COLORS.purple,
  },
  scrollCardBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    zIndex: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  scrollCardBadgeOn: {
    borderColor: "rgba(58,178,152,0.3)",
    backgroundColor: "rgba(58,178,152,0.2)",
  },
  scrollCardBadgeSel: {
    borderColor: "rgba(127,101,192,0.3)",
    backgroundColor: "rgba(127,101,192,0.2)",
  },
  scrollCardBadgeOff: {},
  scrollCardBadgeText: {
    fontSize: 8,
    letterSpacing: 0.5,
    color: COLORS.muted,
    fontWeight: "700",
  },
  scrollCardBadgeTextOn: {
    color: COLORS.green,
  },
  scrollCardBadgeTextSel: {
    color: COLORS.purple,
  },
  scrollCardImageWrap: {
    width: "100%",
    height: 90,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollCardImage: {
    width: "100%",
    height: "100%",
  },
  scrollCardBody: {
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 9,
  },
  scrollCardName: {
    color: COLORS.light,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  scrollCardSub2: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  scrollCardSub: {
    color: COLORS.muted,
    fontSize: 9,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCard: {
    width: "31%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg2,
    overflow: "hidden",
  },
  gridCardEquipped: {
    borderColor: COLORS.green,
  },
  gridCardSelected: {
    borderColor: COLORS.purple,
  },
  gridImageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridLabel: {
    color: COLORS.light,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingTop: 5,
    paddingBottom: 7,
  },
  gridSub: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "500",
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
  bwwSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(6,7,10,0.62)",
  },
  bwwSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bwwSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg2,
    overflow: "hidden",
  },
  bwwSheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.border2,
    marginTop: 10,
    marginBottom: 10,
  },
  bwwPreviewTop: {
    backgroundColor: "#f5f2ec",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 236,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  bwwRareTopBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.5)",
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bwwRareTopBadgeText: {
    color: "#f3b14a",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  bwwPreviewImage: {
    width: "62%",
    height: "84%",
  },
  bwwContent: {
    backgroundColor: COLORS.bg2,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  bwwTitle: {
    color: COLORS.light,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  bwwType: {
    color: COLORS.muted2,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 14,
  },
  bwwTagRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  bwwTagGold: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.45)",
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bwwTagGoldText: {
    color: "#f3b14a",
    fontSize: 12,
    fontWeight: "800",
  },
  bwwTagSport: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.45)",
    backgroundColor: "rgba(58,178,152,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bwwTagSportText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "800",
  },
  bwwTagPass: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(127,101,192,0.42)",
    backgroundColor: "rgba(127,101,192,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bwwTagPassText: {
    color: COLORS.purple,
    fontSize: 12,
    fontWeight: "800",
  },
  bwwInfoGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  bwwInfoBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg3,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bwwInfoLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.55,
    marginBottom: 5,
  },
  bwwInfoValue: {
    color: COLORS.light,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  bwwDescription: {
    color: COLORS.muted2,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  bwwErrorText: {
    color: "#fb7185",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  bwwFooterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 2,
  },
  bwwPrimaryButton: {
    flex: 1.35,
    borderRadius: 18,
    backgroundColor: "#8d73df",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 8,
  },
  bwwPrimaryButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  bwwPrimaryButtonEquipped: {
    backgroundColor: "rgba(58,178,152,0.2)",
    borderWidth: 1,
    borderColor: "rgba(58,178,152,0.38)",
  },
  bwwPrimaryButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  bwwPrimaryButtonTextEquipped: {
    color: COLORS.green,
  },
  bwwSecondaryButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border2,
    backgroundColor: COLORS.bg3,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  bwwSecondaryButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: "700",
  },
  purchaseToastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  purchaseToastPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#69c8ae",
    minWidth: 286,
    maxWidth: 340,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    shadowColor: "#66d4bc",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  purchaseToastIcon: {
    fontSize: 18,
    lineHeight: 18,
  },
  purchaseToastText: {
    color: "#0c1722",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.1,
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
