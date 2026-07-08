// Single source of truth for every tool + category on nexitool.pro.
//
// To add a new tool:
// 1. Use the local Tool Generator: admin/generator.html (not deployed to production)
// 2. Paste the generated tool page into tools/<category>/<tool-id>.html
// 3. Add one entry below describing it.
//
// Fields: id (matches the file name, no extension), name, description, category
// (must match a CATEGORIES entry), color (must match a .color-{color} class in
// style.css), icon (lucide icon name), path (relative from site root), isTrending
// (true shows a 🔥 Trending badge on the card), isPremium (optional, true shows a
// 🪙 badge marking the tool as coin-cost).

const TOOLS = [
    {
        id: 'bulk-image-compressor',
        name: 'Bulk Image Compressor',
        description: 'Compress multiple images at once, right in your browser. Reduce file size while keeping quality.',
        category: 'Image',
        color: 'image',
        icon: 'shrink',
        path: 'tools/image-tools/bulk-image-compressor.html',
        isTrending: true
    },
    {
        id: 'bulk-image-rename',
        name: 'Bulk Image Rename',
        description: 'Rename many images at once using a custom pattern, prefix, suffix or numbering.',
        category: 'Image',
        color: 'image',
        icon: 'tag',
        path: 'tools/image-tools/bulk-image-rename.html',
        isTrending: false
    },
    {
        id: 'image-format-converter',
        name: 'Image Format Converter',
        description: 'Convert images between JPG, PNG and WebP right in your browser. No signup, no watermark.',
        category: 'Image',
        color: 'image',
        icon: 'repeat',
        path: 'tools/image-tools/image-format-converter.html',
        isTrending: false
    },
    {
        id: 'image-resizer-cropper',
        name: 'Image Resizer & Cropper',
        description: 'Resize to exact pixels or a target file size, and crop with preset ratios like passport photo or LinkedIn.',
        category: 'Image',
        color: 'image',
        icon: 'crop',
        path: 'tools/image-tools/image-resizer-cropper.html',
        isTrending: true
    },
    {
        id: 'photo-filters',
        name: 'Photo Filters',
        description: 'Apply vintage, sepia, bright, cool and other filters to your photos instantly in the browser.',
        category: 'Image',
        color: 'image',
        icon: 'palette',
        path: 'tools/image-tools/photo-filters.html',
        isTrending: false
    },
    {
        id: 'image-to-ppt',
        name: 'Image to PPT Converter',
        description: 'Turn multiple photos into a downloadable PowerPoint presentation. No OCR, no text extraction.',
        category: 'Image',
        color: 'image',
        icon: 'presentation',
        path: 'tools/image-tools/image-to-ppt.html',
        isTrending: false
    },
    {
        id: 'pdf-password-adder',
        name: 'PDF Password Adder',
        description: 'Lock a PDF with a password right in your browser using standard 128-bit encryption. Nothing is uploaded.',
        category: 'PDF',
        color: 'pdf',
        icon: 'lock',
        path: 'tools/pdf-tools/pdf-password-adder.html',
        isTrending: true
    },
    {
        id: 'pdf-rotate',
        name: 'PDF Rotate',
        description: 'Fix sideways or upside-down PDF pages right in your browser. Rotate by 90, 180, or 270 degrees.',
        category: 'PDF',
        color: 'pdf',
        icon: 'rotate-cw',
        path: 'tools/pdf-tools/pdf-rotate.html',
        isTrending: false
    },
    {
        id: 'pdf-page-deleter',
        name: 'PDF Page Deleter',
        description: 'Remove unwanted pages or page ranges from a PDF right in your browser. Nothing is uploaded.',
        category: 'PDF',
        color: 'pdf',
        icon: 'file-x-2',
        path: 'tools/pdf-tools/pdf-page-deleter.html',
        isTrending: false
    },
    {
        id: 'pdf-watermark',
        name: 'PDF Watermark Adder',
        description: 'Stamp a custom text watermark across every page of a PDF right in your browser. Nothing is uploaded.',
        category: 'PDF',
        color: 'pdf',
        icon: 'stamp',
        path: 'tools/pdf-tools/pdf-watermark.html',
        isTrending: false
    },
    {
        id: 'pdf-metadata-cleaner',
        name: 'PDF Metadata Viewer & Cleaner',
        description: 'View and strip hidden Title, Author, and Producer info from a PDF right in your browser. Nothing is uploaded.',
        category: 'PDF',
        color: 'pdf',
        icon: 'file-search',
        path: 'tools/pdf-tools/pdf-metadata-cleaner.html',
        isTrending: false
    },
    {
        id: 'pdf-flatten',
        name: 'PDF Flatten Tool',
        description: 'Lock fillable PDF form fields into permanent page content right in your browser. Nothing is uploaded.',
        category: 'PDF',
        color: 'pdf',
        icon: 'layers-2',
        path: 'tools/pdf-tools/pdf-flatten.html',
        isTrending: false
    },
    {
        id: 'pdf-compress-to-size',
        name: 'PDF Compress to Target Size',
        description: 'Shrink a PDF as close as possible to a file size you choose, right in your browser. Nothing is uploaded.',
        category: 'PDF',
        color: 'pdf',
        icon: 'target',
        path: 'tools/pdf-tools/pdf-compress-to-size.html',
        isTrending: false
    },
    {
        id: 'pdf-to-images',
        name: 'PDF to Images Converter',
        description: 'Export every page of a PDF as a PNG or JPG image right in your browser. Nothing is uploaded.',
        category: 'PDF',
        color: 'pdf',
        icon: 'image',
        path: 'tools/pdf-tools/pdf-to-images.html',
        isTrending: false
    },
    {
        id: 'pdf-password-remover',
        name: 'PDF Password Remover',
        description: 'Unlock a password-protected PDF right in your browser once you know the password. Nothing is uploaded.',
        category: 'PDF',
        color: 'pdf',
        icon: 'unlock',
        path: 'tools/pdf-tools/pdf-password-remover.html',
        isTrending: false
    },
    {
        id: 'pdf-compressor',
        name: 'PDF Compressor',
        description: 'Shrink PDF file size in your browser by re-compressing embedded images and stripping extra metadata.',
        category: 'PDF',
        color: 'pdf',
        icon: 'file-archive',
        path: 'tools/pdf-tools/pdf-compressor.html',
        isTrending: true
    },
    {
        id: 'ai-email-writer',
        name: 'AI Email Writer',
        description: 'Write or polish a complete email from context or a rough draft, in the output language you choose.',
        category: 'Email',
        color: 'email',
        icon: 'mail-plus',
        path: 'tools/email-tools/ai-email-writer.html',
        isTrending: true,
        isPremium: true
    },
    {
        id: 'scam-mail-checker',
        name: 'Scam Mail Checker',
        description: 'Get an AI risk score and a plain-language breakdown of red flags in a suspicious email.',
        category: 'Email',
        color: 'email',
        icon: 'shield-alert',
        path: 'tools/email-tools/scam-mail-checker.html',
        isTrending: false,
        isPremium: true
    },
    {
        id: 'mail-tone-changer',
        name: 'Mail Tone Changer',
        description: 'Rewrite any email in a formal, friendly, assertive, apologetic, or persuasive tone using AI.',
        category: 'Email',
        color: 'email',
        icon: 'wand-2',
        path: 'tools/email-tools/mail-tone-changer.html',
        isTrending: false,
        isPremium: true
    },
    {
        id: 'subject-line-generator',
        name: 'Subject Line Generator & Grader',
        description: 'Generate 5 ranked subject lines from an email body, or grade an existing one and get better options.',
        category: 'Email',
        color: 'email',
        icon: 'type',
        path: 'tools/email-tools/subject-line-generator.html',
        isTrending: false,
        isPremium: true
    },
    {
        id: 'auto-reply-generator',
        name: 'Auto-Reply Generator',
        description: 'Draft a natural reply to an incoming email using thread context and your own instructions.',
        category: 'Email',
        color: 'email',
        icon: 'reply',
        path: 'tools/email-tools/auto-reply-generator.html',
        isTrending: false,
        isPremium: true
    },
    {
        id: 'cold-email-generator',
        name: 'Cold Email & Follow-up Generator',
        description: 'Write a concise cold outreach email plus an optional 2-email follow-up sequence with AI.',
        category: 'Email',
        color: 'email',
        icon: 'send',
        path: 'tools/email-tools/cold-email-generator.html',
        isTrending: false,
        isPremium: true
    },
    {
        id: 'temp-mail',
        name: 'Temp Mail With Password',
        description: 'Generate a free disposable email address instantly with a password-protected, live-refreshing inbox. No login needed.',
        category: 'Email',
        color: 'email',
        icon: 'mail',
        path: 'tools/email-tools/temp-mail.html',
        isTrending: false
    }
];

const CATEGORIES = [
    { name: 'Image', color: 'image' },
    { name: 'PDF', color: 'pdf' },
    { name: 'Email', color: 'email' }
];
