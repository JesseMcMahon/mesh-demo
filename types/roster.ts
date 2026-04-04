// Roster-related type definitions

export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF' | 'FLEX';

export type InjuryStatus = 'Q' | 'D' | 'O' | 'IR' | 'PUP' | 'SUS' | null;

export interface GameInfo {
  opponent: string;
  opponentRank?: number;
  isHome: boolean;
  gameTime: string; // e.g., "Sun 4:25 PM"
  gameDate?: string;
}

export interface PlayerStats {
  points?: number;
  projected?: number;
  rosteredPct?: number;
  startPct?: number;
}

export interface RosterPlayer {
  _id?: string;
  playerId: number;
  firstName: string;
  lastName: string;
  team: string;
  position: Position | string;
  photoUrl?: string;
  pickNumber?: number;
  round?: number;
  isAutoPick?: boolean;
  addedAt?: string;
  // Extended properties for roster view (can be hardcoded initially)
  injuryStatus?: InjuryStatus;
  byeWeek?: number;
  gameInfo?: GameInfo;
  stats?: PlayerStats;
}

export interface RosterSlot {
  slotKey?: string;
  position: Position | 'FLEX';
  label: string;
  player: RosterPlayer | null;
  isStarter: boolean;
  slotIndex: number;
  // Vote-related fields for group lineup voting
  consensusPercent?: number; // Percentage of squad members who voted for this player
  totalVotes?: number;       // Total votes this player received for this slot
  totalVoters?: number;      // Total squad members who have voted
  voterNames?: string[];     // Optional list of voters for display
  isLocked?: boolean;        // Starter slot lock state based on kickoff
}

// Represents the official weekly lineup determined by group votes
export interface WeeklyLineup {
  weekNumber: number;
  seasonId: string;
  squadId: string;
  starters: RosterSlot[];
  bench: RosterPlayer[];
  lastUpdated?: string;
}

// Represents an individual user's lineup vote
export interface UserLineupVote {
  odId?: string;
  odDate?: string;
  weekNumber: number;
  seasonId: string;
  squadId: string;
  userId: string;
  starters: {
    position: Position | 'FLEX';
    slotIndex: number;
    playerId: number;
  }[];
  submittedAt?: string;
  updatedAt?: string;
}

// Vote status for UI display
export interface VoteStatus {
  hasVoted: boolean;
  matchesConsensus?: number; // How many of user's picks match current consensus (0-9)
  lastVotedAt?: string;
}

export interface LineupConfiguration {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
  K: number;
  DEF: number;
  BENCH: number;
}

export const DEFAULT_LINEUP_CONFIG: LineupConfiguration = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  K: 1,
  DEF: 1,
  BENCH: 6,
};

// Position colors matching the existing DraftBoard pattern
export const POSITION_COLORS: Record<string, string> = {
  QB: '#5688C7',   // Dusty Blue
  RB: '#F45B69',   // Pink/Red
  WR: '#4CAF93',   // Teal Green (adjusted for better contrast on dark)
  TE: '#F18F01',   // Orange
  K: '#F5C842',    // Yellow
  DEF: '#A461C6',  // Purple
  FLEX: '#8261C2', // Mesh Purple
};

// Get position color with fallback
export const getPositionColor = (position: string): string => {
  const pos = position?.toUpperCase() || '';
  return POSITION_COLORS[pos] || POSITION_COLORS.FLEX;
};

// Injury status display
export const INJURY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  Q: { label: 'QUES', color: '#F5C842' },   // Questionable - Yellow
  D: { label: 'DOUB', color: '#FF9800' },   // Doubtful - Orange
  O: { label: 'OUT', color: '#FF4F4F' },    // Out - Red
  IR: { label: 'IR', color: '#FF4F4F' },    // Injured Reserve - Red
  PUP: { label: 'PUP', color: '#FF4F4F' },  // Physically Unable to Perform - Red
  SUS: { label: 'SUS', color: '#FF4F4F' },  // Suspended - Red
};
