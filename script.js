const API_BASE_URL = 'https://api.mail.tm';
const SEND_API_URL = 'http://xiaoxun.my/api/v1/send.php';
let currentEmail = '';
let refreshInterval = null;
let accountId = '';
let token = '';
let emailCreationTime = null;
let emailExpiryInterval = null;

// 音频通知系统 - 修复版本
let audioContext = null;
let audioInitialized = false;

// DOM元素
const emailDisplay = document.getElementById('email-address');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const clearBtn = document.getElementById('clear-btn');
const sendBtn = document.getElementById('send-btn');
const emailList = document.getElementById('email-list');
const emailCount = document.getElementById('email-count');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');
const emailDetail = document.getElementById('email-detail');
const closeDetailBtn = document.getElementById('close-detail');
const emailError = document.getElementById('email-error');
const emailSuccess = document.getElementById('email-success');
const emailLoader = document.getElementById('email-loader');
const confirmDialog = document.getElementById('confirm-dialog');
const cancelClearBtn = document.getElementById('cancel-clear');
const confirmClearBtn = document.getElementById('confirm-clear');
const apiBtn = document.getElementById('api-btn');
const apiDialog = document.getElementById('api-dialog');
const closeApiDialogBtn = document.getElementById('close-api-dialog');
const settingsBtn = document.getElementById('settings-btn');
const settingsDialog = document.getElementById('settings-dialog');
const cancelSettingsBtn = document.getElementById('cancel-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const colorOptions = document.querySelectorAll('.color-option');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const refreshIntervalSelect = document.getElementById('refresh-interval');
const notificationSoundToggle = document.getElementById('notification-sound-toggle');
const expiryNotificationToggle = document.getElementById('expiry-notification-toggle');
const emailSearch = document.getElementById('email-search');
const totalEmailsElement = document.getElementById('total-emails');
const readEmailsElement = document.getElementById('read-emails');
const emailLifetimeElement = document.getElementById('email-lifetime');
const replyBtn = document.getElementById('reply-btn');
const downloadBtn = document.getElementById('download-btn');

// 发送验证码相关元素
const sendDialog = document.getElementById('send-dialog');
const closeSendDialogBtn = document.getElementById('close-send-dialog');
const templateSelect = document.getElementById('template-select');
const sourceInput = document.getElementById('source-input');
const codeInput = document.getElementById('code-input');
const generateCodeBtn = document.getElementById('generate-code-btn');
const toEmailInput = document.getElementById('to-email-input');
const useCurrentEmailBtn = document.querySelector('.use-current-email-btn');
const proxyEmailInput = document.getElementById('proxy-email-input');
const sendEmailBtn = document.getElementById('send-email-btn');
const previewSubject = document.getElementById('preview-subject');
const previewContent = document.getElementById('preview-content');
const previewCode = document.getElementById('preview-code');
const previewTo = document.getElementById('preview-to');

// 设置相关元素
const defaultSourceInput = document.getElementById('default-source-input');
const defaultCodeLength = document.getElementById('default-code-length');
const defaultTemplate = document.getElementById('default-template');

let allEmails = [];

// 修复音频初始化 - 使用浏览器内置通知音
function initAudio() {
    if (audioInitialized) return;
    
    try {
        // 检查浏览器是否支持AudioContext
        if (window.AudioContext || window.webkitAudioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioInitialized = true;
        } else {
            console.log('浏览器不支持Web Audio API，使用备用通知方式');
        }
    } catch (e) {
        console.log('音频初始化失败，使用备用通知方式:', e);
    }
}

// 播放通知声音 - 简化版本
function playNotificationSound() {
    if (!notificationSoundToggle.checked) return;
    
    try {
        // 尝试使用Web Audio API
        if (audioContext && audioInitialized) {
            // 创建简单的哔声
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } else {
            // 备用方案：尝试使用HTML5 audio元素
            try {
                const audio = new Audio();
                audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
                audio.volume = 0.3;
                audio.play().catch(() => {
                    // 如果都失败，静默处理
                });
            } catch (e) {
                // 静默处理所有音频错误
            }
        }
    } catch (e) {
        // 静默处理所有音频错误
    }
}

// 初始化邮箱
function init() {
    const savedEmail = localStorage.getItem('tempEmail');
    const savedToken = localStorage.getItem('tempEmailToken');
    const savedAccountId = localStorage.getItem('tempEmailAccountId');
    const savedCreationTime = localStorage.getItem('tempEmailCreationTime');
    
    if (savedEmail && savedToken && savedAccountId) {
        currentEmail = savedEmail;
        token = savedToken;
        accountId = savedAccountId;
        emailCreationTime = savedCreationTime ? new Date(savedCreationTime) : new Date();
        emailDisplay.textContent = currentEmail;
        startEmailCheck();
        updateEmailStats();
        updateStatus('已恢复之前的邮箱', 'success');
        showSuccess('成功恢复之前的临时邮箱');
    }
}

// 初始化设置
function initSettings() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const themeColor = localStorage.getItem('themeColor') || 'default';
    const refreshInterval = localStorage.getItem('refreshInterval') || '4000';
    const notificationSound = localStorage.getItem('notificationSound') !== 'false';
    const expiryNotification = localStorage.getItem('expiryNotification') !== 'false';
    const defaultSource = localStorage.getItem('defaultSource') || '小胡临时邮箱';
    const defaultCodeLen = localStorage.getItem('defaultCodeLength') || '6';
    const defaultTemp = localStorage.getItem('defaultTemplate') || 'login';
    
    darkModeToggle.checked = darkMode;
    if (darkMode) document.body.classList.add('dark-mode');
    
    // 设置主题颜色
    const activeColor = document.querySelector(`.color-option[data-color="${themeColor}"]`);
    if (activeColor) {
        colorOptions.forEach(opt => opt.classList.remove('active'));
        activeColor.classList.add('active');
        applyThemeColor(themeColor);
    }
    
    refreshIntervalSelect.value = refreshInterval;
    notificationSoundToggle.checked = notificationSound;
    expiryNotificationToggle.checked = expiryNotification;
    defaultSourceInput.value = defaultSource;
    defaultCodeLength.value = defaultCodeLen;
    defaultTemplate.value = defaultTemp;
    sourceInput.value = defaultSource;
    templateSelect.value = defaultTemp;
}

