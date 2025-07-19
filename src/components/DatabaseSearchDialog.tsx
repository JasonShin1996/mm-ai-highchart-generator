import React, { useState } from 'react';
import { Search, Database, Calendar, TrendingUp, Loader2, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// 國家代碼到國旗 emoji 的映射
const countryFlags = {
  'us': '🇺🇸',
  'tw': '🇹🇼',
  'cn': '🇨🇳',
  'jp': '🇯🇵',
  'kr': '🇰🇷',
  'de': '🇩🇪',
  'fr': '🇫🇷',
  'gb': '🇬🇧',
  'ca': '🇨🇦',
  'au': '🇦🇺',
  'in': '🇮🇳',
  'br': '🇧🇷',
  'mx': '🇲🇽',
  'ru': '🇷🇺',
  'it': '🇮🇹',
  'es': '🇪🇸',
  'nl': '🇳🇱',
  'se': '🇸🇪',
  'ch': '🇨🇭',
  'sg': '🇸🇬',
  'hk': '🇭🇰',
  'th': '🇹🇭',
  'my': '🇲🇾',
  'id': '🇮🇩',
  'ph': '🇵🇭',
  'vn': '🇻🇳',
  'za': '🇿🇦',
  'eg': '🇪🇬',
  'tr': '🇹🇷',
  'ae': '🇦🇪',
  'sa': '🇸🇦',
  'il': '🇮🇱',
  'no': '🇳🇴',
  'dk': '🇩🇰',
  'fi': '🇫🇮',
  'at': '🇦🇹',
  'be': '🇧🇪',
  'pt': '🇵🇹',
  'ie': '🇮🇪',
  'nz': '🇳🇿',
  'cl': '🇨🇱',
  'ar': '🇦🇷',
  'co': '🇨🇴',
  'pe': '🇵🇪',
  'pl': '🇵🇱',
  'cz': '🇨🇿',
  'hu': '🇭🇺',
  'gr': '🇬🇷',
  'ro': '🇷🇴',
  'bg': '🇧🇬',
  'hr': '🇭🇷',
  'si': '🇸🇮',
  'sk': '🇸🇰',
  'lt': '🇱🇹',
  'lv': '🇱🇻',
  'ee': '🇪🇪',
  'mt': '🇲🇹',
  'cy': '🇨🇾',
  'lu': '🇱🇺'
};

// 頻率對應表
const frequencyMap = {
  'D': '日',
  'W': '週',
  'M': '月',
  'Q': '季',
  'Y': '年'
};

interface DatabaseItem {
  id: string;
  name_tc: string;
  name_en: string;
  country: string;
  min_date: string;
  max_date: string;
  frequency: string;
  units: string;
  score: number;
}

interface DatabaseSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataLoaded: (data: any) => void;
}

const DatabaseSearchDialog: React.FC<DatabaseSearchDialogProps> = ({ 
  open, 
  onOpenChange, 
  onDataLoaded 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DatabaseItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getCountryFlag = (countryCode: string) => {
    return countryFlags[countryCode.toLowerCase()] || '🌍';
  };

  const getFrequencyText = (frequency: string) => {
    return frequencyMap[frequency.toUpperCase()] || frequency;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "請輸入搜尋關鍵字",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/search-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });

      if (!response.ok) {
        throw new Error('搜尋失敗');
      }

      const data = await response.json();
      setSearchResults(data.items || []);
      setSelectedItems(new Set()); // 清空選擇
      
      if (data.items.length === 0) {
        toast({
          title: "沒有找到相關數據",
          description: "請嘗試其他關鍵字",
        });
      }
    } catch (error) {
      console.error('搜尋錯誤:', error);
      toast({
        title: "搜尋失敗",
        description: "請稍後重試",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      if (newSelected.size >= 5) {
        toast({
          title: "最多只能選擇5筆資料",
          variant: "destructive",
        });
        return;
      }
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleLoadData = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "請選擇要載入的數據",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/load-database-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stat_ids: Array.from(selectedItems) })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`數據載入失敗 (${response.status}): ${errorData.detail || response.statusText}`);
      }

      const data = await response.json();
      
      // 將選擇的項目資訊與載入的數據合併
      const enrichedData = data.time_series.map(series => {
        const selectedItem = searchResults.find(item => item.id === series.id);
        return {
          ...series,
          name_tc: selectedItem?.name_tc || series.name_tc,
          name_en: selectedItem?.name_en || series.name_en,
          country: selectedItem?.country || '',
          frequency: selectedItem?.frequency || '',
          units: selectedItem?.units || '',
          min_date: selectedItem?.min_date || '',
          max_date: selectedItem?.max_date || ''
        };
      });

      onDataLoaded(enrichedData);
      onOpenChange(false);
      
      toast({
        title: "數據載入成功",
        description: `已載入 ${enrichedData.length} 個時間序列`,
      });
    } catch (error) {
      console.error('載入錯誤:', error);
      toast({
        title: "數據載入失敗",
        description: error.message || "請稍後重試",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            搜尋公司資料庫
          </DialogTitle>
          <DialogDescription>
            搜尋並選擇最多5個時間序列數據進行分析
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜尋輸入 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜尋時間序列數據..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="px-6"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  搜尋中...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  搜尋
                </>
              )}
            </Button>
          </div>

          {/* 搜尋結果 */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  搜尋結果 ({searchResults.length} 個)
                </span>
                {selectedItems.size > 0 && (
                  <Button 
                    onClick={handleLoadData}
                    disabled={isLoading}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        載入中...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        載入選定數據 ({selectedItems.size}/5)
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* 結果列表 */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((item) => (
                  <Card 
                    key={item.id} 
                    className={`cursor-pointer transition-all ${
                      selectedItems.has(item.id) 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => handleItemToggle(item.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onChange={() => handleItemToggle(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">{item.name_tc}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {getFrequencyText(item.frequency)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 truncate">{item.name_en}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center">
                              <Globe className="mr-1 h-3 w-3" />
                              {getCountryFlag(item.country)} {item.country.toUpperCase()}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {item.min_date} ~ {item.max_date}
                            </div>
                            <div className="flex items-center">
                              <TrendingUp className="mr-1 h-3 w-3" />
                              {item.units || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DatabaseSearchDialog; 