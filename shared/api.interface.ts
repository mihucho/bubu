export interface ProfileStatusResponse {
  exists: boolean;
  profile?: KidProfile;
}

export interface InitProfileRequest {
  nickname: string;
  parentRole: string;
}

export interface KidProfile {
  id: string;
  nickname: string;
  title: string;
  avatarUrl?: string;
  availableStars: number;
  totalStars: number;
  weekStars: number;
  weekTarget: number;
  weekAchieved: number;
  readingPoints: number;
  petName: string;
  petType: string;
  petStatus: string;
  petHunger: number;
  petClean: number;
  petMood: number;
  petPointsSent: number;
  readingStreak: number;
  exerciseStreak: number;
  showReadingTracker: boolean;
  parentRole: string;
}

export interface Task {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetCount: number;
  currentCount: number;
  starReward: number;
  sortOrder: number;
  isRecommended: boolean;
  isAchieved: boolean;
  weekStart: string;
}

export interface EggTask {
  id: string;
  name: string;
  icon: string;
  starReward: number;
  isCompleted: boolean;
  completedDate?: string;
}

export interface MoodRecord {
  id: string;
  emotion: string;
  content: string;
  starReward: number;
  recordDate: string;
}

export interface ReadingRecord {
  id: string;
  durationMinutes: number;
  recordDate: string;
  bookTitle?: string;
  pointsEarned: number;
}

export interface ExerciseRecord {
  id: string;
  exerciseType: string;
  durationMinutes: number;
  recordDate: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bub' | 'parent';
  content: string;
  createdAt: string;
}

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  starCost: number;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface WrongQuestion {
  id: string;
  subject: string;
  title: string;
  errorReason?: string;
  isMastered: boolean;
  recordDate: string;
}

export interface ReadingTracker {
  id: string;
  bookTitle: string;
  note?: string;
  isSeen: boolean;
}

export interface DashboardStats {
  profile: KidProfile;
  weekTasks: Task[];
  readingTracker: ReadingTracker[];
}

export interface ExerciseStats {
  weekCount: number;
  weekMinutes: number;
  totalCount: number;
  bestRecords: { type: string; minutes: number }[];
  records: ExerciseRecord[];
}

export interface WrongQuestionStats {
  total: number;
  mastered: number;
  items: WrongQuestion[];
}
