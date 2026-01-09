import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

// 配置：替换为您的服务器地址和端口
const API_BASE_URL = 'https://practitioner-brothers-protest-owned.trycloudflare.com/api';

/**
 * 1. 上传图片
 */
async function uploadImage(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const formData = new FormData();
    formData.append('image', fs.createReadStream(filePath));

    console.log(`[1/2] Uploading ${path.basename(filePath)}...`);
    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Upload failed: ${data.error}`);
    }

    console.log('Upload Success:', data.fileUrl);
    return data.fileUrl; // 返回图片的 URL
}

/**
 * 2. 处理图片 (添加边框和文字)
 */
async function processImage(imageUrl) {
    console.log('[2/2] Processing image...');

    const options = {
        imageUrl: imageUrl,
        options: {
            subtitle: 'STEP 01 自动化处理成功', // 底部文字
            themeColor: '#3B82F6',          // 主题色 (蓝色)
            textColor: '#FFFFFF',           // 文字颜色 (白色)
            footerColor: '#000000',         // 底部背景色 (黑色)
            footerOpacity: 0.8,             // 底部背景透明度
            strokeWidth: 10,                // 边框粗细
            borderStyle: 'double',          // 边框样式: solid, dashed, double
            borderRadius: {                 // 圆角设置
                tl: 40, tr: 40, bl: 40, br: 40 
            }
        },
        outputFormat: 'png' // 输出格式: png, jpg
    };

    const response = await fetch(`${API_BASE_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Processing failed: ${data.error}`);
    }

    console.log('Processing Success!');
    console.log('-----------------------------------');
    console.log('Final Image URL:', data.processedUrl);
    console.log('-----------------------------------');
    return data.processedUrl;
}

// 主函数
(async () => {
    try {
        // 替换为您本地要上传的图片路径
        const localImagePath = './test_image.jpg'; 

        // 1. 上传
        const uploadedUrl = await uploadImage(localImagePath);

        // 2. 处理
        await processImage(uploadedUrl);

    } catch (error) {
        console.error('Error:', error.message);
    }
})();
