// The wall and workbench are hand-written in index.html (most game repos are
// private, so the GitHub API can't list them). This file only drives the
// "Everything public" archive and the scroll reveals.

const USERNAME = 'sh0tybumbati';
// Repos that are already shown elsewhere on the page, or that are just plumbing.
const EXCLUDED = [USERNAME, `${USERNAME}.github.io`, 'Sh0tyCode', 'polis', 'telemetry-dashboard'];

const LANG_COLORS = {
    JavaScript: '#f1e05a', Python: '#3572A5', Java: '#b07219', HTML: '#e34c26', CSS: '#563d7c',
    TypeScript: '#3178c6', 'C++': '#f34b7d', C: '#555555', Go: '#00ADD8', Rust: '#dea584',
    Swift: '#F05138', Kotlin: '#A97BFF', PHP: '#4F5D95', Ruby: '#701516', 'C#': '#178600',
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function ago(iso) {
    const days = Math.ceil((Date.now() - new Date(iso)) / 864e5);
    if (days <= 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

let repos = [];
let filter = 'all';
let query = '';

function render() {
    const shown = repos.filter((r) =>
        (filter === 'all' || (r.language || '').toLowerCase() === filter) &&
        (!query || r.name.toLowerCase().includes(query) || (r.description || '').toLowerCase().includes(query)));

    $('noResults').hidden = shown.length > 0;
    $('reposGrid').innerHTML = shown.map((r) => `
        <li><a href="${esc(r.homepage || r.html_url)}" target="_blank" rel="noopener">
            <span class="r-name">${esc(r.name)}</span>
            <span class="r-desc">${esc(r.description)}</span>
            <span class="r-meta mono">
                <span>${r.language ? `<i class="dot" style="background:${LANG_COLORS[r.language] || '#ff5a2c'}"></i>${esc(r.language)}` : ''}</span>
                <span>${ago(r.updated_at)}</span>
            </span>
        </a></li>`).join('');
}

async function load() {
    try {
        const res = await fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        repos = data.filter((r) => !r.fork && !EXCLUDED.includes(r.name) && r.description && r.description.trim());

        const langs = [...new Set(repos.map((r) => r.language).filter(Boolean))].sort();
        $('filterContainer').innerHTML = ['<button class="filter-btn active" data-filter="all">All</button>']
            .concat(langs.map((l) => `<button class="filter-btn" data-filter="${esc(l.toLowerCase())}">${esc(l)}</button>`)).join('');
        $('loading').hidden = true;
        render();
    } catch (err) {
        console.error('Error fetching repositories:', err);
        $('loading').hidden = true;
        $('error').hidden = false;
    }
}

$('searchInput').addEventListener('input', (e) => { query = e.target.value.toLowerCase(); render(); });
$('filterContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
});

// Scroll reveals. Content stays visible if IntersectionObserver is missing.
const revealTargets = document.querySelectorAll('.sec-head, .tile, .bench li, .controls');
if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
            if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealTargets.forEach((el, i) => {
        el.classList.add('reveal');
        el.style.transitionDelay = `${(i % 3) * 70}ms`;
        io.observe(el);
    });
}

load();