// 应用主题颜色
function applyThemeColor(color) {
    const root = document.documentElement;
    switch(color) {
        case 'blue':
            root.style.setProperty('--primary', '#3498db');
            root.style.setProperty('--primary-light', '#5dade2');
            break;
        case 'green':
            root.style.setProperty('--primary', '#2ecc71');
            root.style.setProperty('--primary-light', '#58d68d');
            break;
        case 'red':
            root.style.setProperty('--primary', '#e74c3c');
            root.style.setProperty('--primary-light', '#ec7063');
            break;
        case 'purple':
            root.style.setProperty('--primary', '#9b59b6');
            root.style.setProperty('--primary-light', '#af7ac5');
            break;
        default:
            root.style.setProperty('--primary', '#6c5ce7');
            root.style.setProperty('--primary-light', '#a29bfe');
    }
}

// 保存邮箱数据
function saveEmailData(email, token, accountId) {
    localStorage.setItem('tempEmail', email);
    localStorage.setItem('tempEmailToken', token);
    localStorage.setItem('tempEmailAccountId', accountId);
    localStorage.setItem('tempEmailCreationTime', new Date().toISOString());
    emailCreationTime = new Date();
}

// 清除邮箱数据
function clearEmailData() {
    localStorage.removeItem('tempEmail');
    localStorage.removeItem('tempEmailToken');
    localStorage.removeItem('tempEmailAccountId');
    localStorage.removeItem('tempEmailCreationTime');
    if (emailExpiryInterval) {
        clearInterval(emailExpiryInterval);
        emailExpiryInterval = null;
    }
}

// 更新状态显示
function updateStatus(message, type = 'default') {
    statusText.textContent = message;
    statusDot.className = 'status-dot';
    switch(type) {
        case 'loading':
            statusDot.classList.add('loading');
            break;
        case 'success':
            statusDot.style.background = 'var(--success)';
            break;
        case 'error':
            statusDot.classList.add('error');
            break;
        default:
            statusDot.style.background = 'var(--success)';
    }
}

