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
        icon: 'image-down',
        path: 'tools/image-tools/bulk-image-compressor',
        isTrending: true
    },
    {
        id: 'bulk-image-rename',
        name: 'Bulk Image Rename',
        description: 'Rename many images at once using a custom pattern, prefix, suffix or numbering.',
        category: 'Image',
        color: 'image',
        icon: 'file-edit',
        path: 'tools/image-tools/bulk-image-rename',
        isTrending: false
    },
    {
        id: 'pdf-compressor',
        name: 'PDF Compressor',
        description: 'Shrink PDF file size in your browser by re-compressing embedded images and stripping extra metadata.',
        category: 'PDF',
        color: 'pdf',
        icon: 'file-down',
        path: 'tools/pdf-tools/pdf-compressor',
        isTrending: true
    }
];

const CATEGORIES = [
    { name: 'Image', color: 'image' },
    { name: 'PDF', color: 'pdf' }
];
