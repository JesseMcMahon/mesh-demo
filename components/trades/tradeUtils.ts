import { ACCENT, BRAND, SEMANTIC, TEXT } from "@/constants/colors";

export type TradeViewerDirection = "inbox" | "sent" | "other";
export type TradeVoteDecision = "approve" | "reject" | null;

export interface TradeViewerContext {
  mySquadSide: "proposer" | "receiver" | null;
  canVote: boolean;
  canReceiverDecide: boolean;
  myVote: TradeVoteDecision;
  direction: TradeViewerDirection;
}

export interface TradeProposalAsset {
  type: "player";
  playerId: number;
  fromSquadId?: string;
}

export interface TradeProposalSummarySide {
  approveCount?: number;
  rejectCount?: number;
  thresholdRequired?: number;
}

export interface TradeProposal {
  _id: any;
  proposerSquadId: any;
  receiverSquadId: any;
  offeredAssets: TradeProposalAsset[];
  requestedAssets: TradeProposalAsset[];
  status: string;
  voteSummary?: {
    proposer?: TradeProposalSummarySide;
    receiver?: TradeProposalSummarySide;
  };
  viewerContext?: TradeViewerContext;
  windows?: {
    proposerVoteDeadline?: string;
    receiverDecisionDeadline?: string;
    executeAt?: string | null;
  };
  updatedAt?: string;
  createdAt?: string;
  cancellationReason?: string | null;
  cancelledByTradeProposalId?: string | null;
}

export const TERMINAL_TRADE_STATUSES = ["executed", "rejected", "expired", "cancelled"];

export function asId(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value._id === "string") return value._id;
    if (typeof value.id === "string") return value.id;
  }
  return null;
}

export function normalizeTradeStatus(status: string): string {
  return String(status || "").trim().toLowerCase();
}

export function getTradeStatusLabel(status: string): string {
  const normalized = normalizeTradeStatus(status);
  switch (normalized) {
    case "proposer_voting":
      return "Sent For Voting";
    case "receiver_pending":
      return "Awaiting Receiver";
    case "receiver_voting":
      return "Receiver Voting";
    case "accepted":
      return "Accepted";
    case "executed":
      return "Executed";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return normalized ? normalized.replaceAll("_", " ") : "Pending";
  }
}

export function getTradeStatusTone(status: string) {
  const normalized = normalizeTradeStatus(status);
  if (["executed", "accepted"].includes(normalized)) {
    return {
      bg: `${SEMANTIC.success}1f`,
      border: `${SEMANTIC.success}4f`,
      text: SEMANTIC.success,
    };
  }
  if (["rejected", "expired", "cancelled"].includes(normalized)) {
    return {
      bg: `${SEMANTIC.error}1f`,
      border: `${SEMANTIC.error}4f`,
      text: SEMANTIC.error,
    };
  }
  return {
    bg: `${ACCENT.gold}1f`,
    border: `${ACCENT.gold}4f`,
    text: ACCENT.gold,
  };
}

export function getVoteChipText(myVote: TradeVoteDecision): string | null {
  if (myVote === "approve") return "You approved";
  if (myVote === "reject") return "You rejected";
  return null;
}

export function getViewerTradeColumns(proposal: TradeProposal) {
  const mySide = proposal?.viewerContext?.mySquadSide || null;
  if (mySide === "proposer") {
    return {
      receives: proposal.requestedAssets || [],
      sends: proposal.offeredAssets || [],
      receivesLabel: "YOU RECEIVE",
      sendsLabel: "YOU SEND",
    };
  }
  if (mySide === "receiver") {
    return {
      receives: proposal.offeredAssets || [],
      sends: proposal.requestedAssets || [],
      receivesLabel: "YOU RECEIVE",
      sendsLabel: "YOU SEND",
    };
  }

  return {
    receives: proposal.requestedAssets || [],
    sends: proposal.offeredAssets || [],
    receivesLabel: "RECEIVES",
    sendsLabel: "SENDS",
  };
}

export function getPartnerSquadName(
  proposal: TradeProposal,
  squadNameById: Map<string, string>,
  mySquadId: string | null
): string {
  const proposerId = asId(proposal?.proposerSquadId);
  const receiverId = asId(proposal?.receiverSquadId);

  if (mySquadId && mySquadId === proposerId && receiverId) {
    return squadNameById.get(receiverId) || "Trade Partner";
  }
  if (mySquadId && mySquadId === receiverId && proposerId) {
    return squadNameById.get(proposerId) || "Trade Partner";
  }

  const proposerName = proposerId ? squadNameById.get(proposerId) || "Squad" : "Squad";
  const receiverName = receiverId ? squadNameById.get(receiverId) || "Squad" : "Squad";
  return `${proposerName} ↔ ${receiverName}`;
}

export function getProgress(approveCount?: number, thresholdRequired?: number): number {
  const safeThreshold = Math.max(1, Number(thresholdRequired || 1));
  const safeApprove = Math.max(0, Number(approveCount || 0));
  return Math.min(1, safeApprove / safeThreshold);
}

export function getRoleBanner(proposal: TradeProposal): string | null {
  const status = normalizeTradeStatus(proposal?.status || "");
  const context = proposal?.viewerContext;
  if (!context) return null;

  if (context.mySquadSide === "receiver" && context.canReceiverDecide && status === "receiver_pending") {
    return "You can accept or decline this offer.";
  }
  if (context.canVote && (status === "proposer_voting" || status === "receiver_voting")) {
    return "Your squad vote is required.";
  }
  const voteChip = getVoteChipText(context.myVote || null);
  if (voteChip) {
    return voteChip;
  }
  return null;
}

export const TRADE_TAB_TINT = {
  inbox: BRAND.primary,
  sent: ACCENT.gold,
  completed: TEXT.secondary,
} as const;
