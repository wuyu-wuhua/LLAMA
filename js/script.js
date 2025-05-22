let BASE_API_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    BASE_API_URL = 'http://localhost:3001'; // 本地测试 API 地址
} else {
    BASE_API_URL = 'https://erlangjiuye.com'; // 生产环境 API 地址
}

let currentScenario = 'general'; // Default scenario
let chatHistory = []; // This will now be mostly managed by backend, but can be used for temporary client-side state if needed
const MAX_HISTORY_ITEMS = 5; // This might become less relevant if backend handles full history
let currentConversationId = null; // ADDED: To track the active conversation
let currentImageSize = '1024*1024'; // 默认尺寸
const IMAGE_KEYWORDS = ['画', '绘画', '生成', '创作', '图片', 'image', 'draw', 'paint', 'create', 'generate'];

// Global store for typewriter timeout IDs to clear them
const typewriterTimeouts = new Map(); // Map<Element, number>

let isNavigatingToLogin = false; // 新增：防止重复导航的标志

// Placeholder for sendMessageHandler - User needs to define this properly
function sendMessageHandler() {
    const loginCheckResult = redirectToLoginIfNeeded();
    if (loginCheckResult.loginRequired) { 
        // 如果需要登录（意味着弹出了对话框），则停止发送消息的逻辑。
        // 如果用户点击了"取消"，isNavigatingToLogin 会是 false，下次操作会再次检查。
        // 如果用户点击了"确定"，isNavigatingToLogin 会是 true，页面会跳转。
        return; 
    }

    // console.warn("sendMessageHandler is called, but needs full implementation for sending messages."); // 可以移除这行了
    const chatInput = document.getElementById('chat-input');
    const imageUploadInput = document.getElementById('image-upload-input');
    let messageText = chatInput ? chatInput.value.trim() : "";
    let file = imageUploadInput && imageUploadInput.files[0] ? imageUploadInput.files[0] : null;

    if (!messageText && !file) {
        return; 
    }
    
    if (typeof sendMessage === 'function') {
        sendMessage(messageText, file);
    } else {
        console.error("sendMessage function is not defined at the point of call by sendMessageHandler.");
    }
    
    if (chatInput) {
        chatInput.value = ""; 
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    }

    if (imageUploadInput && imageUploadInput.files[0]) {
        const removeImageBtn = document.getElementById('remove-image-btn');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const imagePreview = document.getElementById('image-preview');

        imageUploadInput.value = '';
        if(imagePreview) imagePreview.src = '#';
        if(imagePreviewContainer) imagePreviewContainer.style.display = 'none';
        if(removeImageBtn) removeImageBtn.style.display = 'none';
    }
    
    if (chatInput) chatInput.focus();
    
    const currentChatInputVal = chatInput ? chatInput.value.trim() : "";
    const currentImageFile = imageUploadInput && imageUploadInput.files[0] ? imageUploadInput.files[0] : null;

    if (!currentImageFile && !IMAGE_KEYWORDS.some(k => currentChatInputVal.includes(k))) {
        if (typeof hideImageSizeSelector === 'function') {
            hideImageSizeSelector();
        }
    }
}

function initChat() {
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');

    if (!sendBtn || !chatInput) {
        return;
    }

    sendBtn.addEventListener('click', function() {
        sendMessageHandler();
    });

    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageHandler();
        }
    });
    chatInput.addEventListener('input', function() { 
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    chatInput.addEventListener('focus', function() { 
        if (isNavigatingToLogin) return; // 如果正在导航，则不执行任何操作

        const loginCheckResult = redirectToLoginIfNeeded();
        if (loginCheckResult.loginRequired && !loginCheckResult.navigated) {
            // 如果需要登录，弹出了对话框，且用户点击了"取消" (navigated is false)
            this.blur(); // 使输入框失去焦点，防止循环
        }
    });

    chatInput.addEventListener('input', function() {
        const val = this.value;
        if (IMAGE_KEYWORDS.some(k => val.includes(k))) {
            if (typeof showImageSizeSelector === 'function') showImageSizeSelector();
        } else {
            const imageUploadInputElement = document.getElementById('image-upload-input');
            if (imageUploadInputElement && !imageUploadInputElement.files[0]) {
                if (typeof hideImageSizeSelector === 'function') hideImageSizeSelector();
            } else if (!imageUploadInputElement) {
                 if (typeof hideImageSizeSelector === 'function') hideImageSizeSelector();
            }
        }
    });
}

function initImageUpload() {
    const imageUploadInput = document.getElementById('image-upload-input');
    const imageUploadLabel = document.getElementById('image-upload-label');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    if (!imageUploadInput || !imageUploadLabel || !imagePreviewContainer || !imagePreview || !removeImageBtn) {
        return;
    }

    imageUploadLabel.onclick = function(e) {
        e.preventDefault(); 
        const loginCheckResult = redirectToLoginIfNeeded();
        if (loginCheckResult.loginRequired) return;
        imageUploadInput.click(); 
    };

    imageUploadInput.addEventListener('change', function() {
        // if (redirectToLoginIfNeeded()) return; // 用户选择文件后不应立即重定向，而是允许预览
        const file = this.files && this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'block';
                removeImageBtn.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.src = '#';
            imagePreviewContainer.style.display = 'none';
            removeImageBtn.style.display = 'none';
        }
        if (file && typeof showImageSizeSelector === 'function') showImageSizeSelector();
        if (!file) {
            const chatInputVal = document.getElementById('chat-input') ? document.getElementById('chat-input').value : "";
            if (!IMAGE_KEYWORDS.some(k => chatInputVal.includes(k))) {
                if (typeof hideImageSizeSelector === 'function') hideImageSizeSelector();
            }
        }
    });

    removeImageBtn.addEventListener('click', function(e) {
        e.stopPropagation(); 
        imageUploadInput.value = '';
        imagePreview.src = '#';
        imagePreviewContainer.style.display = 'none';
        removeImageBtn.style.display = 'none';
        const chatInputVal = document.getElementById('chat-input') ? document.getElementById('chat-input').value.trim() : "";
        if (!IMAGE_KEYWORDS.some(k => chatInputVal.includes(k))) {
            if (typeof hideImageSizeSelector === 'function') hideImageSizeSelector();
        }
    });
}

// Helper function to get translation keys for scenario-specific texts
function getScenarioTextKeys(scenario) {
    if (!scenario) { // Fallback for safety, though scenario should always be provided
        return {
            titleKey: 'welcomeHeading',
            messageKey: 'welcomeMessageDefault',
            greetingKey: 'aiReplyHello' // Or a more generic greeting
        };
    }
    const s = scenario.toLowerCase();
    let capitalizedScenario;

    switch (s) {
        case 'general': capitalizedScenario = 'General'; break;
        case 'code': capitalizedScenario = 'Code'; break;
        case 'creative': capitalizedScenario = 'Creative'; break;
        case 'analysis': capitalizedScenario = 'Analysis'; break;
        case 'education': capitalizedScenario = 'Education'; break;
        case 'translation': capitalizedScenario = 'Translation'; break;
        case 'imageanalysis': capitalizedScenario = 'ImageAnalysis'; break;
        case 'aipainting': capitalizedScenario = 'AIPainting'; break;
        case 'imagetoimage': capitalizedScenario = 'ImageToImage'; break;
        default: // Fallback for any new/unhandled simple scenario names
            capitalizedScenario = s.charAt(0).toUpperCase() + s.slice(1);
    }

    return {
        titleKey: `welcome${capitalizedScenario}Title`,
        messageKey: `welcome${capitalizedScenario}Message`,
        greetingKey: `aiGreeting${capitalizedScenario}`
    };
}