// 显示错误信息
function showError(message) {
    emailError.textContent = message;
    emailError.style.display = 'block';
    emailSuccess.style.display = 'none';
    setTimeout(() => {
        emailError.style.display = 'none';
    }, 5000);
}

// 显示成功信息
function showSuccess(message) {
    emailSuccess.textContent = message;
    emailSuccess.style.display = 'block';
    emailError.style.display = 'none';
    setTimeout(() => {
        emailSuccess.style.display = 'none';
    }, 5000);
}

// 显示加载器
function showLoader(show) {
    if (show) {
        emailDisplay.classList.add('loading');
        updateStatus('正在生成邮箱...', 'loading');
    } else {
        emailDisplay.classList.remove('loading');
    }
}

// 显示清除确认对话框
function showClearConfirmDialog() {
    if (!currentEmail) {
        showError('当前没有可清除的邮箱');
        return;
    }
    confirmDialog.style.display = 'flex';
}

// 隐藏清除确认对话框
function hideClearConfirmDialog() {
    confirmDialog.style.display = 'none';
}

// 清除当前邮箱
function clearCurrentEmail() {
    hideClearConfirmDialog();
    clearEmailData();
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    currentEmail = '';
    token = '';
    accountId = '';
    emailDisplay.textContent = '点击下方按钮生成临时邮箱(不要频繁生成)';
    showEmptyInbox();
    updateStatus('邮箱已清除', 'success');
    showSuccess('邮箱已成功清除');
    updateEmailStats();
}

// 生成随机邮箱
async function generateRandomEmail() {
    if (currentEmail) {
        const confirmReplace = confirm('您已经有一个临时邮箱了，确定要生成新的邮箱吗？旧邮箱将无法再访问。');
        if (!confirmReplace) return;
        clearEmailData();
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    }
    
    showLoader(true);
    emailError.style.display = 'none';
    emailSuccess.style.display = 'none';
    try {
        const domainsResponse = await fetch(`${API_BASE_URL}/domains`);
        if (!domainsResponse.ok) throw new Error('获取域名失败');
        
        const domainsData = await domainsResponse.json();
        if (!domainsData || !domainsData['hydra:member'] || domainsData['hydra:member'].length === 0) {
            throw new Error('没有可用的邮箱域名');
        }
        
        const domain = domainsData['hydra:member'][0].domain;
        const randomUsername = `user${Math.floor(Math.random() * 1000000)}`;
        const randomPassword = `pass${Math.floor(Math.random() * 1000000)}`;
        const email = `${randomUsername}@${domain}`;
        
        const createAccountResponse = await fetch(`${API_BASE_URL}/accounts`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({address: email, password: randomPassword})
        });
        
        if (!createAccountResponse.ok) throw new Error('创建邮箱账户失败');
        
        const accountData = await createAccountResponse.json();
        accountId = accountData.id;
        
        const tokenResponse = await fetch(`${API_BASE_URL}/token`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({address: email, password: randomPassword})
        });
        
        if (!tokenResponse.ok) throw new Error('获取访问令牌失败');
        
        const tokenData = await tokenResponse.json();
        token = tokenData.token;
        currentEmail = email;
        emailDisplay.textContent = currentEmail;
        saveEmailData(currentEmail, token, accountId);
        startEmailCheck();
        updateEmailStats();
        updateStatus('邮箱已生成', 'success');
        showSuccess('邮箱生成成功！');
    } catch (error) {
        updateStatus('生成邮箱失败', 'error');
        showError(`错误: ${error.message}`);
        console.error('生成邮箱失败:', error);
    } finally {
        showLoader(false);
    }
}

// 开始邮件检查
function startEmailCheck() {
    if (refreshInterval) clearInterval(refreshInterval);
    checkEmails(); 
    refreshInterval = setInterval(checkEmails, parseInt(refreshIntervalSelect.value));
    
    // 启动邮箱有效期计时器
    if (emailExpiryInterval) clearInterval(emailExpiryInterval);
    emailExpiryInterval = setInterval(updateEmailStats, 60000); // 每分钟更新一次
}

