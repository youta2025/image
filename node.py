from langchain_core.runnables import RunnableConfig
from langgraph.runtime import Runtime
from coze_coding_utils.runtime_ctx.context import Context
from graphs.state import ScreenshotInput, ScreenshotOutput
from utils.file.file import File
import os
import tempfile
import hashlib
import time
import subprocess
import sys
import traceback
from typing import Optional

from storage.s3.s3_storage import S3SyncStorage


def screenshot_node(state: ScreenshotInput, config: RunnableConfig, runtime: Runtime[Context]) -> ScreenshotOutput:
    """
    title: 网页截屏
    desc: 使用 Playwright 浏览器自动化工具截屏网页，支持复杂动态网页
    integrations: Playwright (浏览器自动化工具), 对象存储
    """
    # --- Coze 平台适配代码 Start ---
    import os
    import sys
    import shutil
    
    print(">>> [Init] 初始化运行环境 (System Chromium 优先模式)...")
    
    # 1. 优先寻找系统安装的 Chromium (由 install_dependencies.sh 通过 apt-get 安装)
    system_paths = [
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable"
    ]
    
    executable_path = None
    
    # 显式检查系统路径
    for path in system_paths:
        if os.path.exists(path):
            print(f">>> ✅ 发现系统浏览器: {path}")
            executable_path = path
            break
            
    # 使用 shutil.which 进行更广泛的搜索
    if not executable_path:
        executable_path = shutil.which("chromium") or shutil.which("chromium-browser")
        if executable_path:
             print(f">>> ✅ 通过 PATH 找到浏览器: {executable_path}")

    # 2. 如果系统浏览器没找到，检查本地打包的 browsers 目录 (备用)
    if not executable_path:
        current_file_path = os.path.abspath(__file__)
        current_dir = os.path.dirname(current_file_path)
        project_root = os.path.dirname(current_dir)
        bundled_browser_path = os.path.join(project_root, "browsers")
        
        if os.path.exists(bundled_browser_path):
            os.environ["PLAYWRIGHT_BROWSERS_PATH"] = bundled_browser_path
            print(f">>> ⚠ 未找到系统浏览器，回退到本地打包路径: {bundled_browser_path}")
        else:
            print(">>> ⚠ 未找到系统浏览器，也未找到本地打包目录")

    # --- Coze 平台适配代码 End ---

    try:
        from playwright.sync_api import sync_playwright, Error as PlaywrightError
    except ImportError as e:
        raise ImportError(
            "Playwright模块未安装。请确保在部署前已安装所有依赖：\n"
            "1. 检查 requirements.txt 中包含 'playwright==1.57.0'\n"
            "2. 运行 'pip install -r requirements.txt'\n"
            f"原始错误: {e}"
        )
    ctx = runtime.context
    
    url = state.url
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    # 生成唯一文件名
    timestamp = int(time.time())
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    filename = f"screenshot_{timestamp}_{url_hash}.png"
    screenshot_path = os.path.join(tempfile.gettempdir(), filename)
    
    try:
        # 检查浏览器是否已安装 - 使用更智能的方法
        print("开始检查浏览器安装状态...")
        
        # 方法1: 尝试使用Playwright API检查
        try:
            from playwright._repo_version import version as playwright_version
            print(f"Playwright版本: {playwright_version}")
        except ImportError:
            print("无法获取Playwright版本信息")
        
        # 启动浏览器
        with sync_playwright() as p:
            print("正在启动浏览器...")
            
            launch_kwargs = {
                "headless": True,
                "args": [
                    "--no-sandbox", 
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage", # 关键：解决 Docker/Serverless 环境内存不足崩溃
                    "--single-process" # 尝试单进程模式减少资源消耗
                ]
            }
            
            # 如果找到了明确的系统路径，则指定它
            if executable_path:
                print(f"使用指定浏览器路径启动: {executable_path}")
                launch_kwargs["executable_path"] = executable_path
            
            try:
                browser = p.chromium.launch(**launch_kwargs)
                print("浏览器启动成功！")
            except Exception as launch_err:
                print(f"标准启动失败: {launch_err}")
                print("尝试降级启动参数...")
                # 移除可能导致问题的参数重试
                if "executable_path" in launch_kwargs:
                    del launch_kwargs["executable_path"]
                browser = p.chromium.launch(**launch_kwargs)
                print("降级启动成功！")
            
            page = browser.new_page()
            print(f"正在访问: {url}")
            # 增加超时时间到 30秒，并放宽等待条件
            page.goto(url, timeout=30000, wait_until="domcontentloaded") 
            
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"截图已保存: {screenshot_path}")
            
            browser.close()
        
        found_browser = None
        for path in possible_paths:
            if path and os.path.exists(path):
                found_browser = path
                print(f"找到浏览器: {path}")
                # 检查权限
                if not os.access(path, os.X_OK):
                    print(f"警告: 浏览器文件不可执行，尝试修复权限: {path}")
                    try:
                        os.chmod(path, 0o755)
                        print(f"权限修复成功: {path}")
                    except Exception as perm_error:
                        print(f"权限修复失败: {perm_error}")
                break
        
        if not found_browser:
            # 如果没找到，尝试运行playwright install检查
            print("未找到浏览器，尝试使用playwright检查...")
            try:
                import subprocess
                result = subprocess.run(
                    [sys.executable, '-m', 'playwright', 'install', '--dry-run', 'chromium'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                print(f"Playwright检查结果:\n{result.stdout}")
                if result.stderr:
                    print(f"Playwright错误:\n{result.stderr}")
            except Exception as check_error:
                print(f"Playwright检查失败: {check_error}")
            
            # 提供详细的错误信息
            debug_info = f"""
浏览器检查失败详情:
- Python解释器: {sys.executable}
- 工作目录: {os.getcwd()}
- 用户主目录: {os.path.expanduser('~')}
- PLAYWRIGHT_BROWSERS_PATH: {os.environ.get('PLAYWRIGHT_BROWSERS_PATH', '未设置')}
- 已检查的路径: {possible_paths}

建议的解决方案:
1. 在部署前运行安装脚本: bash install_dependencies.sh
2. 手动安装浏览器: {sys.executable} -m playwright install chromium
3. 检查系统依赖是否完整
"""
            raise RuntimeError(
                "Chromium浏览器未安装。请在部署前运行以下命令：\n"
                f"1. 安装Playwright: {sys.executable} -m pip install playwright==1.57.0\n"
                f"2. 安装浏览器: {sys.executable} -m playwright install chromium\n"
                f"3. 检查安装路径: ls -la /root/.cache/ms-playwright/\n"
                f"当前检查路径: {possible_paths[0]} 和 {possible_paths[1]}"
                f"\n详细调试信息: {debug_info}"
            )
        
        print("浏览器检查通过，准备启动...")
        
        # 启动无头浏览器（简化启动策略）
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            print("浏览器启动成功")
            
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1200.0.0.0 Safari/537.36'
            )
            page = context.new_page()
            
            try:
                # 访问网页
                page.goto(url, timeout=60000, wait_until='domcontentloaded')
                # 等待动态内容加载
                page.wait_for_timeout(5000)
                # 等待图片元素
                try:
                    page.wait_for_selector('img', timeout=10000, state='attached')
                except:
                    # 如果没有图片元素也没关系
                    pass
                page.wait_for_timeout(5000)
                
                # 分层关闭弹窗策略（四步策略）
                page.evaluate("""
                    () => {
                        // 第一步：关闭验证界面（高z-index ≥ 9000）
                        // 查找所有z-index >= 9000且是fixed定位的元素
                        const allElements = document.querySelectorAll('*');
                        const highZIndexElements = [];
                        
                        allElements.forEach(el => {
                            try {
                                const style = window.getComputedStyle(el);
                                const zIndex = parseInt(style.zIndex);
                                const position = style.position;
                                
                                if (position === 'fixed' && zIndex >= 9000) {
                                    // 计算元素面积
                                    const rect = el.getBoundingClientRect();
                                    const area = rect.width * rect.height;
                                    
                                    // 如果面积大于100000像素（通常是验证遮罩层）
                                    if (area > 100000) {
                                        highZIndexElements.push({
                                            element: el,
                                            zIndex: zIndex,
                                            area: area
                                        });
                                    }
                                }
                            } catch (e) {
                                // 忽略错误
                            }
                        });
                        
                        // 按z-index从高到低排序
                        highZIndexElements.sort((a, b) => b.zIndex - a.zIndex);
                        
                        // 逐个移除验证界面
                        highZIndexElements.forEach(item => {
                            try {
                                item.element.style.display = 'none';
                                item.element.style.visibility = 'hidden';
                            } catch (e) {
                                // 忽略错误
                            }
                        });
                        
                        // 第二步：关闭登录界面（中等z-index 100-9000）
                        const mediumZIndexElements = [];
                        
                        allElements.forEach(el => {
                            try {
                                const style = window.getComputedStyle(el);
                                const zIndex = parseInt(style.zIndex);
                                const position = style.position;
                                
                                if ((position === 'fixed' || position === 'absolute') && 
                                    zIndex >= 100 && zIndex < 9000) {
                                    
                                    // 检查元素类名或ID是否包含登录相关关键词
                                    const className = el.className.toLowerCase();
                                    const id = el.id.toLowerCase();
                                    const tagName = el.tagName.toLowerCase();
                                    
                                    const loginKeywords = ['login', 'signin', 'modal', 'mask', 'popup', 'overlay', 'dialog', 'auth'];
                                    const hasLoginKeyword = loginKeywords.some(keyword => 
                                        className.includes(keyword) || id.includes(keyword)
                                    );
                                    
                                    if (hasLoginKeyword || tagName === 'dialog') {
                                        mediumZIndexElements.push({
                                            element: el,
                                            zIndex: zIndex
                                        });
                                    }
                                }
                            } catch (e) {
                                // 忽略错误
                            }
                        });
                        
                        // 按z-index从高到低排序
                        mediumZIndexElements.sort((a, b) => b.zIndex - a.zIndex);
                        
                        // 逐个隐藏登录界面
                        mediumZIndexElements.forEach(item => {
                            try {
                                item.element.style.display = 'none';
                                item.element.style.visibility = 'hidden';
                            } catch (e) {
                                // 忽略错误
                            }
                        });
                        
                        // 第三步：恢复页面滚动
                        document.body.style.overflow = '';
                        document.body.style.overflowY = '';
                        document.documentElement.style.overflow = '';
                        document.documentElement.style.overflowY = '';
                        
                        // 第四步：点击关闭按钮
                        // 使用标准CSS选择器
                        const closeSelectors = [
                            '.close', '.modal-close', '[data-close]', '[data-dismiss="modal"]',
                            '[aria-label*="close"]', '[aria-label*="关闭"]',
                            'button', 'a', 'span', 'div'
                        ];
                        
                        closeSelectors.forEach(selector => {
                            try {
                                const elements = document.querySelectorAll(selector);
                                elements.forEach(el => {
                                    // 检查元素是否可能是关闭按钮
                                    const text = el.textContent?.toLowerCase() || '';
                                    const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
                                    const className = el.className?.toLowerCase() || '';
                                    
                                    const isCloseButton = 
                                        text.includes('关闭') || text.includes('close') ||
                                        ariaLabel.includes('关闭') || ariaLabel.includes('close') ||
                                        className.includes('close') || className.includes('关闭');
                                    
                                    if (isCloseButton) {
                                        // 检查按钮是否可见
                                        const style = window.getComputedStyle(el);
                                        if (style.display !== 'none' && style.visibility !== 'hidden') {
                                            el.click();
                                        }
                                    }
                                });
                            } catch (e) {
                                // 忽略错误
                            }
                        });
                        
                        return true;
                    }
                """)
                
                # 等待弹窗关闭效果
                page.wait_for_timeout(1000)
                
                # 截图（只截取视口区域）
                page.screenshot(path=screenshot_path, full_page=False)
                
                # 验证截图
                if not os.path.exists(screenshot_path):
                    raise RuntimeError(f"截图文件未生成: {screenshot_path}")
                
                file_size = os.path.getsize(screenshot_path)
                if file_size == 0:
                    raise RuntimeError(f"截图文件为空: {screenshot_path} (大小: {file_size}字节)")
                
                print(f"截图成功: {screenshot_path} (大小: {file_size}字节)")
                
            finally:
                try:
                    context.close()
                except:
                    pass
                try:
                    browser.close()
                except:
                    pass
        
        # 上传到对象存储 - 检查环境变量并提供详细诊断
        endpoint_url = os.getenv("COZE_BUCKET_ENDPOINT_URL")
        bucket_name = os.getenv("COZE_BUCKET_NAME")
        
        if not endpoint_url or not bucket_name:
            # 收集当前环境变量信息用于诊断
            env_vars = []
            for key in os.environ:
                if 'COZE' in key.upper() or 'BUCKET' in key.upper():
                    env_vars.append(f"{key}={os.environ[key]}")
            
            env_info = "\n".join(env_vars) if env_vars else "未找到相关环境变量"
            
            raise RuntimeError(
                "对象存储环境变量未设置，无法上传截图。\n\n"
                "需要配置的环境变量:\n"
                "1. COZE_BUCKET_ENDPOINT_URL - 对象存储端点URL\n"
                "2. COZE_BUCKET_NAME - 存储桶名称\n\n"
                "当前相关环境变量:\n"
                f"{env_info}\n\n"
                "解决方案:\n"
                "1. 在平台配置中添加这些环境变量\n"
                "2. 或在 .env 文件中设置它们\n"
                "3. 联系管理员确认平台对象存储配置"
            )
        
        storage = S3SyncStorage(
            endpoint_url=endpoint_url,
            access_key="",
            secret_key="",
            bucket_name=bucket_name,
            region="cn-beijing",
        )
        
        with open(screenshot_path, 'rb') as f:
            file_content = f.read()
        
        object_key = storage.upload_file(
            file_content=file_content,
            file_name=filename,
            content_type='image/png'
        )
        
        # 生成签名 URL（有效期1小时）
        signed_url = storage.generate_presigned_url(key=object_key, expire_time=3600)
        
        # 清理临时文件
        try:
            os.remove(screenshot_path)
        except:
            pass
        
        # 返回 File 对象
        screenshot_file = File(url=signed_url, file_type='image')
        
        return ScreenshotOutput(screenshot=screenshot_file)
        
    except Exception as e:
        error_trace = traceback.format_exc()
        error_msg = str(e)
        
        # 针对特定错误的诊断建议
        specific_advice = ""
        
        if "protocol" in error_msg.lower() or "server" in error_msg.lower():
            specific_advice = """
针对'代码服务器协议错误'的特定建议:
1. 浏览器可能崩溃或通信中断，尝试以下步骤:
   - 重启工作流
   - 检查系统资源（内存、CPU）是否充足
   - 减少浏览器启动参数复杂度
2. 尝试使用更简单的浏览器启动方式
3. 检查 Playwright 版本兼容性
"""
        elif "timeout" in error_msg.lower():
            specific_advice = """
针对超时错误的建议:
1. 增加页面加载超时时间
2. 检查网络连接是否稳定
3. 目标网站可能响应缓慢，尝试简化页面操作
"""
        
        diagnostic_info = f"""
网页截屏失败:

错误类型: {type(e).__name__}
错误信息: {error_msg}

详细诊断:
1. 检查浏览器是否安装: python -m playwright install chromium
2. 检查系统依赖: apt-get install -y libnss3 libatk1.0-0 libcups2 libxkbcommon0 libgbm1 libasound2
3. 检查文件权限: ls -la /root/.cache/ms-playwright/
4. 检查磁盘空间: df -h
5. 检查内存使用: free -m

{specific_advice}

完整错误追踪:
{error_trace}
"""
        raise RuntimeError(diagnostic_info) from e