// Function to initialize typewriter effect for a single element
function initTypewriterForElement(element) {
    // Stop any existing typewriter timeout for this element
    if (typewriterTimeouts.has(element)) {
        clearTimeout(typewriterTimeouts.get(element));
        typewriterTimeouts.delete(element);
    }

    // Get the text to type. It should be the already translated text.
    const textToType = element.textContent;
    if (!textToType || textToType.trim() === '') { 
        element.innerHTML = '&nbsp;'; // Ensure it has some content to not collapse
        return;
    }
    
    element.innerHTML = '&nbsp;'; // Start with a non-breaking space to ensure cursor visibility

    let charIndex = 0;
    let isDeleting = false;
    const typingSpeed = 120;    // Milliseconds per character typed
    const deletingSpeed = 70;   // Milliseconds per character deleted
    const pauseBeforeDelete = 2500; // Milliseconds to pause after typing full text
    const pauseBeforeTyping = 400;  // Milliseconds to pause after deleting full text

    function typeWriterCycle() {
        let currentTimeoutId;
        if (isDeleting) {
            if (charIndex > 0) {
                element.textContent = textToType.substring(0, charIndex - 1);
                charIndex--;
                currentTimeoutId = setTimeout(typeWriterCycle, deletingSpeed);
            } else {
                isDeleting = false;
                element.innerHTML = '&nbsp;'; // Ensure cursor visibility when empty
                currentTimeoutId = setTimeout(typeWriterCycle, pauseBeforeTyping);
            }
        } else { // Typing
            if (element.innerHTML === '&nbsp;') element.innerHTML = ''; // Clear placeholder space if it exists
            if (charIndex < textToType.length) {
                element.textContent = textToType.substring(0, charIndex + 1);
                charIndex++;
                currentTimeoutId = setTimeout(typeWriterCycle, typingSpeed);
            } else {
                isDeleting = true;
                currentTimeoutId = setTimeout(typeWriterCycle, pauseBeforeDelete);
            }
        }
        typewriterTimeouts.set(element, currentTimeoutId);
    }
    // Initial call to start the cycle with a slight delay to ensure DOM is ready and initial animations (like pop-up) can play
    const initialDelay = element.classList.contains('reviews-header') ? 100 : 800; // Shorter delay for reviews page title, longer for main page title to allow pop-up.
    // This is a bit of a hack, ideally detect end of other animations. For now, a timed delay.
    // We'll use a generic delay for now as class based detection is not straightforward here.
    setTimeout(() => { 
        if (element.innerHTML === '&nbsp;') element.innerHTML = ''; // Clear placeholder before starting if it was set
        typeWriterCycle();
    }, 800); 
}

// Function to initialize/re-initialize all typewriter effects on the page
function initializeAllTypewriters() {
    // Clear all existing timeouts before re-initializing
    typewriterTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    typewriterTimeouts.clear();

    document.querySelectorAll('.main-title').forEach(titleElement => {
        // Ensure the element is visible before starting typewriter, to avoid issues on hidden elements
        if (titleElement.offsetParent !== null) {
            initTypewriterForElement(titleElement);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // 页面加载时，如果用户未登录，重置导航标志
    if (!isUserLoggedIn()) {
        isNavigatingToLogin = false;
    }

    const pathname = window.location.pathname;

    // 公共初始化 - 这些函数将在所有包含此脚本的页面上运行
    if (typeof initializeAllTypewriters === 'function') {
        initializeAllTypewriters(); // Typewriter可能只在特定页面元素上有效
    }
    if (typeof initPageParticles === 'function') {
        // 确保目标元素存在于当前页面
        if (document.getElementById('page-particles-js')) {
            initPageParticles();
        }
    }
    if (typeof initCustomPointer === 'function') {
        initCustomPointer();
    }
    if (typeof setupLanguageToggle === 'function') { 
        setupLanguageToggle();
    }
    if (typeof applyTranslations === 'function') {
        applyTranslations(currentLang || 'zh'); 
    }

    // 页面特定初始化
    // More robust path checking for login and register pages
    const isLoginPage = pathname.endsWith('/login') || pathname.endsWith('/login.html') || pathname.endsWith('/login/');
    const isRegisterPage = pathname.endsWith('/register') || pathname.endsWith('/register.html') || pathname.endsWith('/register/');

    if (pathname.includes('index.html') || pathname === '/' || pathname.endsWith('/Llama2-Chinese-main/')) { // 假设这些是首页的路径
        if (typeof updateLoginStateUI === 'function') {
            updateLoginStateUI();
        }
        if (typeof initChat === 'function') {
            initChat(); 
        }
        if (typeof initImageUpload === 'function') {
            initImageUpload();
        }
        if (typeof initScenarioButtons === 'function') {
            initScenarioButtons();
        }
        if (typeof loadChatHistory === 'function') {
            loadChatHistory(); // 加载历史对话
        }
        if (typeof initImageSizeSelector === 'function') {
            initImageSizeSelector();
        }
    } else if (isLoginPage || isRegisterPage) { // MODIFIED: Use the more robust check
        if (typeof handleGoogleCallback === 'function') {
            handleGoogleCallback();
        }
        const googleLoginBtn = document.querySelector('.google-login-btn');
        console.log('Attempting to find Google login button on login/register page:', googleLoginBtn); // DIAGNOSTIC LOG
        if (googleLoginBtn && typeof handleGoogleLogin === 'function') {
            console.log('Google login button found, attaching click listener.'); // DIAGNOSTIC LOG
            googleLoginBtn.addEventListener('click', handleGoogleLogin);
        } else {
            console.warn('Google login button NOT found or handleGoogleLogin function is missing.'); // DIAGNOSTIC LOG
        }
    } else if (pathname.includes('reviews.html')) {
        if (typeof initDynamicRatings === 'function') {
            initDynamicRatings();
        }
        if (typeof initVerticalMarqueeReviews === 'function') {
        initVerticalMarqueeReviews();
        }
        if (typeof initMarqueeHoverPause === 'function') {
        initMarqueeHoverPause();
    }
    } else if (pathname.includes('privacy-policy.html')) {
        // 隐私政策页面特有的JS初始化（如果有的话）
    }

    // ... 其他可能的全页通用初始化 ...
    
    // 示例：如果侧边栏的新对话按钮存在于所有页面 (不太可能，通常在 index.html)
    const newChatBtn = document.querySelector('.new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            const loginCheckResult = redirectToLoginIfNeeded();
            if (loginCheckResult.loginRequired) return; // 如果需要登录（无论是否导航），则停止操作
            
            currentConversationId = null;
            document.getElementById('chat-messages').innerHTML = ''; 
            resetChatViewToWelcome();
            if (typeof loadChatHistory === 'function') loadChatHistory(); 
        });
    }
});

