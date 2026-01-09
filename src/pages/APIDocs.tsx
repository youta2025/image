
import { useState } from 'react';
import { Book, Copy, Check, Terminal, Code } from 'lucide-react';

export default function APIDocs() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const uploadExample = `curl -X POST http://localhost:3002/api/upload \\
  -F "image=@/path/to/your/image.jpg"`;

  const processExample = `curl -X POST http://localhost:3002/api/process \\
  -H "Content-Type: application/json" \\
  -d '{
    "imageUrl": "http://localhost:3002/uploads/your-image-id.jpg",
    "options": {
      "subtitle": "STEP 01 接收用户指令",
      "themeColor": "#3B82F6",
      "textColor": "#cccccc",
      "footerColor": "#000000",
      "footerOpacity": 0.7,
      "fontFamily": "sans-serif",
      "strokeWidth": 4,
      "borderStyle": "double",
      "borderRadius": { "tl": 20, "tr": 20, "bl": 20, "br": 20 },
      "distortion": {
        "tl": { "x": 0, "y": 0 },
        "tr": { "x": 0, "y": 0 },
        "bl": { "x": 0, "y": 0 },
        "br": { "x": 0, "y": 0 }
      }
    }
  }'`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Book className="mx-auto h-12 w-12 text-indigo-600" />
          <h1 className="mt-3 text-3xl font-extrabold text-gray-900">API 文档</h1>
          <p className="mt-4 text-lg text-gray-500">
            通过简单的 HTTP 请求集成图片处理功能。
          </p>
        </div>

        <div className="space-y-12">
          {/* Section 1: Upload */}
          <section className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-medium text-gray-900 flex items-center">
                <UploadIcon className="h-5 w-5 mr-2 text-gray-500" />
                1. 上传图片
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                首先上传图片以获取可访问的 URL。支持 JPG, PNG, WEBP 格式。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Endpoint</h3>
                  <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded font-mono text-sm">
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                    <span>/api/upload</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Example Request</h3>
                  <button 
                    onClick={() => copyToClipboard(uploadExample, 'upload')}
                    className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                  >
                    {copied === 'upload' ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    复制
                  </button>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm">{uploadExample}</pre>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Process */}
          <section className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-medium text-gray-900 flex items-center">
                <Terminal className="h-5 w-5 mr-2 text-gray-500" />
                2. 处理图片
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-gray-600">
                发送图片 URL 和样式参数，生成合成后的素材图片。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Endpoint</h3>
                  <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded font-mono text-sm">
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                    <span>/api/process</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Parameters (JSON)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">imageUrl</td>
                        <td className="px-3 py-2 text-gray-500">string</td>
                        <td className="px-3 py-2 text-gray-900">必填。图片的 URL（本地 /uploads/ 或远程 URL）。</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">options.subtitle</td>
                        <td className="px-3 py-2 text-gray-500">string</td>
                        <td className="px-3 py-2 text-gray-900">底部显示的文字内容。</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">options.themeColor</td>
                        <td className="px-3 py-2 text-gray-500">hex</td>
                        <td className="px-3 py-2 text-gray-900">边框和高亮颜色 (e.g. #3B82F6)。</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">options.textColor</td>
                        <td className="px-3 py-2 text-gray-500">hex</td>
                        <td className="px-3 py-2 text-gray-900">底部文字颜色。</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">options.footerColor</td>
                        <td className="px-3 py-2 text-gray-500">hex</td>
                        <td className="px-3 py-2 text-gray-900">底部背景颜色。</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">options.footerOpacity</td>
                        <td className="px-3 py-2 text-gray-500">number</td>
                        <td className="px-3 py-2 text-gray-900">底部透明度 (0-1)。</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">options.fontFamily</td>
                        <td className="px-3 py-2 text-gray-500">string</td>
                        <td className="px-3 py-2 text-gray-900">字体名称 (e.g. "SimHei", "Microsoft YaHei", "sans-serif")。</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">options.distortion</td>
                        <td className="px-3 py-2 text-gray-500">object</td>
                        <td className="px-3 py-2 text-gray-900">自由变形设置：{`{ tl: {x,y}, tr: {x,y}, ... }`}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">options.borderStyle</td>
                        <td className="px-3 py-2 text-gray-500">string</td>
                        <td className="px-3 py-2 text-gray-900">边框样式：'solid' (实线), 'dashed' (虚线), 'double' (双线)。</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-mono text-indigo-600">options.borderRadius</td>
                        <td className="px-3 py-2 text-gray-500">object</td>
                        <td className="px-3 py-2 text-gray-900">{`{ tl: 20, tr: 20, bl: 20, br: 20 }`}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Example Request</h3>
                  <button 
                    onClick={() => copyToClipboard(processExample, 'process')}
                    className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                  >
                    {copied === 'process' ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    复制
                  </button>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-blue-400 font-mono text-sm">{processExample}</pre>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}
