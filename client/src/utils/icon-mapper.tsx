import React from 'react';
import {
  Sparkles,
  Star,
  Home,
  BookOpen,
  Dumbbell,
  MessageCircle,
  FileText,
  Gift,
  UserRound,
  Trophy,
  Target,
  Baby,
  PawPrint,
  Eye,
  Moon,
  CheckCircle,
  PartyPopper,
  Egg,
  TreePine,
  Flame,
  Calendar,
  User,
  Smile,
  Frown,
  Angry,
  HelpCircle,
  Check,
  Footprints,
  Crown,
  Rainbow,
  Map,
  Drumstick,
  Bath,
  Heart,
  Bell,
  Timer,
  RotateCcw,
  DoorOpen,
  PersonStanding,
} from 'lucide-react';

interface EmojiIconMap {
  [key: string]: React.ComponentType<{ size?: number; className?: string }>;
}

const EMOJI_TO_ICON: EmojiIconMap = {
  '🏠': Home,
  '📖': BookOpen,
  '🏃': PersonStanding,
  '💬': MessageCircle,
  '📝': FileText,
  '🎁': Gift,
  '👨‍👩‍👧': UserRound,
  '⭐': Star,
  '🏆': Trophy,
  '🌟': Sparkles,
  '🎯': Target,
  '🐻': Baby,
  '🦭': PawPrint,
  '🐰': PawPrint,
  '👀': Eye,
  '😴': Moon,
  '✅': CheckCircle,
  '🥚': Egg,
  '🎉': PartyPopper,
  '💪': Dumbbell,
  '🌳': TreePine,
  '🎈': Sparkles,
  '🔥': Flame,
  '📅': Calendar,
  '👩': User,
  '🧒': Baby,
  '😊': Smile,
  '😄': Smile,
  '😔': Frown,
  '😠': Angry,
  '🤔': HelpCircle,
  '🥳': PartyPopper,
  '✓': Check,
  '📕': BookOpen,
  '👣': Footprints,
  '👑': Crown,
  '🐶': PawPrint,
  '🐱': PawPrint,
  '🌈': Rainbow,
  '🗺️': Map,
  '🐾': PawPrint,
  '🍗': Drumstick,
  '🛁': Bath,
  '💗': Heart,
  '👤': User,
  '🔔': Bell,
  '⏱️': Timer,
  '🔄': RotateCcw,
  '🚪': DoorOpen,
};

interface IconRendererProps {
  emoji: string;
  size?: number;
  className?: string;
}

const IconRenderer: React.FC<IconRendererProps> = ({ emoji, size = 24, className = '' }) => {
  const IconComponent = EMOJI_TO_ICON[emoji] ?? Sparkles;
  return <IconComponent size={size} className={className} />;
};

export default IconRenderer;
export { EMOJI_TO_ICON };