// Called by toggleLanguage in translation.js after language is set
function updatePageForLanguageChange() {
    loadChatHistory(); // MODIFIED: was initChatHistory()

    if (document.getElementById('chat-messages')) {
        const activeScenarioBtn = document.querySelector('.scenario-btn.active');
        const chatMessages = document.getElementById('chat-messages');

        if (activeScenarioBtn && !currentConversationId) { // Only update scenario greeting if no conversation is loaded
            const scenario = activeScenarioBtn.dataset.scenario;
            const { titleKey, messageKey, greetingKey } = getScenarioTextKeys(scenario);
            
            const welcomeTitle = getTranslatedString(titleKey, currentLang);
            const welcomeMessage = getTranslatedString(messageKey, currentLang);
            let aiGreeting = getTranslatedString(greetingKey, currentLang);
            
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <h2>${welcomeTitle}</h2>
                    <p>${welcomeMessage}</p>
                </div>
            `;
            setTimeout(() => {
                if (document.getElementById('chat-messages')) {
                    const aiMessageDiv = document.createElement('div');
                    aiMessageDiv.className = 'message message-ai';
                    // Replace \n with <br> for AI greeting
                    const processedAiGreeting = String(aiGreeting).replace(/\n/g, '<br>');
                    aiMessageDiv.innerHTML = `<div class="message-content">${processedAiGreeting}</div>`;
                    chatMessages.appendChild(aiMessageDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }, 50); 
        } else if (!currentConversationId) { // If no scenario active and no conversation loaded, show default welcome
            const welcomeHeadingText = getTranslatedString('welcomeHeading');
            const welcomeMessageDefaultText = getTranslatedString('welcomeMessageDefault');
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <h2>${welcomeHeadingText}</h2>
                    <p>${welcomeMessageDefaultText}</p>
                </div>
            `;
        }
    }

    // Update scenario welcome message if a scenario is active
    // Ensure currentConversationId is null for default/scenario welcome messages if no conversation is loaded
    if (document.body.contains(document.getElementById('welcome-message-container')) && !currentConversationId) {
        updateScenarioWelcomeMessage(currentScenario);
    }

    // Re-initialize default welcome message if present and no conversation is loaded
    if (document.body.contains(document.getElementById('default-welcome-heading')) && !currentConversationId) {
        updateDefaultWelcomeMessage(); 
    }
    
    // Update input placeholder as it's not covered by data-translate-key for all browsers/cases
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.placeholder = getTranslatedString('chatInputPlaceholder');
    }

    initializeAllTypewriters(); // Re-initialize typewriters with new translated text
    chatInput.focus();
}

// MODIFIED: Renamed from initChatHistory and significantly updated
async function loadChatHistory() {
    const chatHistoryPanel = document.querySelector('.chat-history');
    if (!chatHistoryPanel) return;

    // Clear existing history items except for controls like "Clear All"
    // A more robust way would be to have a dedicated container for history items
    chatHistoryPanel.innerHTML = ''; // Simple clear for now

    // Add "Clear All History" button if it doesn't exist or handle its placement better
    // For simplicity, we'll prepend it dynamically. Ideally, it's part of the static HTML layout.
    const clearAllBtnContainer = document.createElement('div');
    clearAllBtnContainer.className = 'clear-all-history-container';
    const clearAllBtn = document.createElement('button');
    clearAllBtn.id = 'clear-all-history-btn';
    clearAllBtn.className = 'btn btn-primary btn-sm mb-2 clear-all-history-actual-btn';
    clearAllBtn.textContent = getTranslatedString('clearAllHistoryBtn') || 'Clear All History';
    clearAllBtn.addEventListener('click', async () => {
        if (confirm(getTranslatedString('confirmClearAllHistory') || 'Are you sure you want to delete all chat history?')) {
            try {
                const response = await fetch(`${BASE_API_URL}/api/history`, { method: 'DELETE' });
                if (response.ok) {
                    loadChatHistory(); // Refresh history list
                    // If the current conversation was deleted, reset the chat view
                    if (currentConversationId) {
                        resetChatViewToWelcome(); 
                        currentConversationId = null;
                    }
                } else {
                    alert(getTranslatedString('errorDeletingHistory') || 'Error deleting history.');
                }
            } catch (error) {
                console.error('Error deleting all history:', error);
                alert(getTranslatedString('errorDeletingHistory') || 'Error deleting history.');
            }
        }
    });
    clearAllBtnContainer.appendChild(clearAllBtn);
    chatHistoryPanel.appendChild(clearAllBtnContainer);

    try {
        const historyListResponse = await fetch(`${BASE_API_URL}/api/history`);
        if (!historyListResponse.ok) {
            throw new Error(`Failed to load history list: ${historyListResponse.status}`);
        }
        const historyData = await historyListResponse.json();

        // Sort history data by last updated timestamp, newest first
        historyData.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));

        if (historyData.length === 0) {
            chatHistoryPanel.innerHTML += `<p class="no-history-message">${getTranslatedString('noHistory') || 'No chat history yet.'}</p>`;
        }

        historyData.forEach(item => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.id = item.id;
            
            const titleText = item.title || (getTranslatedString(item.titleKey) || 'Untitled Chat');
            // const timeText = item.lastUpdated ? new Date(item.lastUpdated).toLocaleTimeString() : (getTranslatedString(item.timeKey) || '');
            // Using a more compact display for lastUpdated, or fallback to titleKey if available
            let displayTime = '';
            if (item.lastUpdated) {
                const date = new Date(item.lastUpdated);
                // Simple date formatting, can be enhanced with a library or more logic
                if (new Date().toDateString() === date.toDateString()) {
                    displayTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                    displayTime = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                }
            } else if (item.timeKey) {
                displayTime = getTranslatedString(item.timeKey);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-history-item-btn';
            deleteBtn.innerHTML = '&times;'; // Simple 'x' icon
            deleteBtn.setAttribute('aria-label', getTranslatedString('deleteChat') || 'Delete chat');
            deleteBtn.title = getTranslatedString('deleteChat') || 'Delete chat';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent chatItem click event
                if (confirm(getTranslatedString('confirmDeleteChat', { title: titleText }) || `Are you sure you want to delete "${titleText}"?`)) {
                    try {
                        const deleteResponse = await fetch(`${BASE_API_URL}/api/history/${item.id}`, { method: 'DELETE' });
                        if (deleteResponse.ok) {
                            loadChatHistory(); // Refresh the list
                            if (currentConversationId === item.id) {
                                resetChatViewToWelcome();
                                currentConversationId = null;
                            }
                        } else {
                            alert(getTranslatedString('errorDeletingChat') || 'Error deleting chat.');
                        }
                    } catch (err) {
                        console.error('Error deleting chat item:', err);
                        alert(getTranslatedString('errorDeletingChat') || 'Error deleting chat.');
                    }
                }
            });

            chatItem.innerHTML = `
                <i class="${item.icon || 'fas fa-comments-alt'} "></i> 
                <div class="chat-item-text">${titleText}</div>
                <div class="chat-item-time">${displayTime}</div>
            `;
            chatItem.appendChild(deleteBtn);

            chatHistoryPanel.appendChild(chatItem);

            chatItem.addEventListener('click', function() {
                const newConversationId = this.dataset.id;
                if (currentConversationId !== newConversationId) {
                    loadConversation(newConversationId);
                }
            });
        });
    } catch (error) {
        console.error('Error fetching or processing chat history:', error);
        chatHistoryPanel.innerHTML += `<p>${getTranslatedString('errorLoadingHistory') || 'Error loading history.'}</p>`;
    }
}

