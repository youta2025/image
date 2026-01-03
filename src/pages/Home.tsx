
import { Link } from 'react-router-dom';
import { Wand2, Image as ImageIcon, Sparkles, Layers } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-indigo-800 overflow-hidden">
        <div className="absolute inset-0">
          <img
            className="w-full h-full object-cover opacity-20"
            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
            alt="Background"
          />
          <div className="absolute inset-0 bg-indigo-800 mix-blend-multiply" />
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            让您的图片焕发新生
          </h1>
          <p className="mt-6 text-xl text-indigo-100 max-w-3xl">
            使用我们先进的处理工具，将普通照片转化为优质的设计素材。
            只需几秒钟，即可应用纹理、描边和艺术效果。
          </p>
          <div className="mt-10">
            <Link
              to="/editor"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 md:py-4 md:text-lg md:px-10"
            >
              开始创作
              <Wand2 className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white overflow-hidden lg:py-24">
        <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
          <div className="relative">
            <h2 className="text-center text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              专业级效果
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-center text-xl text-gray-500">
              打造惊艳视觉素材所需的一切。
            </p>
          </div>

          <div className="relative mt-12 lg:mt-24 lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
                <ImageIcon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">高清原图上传</h3>
              <p className="mt-2 text-base text-gray-500">
                支持高分辨率图片。上传、处理和下载，全程无损画质。
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg mt-8 lg:mt-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">智能效果</h3>
              <p className="mt-2 text-base text-gray-500">
                自动应用描边、纹理叠加和调色等复杂滤镜。
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg mt-8 lg:mt-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">即时预览</h3>
              <p className="mt-2 text-base text-gray-500">
                实时查看变化。并排对比原图和处理后的效果。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
