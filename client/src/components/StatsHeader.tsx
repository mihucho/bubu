import React from 'react';
import type { KidProfile } from '@shared/api.interface';
import { Sparkles, Star, Trophy, Target, Baby, PawPrint } from 'lucide-react';
import { Image } from '@client/src/components/ui/image';

interface StatsHeaderProps {
  profile: KidProfile;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <div className="bg-white/30 backdrop-blur-sm rounded-3xl p-3 flex flex-col items-center justify-center">
    <div className="mb-1">{icon}</div>
    <div className="text-white text-xl font-bold leading-none">{value}</div>
    <div className="text-white/80 text-xs mt-1">{label}</div>
  </div>
);

const StatsHeader: React.FC<StatsHeaderProps> = ({ profile }) => {
  return (
    <div
      className="px-4 pt-4 pb-6 rounded-b-[32px]"
      style={{
        background:
          'linear-gradient(180deg, #FF85C1 0%, #A855F7 100%)',
      }}
    >
      {/* 顶部头像 + 昵称 + 宠物 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-sky-200 flex items-center justify-center border-2 border-white/50">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.nickname}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Baby size={32} className="text-white" />
            )}
          </div>
          <div>
            <div className="text-white text-lg font-bold leading-tight">
              {profile.nickname}
            </div>
            <div className="inline-flex items-center gap-1 bg-white/30 px-2 py-0.5 rounded-full text-xs text-white mt-1">
              <Sparkles size={10} className="text-yellow-200" />
              <span>{profile.title}</span>
            </div>
          </div>
        </div>
        <div title={profile.petName} className="text-yellow-200">
          <PawPrint size={32} />
        </div>
      </div>

      {/* 2x2 数据卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="可用星星"
          value={profile.availableStars}
          icon={<Star size={24} className="text-yellow-300" />}
        />
        <StatCard
          label="累计获得"
          value={profile.totalStars}
          icon={<Trophy size={24} className="text-yellow-300" />}
        />
        <StatCard
          label="本周星星"
          value={profile.weekStars}
          icon={<Sparkles size={24} className="text-yellow-200" />}
        />
        <StatCard
          label="本周达标"
          value={`${profile.weekAchieved}/${profile.weekTarget}`}
          icon={<Target size={24} className="text-yellow-200" />}
        />
      </div>
    </div>
  );
};

export default StatsHeader;