// New function to load a specific conversation
async function loadConversation(conversationId) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    try {
        const response = await fetch(`${BASE_API_URL}/api/history/${conversationId}`);
        if (!response.ok) {
            const errorKey = 'errorLoadingConversation';
            const errorText = getTranslatedString(errorKey) || 'Error loading conversation.';
            let serverResponseMessage = '';
            try {
                const errorData = await response.json(); // Try to parse as JSON first
                serverResponseMessage = errorData.error || JSON.stringify(errorData);
            } catch (e) {
                serverResponseMessage = await response.text(); // Fallback to plain text
            }
            alert(`${errorText} (ID: ${conversationId}, Status: ${response.status}).\nServer: ${serverResponseMessage}`);
            return;
        }
        const conversation = await response.json();
        currentConversationId = conversation.id; // Set the active conversation ID
        currentScenario = conversation.scenario || 'general'; // Update current scenario

        chatMessages.innerHTML = ''; // Clear current messages
        conversation.messages.forEach(msg => {
            addMessage(msg.text, msg.sender, false, msg.type || 'text');
        });

        // Deactivate all scenario buttons then activate the one for this conversation
        const scenarioBtns = document.querySelectorAll('.scenario-btn');
        scenarioBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.scenario-btn[data-scenario="${currentScenario}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        // Potentially update welcome message area or hide it if a conversation is loaded
        // This might need refinement based on how welcome messages and scenarios are handled
        // For now, just loading messages is the priority.

        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
        document.getElementById('chat-input').focus();

    } catch (error) {
        console.error('Error loading conversation:', error);
        alert(getTranslatedString('errorLoadingConversation') || 'Error loading conversation.');
    }
}

// Helper function to add a message to the chat window
function addMessage(text, sender, isNewConversationStart = false, messageType = 'text') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const welcomeMessageExists = chatMessages.querySelector('.welcome-message');
    if (sender !== 'ai-thinking' && welcomeMessageExists) {
         if (isNewConversationStart || currentConversationId) { 
            chatMessages.innerHTML = ''; 
         }
    }
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${sender}`;
    if (sender === 'ai-thinking') {
        messageDiv.id = 'ai-thinking-message';
    }

    const messageContentDiv = document.createElement('div');
    messageContentDiv.className = 'message-content';

    if (sender === 'ai' && messageType === 'image') {
        // It's an image from AI
        const img = document.createElement('img');
        img.src = text; // text is the image URL
        img.alt = getTranslatedString('aiGeneratedImageAlt') || "AI Generated Image";
        img.style.position = 'relative';
        messageContentDiv.appendChild(img);

        // 下载按钮容器
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'ai-image-download-btn';
        downloadBtn.title = getTranslatedString('downloadImage') || '下载图片';
        downloadBtn.style.position = 'absolute';
        downloadBtn.style.right = '10px';
        downloadBtn.style.bottom = '10px';
        downloadBtn.style.background = 'rgba(0,0,0,0.6)';
        downloadBtn.style.color = '#fff';
        downloadBtn.style.border = 'none';
        downloadBtn.style.borderRadius = '6px';
        downloadBtn.style.padding = '4px 10px';
        downloadBtn.style.fontSize = '14px';
        downloadBtn.style.cursor = 'pointer';
        downloadBtn.style.zIndex = '2';
        downloadBtn.innerHTML = `<i class='fas fa-download'></i> ${getTranslatedString('downloadImage') || '下载'}`;
        downloadBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const a = document.createElement('a');
            a.href = img.src;
            a.download = 'llama4-image.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
        // 让 messageContentDiv 相对定位以放置按钮
        messageContentDiv.style.position = 'relative';
        messageContentDiv.appendChild(downloadBtn);
    } else if (sender === 'user' && messageType === 'image') {
        // It's an image from the user
        const img = document.createElement('img');
        img.src = text; // text is expected to be a data URL for user images
        img.alt = getTranslatedString('userUploadedImageAlt') || "User Uploaded Image"; 
        img.style.maxWidth = '200px'; 
        img.style.maxHeight = '200px';
        img.style.borderRadius = '8px';
        img.style.marginTop = '5px'; // Add some space if there was text before it from the same user turn
        messageContentDiv.appendChild(img);
    } else {
        let processedText = text;
        if (sender === 'ai' || messageType === 'text') { // Apply <br> for AI text or any explicit text message
            processedText = String(text).replace(/\n/g, '<br>');
        }
        messageContentDiv.innerHTML = processedText;
    }

    messageDiv.appendChild(messageContentDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Helper function to remove the AI thinking indicator
function removeThinkingMessage() {
    const thinkingMsg = document.getElementById('ai-thinking-message');
    if (thinkingMsg) {
        thinkingMsg.remove();
    }
}

function initScenarioButtons() {
    const scenarioBtns = document.querySelectorAll('.scenario-btn');
    const chatMessages = document.getElementById('chat-messages');
    if (!scenarioBtns.length || !chatMessages) return;

    scenarioBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            scenarioBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentScenario = this.dataset.scenario; 
            currentConversationId = null; 
            
            // 新增：AI绘画、图像解析、以图生图场景自动显示图片尺寸选择器
            if (["aipainting", "imageanalysis", "imagetoimage"].includes(currentScenario)) {
                if (typeof showImageSizeSelector === 'function') showImageSizeSelector();
            } else {
                if (typeof hideImageSizeSelector === 'function') hideImageSizeSelector();
            }

            const { titleKey, messageKey, greetingKey } = getScenarioTextKeys(currentScenario);

            const welcomeTitle = getTranslatedString(titleKey, currentLang);
            const welcomeMessage = getTranslatedString(messageKey, currentLang);
            let aiGreeting = getTranslatedString(greetingKey, currentLang);

            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <h2>${welcomeTitle}</h2>
                    <p>${welcomeMessage}</p>
                </div>
            `;
            setTimeout(() => {
                if (document.getElementById('chat-messages')) { 
                    const aiMessageDiv = document.createElement('div');
                    aiMessageDiv.className = 'message message-ai';
                    // Ensure aiGreeting is a string and not undefined/key, then replace \n
                    const greetingText = (aiGreeting === greetingKey && currentLang !== 'zh' && translations[greetingKey] && translations[greetingKey]['zh']) 
                                       ? translations[greetingKey]['zh'] 
                                       : aiGreeting;
                    const processedGreetingText = String(greetingText).replace(/\n/g, '<br>');
                    aiMessageDiv.innerHTML = `<div class="message-content">${processedGreetingText}</div>`;
                    chatMessages.appendChild(aiMessageDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }, 500); 
        });
    });
}

