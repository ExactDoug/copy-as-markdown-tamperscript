Copy Selection as GitHub Flavored Markdown (GFM) - Tampermonkey Script
======================================================================

Description
-----------

This Tampermonkey userscript allows you to select any content on a webpage and copy it to your clipboard as well-formatted GitHub Flavored Markdown (GFM). It aims to simplify the process of pasting web content into GitHub issues, pull requests, comments, wikis, Markdown files, or any other platform that supports GFM.

The script uses the `turndown` library and its GFM plugin for robust HTML-to-Markdown conversion and attempts to embed images directly into the Markdown using Base64 encoding. It provides feedback on any images that couldn't be converted successfully and includes a user-friendly configuration panel.

Features
--------

-   **HTML to GFM Conversion:** Converts selected HTML content into GitHub Flavored Markdown.
-   **Multiple Access Methods:**
    -   **Keyboard Shortcut:** Trigger the copy operation using the keyboard shortcut `Alt+Shift+C` (customizable).
    -   **Floating Button:** A context-aware button appears near your selection.
    -   **Context Menu:** Access via the Tampermonkey menu.
-   **Smart Content Processing:**
    -   **Intelligent Code Block Handling:** Preserves indentation and attempts to detect programming languages.
    -   **Table Improvements:** Automatically handles missing headers and preserves formatting.
    -   **List Structure Preservation:** Maintains proper nesting and formatting of lists.
-   **Comprehensive GFM Support:** Preserves common HTML structures like:
    -   Headings (`# H1`, `## H2`, etc.)
    -   Lists (ordered and unordered)
    -   Links
    -   Code blocks (fenced)
    -   Tables (using GFM table syntax)
    -   Emphasis (bold, italic)
    -   Strikethrough
    -   Task lists
-   **Advanced Image Handling:** 
    -   **Smart Image Conversion:** Converts images to Base64 with size limits to prevent overly large clipboard content.
    -   **Failover Mechanism:** Falls back to original URLs when images can't be converted.
    -   **Retry Logic:** Automatically attempts to retry failed image conversions.
    -   **Progress Tracking:** Shows real-time progress for large selections with many images.
-   **Performance Optimizations:** 
    -   **Chunked Processing:** Handles large content in chunks to prevent UI freezing.
    -   **Size Detection:** Checks image sizes before attempting full downloads.
-   **Full User Customization:**
    -   **Configuration Panel:** Comprehensive settings accessible via the Tampermonkey menu.
    -   **Custom Appearance:** Configurable button colors and behavior.
    -   **Feature Toggles:** Enable/disable specific features like the floating button or keyboard shortcut.
-   **Basic HTML Sanitization:** Removes `<script>` tags from the selection before conversion.
-   **Clipboard Integration:** Automatically copies the generated Markdown to the clipboard.
-   **Enhanced User Feedback:** 
    -   **Detailed Notifications:** Shows processing status with conversion statistics.
    -   **Progress Updates:** Provides updates for large content processing.
-   **Accessibility Features:**
    -   **Keyboard Navigation:** Floating button is fully keyboard accessible.
    -   **ARIA Support:** Includes proper ARIA attributes for screen readers.
    -   **Cross-Browser Compatibility:** Works across all major browsers with fallback mechanisms.

Installation & Usage
--------------------

1.  **Install Tampermonkey:** Ensure you have the [Tampermonkey](https://www.tampermonkey.net/) browser extension (or a compatible userscript manager like Greasemonkey or Violentmonkey) installed.
2.  **Install the Script:**
    -   Open the Tampermonkey dashboard in your browser.
    -   Click the "+" tab to create a new script.
    -   Copy the entire script code from the `Copy Selection as GitHub Flavored Markdown.user.js` file.
    -   Paste the code into the Tampermonkey editor, replacing any default content.
    -   Save the script (File > Save or click the save icon).
3.  **Grant Permissions:** Tampermonkey will likely ask you to grant permissions for:
    -   `GM_setClipboard`: To copy text to the clipboard.
    -   `GM_notification`: To show status notifications.
    -   `GM_getValue`/`GM_setValue`: To store your configuration preferences.
    -   `GM_registerMenuCommand`: To add the configuration panel and context menu.
    -   `GM_xmlhttpRequest` and `@connect *`: To fetch images from potentially any domain. Review these permissions before accepting.
4.  **Basic Usage:**
    -   Navigate to any webpage.
    -   Select the content you want to copy.
    -   Either:
        -   Press `Alt+Shift+C` (default keyboard shortcut)
        -   Click the "Copy as MD" floating button that appears near your selection
        -   Use the Tampermonkey menu → "Copy Selection as GFM"
    -   The script will process the selection, attempt image conversion, and copy the resulting GFM to your clipboard.
    -   A notification will confirm success with conversion statistics.
5.  **Configuration:**
    -   Access the configuration panel via the Tampermonkey menu → "Configure Copy as GFM"
    -   Customize settings like:
        -   Enable/disable keyboard shortcut or floating button
        -   Set maximum image size for conversion
        -   Configure retry attempts for image fetching
        -   Customize button appearance and timing
        -   Adjust performance settings for large content

Dependencies
------------

This script relies on the following external libraries, loaded via `@require`:
-   **Turndown:** Core HTML-to-Markdown conversion library. (`https://unpkg.com/turndown/dist/turndown.js`)
-   **Turndown GFM Plugin:** Adds GitHub Flavored Markdown features (tables, task lists, etc.) to Turndown. (`https://unpkg.com/turndown-plugin-gfm/dist/turndown-plugin-gfm.js`)

Known Limitations & Notes
-------------------------
-   **Image Fetching Limitations:** Some images may not convert due to:
    -   Cross-origin (CORS) security restrictions
    -   Size limits (configurable, default 1MB)
    -   Network issues
    In these cases, the original image URL will be used in the Markdown instead of Base64 data.
-   **Base64 Size Considerations:** Embedding images as Base64 can significantly increase the size of the copied text. The script now includes size limits and notifications about conversion success.
-   **Complex/Non-Standard HTML:** While the script includes content-aware processing for common patterns, extremely complex layouts or custom HTML elements might not convert perfectly.
-   **Basic Sanitization:** Only `<script>` tags are removed. Other potentially unwanted elements are preserved but converted to markdown.
-   **Large Selections:** Very large selections with many images will be processed in chunks to prevent UI freezing, but may still take time to complete.

Possible Future Enhancements
-------------------------------

Some potential future improvements could include:
-   **Additional Markdown Flavors:** Support for other Markdown variants beyond GitHub Flavored Markdown.
-   **Extended Site-Specific Rules:** More specialized handling for popular websites with unique HTML structures.
-   **Advanced HTML Sanitization:** More comprehensive options to remove unwanted styles, attributes, or elements.
-   **Table of Contents Generation:** Option to automatically generate a Markdown Table of Contents based on headings.
-   **Image Compression:** Client-side compression options for large images before Base64 conversion.
-   **Link Processing Options:** Settings for how links are handled (absolute/relative, link text options).
-   **Layout Preservation:** Better handling of complex layouts like multiple columns.