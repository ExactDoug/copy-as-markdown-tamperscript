// ==UserScript==
// @name         Copy Selection as GitHub Flavored Markdown (GFM)
// @namespace    https://github.com/ExactDoug/copy-as-markdown-tamperscript
// @version      2.0
// @description  Copies selected HTML content as GFM to the clipboard. Trigger via Alt+Shift+C, context menu, or optional floating button. Attempts to convert images to Base64.
// @author       @Gemini
// @homepageURL  https://github.com/ExactDoug/copy-as-markdown-tamperscript
// @supportURL   https://github.com/ExactDoug/copy-as-markdown-tamperscript/issues
// @downloadURL  https://raw.githubusercontent.com/ExactDoug/copy-as-markdown-tamperscript/main/Copy-Selection-as-GFM-Markdown.user.js
// @updateURL    https://raw.githubusercontent.com/ExactDoug/copy-as-markdown-tamperscript/main/Copy-Selection-as-GFM-Markdown.user.js
// @match        *://*/*
// @require      https://unpkg.com/turndown/dist/turndown.js
// @require      https://unpkg.com/turndown-plugin-gfm/dist/turndown-plugin-gfm.js
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    // Get saved user preferences or use defaults
    const CONFIG = {
        enableKeyboardShortcut: GM_getValue('enableKeyboardShortcut', true),
        enableFloatingButton: GM_getValue('enableFloatingButton', true),
        keyboardShortcut: GM_getValue('keyboardShortcut', {
            altKey: true,
            shiftKey: true,
            key: 'C' // Alt+Shift+C
        }),
        convertImages: GM_getValue('convertImages', true),
        maxImageSize: GM_getValue('maxImageSize', 1000000), // 1MB default limit
        maxRetries: GM_getValue('maxRetries', 2),
        buttonColor: GM_getValue('buttonColor', '#333'),
        buttonTextColor: GM_getValue('buttonTextColor', 'white'),
        buttonTimeout: GM_getValue('buttonTimeout', 4000), // Hide button after 4 seconds
        processingChunkSize: GM_getValue('processingChunkSize', 20) // Process 20 items at a time
    };

    // --- Turndown Service Initialization ---
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '*',
        codeBlockStyle: 'fenced',
        emDelimiter: '*'
    });
    turndownService.use(turndownPluginGfm.gfm);

    // --- Floating Button Elements & State ---
    let floatingButton = null;
    let buttonTimeout = null; // To hide button after a delay
    
    // --- Configuration Panel Setup ---
    function setupConfigPanel() {
        GM_registerMenuCommand("Configure Copy as GFM", showConfigDialog);
        GM_registerMenuCommand("Copy Selection as GFM", copySelectionAsMarkdown);
    }
    
    /**
     * Shows a configuration dialog for the user to adjust script settings.
     */
    function showConfigDialog() {
        // Create dialog elements
        const dialog = document.createElement('div');
        dialog.id = 'gfm-config-dialog';
        
        // Set inner HTML safely using a safer approach for CSP environments
        const dialogContent = document.createElement('div');
        dialogContent.className = 'gfm-config-header';
        const headerTitle = document.createElement('h2');
        headerTitle.textContent = 'Copy as GFM Settings';
        const closeButton = document.createElement('button');
        closeButton.id = 'gfm-config-close';
        closeButton.textContent = '×';
        dialogContent.appendChild(headerTitle);
        dialogContent.appendChild(closeButton);
        dialog.appendChild(dialogContent);
        
        // Create dialog body
        const dialogBody = document.createElement('div');
        dialogBody.className = 'gfm-config-body';
        
        // Create checkbox options
        createConfigOption(dialogBody, 'checkbox', 'gfm-keyboard-shortcut', 'Enable keyboard shortcut (Alt+Shift+C)', CONFIG.enableKeyboardShortcut);
        createConfigOption(dialogBody, 'checkbox', 'gfm-floating-button', 'Enable floating button', CONFIG.enableFloatingButton);
        createConfigOption(dialogBody, 'checkbox', 'gfm-convert-images', 'Convert images to Base64', CONFIG.convertImages);
        
        // Number inputs
        createConfigOption(dialogBody, 'number', 'gfm-max-image-size', 'Max image size (bytes):', CONFIG.maxImageSize, 1000, 10000000);
        createConfigOption(dialogBody, 'number', 'gfm-max-retries', 'Max retries for image fetch:', CONFIG.maxRetries, 0, 5);
        createConfigOption(dialogBody, 'number', 'gfm-button-timeout', 'Button hide timeout (ms):', CONFIG.buttonTimeout, 1000, 10000, 500);
        
        // Color inputs
        createConfigOption(dialogBody, 'color', 'gfm-button-color', 'Button color:', CONFIG.buttonColor);
        createConfigOption(dialogBody, 'color', 'gfm-button-text-color', 'Button text color:', CONFIG.buttonTextColor);
        
        // Processing option with info text
        const chunkOption = createConfigOption(dialogBody, 'number', 'gfm-chunk-size', 'Processing chunk size:', CONFIG.processingChunkSize, 5, 100);
        const infoSpan = document.createElement('span');
        infoSpan.className = 'gfm-info';
        infoSpan.textContent = 'Lower values for smoother processing of large content';
        chunkOption.appendChild(infoSpan);
        
        // Action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'gfm-config-actions';
        
        const saveButton = document.createElement('button');
        saveButton.id = 'gfm-config-save';
        saveButton.textContent = 'Save';
        
        const resetButton = document.createElement('button');
        resetButton.id = 'gfm-config-reset';
        resetButton.textContent = 'Reset to Defaults';
        
        actionsDiv.appendChild(saveButton);
        actionsDiv.appendChild(resetButton);
        dialogBody.appendChild(actionsDiv);
        
        dialog.appendChild(dialogBody);
        
        // Add styles for the dialog
        GM_addStyle(`
            #gfm-config-dialog {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                z-index: 100000;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                border-radius: 8px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                width: 450px;
                max-width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
            }
            .gfm-config-header {
                padding: 10px 15px;
                background: #f5f5f5;
                border-bottom: 1px solid #ddd;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 8px 8px 0 0;
            }
            .gfm-config-header h2 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }
            #gfm-config-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
            }
            .gfm-config-body {
                padding: 15px;
            }
            .gfm-config-option {
                margin-bottom: 12px;
            }
            .gfm-config-option label {
                display: block;
                margin-bottom: 4px;
                font-weight: 500;
            }
            .gfm-config-option input[type="number"],
            .gfm-config-option input[type="color"] {
                padding: 5px;
                border: 1px solid #ddd;
                border-radius: 4px;
                width: 100%;
            }
            .gfm-info {
                font-size: 12px;
                color: #666;
                display: block;
                margin-top: 2px;
            }
            .gfm-config-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 15px;
            }
            .gfm-config-actions button {
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                border: 1px solid #ddd;
            }
            #gfm-config-save {
                background: #4CAF50;
                color: white;
                border-color: #4CAF50;
            }
            #gfm-config-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 99999;
            }
        `);
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'gfm-config-overlay';
        
        // Add to DOM
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);
        
        // Setup event listeners
        document.getElementById('gfm-config-close').addEventListener('click', closeConfigDialog);
        document.getElementById('gfm-config-save').addEventListener('click', saveConfig);
        document.getElementById('gfm-config-reset').addEventListener('click', resetConfig);
        overlay.addEventListener('click', closeConfigDialog);
        
        // Function to close dialog
        function closeConfigDialog() {
            dialog.remove();
            overlay.remove();
        }
        
        // Function to save settings
        function saveConfig() {
            const newConfig = {
                enableKeyboardShortcut: document.getElementById('gfm-keyboard-shortcut').checked,
                enableFloatingButton: document.getElementById('gfm-floating-button').checked,
                convertImages: document.getElementById('gfm-convert-images').checked,
                maxImageSize: parseInt(document.getElementById('gfm-max-image-size').value),
                maxRetries: parseInt(document.getElementById('gfm-max-retries').value),
                buttonTimeout: parseInt(document.getElementById('gfm-button-timeout').value),
                buttonColor: document.getElementById('gfm-button-color').value,
                buttonTextColor: document.getElementById('gfm-button-text-color').value,
                processingChunkSize: parseInt(document.getElementById('gfm-chunk-size').value),
                // Keep existing values for other settings
                keyboardShortcut: CONFIG.keyboardShortcut
            };
            
            // Save each setting to GM storage
            for (const [key, value] of Object.entries(newConfig)) {
                GM_setValue(key, value);
            }
            
            // Update current config
            Object.assign(CONFIG, newConfig);
            
            // Apply visual changes
            applyButtonStyles();
            
            // Notification
            GM_notification({
                text: 'Settings saved',
                title: 'Copy as Markdown',
                timeout: 2000
            });
            
            // Close dialog
            closeConfigDialog();
            
            // Reload event listeners
            setupEventListeners();
        }
        
        // Function to reset to defaults
        function resetConfig() {
            const defaultConfig = {
                enableKeyboardShortcut: true,
                enableFloatingButton: true,
                keyboardShortcut: {
                    altKey: true,
                    shiftKey: true,
                    key: 'C'
                },
                convertImages: true,
                maxImageSize: 1000000,
                maxRetries: 2,
                buttonColor: '#333',
                buttonTextColor: 'white',
                buttonTimeout: 4000,
                processingChunkSize: 20
            };
            
            // Update form values
            document.getElementById('gfm-keyboard-shortcut').checked = defaultConfig.enableKeyboardShortcut;
            document.getElementById('gfm-floating-button').checked = defaultConfig.enableFloatingButton;
            document.getElementById('gfm-convert-images').checked = defaultConfig.convertImages;
            document.getElementById('gfm-max-image-size').value = defaultConfig.maxImageSize;
            document.getElementById('gfm-max-retries').value = defaultConfig.maxRetries;
            document.getElementById('gfm-button-timeout').value = defaultConfig.buttonTimeout;
            document.getElementById('gfm-button-color').value = defaultConfig.buttonColor;
            document.getElementById('gfm-button-text-color').value = defaultConfig.buttonTextColor;
            document.getElementById('gfm-chunk-size').value = defaultConfig.processingChunkSize;
        }
    }
    
    /**
     * Helper to create config options
     */
    function createConfigOption(parent, type, id, labelText, value, min, max, step) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'gfm-config-option';
        
        if (type === 'checkbox') {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = id;
            input.checked = value;
            label.appendChild(input);
            label.appendChild(document.createTextNode(' ' + labelText));
            optionDiv.appendChild(label);
        } else {
            const label = document.createElement('label');
            label.setAttribute('for', id);
            label.textContent = labelText;
            optionDiv.appendChild(label);
            
            const input = document.createElement('input');
            input.type = type;
            input.id = id;
            input.value = value;
            
            if (type === 'number') {
                if (min !== undefined) input.min = min;
                if (max !== undefined) input.max = max;
                if (step !== undefined) input.step = step;
            }
            
            optionDiv.appendChild(input);
        }
        
        parent.appendChild(optionDiv);
        return optionDiv;
    }
        
    /**
     * Applies current button style settings from config
     */
    function applyButtonStyles() {
        GM_addStyle(`
            #gm-copy-markdown-button {
                position: absolute;
                display: none;
                z-index: 99999;
                padding: 5px 8px;
                background-color: ${CONFIG.buttonColor};
                color: ${CONFIG.buttonTextColor};
                border: 1px solid ${adjustColor(CONFIG.buttonColor, 20)};
                border-radius: 4px;
                font-family: sans-serif;
                font-size: 12px;
                cursor: pointer;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
                white-space: nowrap;
            }
            #gm-copy-markdown-button:hover {
                background-color: ${adjustColor(CONFIG.buttonColor, -20)};
            }
        `);
    }
    
    /**
     * Helper function to lighten/darken colors for button styling
     */
    function adjustColor(color, amount) {
        return '#' + color.replace(/^#/, '').replace(/../g, color => 
            ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
        );
    }

    // --- Helper Functions ---

    /**
     * Fetches image data and converts it to a Base64 Data URL with retry logic.
     * Uses GM_xmlhttpRequest for potentially cross-origin requests.
     * @param {string} url - The URL of the image to fetch.
     * @param {number} attemptNumber - Current attempt number (for retry logic)
     * @returns {Promise<string>} A promise that resolves with the Base64 Data URL or rejects on error.
     */
    function imageToBase64(url, attemptNumber = 1) {
        return new Promise(async (resolve, reject) => {
            // Check if image conversion is enabled in config
            if (!CONFIG.convertImages) {
                return reject(new Error('Image conversion disabled in settings'));
            }
            
            // Basic validation for URL format
            try {
                new URL(url); // Check if it's a valid URL structure
            } catch (e) {
                return reject(new Error(`Invalid image URL: ${url}`));
            }
            
            // First check image size via HEAD request if possible
            try {
                const headResult = await checkImageSize(url);
                if (!headResult.success) {
                    return reject(new Error(headResult.reason));
                }
            } catch (error) {
                console.warn(`Could not check image size (will still try to fetch): ${error.message}`);
                // Continue anyway, the actual GET request might still succeed
            }

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                timeout: 10000, // Add a timeout (10 seconds)
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300 && response.response) {
                        // Check if the blob is too large
                        if (response.response.size > CONFIG.maxImageSize) {
                            return reject(new Error(`Image too large (${Math.round(response.response.size/1024)}KB > ${Math.round(CONFIG.maxImageSize/1024)}KB)`));
                        }
                        
                        const reader = new FileReader();
                        reader.onloadend = function() {
                            if (reader.result) {
                                resolve(reader.result); // Resolves with base64 data URL
                            } else {
                                reject(new Error('FileReader resulted in null.'));
                            }
                        };
                        reader.onerror = function(error) {
                            console.error("FileReader error:", error);
                            reject(new Error('FileReader error converting blob.'));
                        };
                        // Ensure response.response is a Blob before reading
                        if (response.response instanceof Blob) {
                             reader.readAsDataURL(response.response);
                        } else {
                             reject(new Error('Response was not a Blob.'));
                        }
                    } else {
                        console.error(`Failed to fetch image: ${response.status} ${response.statusText}`, response);
                        handleRetry(url, attemptNumber, reject, `Failed to fetch image: ${response.status}. URL: ${url.substring(0,100)}...`);
                    }
                },
                onerror: function(error) {
                    console.error("GM_xmlhttpRequest error:", error);
                    handleRetry(url, attemptNumber, reject, `Network error fetching image. URL: ${url.substring(0,100)}...`);
                },
                ontimeout: function() {
                    console.error("GM_xmlhttpRequest timeout");
                    handleRetry(url, attemptNumber, reject, `Request timed out fetching image. URL: ${url.substring(0,100)}...`);
                }
            });
        });
    }
    
    /**
     * Helper function to check image size before fetching full image
     * @param {string} url - URL of the image to check
     * @returns {Promise<{success: boolean, reason: string}>} - Result of size check
     */
    function checkImageSize(url) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'HEAD',
                url: url,
                timeout: 5000,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        const contentLength = response.responseHeaders.match(/content-length:\s*(\d+)/i);
                        if (contentLength && contentLength[1]) {
                            const size = parseInt(contentLength[1], 10);
                            if (size > CONFIG.maxImageSize) {
                                resolve({
                                    success: false,
                                    reason: `Image too large (${Math.round(size/1024)}KB > ${Math.round(CONFIG.maxImageSize/1024)}KB)`
                                });
                                return;
                            }
                        }
                        resolve({ success: true });
                    } else {
                        resolve({ success: true }); // Continue anyway, let the GET request try
                    }
                },
                onerror: function() {
                    resolve({ success: true }); // Continue anyway, let the GET request try
                },
                ontimeout: function() {
                    resolve({ success: true }); // Continue anyway, let the GET request try
                }
            });
        });
    }
    
    /**
     * Handler for image fetching retries
     */
    function handleRetry(url, attemptNumber, reject, errorMessage) {
        if (attemptNumber < CONFIG.maxRetries) {
            console.log(`Retrying image fetch (${attemptNumber+1}/${CONFIG.maxRetries}): ${url}`);
            // Wait a bit longer for each retry
            setTimeout(() => {
                imageToBase64(url, attemptNumber + 1)
                    .then(result => {
                        // We can't call resolve directly here since it's not in scope
                        // The promise chain is handled in the imageToBase64 function
                        return result;
                    })
                    .catch(error => reject(error));
            }, 500 * attemptNumber);
        } else {
            reject(new Error(errorMessage));
        }
    }

    /**
     * Pre-processes HTML to improve conversion quality
     * Handles special cases for code blocks, tables, etc.
     * @param {HTMLElement} container - The container element with HTML content
     * @returns {HTMLElement} - The processed container
     */
    function preProcessHtml(container) {
        // Fix code blocks (Stack Overflow, GitHub, etc.)
        container.querySelectorAll('pre code').forEach(codeBlock => {
            // Preserve indentation
            codeBlock.innerHTML = codeBlock.innerHTML
                .replace(/&nbsp;/g, ' ')
                .replace(/<br\s*\/?>/g, '\n');
                
            // Try to detect language
            const classes = Array.from(codeBlock.classList || []);
            const langClass = classes.find(c => c.startsWith('language-') || c.startsWith('lang-'));
            if (langClass) {
                const lang = langClass.replace(/^(language-|lang-)/, '');
                codeBlock.setAttribute('data-language', lang);
            }
        });
        
        // Improve table rendering
        container.querySelectorAll('table').forEach(table => {
            // Add class for better turndown processing
            table.classList.add('gfm-table');
            
            // Ensure tables have headers if they're missing
            const firstRow = table.querySelector('tr');
            if (firstRow) {
                const hasHeader = table.querySelector('th') !== null;
                if (!hasHeader && firstRow.cells.length > 0) {
                    // Convert first row to header row if no headers exist
                    Array.from(firstRow.cells).forEach(cell => {
                        const th = document.createElement('th');
                        th.innerHTML = cell.innerHTML;
                        cell.replaceWith(th);
                    });
                }
            }
        });
        
        // Handle special cases for lists
        container.querySelectorAll('ul, ol').forEach(list => {
            // Fix nested lists formatting
            list.querySelectorAll('ul, ol').forEach(nestedList => {
                const parent = nestedList.parentElement;
                if (parent.tagName === 'LI') {
                    // Make sure there's spacing for proper nesting in markdown
                    const spacer = document.createElement('span');
                    spacer.innerHTML = '&nbsp;';
                    parent.insertBefore(spacer, nestedList);
                }
            });
        });
        
        // Fix blockquotes with multiple paragraphs
        container.querySelectorAll('blockquote').forEach(quote => {
            const paragraphs = quote.querySelectorAll('p');
            if (paragraphs.length > 1) {
                paragraphs.forEach((p, index) => {
                    if (index > 0) {
                        // Add a special marker to indicate paragraph separation in blockquotes
                        const marker = document.createElement('span');
                        marker.classList.add('blockquote-paragraph-break');
                        marker.innerHTML = '\n\n> ';
                        p.parentNode.insertBefore(marker, p);
                    }
                });
            }
        });
        
        return container;
    }

    /**
     * Processes the selected HTML fragment with optimizations for large content.
     * 1. Content-aware pre-processing
     * 2. Sanitizes by removing script tags
     * 3. Processes images in chunks to avoid UI freezing
     * 
     * @param {DocumentFragment} fragment - The selected document fragment.
     * @param {Object} processingNotification - Notification object for updates
     * @returns {Promise<{html: string, failedImages: number, totalImages: number}>} Result with processed HTML and stats
     */
    async function processSelectedHtml(fragment, processingNotification) {
        const container = document.createElement('div');
        container.appendChild(fragment.cloneNode(true));

        // 1. Basic Sanitization: Remove script tags
        container.querySelectorAll('script').forEach(script => script.remove());
        
        // 2. Content-aware preprocessing
        preProcessHtml(container);

        // 3. Process Images: Convert src to Base64 in chunks
        const images = Array.from(container.querySelectorAll('img'));
        let failedImages = 0;
        let processedCount = 0;
        
        // If no images, just return the HTML
        if (images.length === 0) {
            return {
                html: container.innerHTML,
                failedImages: 0,
                totalImages: 0
            };
        }
        
        // Process images in chunks to avoid freezing UI
        const chunkSize = CONFIG.processingChunkSize;
        
        for (let i = 0; i < images.length; i += chunkSize) {
            const chunk = images.slice(i, i + chunkSize);
            
            // Update notification if possible
            if (processingNotification && typeof processingNotification.update === 'function') {
                processingNotification.update({
                    text: `Processing images (${processedCount}/${images.length})...`
                });
            }
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Process this chunk of images
            const chunkPromises = chunk.map(async (img) => {
                const originalSrc = img.getAttribute('src');
                // Only process non-data URLs and valid-looking URLs
                if (originalSrc && !originalSrc.startsWith('data:') && (originalSrc.startsWith('http') || originalSrc.startsWith('/'))) {
                    let absoluteSrc;
                    try {
                        // Resolve relative URLs carefully
                        absoluteSrc = new URL(originalSrc, window.location.href).href;
                    } catch (e) {
                        console.warn(`Invalid original image src: ${originalSrc}`);
                        failedImages++;
                        return;
                    }

                    try {
                        console.log(`Attempting to fetch image: ${absoluteSrc}`);
                        const base64Src = await imageToBase64(absoluteSrc);
                        img.setAttribute('src', base64Src);
                        img.setAttribute('data-original-src', absoluteSrc);
                        console.log(`Successfully converted image to Base64: ${absoluteSrc.substring(0, 50)}...`);
                    } catch (error) {
                        console.warn(`Could not convert image to Base64 (${originalSrc}):`, error.message);
                        // Keep the original resolved absolute src if conversion fails but URL was valid
                        img.setAttribute('src', absoluteSrc);
                        failedImages++;
                    }
                } else if (originalSrc && !originalSrc.startsWith('data:')) {
                    console.warn(`Skipping image with potentially invalid or relative src: ${originalSrc}`);
                    failedImages++;
                }
            });
            
            await Promise.allSettled(chunkPromises);
            processedCount += chunk.length;
        }

        return {
            html: container.innerHTML,
            failedImages: failedImages,
            totalImages: images.length
        };
    }


    /**
     * Copies the selected content as Markdown.
     * Also hides the floating button after execution.
     */
    async function copySelectionAsMarkdown() {
        // Hide button immediately on action
        hideFloatingButton();

        // Get the current selection with fallbacks for different browsers
        const selection = getSelectionWithFallback();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            console.log('No text selected for Markdown copy.');
            GM_notification({ text: 'No text selected.', title: 'Copy as Markdown', timeout: 2000 });
            return;
        }

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();

        // Create processing notification with ability to update
        const processingNotification = GM_notification({
            text: 'Processing selection...',
            title: 'Copy as Markdown',
            silent: true,
            timeout: 0 // Don't auto-close
        });

        try {
            // Process the HTML with our enhanced function
            const processResult = await processSelectedHtml(fragment, processingNotification);
            const markdown = turndownService.turndown(processResult.html);

            // Copy to clipboard
            GM_setClipboard(markdown, 'text');

            // Close processing notification early
            if (processingNotification && processingNotification.close) processingNotification.close();

            // Create success message with image conversion stats
            let successMessage = 'Selected content copied as Markdown!';
            if (processResult.totalImages > 0) {
                const convertedImages = processResult.totalImages - processResult.failedImages;
                successMessage += ` (${convertedImages}/${processResult.totalImages} image${processResult.totalImages > 1 ? 's' : ''} converted)`;
            }

            GM_notification({
                text: successMessage,
                title: 'Copy as Markdown',
                timeout: 3000
            });
            console.log('Copied Markdown:', markdown);

        } catch (error) {
            // Close processing notification early
            if (processingNotification && processingNotification.close) processingNotification.close();

            console.error('Error copying as Markdown:', error);
            GM_notification({
                text: `Error: ${error.message}`,
                title: 'Copy as Markdown Failed',
                timeout: 5000
            });
        }
    }
    
    /**
     * Cross-browser compatible selection getter with fallbacks
     * @returns {Selection|null} The window selection object or null
     */
    function getSelectionWithFallback() {
        // Standard method
        if (window.getSelection) {
            return window.getSelection();
        }
        // IE fallback
        else if (document.selection && document.selection.createRange) {
            const range = document.selection.createRange();
            if (range && range.htmlText) {
                const selection = {
                    rangeCount: 1,
                    isCollapsed: range.htmlText === '',
                    getRangeAt: function() { return range; }
                };
                return selection;
            }
        }
        return null;
    }

    // --- Floating Button Logic ---

    /**
     * Creates the floating button element if it doesn't exist.
     * Includes accessibility improvements.
     */
    function createFloatingButton() {
        if (!CONFIG.enableFloatingButton || floatingButton) return;

        floatingButton = document.createElement('button');
        floatingButton.setAttribute('id', 'gm-copy-markdown-button');
        floatingButton.textContent = 'Copy as MD'; // Short text for the button
        
        // Accessibility improvements
        floatingButton.setAttribute('role', 'button');
        floatingButton.setAttribute('tabindex', '0');  // Make focusable with keyboard
        floatingButton.setAttribute('aria-label', 'Copy selection as GitHub Markdown');
        floatingButton.setAttribute('title', 'Copy selection as GitHub Markdown (Alt+Shift+C)');
        
        // Click handler with propagation stopped
        floatingButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from deselecting text
            copySelectionAsMarkdown();
        });
        
        // Keyboard handler for accessibility
        floatingButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {  // Space or Enter activates button
                e.preventDefault();
                copySelectionAsMarkdown();
            }
        });
        
        document.body.appendChild(floatingButton);
    }

    /**
     * Gets a reliable position for the Range with cross-browser compatibility
     * @param {Range} range - The selection range
     * @returns {DOMRect|null} - Rectangle for positioning or null if cannot be determined
     */
    function getRangePosition(range) {
        let rect = null;
        
        try {
            // First try standard method
            rect = range.getBoundingClientRect();
            
            // If the rect is empty, try getting client rects
            if (rect.width === 0 && rect.height === 0) {
                const rects = range.getClientRects();
                
                // Use the first non-empty rect
                for (let i = 0; i < rects.length; i++) {
                    if (rects[i].width > 0 || rects[i].height > 0) {
                        rect = rects[i];
                        break;
                    }
                }
                
                // If still no valid rect, try parent element
                if (rect.width === 0 && rect.height === 0) {
                    const container = range.commonAncestorContainer;
                    if (container) {
                        if (container.nodeType === Node.ELEMENT_NODE) {
                            rect = container.getBoundingClientRect();
                        } else if (container.parentElement) {
                            rect = container.parentElement.getBoundingClientRect();
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Error getting range position:', e);
            return null;
        }
        
        return (rect && rect.width > 0 && rect.height > 0) ? rect : null;
    }

    /**
     * Positions and shows the floating button near the selection range.
     * Improved with better browser compatibility and positioning algorithm.
     * @param {Range} range - The selected range.
     */
    function showFloatingButton(range) {
        if (!CONFIG.enableFloatingButton || !floatingButton) return;

        clearTimeout(buttonTimeout); // Cancel any pending hide timeout

        // Get position with better browser compatibility
        const rect = getRangePosition(range);
        if (!rect) {
            hideFloatingButton(); // Cannot determine position
            return;
        }

        // Position near the bottom-right of the selection, adjusting for viewport edges
        let top = window.scrollY + rect.bottom + 5; // 5px below selection
        let left = window.scrollX + rect.right - 100; // Approximate button width
        
        // Make sure the button is visible and positioned after DOM is updated
        setTimeout(() => {
            // Adjust if button goes off-screen
            if (left + floatingButton.offsetWidth > window.innerWidth) {
                left = window.innerWidth - floatingButton.offsetWidth - 10; // 10px margin from right edge
            }
            if (top + floatingButton.offsetHeight > window.innerHeight + window.scrollY) {
                top = window.scrollY + rect.top - floatingButton.offsetHeight - 5; // Place above if not enough space below
            }
            if (left < 0) left = 10; // 10px margin from left edge
            if (top < 0) top = 10; // 10px margin from top edge

            floatingButton.style.top = `${top}px`;
            floatingButton.style.left = `${left}px`;
            floatingButton.style.display = 'block'; // Make it visible
        }, 0);

        // Set a timeout to hide the button if selection doesn't change for a while
        clearTimeout(buttonTimeout);
        buttonTimeout = setTimeout(hideFloatingButton, CONFIG.buttonTimeout);
    }

    /**
     * Hides the floating button.
     */
    function hideFloatingButton() {
        if (floatingButton) {
            floatingButton.style.display = 'none';
        }
        clearTimeout(buttonTimeout);
    }

    /**
     * Handles selection changes to show/hide the button.
     * Improved with better element checks and accessibility considerations.
     */
    function handleSelectionChange() {
        if (!CONFIG.enableFloatingButton) return;

        const selection = getSelectionWithFallback();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // Don't show button inside inputs or if selection is too small
            try {
                // Check if the selection is primarily text-like content
                const container = range.commonAncestorContainer;
                
                // Don't show in editable areas
                if (isEditableElement(container)) {
                    hideFloatingButton();
                    return;
                }
                
                showFloatingButton(range);
            } catch (e) {
                console.warn("Error handling selection change:", e);
                // On error, still try to show button if we can
                showFloatingButton(range);
            }
        } else {
            hideFloatingButton();
        }
    }
    
    /**
     * Determines if an element or its parent is an editable field
     * @param {Node} node - The node to check
     * @returns {boolean} - True if the node is in an editable field
     */
    function isEditableElement(node) {
        if (!node) return false;
        
        // If it's a text node, check its parent
        if (node.nodeType === Node.TEXT_NODE) {
            return isEditableElement(node.parentElement);
        }
        
        // Check if it's an element node
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Common editable elements
            if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(node.tagName)) {
                return true;
            }
            
            // Check contentEditable
            if (node.contentEditable === 'true') {
                return true;
            }
            
            // Check for code editors (common class names)
            const classes = node.className || '';
            if (typeof classes === 'string' && 
                (classes.includes('CodeMirror') || 
                 classes.includes('ace_editor') || 
                 classes.includes('monaco-editor'))) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Setup all event listeners based on current configuration
     */
    function setupEventListeners() {
        // Remove existing event listeners first
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('selectionchange', handleSelectionChange);
        document.removeEventListener('mouseup', handleSelectionChange);
        window.removeEventListener('scroll', hideFloatingButton, true);
        
        // Keyboard shortcut listener
        if (CONFIG.enableKeyboardShortcut) {
            document.addEventListener('keydown', handleKeyDown, true);
            console.log('Copy as Markdown: Keyboard shortcut enabled');
        } else {
            console.log('Copy as Markdown: Keyboard shortcut disabled');
        }

        // Floating button listeners
        if (CONFIG.enableFloatingButton) {
            // Create the button if it doesn't exist
            createFloatingButton();
            
            // Use selectionchange for modern browsers (more efficient)
            document.addEventListener('selectionchange', handleSelectionChange);
            
            // Fallback/additional check on mouseup
            document.addEventListener('mouseup', handleSelectionChange);
            
            // Hide button on scroll to avoid it looking detached
            window.addEventListener('scroll', hideFloatingButton, true);

            console.log('Copy as Markdown: Floating button enabled');
        } else {
            hideFloatingButton();
            console.log('Copy as Markdown: Floating button disabled');
        }
    }
    
    /**
     * Handler for keyboard shortcut
     */
    function handleKeyDown(event) {
        const shortcut = CONFIG.keyboardShortcut;
        if (event.altKey === shortcut.altKey &&
            event.shiftKey === shortcut.shiftKey &&
            event.key.toUpperCase() === shortcut.key) {

            event.preventDefault();
            event.stopPropagation();
            copySelectionAsMarkdown();
        }
    }

    // --- Script Initialization ---
    
    /**
     * Initialize the script
     */
    function init() {
        // Apply button styles
        applyButtonStyles();
        
        // Setup configuration panel
        setupConfigPanel();
        
        // Setup event listeners
        setupEventListeners();
    }
    
    // Start the script
    init();

})();
