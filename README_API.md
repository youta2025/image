# API 使用文档

本项目提供了一个 RESTful API 用于生成网页截图。

## 基础信息

- **Base URL**: `http://localhost:3002`
- **Endpoint**: `/api/screenshot`
- **Method**: `POST`
- **Content-Type**: `application/json`

## 请求参数

| 参数名 | 类型   | 必选 | 描述 |
| :--- | :--- | :--- | :--- |
| `url`  | string | 是   | 需要截图的目标网页地址 (e.g., "https://www.douyin.com/...") |

## 请求示例

### 使用 curl

```bash
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.douyin.com/user/MS4wLjABAAAAl772J8S_5bblTWU5GsGNMZSGnyi9r8r2YFkULTV6nsc"}'
```

### 使用 JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:3002/api/screenshot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://www.douyin.com/user/MS4wLjABAAAAl772J8S_5bblTWU5GsGNMZSGnyi9r8r2YFkULTV6nsc'
  })
});

const result = await response.json();
if (result.success) {
  console.log('截图成功，Base64数据:', result.data.image.substring(0, 50) + '...');
} else {
  console.error('截图失败:', result.error);
}
```

### 使用 Python

```python
import requests

url = "http://localhost:3002/api/screenshot"
payload = {
    "url": "https://www.douyin.com/user/MS4wLjABAAAAl772J8S_5bblTWU5GsGNMZSGnyi9r8r2YFkULTV6nsc"
}

response = requests.post(url, json=payload)
result = response.json()

if result.get("success"):
    print("截图成功")
    # result['data']['image'] 包含了 base64 图片数据
else:
    print("失败:", result.get("error"))
```

## 响应格式

成功响应:
```json
{
  "success": true,
  "data": {
    "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

失败响应:
```json
{
  "success": false,
  "error": "Error message description"
}
```