// 检查邮件
async function checkEmails() {
    if (!currentEmail || !token) return;
    updateStatus('正在检查邮件...', 'loading');
    try {
        const response = await fetch(`${API_BASE_URL}/messages`, {
            headers: {'Authorization': `Bearer ${token}`}
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                clearEmailData();
                throw new Error('授权已过期，请重新生成邮箱');
            }
            throw new Error('获取邮件失败');
        }
        
        const emailsData = await response.json();
        const emails = emailsData['hydra:member'] || [];
        allEmails = emails;
        
        if (emails.length > 0) {
            emailCount.textContent = emails.length;
            renderEmailList(emails);
            updateStatus(`已加载 ${emails.length} 封邮件`, 'success');
            updateEmailStats();
            
            if (notificationSoundToggle.checked && emails.some(email => !email.isRead)) {
                playNotificationSound();
            }
        } else {
            showEmptyInbox();
            updateStatus('没有新邮件', 'success');
            updateEmailStats();
        }
    } catch (error) {
        updateStatus('获取邮件失败', 'error');
        console.error('检查邮件失败:', error);
    }
}

// 更新邮件统计信息
function updateEmailStats() {
    if (!currentEmail) {
        totalEmailsElement.textContent = '0';
        readEmailsElement.textContent = '0';
        emailLifetimeElement.textContent = '0';
        return;
    }
    
    // 计算邮箱存在时间
    if (emailCreationTime) {
        const now = new Date();
        const diffMinutes = Math.floor((now - emailCreationTime) / (1000 * 60));
        emailLifetimeElement.textContent = diffMinutes;
        
        // 如果启用提醒且邮箱存在超过60分钟
        if (expiryNotificationToggle.checked && diffMinutes >= 60) {
            showSuccess(`注意：您的临时邮箱已存在 ${diffMinutes} 分钟，建议定期更换以确保安全`);
        }
    }
    
    // 更新邮件统计
    if (allEmails && allEmails.length > 0) {
        totalEmailsElement.textContent = allEmails.length;
        const readCount = allEmails.filter(email => email.isRead).length;
        readEmailsElement.textContent = readCount;
    } else {
        totalEmailsElement.textContent = '0';
        readEmailsElement.textContent = '0';
    }
}

// 显示空收件箱
function showEmptyInbox() {
    emailList.innerHTML = `
        <div class="empty-inbox">
            <i class="fas fa-inbox"></i>
            <p>收件箱为空</p>
            <p>发送到该地址的邮件将显示在这里</p>
        </div>
    `;
    emailCount.textContent = '0';
}

