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

// Placeholder for sendMessageHandler - User needs to define this properly
function sendMessageHandler() {
    console.warn("sendMessageHandler is called, but needs full implementation for sending messages.");
    const chatInput = document.getElementById('chat-input');
    const imageUploadInput = document.getElementById('image-upload-input');
    let messageText = chatInput ? chatInput.value.trim() : "";
    let file = imageUploadInput && imageUploadInput.files[0] ? imageUploadInput.files[0] : null;

    if (!messageText && !file) {
        // console.log("No message text or file to send.");
        return; 
    }
    
    // Call the actual sendMessage function
    if (typeof sendMessage === 'function') {
        sendMessage(messageText, file); // sendMessage is defined at the end of the script
    } else {
        console.error("sendMessage function is not defined at the point of call by sendMessageHandler.");
    }
    
    if (chatInput) {
        chatInput.value = ""; // Clear text input
        chatInput.style.height = 'auto'; // Reset height
        chatInput.style.height = (chatInput.scrollHeight) + 'px'; // Adjust to new content (empty)
    }

    if (imageUploadInput && imageUploadInput.files[0]) { // If a file was part of the message
        const removeImageBtn = document.getElementById('remove-image-btn');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const imagePreview = document.getElementById('image-preview');

        imageUploadInput.value = ''; // Clear the file input
        if(imagePreview) imagePreview.src = '#';
        if(imagePreviewContainer) imagePreviewContainer.style.display = 'none';
        if(removeImageBtn) removeImageBtn.style.display = 'none';
    }
    
    // Focus input and manage image size selector visibility
    if (chatInput) chatInput.focus();
    
    const currentChatInputVal = chatInput ? chatInput.value.trim() : ""; // Should be empty now
    const currentImageFile = imageUploadInput && imageUploadInput.files[0] ? imageUploadInput.files[0] : null; // Should be null now

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
        // console.warn("Essential chat elements (send button or input) not found, initChat skipped.");
        return;
    }

    sendBtn.addEventListener('click', sendMessageHandler);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageHandler();
        }
    });
    chatInput.addEventListener('input', function() { // Auto-resize
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Logic for showing/hiding image size selector based on chat input
    chatInput.addEventListener('input', function() {
        const val = this.value;
        if (IMAGE_KEYWORDS.some(k => val.includes(k))) {
            if (typeof showImageSizeSelector === 'function') showImageSizeSelector();
        } else {
            const imageUploadInputElement = document.getElementById('image-upload-input');
            // Hide only if no image is selected
            if (imageUploadInputElement && !imageUploadInputElement.files[0]) {
                if (typeof hideImageSizeSelector === 'function') hideImageSizeSelector();
            } else if (!imageUploadInputElement) { // If no image upload input at all
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

    imageUploadLabel.addEventListener('click', () => imageUploadInput.click());

    imageUploadInput.addEventListener('change', function() {
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
        // 只要有文件就显示尺寸选择器
        if (file && typeof showImageSizeSelector === 'function') showImageSizeSelector();
        if (!file) {
            const chatInputVal = document.getElementById('chat-input') ? document.getElementById('chat-input').value : "";
            if (!IMAGE_KEYWORDS.some(k => chatInputVal.includes(k))) {
                if (typeof hideImageSizeSelector === 'function') hideImageSizeSelector();
            }
        }
    });

    removeImageBtn.addEventListener('click', function() {
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
    // Initialize language settings first
    if (typeof setLanguage === 'function') {
        setLanguage(currentLang || 'zh'); 
    }

    // Initialize other components
    loadChatHistory(); 

    // Only initialize chat-specific functions if chat elements are present
    if (document.getElementById('chat-input')) {
        initChat(); 
        initScenarioButtons(); // Scenario buttons are also part of the main chat interface
        initImageUpload(); // Image upload is also part of the main chat interface
    }
    
    initDynamicRatings(); // For reviews page (and potentially other pages if ratings are shown)

    // Reviews page specific initializations
    if (document.querySelector('.reviews-container')) {
        initVerticalMarqueeReviews();
        initMarqueeHoverPause();
    }

    // Add language toggle listener (should be global if button is on multiple pages)
    const langToggleBtn = document.getElementById('lang-toggle-btn');
    if (langToggleBtn && typeof toggleLanguage === 'function') {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }

    // Language initialization
    const savedLang = localStorage.getItem('language') || 'zh';
    setLanguage(savedLang); // Apply translations first
    initializeAllTypewriters(); // Then initialize typewriters with translated text
    
    // Global effects - should be initialized after specific page initializations 
    // to avoid being blocked by errors, but also ensure they run on all pages.
    initPageParticles(); // Initialize page particles effect
    initCustomPointer(); // Initialize custom mouse pointer
    initImageSizeSelector();
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

function sendMessage(messageText, file) {
    // 发送前先显示用户消息
    if (messageText) {
        addMessage(messageText, 'user');
    }
    // AI思考中提示
    addMessage('<i class="fas fa-spinner fa-spin"></i> AI思考中...', 'ai-thinking');

    // 构造请求体
    let url = '';
    let body = {};
    let isImage = false;
    if (currentScenario === 'aipainting') {
        url = BASE_API_URL + '/api/image/generate';
        body = {
            prompt: messageText,
            size: currentImageSize,
            scenario: 'aipainting',
            conversationId: currentConversationId
        };
        isImage = true;
    } else {
        url = BASE_API_URL + '/api/chat';
        body = {
            message: messageText,
            scenario: currentScenario,
            conversationId: currentConversationId
        };
    }

    // 发送请求
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
        removeThinkingMessage();
        if (data.error) {
            addMessage('❌ ' + (data.error || 'AI服务异常'), 'ai');
            return;
        }
        if (isImage && data.reply) {
            // AI绘画
            addMessage(data.reply, 'ai', false, 'image');
        } else if (data.reply) {
            addMessage(data.reply, 'ai');
        } else {
            addMessage('AI无回复', 'ai');
        }
        if (data.conversationId) {
            currentConversationId = data.conversationId;
        }
        loadChatHistory(); // 刷新历史
    })
    .catch(err => {
        removeThinkingMessage();
        addMessage('❌ 网络错误或服务器异常', 'ai');
    });
} 
 