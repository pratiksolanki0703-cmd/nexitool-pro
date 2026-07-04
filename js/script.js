// UI Logic for Static Site
//
// IMPORTANT: All internal pages currently use explicit .html filenames
// (e.g. /tools/image-tools/bulk-image-compressor.html), NOT pretty/clean URLs.
// This site has no CNAME/custom domain wired up yet, so GitHub Pages serves it
// from a repo subpath (e.g. username.github.io/nexitool-pro/) rather than the
// domain root — absolute paths like "/components/header.html" would 404 there.
//
// The "../" prefix is read from THIS SCRIPT TAG's own unresolved src attribute
// rather than window.location.pathname — pathname parsing counted the GitHub
// Pages repo-subpath segment ("/nexitool-pro/") as an extra folder level, so
// every tool page fetched header.html/footer.html one directory too high and
// 404'd. Every page already hardcodes the correct "../" depth for its own
// <script src="...js/script.js"> tag (same as every other asset on that page),
// so reading it back here is depth-correct no matter what subpath it's hosted at.
const scriptEl = document.currentScript
    || Array.from(document.getElementsByTagName('script')).find(s => /(^|\/)script\.js$/.test(s.getAttribute('src') || ''));
const prefix = (scriptEl.getAttribute('src').match(/^(\.\.\/)*/) || [''])[0];
const isSubfolder = prefix.length > 0;

// Theme Management
let themeToggle;
let htmlElement = document.documentElement;

async function loadComponents() {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');

    // Relative to current page depth — works whether the site is served from
    // a domain root or a GitHub Pages project subpath.
    const headerPath = `${prefix}components/header.html`;
    const footerPath = `${prefix}components/footer.html`;

    if (header) {
        // Check for local file testing (CORS issue)
        if (window.location.protocol === 'file:') {
            header.innerHTML = '<div class="container" style="padding: 1rem; color: #f59e0b; background: rgba(245, 158, 11, 0.1); border-radius: 8px; margin-top: 1rem;">' +
                '<strong>Local Testing Note:</strong> Header/Footer cannot be loaded when opening HTML files directly. ' +
                'Please use a local server (like Live Server in VS Code) or host the files to see the full site.' +
                '</div>';
            return;
        }

        // Only show skeleton if it takes more than 100ms
        const skeletonTimeout = setTimeout(() => {
            if (!header.innerHTML) {
                header.innerHTML = '<div class="container skeleton" style="height: 64px;"></div>';
            }
        }, 100);

        try {
            const res = await fetch(headerPath);
            if (!res.ok) throw new Error(`Failed to load ${headerPath}`);
            let data = await res.text();
            
            // If in subfolder, fix links
            if (isSubfolder) {
                data = data.replace(/href="index\.html"/g, `href="${prefix}index.html"`);
                data = data.replace(/href="about\.html"/g, `href="${prefix}about.html"`);
                data = data.replace(/href="privacy-policy\.html"/g, `href="${prefix}privacy-policy.html"`);
                data = data.replace(/href="terms-of-service\.html"/g, `href="${prefix}terms-of-service.html"`);
                data = data.replace(/href="sitemap\.xml"/g, `href="${prefix}sitemap.xml"`);
                data = data.replace(/href="tools\//g, `href="${prefix}tools/`);
                data = data.replace(/href="style\.css"/g, `href="${prefix}style.css"`);
            }

            clearTimeout(skeletonTimeout);
            header.innerHTML = data;
            
            // Re-initialize theme toggle and mobile menu after loading
            themeToggle = document.getElementById('themeToggle');
            initThemeToggle();
            initMobileMenu();
            if (window.lucide) lucide.createIcons();
            if (window.initAuthWidget) window.initAuthWidget();
        } catch (e) { 
            console.error("Header load failed", e);
            header.innerHTML = '<div class="container" style="padding: 1rem; color: red;">Error loading header. Check console for details.</div>';
        }
    }

    if (footer) {
        const skeletonTimeout = setTimeout(() => {
            if (!footer.innerHTML) {
                footer.innerHTML = '<div class="container skeleton" style="height: 100px;"></div>';
            }
        }, 100);

        try {
            const res = await fetch(footerPath);
            if (!res.ok) throw new Error(`Failed to load ${footerPath}`);
            let data = await res.text();
            
            // If in subfolder, fix links
            if (isSubfolder) {
                data = data.replace(/href="index\.html"/g, `href="${prefix}index.html"`);
                data = data.replace(/href="about\.html"/g, `href="${prefix}about.html"`);
                data = data.replace(/href="privacy-policy\.html"/g, `href="${prefix}privacy-policy.html"`);
                data = data.replace(/href="terms-of-service\.html"/g, `href="${prefix}terms-of-service.html"`);
                data = data.replace(/href="sitemap\.xml"/g, `href="${prefix}sitemap.xml"`);
                data = data.replace(/href="tools\//g, `href="${prefix}tools/`);
                data = data.replace(/href="style\.css"/g, `href="${prefix}style.css"`);
            }

            clearTimeout(skeletonTimeout);
            footer.innerHTML = data;
        } catch (e) { 
            console.error("Footer load failed", e);
            footer.innerHTML = '<div class="container" style="padding: 1rem; color: red;">Error loading footer.</div>';
        }
    }
}

function updateThemeIcon(theme) {
    if (!themeToggle) return;
    
    let icon = themeToggle.querySelector('i') || themeToggle.querySelector('svg');
    if (!icon) return;
    
    const newIcon = document.createElement('i');
    newIcon.setAttribute('data-lucide', theme === 'light' ? 'sun' : 'moon');
    icon.parentNode.replaceChild(newIcon, icon);
    
    if (window.lucide) lucide.createIcons();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        htmlElement.classList.add('light');
    }
    updateThemeIcon(savedTheme);
}

