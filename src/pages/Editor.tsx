
import { useState, useRef } from 'react';
import { Upload, Download, Wand2, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, Type, Palette, Layout, MoveHorizontal, Slash, Square, Maximize, Droplets, Move } from 'lucide-react';

interface CardOptions {
  subtitle: string;
  themeColor: string;
  strokeWidth: number;
  borderStyle: 'solid' | 'dashed' | 'double';
  borderRadius: {
    tl: number;
    tr: number;
    bl: number;
    br: number;
  };
  distortion: {
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    bl: { x: number; y: number };
    br: number; // br is kept simple here but in state it might be obj? Wait, API expects obj for all.
  };
  // Actually, let's fix the interface to match what we need
  // API expects: distortion: { tl: {x,y}, tr: {x,y}, bl: {x,y}, br: {x,y} }
  // We should match that structure in state
  distortionConfig: {
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    bl: { x: number; y: number };
    br: { x: number; y: number };
  };
  textColor: string;
  footerColor: string;
  footerOpacity: number;
}
const PRESET_COLORS = [
  { name: '蓝色', value: '#3B82F6' },
  { name: '紫色', value: '#8B5CF6' },
  { name: '粉色', value: '#EC4899' },
  { name: '橙色', value: '#F97316' },
  { name: '绿色', value: '#10B981' },
  { name: '黑色', value: '#000000' },
  { name: '白色', value: '#FFFFFF' },
  { name: '灰色', value: '#6B7280' },
];