// 渲染邮件列表
function renderEmailList(emails) {
    emails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    emailList.innerHTML = emails.map((email, index) => {
        const sender = email.from ? email.from.name || email.from.address : '未知发件人';
        const subject = email.subject || '无主题';
        const date = email.createdAt;
        const id = email.id;
        const read = email.isRead || false;
        const animationDelay = `${index * 0.1}s`;
        
        return `
            <div class="email-item ${!read ? 'unread' : ''}" data-id="${id}" style="animation-delay: ${animationDelay}">
                <div class="email-icon">
                    <i class="fas fa-envelope${read ? '-open' : ''}"></i>
                </div>
                <div class="email-content">
                    <div class="email-sender">${sender}</div>
                    <div class="email-subject">${subject}</div>
                </div>
                <div class="email-time">${formatTime(date)}</div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.email-item').forEach(item => {
        item.addEventListener('click', () => {
            const emailId = item.getAttribute('data-id');
            viewEmailDetails(emailId);
        });
    });
}

// 查看邮件详情
async function viewEmailDetails(emailId) {
    if (!currentEmail || !token) return;
    updateStatus('正在加载邮件...', 'loading');
    try {
        const response = await fetch(`${API_BASE_URL}/messages/${emailId}`, {
            headers: {'Authorization': `Bearer ${token}`}
        });
        
        if (!response.ok) throw new Error('加载邮件失败');
        
        const email = await response.json();
        if (email) {
            document.getElementById('detail-subject').textContent = email.subject || '无主题';
            
            let senderName = '未知发件人';
            let senderAddress = '';
            if (email.from) {
                senderName = email.from.name || email.from.address || '未知发件人';
                senderAddress = email.from.address || '';
            }
            
            document.getElementById('sender-name').textContent = senderName;
            document.getElementById('sender-email').textContent = senderAddress;
            document.getElementById('email-received').textContent = formatTime(email.createdAt);
            
            const senderAvatar = document.getElementById('sender-avatar');
            if (senderName) {
                senderAvatar.textContent = senderName.charAt(0).toUpperCase();
            }
            
            let body = email.text || email.html || '无内容';
            if (email.html) {
                document.getElementById('email-body').innerHTML = email.html;
            } else {
                document.getElementById('email-body').textContent = body;
            }
            
            emailDetail.style.display = 'block';
            updateStatus('邮件已加载', 'success');
            
            // 标记为已读
            if (!email.isRead) {
                await markAsRead(emailId);
            }
        } else {
            throw new Error('无法加载邮件');
        }
    } catch (error) {
        updateStatus('加载邮件失败', 'error');
        console.error('查看邮件详情失败:', error);
    }
}

// 标记邮件为已读
async function markAsRead(emailId) {
    try {
        await fetch(`${API_BASE_URL}/messages/${emailId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/merge-patch+json'
            },
            body: JSON.stringify({isRead: true})
        });
    } catch (e) {
        console.error('标记为已读失败:', e);
    }
}

// 复制邮箱到剪贴板
function copyEmailToClipboard() {
    if (!currentEmail) {
        updateStatus('请先生成邮箱', 'error');
        showError('请先生成邮箱地址');
        return;
    }
    
    navigator.clipboard.writeText(currentEmail)
        .then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
            updateStatus('邮箱已复制', 'success');
            showSuccess('邮箱地址已复制到剪贴板');
        })
        .catch(err => {
            updateStatus('复制失败', 'error');
            showError('无法复制到剪贴板，请手动复制');
        });
}