function initDynamicRatings() {
    const ratingLargeSpan = document.querySelector('.rating-large span');
    const ratingFills = document.querySelectorAll('.rating-fill');
    const ratingCategorySpans = document.querySelectorAll('.rating-category span:last-child');
    if (ratingLargeSpan) {
        animateCount(ratingLargeSpan, 0, 4.8, 1, 1500); 
    }
    ratingFills.forEach(fill => {
        const targetWidth = parseFloat(fill.dataset.targetWidth || fill.style.width || "0");
        fill.dataset.targetWidth = targetWidth; 
        fill.style.width = '0%'; 
        setTimeout(() => { 
            fill.style.transition = 'width 1.5s ease-out';
            fill.style.width = targetWidth + '%';
        }, 200);
    });
    ratingCategorySpans.forEach(span => {
        const targetScore = parseFloat(span.dataset.targetScore || span.textContent || "0");
        span.dataset.targetScore = targetScore; 
        animateCount(span, 0, targetScore, 1, 1500); 
    });
}

function animateCount(element, start, end, decimals, duration) {
    const startTime = performance.now();
    function animation(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const currentVal = start + (end - start) * progress;
        element.textContent = currentVal.toFixed(decimals);
        if (progress < 1) {
            requestAnimationFrame(animation);
        } else {
            element.textContent = end.toFixed(decimals); 
        }
    }
    requestAnimationFrame(animation);
}

function initVerticalMarqueeReviews() {
    const marqueeColumns = [document.getElementById('marquee-column-1'), document.getElementById('marquee-column-2')];
    if (!marqueeColumns[0] || !marqueeColumns[1]) return;
    const allReviewsSource = Array.from(document.querySelectorAll('.reviews-grid .review-card'));
    if (allReviewsSource.length === 0) return;
    const minReviewsPerColumn = 10; 
    marqueeColumns.forEach((column, colIndex) => {
        column.innerHTML = ''; 
        let reviewsForThisColumn = allReviewsSource.filter((_, index) => index % 2 === colIndex);
        if (reviewsForThisColumn.length === 0 && allReviewsSource.length > 0 && colIndex === 0) { // Ensure first column gets some if distribution is uneven and it's empty
            reviewsForThisColumn = allReviewsSource.slice(0, Math.ceil(allReviewsSource.length / 2));
        }
        if (reviewsForThisColumn.length === 0 && allReviewsSource.length > 0 && colIndex === 1) { // Ensure second column gets some if distribution is uneven and it's empty
             reviewsForThisColumn = allReviewsSource.slice(Math.floor(allReviewsSource.length / 2));
        }
        
        let populatedReviews = [];
        while (reviewsForThisColumn.length > 0 && populatedReviews.length < minReviewsPerColumn) {
            populatedReviews = populatedReviews.concat(reviewsForThisColumn);
        }
        // If still not enough, and original source wasn't empty, use a slice of source to fill up
        if (populatedReviews.length < minReviewsPerColumn && allReviewsSource.length > 0){
            let needed = minReviewsPerColumn - populatedReviews.length;
            for(let i=0; i < needed; i++){
                populatedReviews.push(allReviewsSource[i % allReviewsSource.length]);
            }
        }

        populatedReviews.forEach(reviewCard => { 
            column.appendChild(reviewCard.cloneNode(true));
        });
    });
}

function initMarqueeHoverPause() {
    const marqueeWrapper = document.querySelector('.marquee-wrapper'); 
    if (marqueeWrapper) {
        marqueeWrapper.addEventListener('mouseenter', () => {
            marqueeWrapper.style.animationPlayState = 'paused';
            const summary = document.querySelector('.reviews-summary');
            if (summary && summary.style.animationName && summary.style.animationName.includes('pulse')) {
                 summary.style.animationPlayState = 'paused';
            }
        });
        marqueeWrapper.addEventListener('mouseleave', () => {
            marqueeWrapper.style.animationPlayState = 'running';
            const summary = document.querySelector('.reviews-summary');
            if (summary && summary.style.animationName && summary.style.animationName.includes('pulse')) {
                 summary.style.animationPlayState = 'running';
            }
        });
    }
}

function initImageSizeSelector() {
    const selector = document.getElementById('image-size-selector');
    if (!selector) return;
    selector.addEventListener('click', e => {
        if (e.target.classList.contains('size-btn')) {
            currentImageSize = e.target.dataset.size;
            setActiveSizeBtn(currentImageSize);
        }
    });
    setActiveSizeBtn(currentImageSize);
}

function showImageSizeSelector() {
    const selector = document.getElementById('image-size-selector');
    if (selector) selector.style.display = 'flex';
}
function hideImageSizeSelector() {
    const selector = document.getElementById('image-size-selector');
    if (selector) selector.style.display = 'none';
}
function setActiveSizeBtn(size) {
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === size);
    });
}

// Initialize Custom Mouse Pointer
function initCustomPointer() {
    const pointer = document.getElementById('custom-mouse-pointer');
    if (!pointer) {
        console.error('Custom mouse pointer element not found.');
        return;
    }

    // Heart SVG markup (approximating the one from the React example)
    pointer.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    `;

    // Adjust position to center the pointer (half of its width/height)
    const pointerOffsetX = pointer.offsetWidth / 2;
    const pointerOffsetY = pointer.offsetHeight / 2;

    document.addEventListener('mousemove', function(e) {
        if (!pointer.classList.contains('visible')) {
            pointer.classList.add('visible');
        }
        // Subtract offset to center the custom pointer on the actual cursor position
        pointer.style.left = (e.clientX - pointerOffsetX) + 'px';
        pointer.style.top = (e.clientY - pointerOffsetY) + 'px';
    });

    document.body.addEventListener('mouseleave', function() {
        pointer.classList.remove('visible');
    });

    document.body.addEventListener('mouseenter', function() {
        if (document.hasFocus()) { // Only make visible if window is focused
            pointer.classList.add('visible');
        }
    });
}

// Initialize Page Particles Effect
function initPageParticles() {
    if (typeof particlesJS === 'function') {
        particlesJS('page-particles-js', { // Target the ID of the div we added
            "particles": {
                "number": {
                    "value": 80,
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": ["#FF69B4", "#7FFF00", "#1E90FF", "#FFD700", "#FF4500", "#9370DB", "#00CED1", "#FFC0CB", "#32CD32", "#FFA500"] // Vibrant and varied colors
                },
                "shape": {
                    "type": "circle",
                },
                "opacity": {
                    "value": 0.4,
                    "random": true,
                    "anim": {
                        "enable": true,
                        "speed": 0.8,
                        "opacity_min": 0.1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 3,
                    "random": true,
                    "anim": {
                        "enable": false,
                        "speed": 40,
                        "size_min": 0.1,
                        "sync": false
                    }
                },
                "line_linked": {
                    "enable": false,
                    "distance": 150,
                    "color": "#888888",
                    "opacity": 0.4,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 1.5, // Slower speed
                    "direction": "none",
                    "random": true,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false,
                    "attract": {
                        "enable": false,
                    }
                }
            },
            "interactivity": {
                "detect_on": "window",
                "events": {
                    "onhover": {
                        "enable": true,
                        "mode": "grab"
                    },
                    "onclick": {
                        "enable": true,
                        "mode": "push"
                    },
                    "resize": true
                },
                "modes": {
                    "grab": {
                        "distance": 140,
                        "line_linked": {
                            "opacity": 0.7
                        }
                    },
                    "bubble": {
                        "distance": 400,
                        "size": 40,
                        "duration": 2,
                        "opacity": 8,
                        "speed": 3
                    },
                    "repulse": {
                        "distance": 150,
                        "duration": 0.4
                    },
                    "push": {
                        "particles_nb": 4
                    },
                    "remove": {
                        "particles_nb": 2
                    }
                }
            },
            "retina_detect": true
        });
    } else {
        console.error('particles.js library (particlesJS) not loaded or not a function.');
    }
}

// New helper function to reset chat view to the default welcome message
function resetChatViewToWelcome() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        const welcomeHeadingText = getTranslatedString('welcomeHeading');
        const welcomeMessageDefaultText = getTranslatedString('welcomeMessageDefault');
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <h2>${welcomeHeadingText}</h2>
                <p>${welcomeMessageDefaultText}</p>
            </div>
        `;
    }
    // Reset scenario to general and update scenario buttons as well
    currentScenario = 'general';
    const scenarioBtns = document.querySelectorAll('.scenario-btn');
    scenarioBtns.forEach(b => b.classList.remove('active'));
    const generalBtn = document.querySelector('.scenario-btn[data-scenario="general"]');
    if (generalBtn) generalBtn.classList.add('active');
}

