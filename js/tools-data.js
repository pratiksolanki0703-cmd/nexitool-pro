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
// (true shows a 🔥 Trending badge on the card).

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
    }
];

const CATEGORIES = [
    { name: 'Image', color: 'image' },
    { name: 'PDF', color: 'pdf' }
];