// 下载邮件
function downloadEmail() {
    const subject = document.getElementById('detail-subject').textContent;
    const sender = document.getElementById('sender-name').textContent;
    const date = document.getElementById('email-received').textContent;
    const body = document.getElementById('email-body').innerHTML;
    
    const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${subject}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                .header { border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
                .subject { font-size: 1.5em; font-weight: bold; margin-bottom: 10px; }
                .meta { color: #666; font-size: 0.9em; }
                .body { margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="subject">${subject}</div>
                <div class="meta">
                    <div>发件人: ${sender}</div>
                    <div>日期: ${date}</div>
                </div>
            </div>
            <div class="body">${body}</div>
        </body>
        </html>
    `;
    
    const blob = new Blob([emailContent], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subject.replace(/[^\w\s]/gi, '')}.html` || 'email.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 生成随机验证码
function generateRandomCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 更新邮件预览
function updateEmailPreview() {
    const template = templateSelect.value;
    const source = sourceInput.value || '小胡临时邮箱';
    const code = codeInput.value || 'ABC123';
    const toEmail = toEmailInput.value || '未设置';
    
    // 更新预览
    previewTo.textContent = toEmail;
    previewCode.textContent = code;
    
    // 根据模板更新主题和内容
    let subject = '';
    let content = '';
    
    switch(template) {
        case 'login':
            subject = `登录验证码 - ${source}`;
            content = `您正在尝试登录，验证码为：<code>${code}</code>，有效期10分钟。`;
            break;
        case 'register':
            subject = `注册验证码 - ${source}`;
            content = `欢迎注册！您的验证码为：<code>${code}</code>，有效期10分钟。`;
            break;
        case 'privacy':
            subject = `隐私信息修改验证 - ${source}`;
            content = `您正在修改隐私信息，验证码为：<code>${code}</code>，有效期10分钟。`;
            break;
        case 'important':
            subject = `重要操作验证 - ${source}`;
            content = `您正在执行重要操作，验证码为：<code>${code}</code>，有效期10分钟。`;
            break;
        case 'reset':
            subject = `密码重置验证 - ${source}`;
            content = `您正在重置密码，验证码为：<code>${code}</code>，有效期10分钟。`;
            break;
    }
    
    previewSubject.textContent = subject;
    previewContent.innerHTML = content;
}

// 发送验证码邮件
async function sendVerificationEmail() {
    const template = templateSelect.value;
    const source = sourceInput.value;
    const code = codeInput.value;
    const toEmail = toEmailInput.value;
    const proxyEmail = proxyEmailInput.value;
    
    // 验证输入
    if (!source) {
        showError('请输入来源名称');
        return;
    }
    
    if (!code) {
        showError('请输入验证码');
        return;
    }
    
    if (!/^[A-Za-z0-9]{3,12}$/.test(code)) {
        showError('验证码必须是3-12位英文字母数字，不支持符号');
        return;
    }
    
    if (!toEmail) {
        showError('请输入收件人邮箱');
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
        showError('请输入有效的邮箱地址');
        return;
    }
    
    if (proxyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proxyEmail)) {
        showError('请输入有效的代理邮箱地址');
        return;
    }
    
    // 准备发送数据
    const params = new URLSearchParams({
        template: template,
        source: source,
        code: code,
        to_email: toEmail
    });
    
    if (proxyEmail) {
        params.append('proxy_email', proxyEmail);
    }
    
    // 显示加载状态
    sendEmailBtn.disabled = true;
    sendEmailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';
    
    try {
        // 发送请求
        const response = await fetch(SEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // 发送成功
            sendDialog.style.display = 'none';
            showSuccess(`验证码邮件已成功发送到 ${toEmail}`);
            updateStatus('邮件发送成功', 'success');
            
            // 如果发送到当前邮箱，提示用户检查收件箱
            if (toEmail === currentEmail) {
                setTimeout(() => {
                    checkEmails();
                }, 2000);
            }
        } else {
            // 发送失败
            throw new Error(data.message || '邮件发送失败');
        }
    } catch (error) {
        console.error('发送邮件失败:', error);
        showError(`发送失败: ${error.message}`);
        updateStatus('邮件发送失败', 'error');
    } finally {
        // 恢复按钮状态
        sendEmailBtn.disabled = false;
        sendEmailBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送邮件';
    }
}

// 从API生成验证码
async function generateCodeFromAPI() {
    const length = parseInt(defaultCodeLength.value) || 6;
    
    try {
        const response = await fetch(`${SEND_API_URL}?action=generate-code&length=${length}`);
        if (!response.ok) throw new Error('API请求失败');
        
        const data = await response.json();
        
        if (data.status === 'success' && data.code) {
            codeInput.value = data.code;
            updateEmailPreview();
        } else {
            // 如果API失败，使用本地生成
            codeInput.value = generateRandomCode(length);
            updateEmailPreview();
        }
    } catch (error) {
        console.error('从API生成验证码失败:', error);
        // 使用本地生成
        codeInput.value = generateRandomCode(length);
        updateEmailPreview();
    }
}

// 打开发送模态窗
function openSendDialog() {
    // 重置表单
    toEmailInput.value = '';
    proxyEmailInput.value = '';
    
    // 生成验证码
    generateCodeFromAPI();
    
    // 更新预览
    updateEmailPreview();
    
    // 显示模态窗
    sendDialog.style.display = 'flex';
}

// 格式化时间
function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前`;
}

// 响应式布局调整
function adjustLayout() {
    const width = window.innerWidth;
    const header = document.querySelector('.header');
    
    // 移动端：重新组织按钮布局
    if (width <= 767) {
        // 检查是否已经有按钮容器
        let headerButtons = document.querySelector('.header-buttons');
        if (!headerButtons) {
            // 创建按钮容器
            headerButtons = document.createElement('div');
            headerButtons.className = 'header-buttons';
            
            // 获取按钮
            const apiBtn = document.querySelector('.api-btn');
            const sendBtn = document.querySelector('.send-btn');
            const settingsBtn = document.querySelector('.settings-btn');
            
            // 移除原有位置
            if (apiBtn && sendBtn && settingsBtn) {
                header.appendChild(headerButtons);
                headerButtons.appendChild(apiBtn);
                headerButtons.appendChild(sendBtn);
                headerButtons.appendChild(settingsBtn);
            }
        }
    } else {
        // 桌面端：恢复原始位置
        const headerButtons = document.querySelector('.header-buttons');
        if (headerButtons) {
            const apiBtn = document.querySelector('.api-btn');
            const sendBtn = document.querySelector('.send-btn');
            const settingsBtn = document.querySelector('.settings-btn');
            
            // 移除容器
            headerButtons.remove();
            
            // 重新添加按钮到header
            if (apiBtn) {
                apiBtn.style.position = 'absolute';
                apiBtn.style.left = '20px';
                apiBtn.style.top = '20px';
                header.appendChild(apiBtn);
            }
            
            if (sendBtn) {
                sendBtn.style.position = 'absolute';
                sendBtn.style.right = '140px';
                sendBtn.style.top = '20px';
                header.appendChild(sendBtn);
            }
            
            if (settingsBtn) {
                settingsBtn.style.position = 'absolute';
                settingsBtn.style.right = '20px';
                settingsBtn.style.top = '20px';
                header.appendChild(settingsBtn);
            }
        }
    }
}

// 保存设置
function saveSettings() {
    localStorage.setItem('darkMode', darkModeToggle.checked);
    localStorage.setItem('notificationSound', notificationSoundToggle.checked);
    localStorage.setItem('expiryNotification', expiryNotificationToggle.checked);
    localStorage.setItem('refreshInterval', refreshIntervalSelect.value);
    localStorage.setItem('defaultSource', defaultSourceInput.value);
    localStorage.setItem('defaultCodeLength', defaultCodeLength.value);
    localStorage.setItem('defaultTemplate', defaultTemplate.value);
    
    // 更新发送表单的默认值
    sourceInput.value = defaultSourceInput.value;
    templateSelect.value = defaultTemplate.value;
    updateEmailPreview();
    
    if (refreshInterval) {
        clearInterval(refreshInterval);
        startEmailCheck();
    }
    
    settingsDialog.style.display = 'none';
    showSuccess('设置已保存');
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    init();
    initSettings();
    
    // 初始化音频系统（简化版）
    initAudio();
    
    // 初始布局调整
    adjustLayout();
    
    // 监听窗口大小变化
    window.addEventListener('resize', adjustLayout);
    
    // 按钮事件绑定
    generateBtn.addEventListener('click', generateRandomEmail);
    copyBtn.addEventListener('click', copyEmailToClipboard);
    clearBtn.addEventListener('click', showClearConfirmDialog);
    cancelClearBtn.addEventListener('click', hideClearConfirmDialog);
    confirmClearBtn.addEventListener('click', clearCurrentEmail);
    closeDetailBtn.addEventListener('click', () => {
        emailDetail.style.display = 'none';
    });

    // API弹窗控制
    apiBtn.addEventListener('click', () => {
        apiDialog.style.display = 'flex';
    });
    closeApiDialogBtn.addEventListener('click', () => {
        apiDialog.style.display = 'none';
    });

    // 设置弹窗控制
    settingsBtn.addEventListener('click', () => {
        settingsDialog.style.display = 'flex';
    });
    
    cancelSettingsBtn.addEventListener('click', () => {
        settingsDialog.style.display = 'none';
        // 恢复原始设置
        initSettings();
    });
    
    saveSettingsBtn.addEventListener('click', saveSettings);
    
    // 深色模式切换
    darkModeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    });
    
    // 主题颜色选择
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            const color = option.getAttribute('data-color');
            applyThemeColor(color);
            localStorage.setItem('themeColor', color);
        });
    });
    
    // 标签页切换
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // 邮件搜索功能
    emailSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (!searchTerm) {
            renderEmailList(allEmails);
            return;
        }
        
        const filteredEmails = allEmails.filter(email => {
            const sender = email.from ? (email.from.name || email.from.address || '').toLowerCase() : '';
            const subject = (email.subject || '').toLowerCase();
            return sender.includes(searchTerm) || subject.includes(searchTerm);
        });
        
        if (filteredEmails.length > 0) {
            renderEmailList(filteredEmails);
        } else {
            emailList.innerHTML = `
                <div class="empty-inbox">
                    <i class="fas fa-search"></i>
                    <p>没有找到匹配的邮件</p>
                    <p>尝试使用不同的搜索词</p>
                </div>
            `;
        }
    });

    // 下载邮件按钮
    downloadBtn.addEventListener('click', downloadEmail);

    // 回复按钮（模拟功能）
    replyBtn.addEventListener('click', () => {
        showSuccess('回复功能在当前临时邮箱中不可用，请使用您的常规邮箱回复');
    });

    // 发送验证码功能
    sendBtn.addEventListener('click', openSendDialog);
    
    closeSendDialogBtn.addEventListener('click', () => {
        sendDialog.style.display = 'none';
    });
    
    generateCodeBtn.addEventListener('click', generateCodeFromAPI);
    
    sendEmailBtn.addEventListener('click', sendVerificationEmail);
    
    // 使用当前邮箱按钮
    useCurrentEmailBtn.addEventListener('click', () => {
        if (currentEmail) {
            toEmailInput.value = currentEmail;
            updateEmailPreview();
        } else {
            showError('请先生成邮箱地址');
        }
    });
    
    // 实时更新预览
    templateSelect.addEventListener('change', updateEmailPreview);
    sourceInput.addEventListener('input', updateEmailPreview);
    codeInput.addEventListener('input', updateEmailPreview);
    toEmailInput.addEventListener('input', updateEmailPreview);
    
    // 初始化预览
    updateEmailPreview();

    // 鼠标追踪效果
    const containers = [
        '.card', '.email-section', '.inbox-section', 
        '.email-detail', '.confirm-content', 
        '.api-content', '.settings-content', '.send-content'
    ].map(selector => document.querySelector(selector));

    containers.forEach(container => {
        if (!container) return;
        
        let rafId = null;
        let lastX = 0;
        let lastY = 0;
        
        const updateMousePosition = (x, y) => {
            container.style.setProperty('--mouse-x', `${x}px`);
            container.style.setProperty('--mouse-y', `${y}px`);
            lastX = x;
            lastY = y;
        };
        
        container.addEventListener('mousemove', (e) => {
            if (rafId) cancelAnimationFrame(rafId);
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (Math.abs(x - lastX) > 5 || Math.abs(y - lastY) > 5) {
                rafId = requestAnimationFrame(() => {
                    updateMousePosition(x, y);
                });
            }
        });
        
        container.addEventListener('mouseleave', () => {
            if (rafId) cancelAnimationFrame(rafId);
            container.style.removeProperty('--mouse-x');
            container.style.removeProperty('--mouse-y');
        });
    });
})// 自动回复
let autoReplyEnabled = false;
let autoReplyMessage = '我已收到您的邮件，稍后会处理。';

const autoReplyToggle = document.getElementById('auto-reply-toggle');
const autoReplyMessageInput = document.getElementById('auto-reply-message');

if (autoReplyToggle) {
    autoReplyToggle.addEventListener('change', (e) => {
        autoReplyEnabled = e.target.checked;
        showSuccess(autoReplyEnabled ? '自动回复已开启' : '自动回复已关闭');
    });
}

if (autoReplyMessageInput) {
    autoReplyMessageInput.addEventListener('input', (e) => {
        autoReplyMessage = e.target.value;
    });
}
// ==================== 新增功能：快捷键 ====================
document.addEventListener('keydown', (e) => {
    // Ctrl + G：生成邮箱
    if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        document.getElementById('generate-btn').click();
    }
    // Ctrl + C：复制地址
    if (e.ctrlKey && e.key === 'c' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('copy-btn').click();
    }
    // Ctrl + S：打开设置
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        document.getElementById('settings-btn').click();
    }
    // Esc：关闭所有弹窗
    if (e.key === 'Escape') {
        document.querySelectorAll('.confirm-dialog, .api-dialog, .send-dialog, .settings-dialog').forEach(d => {
            d.style.display = 'none';
        });
    }
});