function sendMessage(messageText, uploadedFile) {
    // 发送前先显示用户消息
    if (messageText) {
        addMessage(messageText, 'user');
    }
    // ADDED: Display user-uploaded image immediately
    if (uploadedFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            addMessage(e.target.result, 'user', false, 'image');
        }
        reader.readAsDataURL(uploadedFile);
    }

    // AI思考中提示
    addMessage('<i class="fas fa-spinner fa-spin"></i> AI思考中...', 'ai-thinking');

    let url = '';
    let requestOptions = {};
    // 定义一个统一的响应处理器结构，具体实现在各个分支中定义
    let responseHandler = (data, lang) => { // Added lang for getTranslatedString
        // Default handler, should be overridden
        if (data.reply) {
            addMessage(data.reply, 'ai');
        } else {
            addMessage(getTranslatedString('aiEmptyReply', lang) || 'AI未返回有效回复。', 'ai');
        }
    };

    if (currentScenario === 'aipainting') {
        if (!messageText || messageText.trim() === "") {
            removeThinkingMessage();
            addMessage(getTranslatedString('promptRequiredForPainting', currentLang) || '请输入绘画提示词。', 'ai');
            return;
        }
        url = BASE_API_URL + '/api/image/generate';
        const body = {
            prompt: messageText,
            size: currentImageSize,
            scenario: 'aipainting',
            conversationId: currentConversationId
        };
        requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        };
        responseHandler = (data, lang) => {
            if (data.reply) { // AI Painting API returns image URL in data.reply
                addMessage(data.reply, 'ai', false, 'image');
    } else {
                addMessage(getTranslatedString('aiFailedToGenerateImage', lang) || 'AI未能生成图片，请检查提示词或稍后再试。', 'ai');
                console.error("API response for aipainting didn't contain data.reply:", data);
            }
        };
    } else if (currentScenario === 'imagetoimage') {
        const imageInputElement = document.getElementById('image-upload-input');
        const imageFile = imageInputElement && imageInputElement.files && imageInputElement.files[0] ? imageInputElement.files[0] : uploadedFile;

        if (!imageFile) {
            removeThinkingMessage();
            addMessage(getTranslatedString('imageRequiredForImageToImage', currentLang) || '请先上传一张图片才能进行以图生图。', 'ai');
            if (imageInputElement) imageInputElement.value = '';
            const removeImageBtn = document.getElementById('remove-image-btn');
            if (removeImageBtn && document.getElementById('image-preview-container').style.display !== 'none') {
                 removeImageBtn.click();
            }
            return;
        }
        if (!messageText || messageText.trim() === "") {
             removeThinkingMessage();
             addMessage(getTranslatedString('promptRequiredForImageToImage', currentLang) || '请输入图片转换的描述或指令。', 'ai');
             return;
        }

        // For debugging: Log file type and name
        console.log('File Name:', imageFile.name);
        console.log('File Type:', imageFile.type);

        url = '/api/image-ai-call'; // MODIFIED: Point to the Cloudflare Function proxy
        const formData = new FormData();
        const google_id = localStorage.getItem('google_id');
        formData.append('google_id', google_id || '');
        formData.append('model_id', '5');
        formData.append('img', imageFile);
        formData.append('content', messageText);

        requestOptions = {
            method: 'POST',
            body: formData,
        };
        responseHandler = (data, lang) => {
            if (data.data) {
                addMessage(data.data, 'ai', false, 'image');
            } else {
                // Check for specific error message from the API response
                if (data.msg && data.msg.includes('图片格式不正确')) {
                    addMessage(getTranslatedString('aiFailedToGenerateImageInvalidFormat', lang) || 'AI未能生成图片：图片格式不正确。请尝试使用JPG或PNG格式的图片。', 'ai');
                } else {
                    addMessage(getTranslatedString('aiFailedToGenerateImage', lang) || 'AI未能生成图片，请检查输入或稍后再试。', 'ai');
                }
                console.error("API response for imagetoimage (model_id 5) didn't contain data.data:", data);
            }
        };
    } else { // General chat and other text-based scenarios
        url = BASE_API_URL + '/api/chat';
        if (uploadedFile) {
            const formData = new FormData();
            formData.append('message', messageText);
            formData.append('scenario', currentScenario);
            if (currentConversationId) {
                formData.append('conversationId', currentConversationId);
            }
            formData.append('image', uploadedFile, uploadedFile.name); // 'image' is a common key for image files

            requestOptions = {
                method: 'POST',
                body: formData
                // Headers are not explicitly set for FormData; browser sets 'Content-Type' to 'multipart/form-data'
            };
        } else {
            const body = {
            message: messageText,
            scenario: currentScenario,
            conversationId: currentConversationId
        };
            requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
            };
        }
        responseHandler = (data, lang) => {
            if (data.reply) {
                addMessage(data.reply, 'ai');
            } else {
                addMessage(getTranslatedString('aiEmptyReply', lang) || 'AI未返回有效回复。', 'ai');
            }
        };
    }

    // 发送请求
    fetch(url, requestOptions)
    .then(res => {
        if (!res.ok && res.status === 500) {
            console.error('Server Error 500:', res);
            return res.json().then(errData => {
                throw new Error(errData.error || '服务器内部错误 (500)');
            }).catch(() => {
                throw new Error('服务器内部错误 (500)，且响应无法解析。');
            });
        }
        if (!res.ok) {
             return res.json().then(errData => {
                throw new Error(errData.error || `请求失败，状态码: ${res.status}`);
            }).catch(() => {
                throw new Error(`请求失败，状态码: ${res.status}，且响应无法解析。`);
            });
        }
        return res.json();
    })
    .then(data => {
        removeThinkingMessage();
        if (data.error) {
            addMessage('❌ ' + (data.error || 'AI服务异常'), 'ai');
            return;
        }

        responseHandler(data, currentLang); // Call the appropriate response handler

        if (data.conversationId) {
            currentConversationId = data.conversationId;
        }
        loadChatHistory(); // 刷新历史
    })
    .catch(err => {
        removeThinkingMessage();
        addMessage('❌ ' + (err.message || '网络错误或服务器异常'), 'ai');
        console.error('API Error:', err);
    });
}

