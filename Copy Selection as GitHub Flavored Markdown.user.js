// ==UserScript==
// @name         Copy Selection as GitHub Flavored Markdown (GFM)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Copies selected HTML content as GFM to the clipboard. Trigger via Alt+Shift+C or optional floating button. Attempts to convert images to Base64.
// @author       @Gemini
// @match        *://*/*
// @require      https://unpkg.com/turndown/dist/turndown.js
// @require      https://unpkg.com/turndown-plugin-gfm/dist/turndown-plugin-gfm.js
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const ENABLE_KEYBOARD_SHORTCUT = true; // Set to false to disable Alt+Shift+C
    const ENABLE_FLOATING_BUTTON = true;  // Set to false to disable the floating button

    const KEYBOARD_SHORTCUT = {
        altKey: true,
        shiftKey: true,
        key: 'C' // Alt+Shift+C
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

    // --- Helper Functions ---

    /**
     * Fetches image data and converts it to a Base64 Data URL.
     * Uses GM_xmlhttpRequest for potentially cross-origin requests.
     * @param {string} url - The URL of the image to fetch.
     * @returns {Promise<string>} A promise that resolves with the Base64 Data URL or rejects on error.
     */
    function imageToBase64(url) {
        return new Promise((resolve, reject) => {
            // Basic validation for URL format
             try {
                new URL(url); // Check if it's a valid URL structure
            } catch (e) {
                return reject(new Error(`Invalid image URL: ${url}`));
            }

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                timeout: 10000, // Add a timeout (10 seconds)
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300 && response.response) {
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
                         reject(new Error(`Failed to fetch image: ${response.status}. URL: ${url.substring(0,100)}...`));
                    }
                },
                onerror: function(error) {
                    console.error("GM_xmlhttpRequest error:", error);
                    reject(new Error(`Network error fetching image. URL: ${url.substring(0,100)}...`));
                },
                ontimeout: function() {
                    console.error("GM_xmlhttpRequest timeout");
                    reject(new Error(`Request timed out fetching image. URL: ${url.substring(0,100)}...`));
                }
            });
        });
    }

    /**
     * Processes the selected HTML fragment:
     * 1. Sanitizes by removing script tags.
     * 2. Attempts to convert image srcs to Base64 Data URLs.
     * @param {DocumentFragment} fragment - The selected document fragment.
     * @returns {Promise<string>} A promise that resolves with the processed HTML string.
     */
    async function processSelectedHtml(fragment) {
        const container = document.createElement('div');
        container.appendChild(fragment.cloneNode(true));

        // 1. Basic Sanitization: Remove script tags
        container.querySelectorAll('script').forEach(script => script.remove());

        // 2. Process Images: Convert src to Base64
        const images = Array.from(container.querySelectorAll('img'));
        const imagePromises = images.map(async (img) => {
            const originalSrc = img.getAttribute('src');
            // Only process non-data URLs and valid-looking URLs
            if (originalSrc && !originalSrc.startsWith('data:') && (originalSrc.startsWith('http') || originalSrc.startsWith('/'))) {
                let absoluteSrc;
                 try {
                    // Resolve relative URLs carefully
                    absoluteSrc = new URL(originalSrc, window.location.href).href;
                } catch (e) {
                    console.warn(`Invalid original image src: ${originalSrc}`);
                    return; // Skip processing if URL is invalid
                }

                try {
                    console.log(`Attempting to fetch image: ${absoluteSrc}`);
                    const base64Src = await imageToBase64(absoluteSrc);
                    img.setAttribute('src', base64Src);
                    console.log(`Successfully converted image to Base64: ${absoluteSrc.substring(0, 50)}...`);
                } catch (error) {
                    console.warn(`Could not convert image to Base64 (${originalSrc}):`, error.message);
                    // Keep the original resolved absolute src if conversion fails but URL was valid
                    img.setAttribute('src', absoluteSrc);
                }
            } else if (originalSrc && !originalSrc.startsWith('data:')) {
                 console.warn(`Skipping image with potentially invalid or relative src: ${originalSrc}`);
            }
        });

        await Promise.allSettled(imagePromises);
        return container.innerHTML;
    }


    /**
     * Copies the selected content as Markdown.
     * Also hides the floating button after execution.
     */
    async function copySelectionAsMarkdown() {
        // Hide button immediately on action
        hideFloatingButton();

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            console.log('No text selected for Markdown copy.');
             GM_notification({ text: 'No text selected.', title: 'Copy as Markdown', timeout: 2000 });
            return;
        }

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();

        let notificationTimeout = 1500; // Default timeout for processing message
        let processingNotification = GM_notification({
             text: 'Processing selection...',
             title: 'Copy as Markdown',
             silent: true // Less intrusive
        });


        try {
            const processedHtml = await processSelectedHtml(fragment);
            const markdown = turndownService.turndown(processedHtml);

            GM_setClipboard(markdown, 'text');

            // Close processing notification early
            if (processingNotification && processingNotification.close) processingNotification.close();
            else notificationTimeout = 0; // Prevent it showing if already closed


            GM_notification({
                text: 'Selected content copied as Markdown!',
                title: 'Copy as Markdown',
                timeout: 3000
            });
            console.log('Copied Markdown:', markdown);

        } catch (error) {
             // Close processing notification early
            if (processingNotification && processingNotification.close) processingNotification.close();
             else notificationTimeout = 0;

            console.error('Error copying as Markdown:', error);
            GM_notification({
                text: `Error: ${error.message}`,
                title: 'Copy as Markdown Failed',
                timeout: 5000
            });
        }
    }

    // --- Floating Button Logic ---

    /**
     * Creates the floating button element if it doesn't exist.
     */
    function createFloatingButton() {
        if (!ENABLE_FLOATING_BUTTON || floatingButton) return;

        floatingButton = document.createElement('button');
        floatingButton.setAttribute('id', 'gm-copy-markdown-button');
        floatingButton.textContent = 'Copy as MD'; // Short text for the button
        floatingButton.addEventListener('click', (e) => {
             e.stopPropagation(); // Prevent click from deselecting text
             copySelectionAsMarkdown();
        });
        document.body.appendChild(floatingButton);
    }

    /**
     * Positions and shows the floating button near the selection range.
     * @param {Range} range - The selected range.
     */
    function showFloatingButton(range) {
        if (!ENABLE_FLOATING_BUTTON || !floatingButton) return;

        clearTimeout(buttonTimeout); // Cancel any pending hide timeout

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            // If rect is empty, try getting rect from parent element
            const parentRect = range.commonAncestorContainer.getBoundingClientRect ? range.commonAncestorContainer.getBoundingClientRect() : null;
             if (!parentRect || (parentRect.width === 0 && parentRect.height === 0)) {
                 hideFloatingButton(); // Cannot determine position
                 return;
             }
             // Use parentRect as fallback - less accurate
             Object.assign(rect, parentRect);
        }


        // Position near the bottom-right of the selection, adjusting for viewport edges
        let top = window.scrollY + rect.bottom + 5; // 5px below selection
        let left = window.scrollX + rect.right - floatingButton.offsetWidth; // Align right edge

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
     */
    function handleSelectionChange() {
        if (!ENABLE_FLOATING_BUTTON) return;

        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
             // Check if the selection is primarily text-like content
             const container = range.commonAncestorContainer;
             if (container && container.nodeType === Node.ELEMENT_NODE && ['INPUT', 'TEXTAREA'].includes(container.tagName)) {
                 // Don't show button inside input fields typically
                 hideFloatingButton();
                 return;
             }

            showFloatingButton(range);
            // Set a timeout to hide the button if selection doesn't change for a while
             clearTimeout(buttonTimeout);
             buttonTimeout = setTimeout(hideFloatingButton, 4000); // Hide after 4 seconds of inactivity

        } else {
            hideFloatingButton();
        }
    }

    // --- Event Listeners ---

    // Keyboard shortcut listener
    if (ENABLE_KEYBOARD_SHORTCUT) {
        document.addEventListener('keydown', function(event) {
            if (event.altKey === KEYBOARD_SHORTCUT.altKey &&
                event.shiftKey === KEYBOARD_SHORTCUT.shiftKey &&
                event.key.toUpperCase() === KEYBOARD_SHORTCUT.key) {

                event.preventDefault();
                event.stopPropagation();
                copySelectionAsMarkdown();
            }
        }, true); // Use capture phase
        console.log('Copy as Markdown: Keyboard shortcut (Alt+Shift+C) enabled.');
    } else {
        console.log('Copy as Markdown: Keyboard shortcut disabled.');
    }

    // Floating button listeners
    if (ENABLE_FLOATING_BUTTON) {
        // Create the button on script start
        createFloatingButton();
        // Use selectionchange for modern browsers (more efficient)
        document.addEventListener('selectionchange', handleSelectionChange);
        // Fallback/additional check on mouseup
        document.addEventListener('mouseup', handleSelectionChange);
         // Hide button on scroll to avoid it looking detached
         window.addEventListener('scroll', hideFloatingButton, true);


        console.log('Copy as Markdown: Floating button enabled.');
    } else {
         console.log('Copy as Markdown: Floating button disabled.');
    }


    // --- Styling for Floating Button ---
    if (ENABLE_FLOATING_BUTTON) {
        GM_addStyle(`
            #gm-copy-markdown-button {
                position: absolute; /* Positioned via JS */
                display: none; /* Hidden by default */
                z-index: 99999; /* High z-index to appear on top */
                padding: 5px 8px;
                background-color: #333;
                color: white;
                border: 1px solid #555;
                border-radius: 4px;
                font-family: sans-serif;
                font-size: 12px;
                cursor: pointer;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
                white-space: nowrap;
            }
            #gm-copy-markdown-button:hover {
                background-color: #555;
            }
        `);
    }

})();
