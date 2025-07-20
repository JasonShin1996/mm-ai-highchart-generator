import React from 'react';
import { Upload, Database, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <header className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          MM AI Highcharts圖表生成器
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          選擇您的數據源，用自然語言描述，讓 AI 為您生成互動式圖表
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 本地檔案上傳選項 */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
              onClick={() => navigate('/local-file')}>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">本地檔案上傳</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              上傳您的 CSV 或 Excel 檔案，AI 會分析數據並為您生成最適合的圖表
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>✓ 支援 CSV、Excel 格式</p>
              <p>✓ AI 自動分析數據特性</p>
              <p>✓ 智能推薦圖表類型</p>
              <p>✓ 即時數據預覽和編輯</p>
            </div>
            <Button 
              className="mt-6 w-full group-hover:bg-blue-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/local-file');
              }}
            >
              開始使用
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* M平方資料庫選項 */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
              onClick={() => navigate('/database')}>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <Database className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">M平方資料庫</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              搜尋 M平方資料庫中的時間序列數據，快速生成專業的金融圖表
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>✓ 豐富的金融數據庫</p>
              <p>✓ 專業的時間序列圖表</p>
              <p>✓ 支援多數據系列組合</p>
              <p>✓ 自動雙Y軸配置</p>
            </div>
            <Button 
              className="mt-6 w-full group-hover:bg-green-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/database');
              }}
            >
              開始使用
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 功能特色說明 */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">功能特色</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-purple-600 font-bold text-lg">AI</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI 智能分析</h3>
            <p className="text-gray-600 text-sm">
              自動分析數據特性，推薦最適合的圖表類型和樣式
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-orange-600 font-bold text-lg">⚡</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">快速生成</h3>
            <p className="text-gray-600 text-sm">
              使用自然語言描述需求，AI 快速生成互動式圖表
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-red-600 font-bold text-lg">🎨</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">專業樣式</h3>
            <p className="text-gray-600 text-sm">
              基於 M平方設計規範，生成專業美觀的圖表樣式
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