// ========== GOOGLE AUTHENTICATION START ==========

// 辅助函数：从URL中提取主域名
function extractRootDomain(url) {
    let domain;
    try {
        // 先尝试通过URL构造函数解析
        domain = new URL(url).hostname;
    } catch (e) {
        // 如果失败（比如url不是一个完整的http/https地址，可能是相对路径等），则直接返回原始url
        // 或者可以尝试更复杂的正则表达式，但这里简化处理
        // 对于 window.location.origin 这样的输入，hostname属性可以直接使用
        return url; // 或者根据具体情况返回更合适的默认值
    }

    const parts = domain.split('.');
    if (parts.length > 2) {
        // 检查是否是常见的多部分顶级域名，如 .co.uk, .com.cn
        // 这是一个简化版本，可能需要根据实际支持的域名进行调整
        if ((parts[parts.length - 2] === 'co' || parts[parts.length - 2] === 'com') && parts.length > 3) {
            return parts.slice(-3).join('.');
        }
        return parts.slice(-2).join('.');
    }
    return domain;
}

// 处理Google登录点击
function handleGoogleLogin() {
    // The redirect_uri should be the current page the user is on when they click login.
    // This is where Google (after the PHP script) should redirect the user back to.
    const clientPageUri = window.location.href; 

    // MODIFIED: Point to the Cloudflare Function proxy.
    // We send the clientPageUri which the function will use as the redirect_uri for the PHP script.
    // The 'url' parameter for the PHP script will be hardcoded in the Cloudflare Function itself based on your React example.
    window.location.href = `/api/google-auth-redirect?client_page_uri=${encodeURIComponent(clientPageUri)}`;
}

// 检查用户是否已登录
function isUserLoggedIn() {
    return !!localStorage.getItem('token');
}

// 获取存储的用户信息
function getUserInfo() {
    const name = localStorage.getItem('name');
    const email = localStorage.getItem('email');
    const picture = localStorage.getItem('picture');
    if (name && email && picture) {
        return { name, email, picture };
    }
    return null;
}

// 处理Google登录回调 (在登录/注册页面加载时调用)
function handleGoogleCallback() {
    const url = window.location.href;
    if (url.includes('google_id=')) {
        const params = new URLSearchParams(url.split('?')[1]);
        
        const googleId = params.get('google_id');
        const name = params.get('name');
        const email = params.get('email');
        const picture = params.get('picture');
        
        if (googleId) localStorage.setItem('google_id', googleId);
        if (name) localStorage.setItem('name', name);
        if (email) localStorage.setItem('email', email);
        if (picture) localStorage.setItem('picture', picture);
        
        // 生成简单的 token
        const token = btoa(JSON.stringify({ googleId, name, email, picture })); // 使用 btoa 进行简单编码
        localStorage.setItem('token', token);
        
        // 清理 URL 参数
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // 重定向到首页
        window.location.href = 'index.html'; 
    }
}

// 更新侧边栏登录状态UI (在index.html调用)
function updateLoginStateUI() {
    const loginBtnContainer = document.querySelector('.nav-links a.login-btn'); // 登录按钮的容器<a>
    const navLinks = document.querySelector('.nav-links');

    if (!navLinks) return; // 如果侧边栏不存在则不执行

    if (isUserLoggedIn()) {
        const userInfo = getUserInfo();
        if (userInfo && loginBtnContainer) {
            // 移除旧的登录按钮
            loginBtnContainer.style.display = 'none';

            // 检查是否已存在用户信息元素，避免重复添加
            let userProfileElement = document.getElementById('user-profile-sidebar');
            if (!userProfileElement) {
                userProfileElement = document.createElement('div');
                userProfileElement.id = 'user-profile-sidebar';
                userProfileElement.classList.add('user-profile-sidebar-container');

                let avatarHTML = '';
                // More robust check for picture URL and add Tailwind classes
                if (userInfo.picture && (userInfo.picture.startsWith('http://') || userInfo.picture.startsWith('https://'))) {
                    avatarHTML = `<img src="${userInfo.picture}" alt="${userInfo.name || 'User'}" class="user-avatar w-8 h-8 rounded-full">`;
                } else if (userInfo.name && userInfo.name.length > 0) { // Check name exists and has length
                    const firstLetter = userInfo.name.charAt(0).toUpperCase();
                    let bgColor = '#cccccc'; // Default color for background
                    try {
                        // Dynamic background color based on name hash
                        const nameHash = userInfo.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const colors = ['#FFB6C1', '#ADD8E6', '#90EE90', '#FFDAB9', '#E6E6FA', '#F0E68C', '#B0E0E6'];
                        bgColor = colors[nameHash % colors.length];
                    } catch(e){ /* Ignore color generation error, use default */ }
                    // Apply Tailwind-like classes for styling initials avatar
                    avatarHTML = `<div class="w-8 h-8 rounded-full flex items-center justify-center text-white" style="background-color: ${bgColor};">${firstLetter}</div>`;
                } else {
                    // Fallback avatar with 'U' and Tailwind-like classes
                    avatarHTML = `<div class="w-8 h-8 rounded-full flex items-center justify-center text-white" style="background-color: #cccccc;">U</div>`;
                }

                userProfileElement.innerHTML = `
                    ${avatarHTML}
                    <span class="user-name">${userInfo.name || 'User'}</span>
                    <div class="user-dropdown" style="display:none;">
                        <a href="profile.html" id="view-profile-btn"><span data-translate-key="profileViewProfile">查看信息</span></a>
                        <a href="#" id="logout-btn"><span data-translate-key="profileLogout">退出登录</span></a>
                    </div>
                `;
                // 将新的用户信息元素插入到登录按钮原本的位置或其父容器的开头/末尾
                // 为了保持顺序，我们尝试插入到 chat 链接之前
                const chatLink = navLinks.querySelector('a[href="index.html"]');
                if (chatLink) {
                    navLinks.insertBefore(userProfileElement, chatLink);
                } else {
                    navLinks.appendChild(userProfileElement); // 备用方案
                }

                // 事件监听器
                const avatarContainer = userProfileElement; // 直接用父容器触发
                const dropdown = userProfileElement.querySelector('.user-dropdown');
                
                avatarContainer.addEventListener('click', (e) => {
                    e.stopPropagation(); // 防止事件冒泡到document关闭dropdown
                    if(dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                });

                document.getElementById('logout-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    logoutUser();
                });
                
                // 点击页面其他地方关闭下拉菜单
                document.addEventListener('click', (e) => {
                    if (userProfileElement && !userProfileElement.contains(e.target) && dropdown) {
                        dropdown.style.display = 'none';
                    }
                });
            } else {
                // 更新已存在的用户信息
                const currentAvatarElement = userProfileElement.querySelector('.user-avatar, .user-avatar-initial, .w-8.h-8.rounded-full'); // Include new classes in selector
                let newAvatarHTML = '';

                // Consistent robust check for picture URL and add Tailwind classes
                if (userInfo.picture && (userInfo.picture.startsWith('http://') || userInfo.picture.startsWith('https://'))) {
                    newAvatarHTML = `<img src="${userInfo.picture}" alt="${userInfo.name || 'User'}" class="user-avatar w-8 h-8 rounded-full">`;
                } else if (userInfo.name && userInfo.name.length > 0) { // Check name exists and has length
                    const firstLetter = userInfo.name.charAt(0).toUpperCase();
                    let bgColor = '#cccccc'; // Default color for background
                    try {
                        // Dynamic background color based on name hash
                        const nameHash = userInfo.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const colors = ['#FFB6C1', '#ADD8E6', '#90EE90', '#FFDAB9', '#E6E6FA', '#F0E68C', '#B0E0E6'];
                        bgColor = colors[nameHash % colors.length];
                    } catch(e){ /* Ignore color generation error, use default */ }
                    // Apply Tailwind-like classes for styling initials avatar
                    newAvatarHTML = `<div class="w-8 h-8 rounded-full flex items-center justify-center text-white" style="background-color: ${bgColor};">${firstLetter}</div>`;
                } else {
                    // Fallback avatar with 'U' and Tailwind-like classes
                    newAvatarHTML = `<div class="w-8 h-8 rounded-full flex items-center justify-center text-white" style="background-color: #cccccc;">U</div>`;
                }

                if (currentAvatarElement) {
                    currentAvatarElement.outerHTML = newAvatarHTML;
                } else {
                    // 如果没有找到旧的头像元素，则添加到容器的开头
                    userProfileElement.insertAdjacentHTML('afterbegin', newAvatarHTML);
                }
                
                const userNameElement = userProfileElement.querySelector('.user-name');
                if (userNameElement) {
                    userNameElement.textContent = userInfo.name || 'User';
                }
            }
        }
    } else {
        // 用户未登录，确保显示登录按钮，移除用户信息
        if (loginBtnContainer) loginBtnContainer.style.display = 'flex'; // 或 'block' 取决于原始样式
        const userProfileElement = document.getElementById('user-profile-sidebar');
        if (userProfileElement) {
            userProfileElement.remove();
        }
    }
}