function initThemeToggle() {
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isLight = htmlElement.classList.toggle('light');
            const newTheme = isLight ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

// Mobile Menu
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            let icon = menuToggle.querySelector('i') || menuToggle.querySelector('svg');
            if (!icon) return;
            
            const isOpen = mobileMenu.classList.contains('open');
            const newIcon = document.createElement('i');
            newIcon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
            icon.parentNode.replaceChild(newIcon, icon);
            
            if (window.lucide) lucide.createIcons();
        });
    }
}

function renderHome() {
    const container = document.getElementById('toolSections');
    const blogContainer = document.getElementById('latestBlogs');
    
    if (!container && !blogContainer) return;
    if (typeof TOOLS === 'undefined' || typeof BLOGS === 'undefined' || typeof CATEGORIES === 'undefined') return;

    if (container) {
        let html = '';
        const visibleCategories = CATEGORIES.filter(cat => 
            TOOLS.some(t => Array.isArray(t.category) ? t.category.includes(cat.name) : t.category === cat.name)
        );
        
        visibleCategories.forEach((cat, index) => {
            const catTools = TOOLS.filter(t => Array.isArray(t.category) ? t.category.includes(cat.name) : t.category === cat.name);
            const isTrending = cat.name === 'Trending';
            const sectionClass = isTrending ? 'section-trending' : 'section-grid';
            
            // Limit to 12 tools on home page
            const displayTools = catTools.slice(0, 12);
            const hasMore = catTools.length > 12;

            html += `
                <section class="mb-24 ${sectionClass} color-${cat.color}">
                    <h2 class="section-title">
                        <span class="section-indicator"></span>
                        ${cat.name} Tools
                    </h2>
                    <div class="grid">
                        ${displayTools.map(tool => `
                            <a href="${prefix}${tool.path}" class="glass-card group color-${tool.color}">
                                <div class="card-header">
                                    <div class="card-icon">
                                        <i data-lucide="${tool.icon}"></i>
                                    </div>
                                    ${tool.isTrending && !isTrending ? '<span class="trending-badge">Trending <span class="fire-icon">🔥</span></span>' : ''}
                                </div>
                                <div class="card-body">
                                    <h3 class="card-title">${tool.name}</h3>
                                    <p class="card-desc">${tool.description}</p>
                                </div>
                                <div class="card-footer">
                                    Open Tool <i data-lucide="arrow-right" style="width:14px; height:14px; margin-left:4px;"></i>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                    ${hasMore ? `
                        <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
                            <a href="${prefix}index.html?cat=${encodeURIComponent(cat.name)}" class="more-link">
                                View All ${catTools.length} Tools <i data-lucide="chevron-right" style="width:16px; height:16px;"></i>
                            </a>
                        </div>
                    ` : ''}
                </section>
            `;

            // Add rainbow separator between sections (except after the last one)
            if (index < visibleCategories.length - 1) {
                html += `<hr class="rainbow-separator">`;
            }
        });
        container.innerHTML = html;
    }

    if (blogContainer) {
        blogContainer.innerHTML = BLOGS.slice(0, 4).map(post => `
            <a href="${prefix}${post.path}" class="glass-card blog-card-horizontal group">
                <img src="${post.image}" alt="${post.title}" class="blog-img-horizontal">
                <div class="blog-content">
                    <div class="blog-meta">${post.date}</div>
                    <h3 class="card-title" style="font-size: 1.125rem;">${post.title}</h3>
                    <p class="card-desc" style="font-size: 12px;">${post.description}</p>
                </div>
            </a>
        `).join('');
    }

    if (window.lucide) lucide.createIcons();
}

function renderRelatedBlogs(toolId) {
    const container = document.getElementById('relatedBlogs');
    if (!container || typeof BLOGS === 'undefined') return;

    const related = BLOGS.filter(blog => blog.tags && blog.tags.includes(toolId));
    if (related.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = `
        <h2 class="section-title" style="margin-top: 4rem;">Related Guides</h2>
        <div class="grid">
            ${related.map(post => `
                <a href="${prefix}${post.path}" class="glass-card blog-card group">
                    <img src="${post.image}" alt="${post.title}" class="blog-img">
                    <div class="blog-content">
                        <div class="blog-meta">${post.date}</div>
                        <h3 class="card-title">${post.title}</h3>
                        <p class="card-desc" style="font-size: 12px;">${post.description}</p>
                    </div>
                </a>
            `).join('')}
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderRelatedTools(currentToolId) {
    const container = document.getElementById('relatedTools');
    if (!container || typeof TOOLS === 'undefined' || typeof CATEGORIES === 'undefined') return;

    const currentTool = TOOLS.find(t => t.id === currentToolId);
    if (!currentTool) return;

    const currentCategories = Array.isArray(currentTool.category) ? currentTool.category : [currentTool.category];

    const related = TOOLS.filter(t => {
        if (t.id === currentToolId) return false;
        const toolCategories = Array.isArray(t.category) ? t.category : [t.category];
        return toolCategories.some(cat => currentCategories.includes(cat));
    });

    if (related.length === 0) {
        container.style.display = 'none';
        return;
    }

    const firstCatName = currentCategories[0];
    const cat = CATEGORIES.find(c => c.name === firstCatName);
    const catColor = cat ? cat.color : 'image';

    container.innerHTML = `
        <div class="related-tools-container color-${catColor}">
            <h2 class="section-title" style="margin-bottom: 1.5rem;">Related Tools</h2>
            <div class="related-tools-grid">
                ${related.map(tool => `
                    <a href="${prefix}${tool.path}" class="compact-tool-card group">
                        <div class="compact-tool-icon">
                            <i data-lucide="${tool.icon}" style="width: 16px; height: 16px;"></i>
                        </div>
                        <span class="compact-tool-name">${tool.name}</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

// Automatic Related Content Injection
function autoInjectRelatedContent() {
    // Check if data is available
    if (typeof TOOLS === 'undefined' || typeof CATEGORIES === 'undefined' || typeof BLOGS === 'undefined') return;

    const currentPath = window.location.pathname.replace(/\$/, '');

    // Case 1: Tool Page
    if (currentPath.includes('/tools/')) {
        const currentTool = TOOLS.find(t => {
            const toolCleanPath = t.path.replace(/\$/, '');
            return currentPath.endsWith(toolCleanPath) || currentPath.includes(toolCleanPath);
        });
        
        if (currentTool) {
            const main = document.querySelector('main.tool-container');
            if (main) {
                // Inject Related Tools
                let relatedToolsDiv = document.getElementById('relatedTools');
                if (!relatedToolsDiv) {
                    relatedToolsDiv = document.createElement('div');
                    relatedToolsDiv.id = 'relatedTools';
                    const blogDiv = document.getElementById('relatedBlogs');
                    if (blogDiv) main.insertBefore(relatedToolsDiv, blogDiv);
                    else main.appendChild(relatedToolsDiv);
                    renderRelatedTools(currentTool.id);
                } else if (relatedToolsDiv.innerHTML.trim() === '') {
                    renderRelatedTools(currentTool.id);
                }

                // Inject Related Blogs
                let relatedBlogsDiv = document.getElementById('relatedBlogs');
                if (!relatedBlogsDiv) {
                    relatedBlogsDiv = document.createElement('div');
                    relatedBlogsDiv.id = 'relatedBlogs';
                    main.appendChild(relatedBlogsDiv);
                    renderRelatedBlogs(currentTool.id);
                } else if (relatedBlogsDiv.innerHTML.trim() === '') {
                    renderRelatedBlogs(currentTool.id);
                }
            }
        }
    }

    // Case 2: Blog Page
    if (currentPath.includes('/blog/')) {
        const currentBlog = BLOGS.find(b => {
            const blogCleanPath = b.path.replace(/\$/, '');
            return currentPath.endsWith(blogCleanPath) || currentPath.includes(blogCleanPath);
        });

        if (currentBlog && currentBlog.tags && currentBlog.tags.length > 0) {
            // Show tools that match blog tags
            const relatedToolsDiv = document.getElementById('relatedTools');
            if (relatedToolsDiv && relatedToolsDiv.innerHTML.trim() === '') {
                const relatedTools = TOOLS.filter(t => currentBlog.tags.includes(t.id));
                if (relatedTools.length > 0) {
                    relatedToolsDiv.innerHTML = `
                        <div class="related-tools-container color-image">
                            <h2 class="section-title" style="margin-bottom: 1.5rem; margin-top: 4rem;">Related Tools</h2>
                            <div class="related-tools-grid">
                                ${relatedTools.map(tool => `
                                    <a href="${prefix}${tool.path}" class="compact-tool-card group">
                                        <div class="compact-tool-icon">
                                            <i data-lucide="${tool.icon}" style="width: 16px; height: 16px;"></i>
                                        </div>
                                        <span class="compact-tool-name">${tool.name}</span>
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    if (window.lucide) lucide.createIcons();
                }
            }
        }
    }
}

// Search Logic
const searchInput = document.getElementById('toolSearch');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.glass-card');
        cards.forEach(card => {
            const titleEl = card.querySelector('.card-title');
            const descEl = card.querySelector('.card-desc');
            if (!titleEl) return;
            
            const name = titleEl.innerText.toLowerCase();
            const desc = descEl ? descEl.innerText.toLowerCase() : '';
            
            if (name.includes(query) || desc.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// FAQ Accordion Logic
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all other items
                faqItems.forEach(other => other.classList.remove('active'));
                
                // Toggle current item
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Run critical UI tasks first
    autoInjectRelatedContent();
    initTheme();
    
    // Then load components and other UI
    loadComponents();
    renderHome();
    initFAQ();

    // Handle Category Filter on Home Page
    const urlParams = new URLSearchParams(window.location.search);
    const catFilter = urlParams.get('cat');
    if (catFilter && document.getElementById('toolSections')) {
        const sections = document.querySelectorAll('#toolSections section');
        sections.forEach(sec => {
            const title = sec.querySelector('.section-title').innerText.replace(' Tools', '').trim();
            if (title !== catFilter) {
                sec.style.display = 'none';
            } else {
                // Show all tools in this section
                const cards = sec.querySelectorAll('.glass-card');
                cards.forEach(card => card.style.display = 'flex');
                // Hide the "View All" link
                const moreLink = sec.querySelector('.more-link');
                if (moreLink) moreLink.style.display = 'none';
                
                // Add a "Back to All Categories" link
                const header = sec.querySelector('.section-header');
                const backLink = document.createElement('a');
backLink.href = 'index.html';
                backLink.className = 'more-link';
                backLink.innerHTML = '<i data-lucide="arrow-left" style="width:16px; height:16px;"></i> Back to All';
                header.appendChild(backLink);
                if (window.lucide) lucide.createIcons();
            }
        });
    }
});
