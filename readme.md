Copy Selection as GitHub Flavored Markdown (GFM) - Tampermonkey Script
======================================================================

Description
-----------

This Tampermonkey userscript allows you to select any content on a webpage and copy it to your clipboard as well-formatted GitHub Flavored Markdown (GFM). It aims to simplify the process of pasting web content into GitHub issues, pull requests, comments, wikis, Markdown files, or any other platform that supports GFM.

The script uses the `turndown` library and its GFM plugin for robust HTML-to-Markdown conversion and attempts to embed images directly into the Markdown using Base64 encoding.

Features
--------

-   **HTML to GFM Conversion:** Converts selected HTML content into GitHub Flavored Markdown.
    
-   **Keyboard Shortcut:** Trigger the copy operation using the keyboard shortcut `Alt+Shift+C`.
    
-   **GFM Support:** Preserves common HTML structures like:
    
    -   Headings (`# H1`, `## H2`, etc.)
        
    -   Lists (ordered and unordered)
        
    -   Links
        
    -   Code blocks (fenced)
        
    -   Tables (using GFM table syntax)
        
    -   Emphasis (bold, italic)
        
    -   Strikethrough
        
    -   Task lists
        
-   **Image Conversion (Attempted):** Tries to fetch images within the selection and convert them into Base64 Data URLs, embedding them directly into the Markdown. If fetching fails (e.g., due to cross-origin restrictions), the original image URL is kept.
    
-   **Basic HTML Sanitization:** Removes `<script>` tags from the selection before conversion.
    
-   **Clipboard Integration:** Automatically copies the generated Markdown to the clipboard.
    
-   **User Feedback:** Provides brief desktop notifications for processing status (starting, success, error).
    

Installation & Usage
--------------------

1.  **Install Tampermonkey:** Ensure you have the [Tampermonkey](https://www.tampermonkey.net/ "null") browser extension (or a compatible userscript manager like Greasemonkey or Violentmonkey) installed.
    
2.  **Install the Script:**
    
    -   Open the Tampermonkey dashboard in your browser.
        
    -   Click the "+" tab to create a new script.
        
    -   Copy the entire script code from the `tampermonkey_gfm_script_v1` file.
        
    -   Paste the code into the Tampermonkey editor, replacing any default content.
        
    -   Save the script (File > Save or click the save icon).
        
3.  **Grant Permissions:** Tampermonkey will likely ask you to grant permissions for:
    
    -   `GM_setClipboard`: To copy text to the clipboard.
        
    -   `GM_notification`: To show status notifications.
        
    -   `GM_xmlhttpRequest` and `@connect *`: To fetch images from potentially any domain. Review these permissions before accepting.
        
4.  **Usage:**
    
    -   Navigate to any webpage.
        
    -   Select the content you want to copy.
        
    -   Press `Alt+Shift+C`.
        
    -   The script will process the selection, attempt image conversion, and copy the resulting GFM to your clipboard. A notification will confirm success or indicate an error.
        

Dependencies
------------

This script relies on the following external libraries, loaded via `@require`:

-   **Turndown:** Core HTML-to-Markdown conversion library. (`https://unpkg.com/turndown/dist/turndown.js`)
    
-   **Turndown GFM Plugin:** Adds GitHub Flavored Markdown features (tables, task lists, etc.) to Turndown. (`https://unpkg.com/turndown-plugin-gfm/dist/turndown-plugin-gfm.js`)
    

Known Limitations & Notes
-------------------------

-   **Image Fetching Failures:** Fetching images, especially cross-origin, may fail due to network issues or security restrictions (CORS). In such cases, the original image `src` URL will be used in the Markdown instead of Base64 data.
    
-   **Base64 Size:** Embedding images as Base64 can significantly increase the size of the copied text. This might be an issue for very large images or selections with many images.
    
-   **Complex/Non-Standard HTML:** While `turndown` is robust, extremely complex layouts or non-standard HTML might not convert perfectly.
    
-   **Basic Sanitization:** Only `<script>` tags are removed. Other potentially unwanted elements (like complex styles or certain interactive elements) are not currently sanitized.
    

Future Enhancements (Potential)
-------------------------------

Based on the initial feature plan, potential future improvements could include:

-   **Configuration Panel:** Add a user menu (via Tampermonkey) to configure options like:
    
    -   Choice of Markdown flavor (GFM, CommonMark).
        
    -   Image conversion preferences (Base64 vs. original URL vs. skip images vs. reference links).
        
    -   Table conversion preferences (how to handle complex tables, alignment).
        
    -   Code block language detection hints.
        
    -   Enable/disable specific conversions (e.g., blockquotes).
        
-   **Site-Specific Rules:** Add custom logic to improve conversion accuracy for specific websites known to have unique HTML structures (e.g., Stack Overflow, Reddit).
    
-   **More Robust HTML Sanitization:** Implement more advanced sanitization options to remove unwanted styles, attributes, or elements.
    
-   **Table of Contents Generation:** Option to automatically generate a Markdown Table of Contents (`[TOC]`) based on headings in a long selection.
    
-   **Alternative Trigger:** Add an option for a context menu trigger ("Copy as GFM") in addition to the keyboard shortcut.
    

Author
------

\[Your Name Here\]

License
-------

\[Specify License, e.g., MIT License\]