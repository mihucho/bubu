import React, { useState, useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Gift, Star } from 'lucide-react';
import StatsHeader from '../../components/StatsHeader';
import { useAppContext } from '../../contexts/AppContext';
import { getShopItems, exchangeItem } from '../../api';
import type { ShopItem } from '@shared/api.interface';
import IconRenderer from '@client/src/utils/icon-mapper';

const StarsPage: React.FC = () => {
  const { profile, loading, refreshProfile, setProfile } = useAppContext();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [exchanging, setExchanging] = useState<boolean>(false);

  useEffect(() => {
    const loadItems = async (): Promise<void> => {
      try {
        const data = await getShopItems();
        setItems((data as ShopItem[]).filter((item: ShopItem) => item.isActive));
      } catch (error) {
        logger.error('加载商店物品失败', error);
        toast.error('加载失败，请重试');
      } finally {
        setItemsLoading(false);
      }
    };
    void loadItems();
  }, []);

  const handleItemClick = (item: ShopItem): void => {
    setSelectedItem(item);
    setShowConfirm(true);
  };

  const handleConfirm = async (): Promise<void> => {
    if (!selectedItem || !profile) return;

    const cost = selectedItem.starCost;
    if (profile.availableStars < cost) {
      toast.error('星星不够哦，继续加油！');
      return;
    }

    setExchanging(true);
    try {
      const result = await exchangeItem(selectedItem.id);
      if (result.success && result.profile) {
        setProfile(result.profile);
      }
      toast.success('兑换成功');
      setShowConfirm(false);
      setSelectedItem(null);
    } catch (error) {
      logger.error('兑换失败', error);
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const msg = err.response?.data?.error?.message || '兑换失败，请重试';
      toast.error(msg);
      void refreshProfile();
    } finally {
      setExchanging(false);
    }
  };

  const formatPrice = (item: ShopItem): string => {
    if (item.description && item.description.includes('=')) {
      return `${item.starCost}☆=${item.description.split('=')[1]}`;
    }
    return `${item.starCost}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        加载中...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        暂无数据
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-20">
      <StatsHeader profile={profile} />

      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gift size={28} className="text-[#FF85C1]" />
            <h2 className="text-xl font-bold text-[#4A2666]">星星商店</h2>
          </div>
          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-sm text-[#4A2666]">我有</span>
            <span className="font-bold text-[#4A2666]">{profile.availableStars}</span>
            <Star size={14} className="text-[#FFD700]" />
          </div>
        </div>

        {/* 商品网格 */}
        {itemsLoading ? (
          <div className="flex items-center justify-center py-16 text-[#8B5FBF]">
            加载中...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item: ShopItem) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="bg-white rounded-[20px] border-2 border-pink-200 p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform shadow-sm hover:shadow-md"
                aria-label={`兑换 ${item.name}`}
              >
                <div className="mb-1 text-[#A855F7]">
                  <IconRenderer emoji={item.icon} size={40} />
                </div>
                <div className="text-sm font-bold text-[#4A2666] text-center leading-tight min-h-[2.5rem] flex items-center">
                  {item.name}
                </div>
                <div className="text-[#FF85C1] font-bold text-sm flex items-center gap-1">
                  {formatPrice(item)}
                  {!item.description?.includes('=') && <Star size={12} className="text-[#FFD700]" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 确认兑换弹窗 */}
      {showConfirm && selectedItem && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
          onClick={() => !exchanging && setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mb-3 flex justify-center text-[#A855F7]">
                <IconRenderer emoji={selectedItem.icon} size={56} />
              </div>
              <h3 className="text-xl font-bold text-[#4A2666] mb-2">
                {selectedItem.name}
              </h3>
              <p className="text-[#FF85C1] font-bold text-lg mb-4 flex items-center justify-center gap-1">
                {formatPrice(selectedItem)}
                {!selectedItem.description?.includes('=') && <Star size={16} className="text-[#FFD700]" />}
              </p>
              <p className="text-[#8B5FBF] mb-6">确定兑换吗？</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={exchanging}
                className="flex-1 py-3 rounded-full bg-gray-100 text-[#8B5FBF] font-bold text-sm disabled:opacity-50"
              >
                再想想
              </button>
              <button
                onClick={() => void handleConfirm()}
                disabled={exchanging}
                className="flex-1 py-3 rounded-full text-white font-bold text-sm disabled:opacity-70"
                style={{
                  background: 'linear-gradient(90deg, #FF85C1 0%, #A855F7 100%)',
                }}
              >
                {exchanging ? '兑换中...' : '确定兑换'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StarsPage;