export default function Editor() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [options, setOptions] = useState<CardOptions>({
    subtitle: 'STEP 01 接收用户指令',
    themeColor: '#3B82F6',
    strokeWidth: 4,
    borderStyle: 'solid',
    borderRadius: { tl: 20, tr: 20, bl: 20, br: 20 },
    distortionConfig: {
      tl: { x: 0, y: 0 },
      tr: { x: 0, y: 0 },
      bl: { x: 0, y: 0 },
      br: { x: 0, y: 0 }
    },
    textColor: '#cccccc',
    footerColor: '#000000',
    footerOpacity: 0.7
  });

  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProcessedImage(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || '上传失败');

      setOriginalImage(data.fileUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!originalImage) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: originalImage,
          options: {
            ...options,
            distortion: options.distortionConfig
          },
          outputFormat: 'png'
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || '处理失败');

      setProcessedImage(data.processedUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const updateRadius = (corner: keyof typeof options.borderRadius, value: number) => {
    setOptions(prev => ({
      ...prev,
      borderRadius: {
        ...prev.borderRadius,
        [corner]: value
      }
    }));
  };

  const setAllRadius = (value: number) => {
    setOptions(prev => ({
      ...prev,
      borderRadius: {
        tl: value,
        tr: value,
        bl: value,
        br: value
      }
    }));
  };

  // Helper to update distortion
  const updateDistortion = (corner: keyof typeof options.distortionConfig, axis: 'x' | 'y', value: number) => {
    setOptions(prev => ({
      ...prev,
      distortionConfig: {
        ...prev.distortionConfig,
        [corner]: {
          ...prev.distortionConfig[corner],
          [axis]: value
        }
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Wand2 className="h-6 w-6 text-indigo-600 mr-2" />
            <h1 className="text-xl font-bold text-gray-900 mr-8">图片工坊</h1>
            <a href="/docs" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
              API 文档
            </a>
          </div>
          {processedImage && (
            <a
              href={processedImage}
              download="card-material.png"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Download className="h-4 w-4 mr-2" />
              下载素材
            </a>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-gray-500" />
                第一步：上传图片
              </h2>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {uploading ? <Loader2 className="animate-spin h-5 w-5" /> : '选择图片文件'}
              </button>
            </div>

            {/* Customization Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Layout className="h-5 w-5 mr-2 text-gray-500" />
                第二步：样式设置
              </h2>
              
              <div className="space-y-6">
                
                {/* Theme Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                    <div className="flex items-center"><Palette className="h-4 w-4 mr-1" /> 主题颜色 (边框与高亮)</div>
                    <input 
                        type="color" 
                        value={options.themeColor}
                        onChange={(e) => setOptions({...options, themeColor: e.target.value})}
                        className="h-6 w-6 p-0 border-0 rounded cursor-pointer"
                        title="自定义颜色"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setOptions({...options, themeColor: color.value})}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          options.themeColor === color.value ? 'border-gray-900 scale-110' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Footer Settings */}
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Droplets className="h-4 w-4 mr-1 text-gray-500" />
                    底部样式设置
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">文字颜色</label>
                        <div className="flex items-center">
                            <input 
                                type="color" 
                                value={options.textColor}
                                onChange={(e) => setOptions({...options, textColor: e.target.value})}
                                className="h-8 w-full p-0 border border-gray-300 rounded cursor-pointer"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">背景颜色</label>
                        <div className="flex items-center">
                            <input 
                                type="color" 
                                value={options.footerColor}
                                onChange={(e) => setOptions({...options, footerColor: e.target.value})}
                                className="h-8 w-full p-0 border border-gray-300 rounded cursor-pointer"
                            />
                        </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1 flex justify-between">
                        <span>背景透明度</span>
                        <span>{Math.round(options.footerOpacity * 100)}%</span>
                    </label>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="1"
                        value={options.footerOpacity * 100}
                        onChange={(e) => setOptions({...options, footerOpacity: parseInt(e.target.value) / 100})}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>

                {/* Border Settings */}
                <div className="border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <Slash className="h-4 w-4 mr-1" /> 边框样式
                            </label>
                            <div className="flex rounded-md shadow-sm">
                                <button
                                    onClick={() => setOptions({...options, borderStyle: 'solid'})}
                                    className={`flex-1 px-3 py-2 text-sm border rounded-l-md ${
                                        options.borderStyle === 'solid' 
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-500 z-10' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    实线
                                </button>
                                <button
                                    onClick={() => setOptions({...options, borderStyle: 'dashed'})}
                                    className={`flex-1 px-3 py-2 text-sm border -ml-px ${
                                        options.borderStyle === 'dashed' 
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-500 z-10' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    虚线
                                </button>
                                <button
                                    onClick={() => setOptions({...options, borderStyle: 'double'})}
                                    className={`flex-1 px-3 py-2 text-sm border -ml-px rounded-r-md ${
                                        options.borderStyle === 'double' 
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-500 z-10' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    双线
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <MoveHorizontal className="h-4 w-4 mr-1" /> 边框粗细: {options.strokeWidth}px
                            </label>
                            <input 
                                type="range" 
                                min="1" 
                                max="20" 
                                step="1"
                                value={options.strokeWidth}
                                onChange={(e) => setOptions({...options, strokeWidth: parseInt(e.target.value)})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Distortion Settings */}
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Move className="h-4 w-4 mr-1 text-gray-500" />
                    拖拽变形 (自由透视)
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {/* Top Left */}
                    <div>
                      <span className="text-xs text-gray-500 block mb-1 font-medium">左上 (TL)</span>
                      <div className="flex space-x-2">
                        <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2">
                          <span className="text-xs text-gray-400 mr-1">X</span>
                          <input 
                            type="number" 
                            className="w-12 text-sm bg-transparent border-none p-1 focus:ring-0"
                            value={options.distortionConfig.tl.x}
                            onChange={(e) => updateDistortion('tl', 'x', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2">
                          <span className="text-xs text-gray-400 mr-1">Y</span>
                          <input 
                            type="number" 
                            className="w-12 text-sm bg-transparent border-none p-1 focus:ring-0"
                            value={options.distortionConfig.tl.y}
                            onChange={(e) => updateDistortion('tl', 'y', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Top Right */}
                    <div>
                      <span className="text-xs text-gray-500 block mb-1 font-medium">右上 (TR)</span>
                      <div className="flex space-x-2">
                        <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2">
                          <span className="text-xs text-gray-400 mr-1">X</span>
                          <input 
                            type="number" 
                            className="w-12 text-sm bg-transparent border-none p-1 focus:ring-0"
                            value={options.distortionConfig.tr.x}
                            onChange={(e) => updateDistortion('tr', 'x', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2">
                          <span className="text-xs text-gray-400 mr-1">Y</span>
                          <input 
                            type="number" 
                            className="w-12 text-sm bg-transparent border-none p-1 focus:ring-0"
                            value={options.distortionConfig.tr.y}
                            onChange={(e) => updateDistortion('tr', 'y', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Left */}
                    <div>
                      <span className="text-xs text-gray-500 block mb-1 font-medium">左下 (BL)</span>
                      <div className="flex space-x-2">
                        <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2">
                          <span className="text-xs text-gray-400 mr-1">X</span>
                          <input 
                            type="number" 
                            className="w-12 text-sm bg-transparent border-none p-1 focus:ring-0"
                            value={options.distortionConfig.bl.x}
                            onChange={(e) => updateDistortion('bl', 'x', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2">
                          <span className="text-xs text-gray-400 mr-1">Y</span>
                          <input 
                            type="number" 
                            className="w-12 text-sm bg-transparent border-none p-1 focus:ring-0"
                            value={options.distortionConfig.bl.y}
                            onChange={(e) => updateDistortion('bl', 'y', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Right */}
                    <div>
                      <span className="text-xs text-gray-500 block mb-1 font-medium">右下 (BR)</span>
                      <div className="flex space-x-2">
                        <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2">
                          <span className="text-xs text-gray-400 mr-1">X</span>
                          <input 
                            type="number" 
                            className="w-12 text-sm bg-transparent border-none p-1 focus:ring-0"
                            value={options.distortionConfig.br.x}
                            onChange={(e) => updateDistortion('br', 'x', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2">
                          <span className="text-xs text-gray-400 mr-1">Y</span>
                          <input 
                            type="number" 
                            className="w-12 text-sm bg-transparent border-none p-1 focus:ring-0"
                            value={options.distortionConfig.br.y}
                            onChange={(e) => updateDistortion('br', 'y', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Border Radius */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                        <div className="flex items-center"><Maximize className="h-4 w-4 mr-1" /> 圆角设置</div>
                        <button 
                            onClick={() => setAllRadius(0)}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                            重置直角
                        </button>
                    </label>
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div>
                            <span className="text-xs text-gray-500 block mb-1">左上 (TL)</span>
                            <input 
                                type="number" 
                                min="0" max="100"
                                value={options.borderRadius.tl}
                                onChange={(e) => updateRadius('tl', parseInt(e.target.value) || 0)}
                                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block mb-1">右上 (TR)</span>
                            <input 
                                type="number" 
                                min="0" max="100"
                                value={options.borderRadius.tr}
                                onChange={(e) => updateRadius('tr', parseInt(e.target.value) || 0)}
                                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block mb-1">左下 (BL)</span>
                            <input 
                                type="number" 
                                min="0" max="100"
                                value={options.borderRadius.bl}
                                onChange={(e) => updateRadius('bl', parseInt(e.target.value) || 0)}
                                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block mb-1">右下 (BR)</span>
                            <input 
                                type="number" 
                                min="0" max="100"
                                value={options.borderRadius.br}
                                onChange={(e) => updateRadius('br', parseInt(e.target.value) || 0)}
                                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Type className="h-4 w-4 mr-1" /> 底部说明文字
                  </label>
                  <input
                    type="text"
                    value={options.subtitle}
                    onChange={(e) => setOptions({...options, subtitle: e.target.value})}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="STEP 01 说明文字..."
                  />
                </div>

              </div>

              <div className="mt-6">
                <button
                  onClick={handleProcess}
                  disabled={!originalImage || processing}
                  className={`w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    !originalImage || processing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {processing ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      正在生成素材...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="-ml-1 mr-2 h-5 w-5" />
                      生成高级素材
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">错误</h3>
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Area - Preview */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-medium text-gray-700">效果预览</h3>
              {originalImage && !processedImage && <span className="text-xs text-gray-500">原图</span>}
              {processedImage && <span className="text-xs text-indigo-600 font-medium">素材合成结果</span>}
            </div>
            
            <div className="flex-1 flex items-center justify-center p-6 bg-checkerboard relative overflow-auto bg-slate-50">
                {/* Changed background to light gray checkerboard to show transparency better */}
              {!originalImage ? (
                <div className="text-center text-gray-400">
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>请先上传图片</p>
                </div>
              ) : (
                <div className="relative max-w-full max-h-full">
                  <img 
                    src={processedImage || originalImage} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain drop-shadow-sm"
                  />
                  {processing && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-sm rounded-lg">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-2" />
                        <p className="text-gray-800 font-medium">AI 正在处理...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