// 注销用户
function logoutUser() {
    localStorage.removeItem('google_id');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    localStorage.removeItem('picture');
    localStorage.removeItem('token');
    updateLoginStateUI(); // 更新UI以显示登录按钮
    // 可选: 重定向到首页或登录页
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
       // window.location.href = 'index.html'; // 避免在首页重复刷新
    }
}

// 检查是否需要登录，如果未登录则重定向或提示
function redirectToLoginIfNeeded() {
    if (isNavigatingToLogin) {
        // 如果已经在尝试导航到登录页面，则直接返回，避免重复弹窗
        return { loginRequired: true, navigated: true }; 
    }

    if (!isUserLoggedIn()) {
        const confirmLogin = window.confirm(getTranslatedString('loginRequiredMessage', currentLang) || '您需要登录才能使用此功能。是否立即登录？');
        if (confirmLogin) {
            isNavigatingToLogin = true; // 设置标志，表示开始导航
            window.location.href = 'login.html';
            return { loginRequired: true, navigated: true }; // 用户选择导航
        } else {
            return { loginRequired: true, navigated: false }; // 用户取消
        }
    }
    // 用户已登录，或者之前已设置 isNavigatingToLogin 但实际未登录（例如页面加载时重置）
    // 如果用户已登录，确保标志是false
    isNavigatingToLogin = false; 
    return { loginRequired: false, navigated: false }; 
}

// ========== GOOGLE AUTHENTICATION END ==========

// Modify document.addEventListener('DOMContentLoaded', ...) to include auth checks
// We will do this in a separate step to ensure all functions are defined.

// The existing sendMessage function might need modification for auth check
// We will handle this later.

// The existing sendMessage function might need modification for auth check
// We will handle this later.

// Function to handle image-to-image generation
async function handleImageGeneration() {
    const imageInputElement = document.getElementById('imageInput'); // 请确保您有这个ID的input[type=file]元素
    const styleSelectorElement = document.getElementById('styleSelector'); // 请确保您有这个ID的select或其他输入元素
    const roomTypeSelectorElement = document.getElementById('roomTypeSelector'); // 请确保您有这个ID的select或其他输入元素
    const processedImageDisplayElement = document.getElementById('processedImageDisplay'); // 请确保您有这个ID的img元素
    const generateButton = document.getElementById('generateImageBtn'); // 请确保您有这个ID的按钮元素
    const loadingIndicator = document.getElementById('loadingIndicator'); // 可选：用于显示加载状态的元素
    const errorDisplay = document.getElementById('errorDisplay'); // 可选：用于显示错误的元素

    if (!imageInputElement || !imageInputElement.files || imageInputElement.files.length === 0) {
        if (errorDisplay) errorDisplay.textContent = '请先选择一张图片。';
        console.error('No image selected.');
        return;
    }
    const selectedImage = imageInputElement.files[0];

    if (!styleSelectorElement || !roomTypeSelectorElement) {
        if (errorDisplay) errorDisplay.textContent = '风格或房间类型选择器未找到。';
        console.error('Style or Room Type selector not found.');
        return;
    }
    const selectedStyle = styleSelectorElement.value; // 假设 .value 能获取到选中的值
    const selectedRoomType = roomTypeSelectorElement.value; // 假设 .value 能获取到选中的值

    if (!selectedStyle || !selectedRoomType) {
        if (errorDisplay) errorDisplay.textContent = '请选择风格和房间类型。';
        console.error('Style or Room Type not selected.');
        return;
    }
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (errorDisplay) errorDisplay.textContent = '';
    if (generateButton) generateButton.disabled = true;

    const formData = new FormData();
    const google_id = localStorage.getItem('google_id');
    formData.append('google_id', google_id || '');
    formData.append('model_id', '5');  // 通义千问的线稿生图API的ID
    formData.append('img', selectedImage);

    const content = `以${selectedStyle} 风格 设计 ${selectedRoomType}`;
    formData.append('content', content);
      
    try {
        const response = await fetch('https://aa.jstang.cn/api/ai/call', {
            method: 'POST',
            body: formData,
        });
 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
      
        const data = await response.json();
        console.log('API Response:', data);

        if (data && data.data) {
            if (processedImageDisplayElement) {
                processedImageDisplayElement.src = data.data;
                processedImageDisplayElement.style.display = 'block'; //确保图片可见
            } else {
                console.error('Processed image display element not found.');
            }
        } else {
            throw new Error('图片URL未在API响应中找到。');
        }

    } catch (error) {
        console.error('Error during image generation:', error);
        if (errorDisplay) errorDisplay.textContent = `图像生成失败: ${error.message}`;
        if (processedImageDisplayElement) processedImageDisplayElement.style.display = 'none'; // 发生错误时隐藏图片
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (generateButton) generateButton.disabled = false;
    }
}

// 您需要在您的HTML中，为触发此功能的按钮添加事件监听器
// 例如:
// document.addEventListener('DOMContentLoaded', () => {
//     const generateButton = document.getElementById('generateImageBtn');
//     if (generateButton) {
//         generateButton.addEventListener('click', handleImageGeneration);
//     }
// });
 
