class GitHubPortfolio {
    constructor() {
        this.username = 'sh0tybumbati';
        this.allRepos = [];
        this.featuredRepos = [];
        this.regularRepos = [];
        this.filteredRegularRepos = [];
        
        this.currentFilter = 'all';
        this.searchQuery = '';

        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadRepositories();
    }
    
    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.filterRepositories();
            });
        }
        
        // Filter buttons (delegated because they are generated dynamically)
        const filterContainer = document.getElementById('filterContainer');
        if (filterContainer) {
            filterContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-btn')) {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.currentFilter = e.target.dataset.filter;
                    this.filterRepositories();
                }
            });
        }
    }
    
    async loadRepositories() {
        this.showLoading();
        
        try {
            // Fetch all repos (might need pagination in the future, but 100 is good for now)
            const response = await fetch(`https://api.github.com/users/${this.username}/repos?per_page=100&sort=updated`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const excludedRepos = [this.username, `${this.username}.github.io`, 'Sh0tyCode', 'polis', 'telemetry-dashboard'];
            
            this.allRepos = data.filter(repo => 
                !repo.fork && 
                !excludedRepos.includes(repo.name)
            );

            // Separate into featured (has_pages) and regular
            this.featuredRepos = this.allRepos.filter(repo => repo.has_pages);
            this.regularRepos = this.allRepos.filter(repo => !repo.has_pages && repo.description && repo.description.trim() !== '');
            this.filteredRegularRepos = [...this.regularRepos];

            this.hideLoading();
            this.updateStats();
            this.renderFeaturedProjects();
            this.buildLanguageFilters();
            this.renderRepositories();
            
        } catch (error) {
            console.error('Error fetching repositories:', error);
            this.showError();
        }
    }
    
    updateStats() {
        const totalRepos = this.allRepos.length;
        const totalStars = this.allRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
        
        const languages = new Set();
        this.allRepos.forEach(repo => {
            if (repo.language) languages.add(repo.language);
        });
        
        const totalReposEl = document.getElementById('totalRepos');
        const totalStarsEl = document.getElementById('totalStars');
        const totalLangEl = document.getElementById('totalLanguages');

        if (totalReposEl) totalReposEl.textContent = totalRepos;
        if (totalStarsEl) totalStarsEl.textContent = totalStars;
        if (totalLangEl) totalLangEl.textContent = languages.size;
    }

    buildLanguageFilters() {
        const filterContainer = document.getElementById('filterContainer');
        if (!filterContainer) return;

        const languages = new Set();
        this.regularRepos.forEach(repo => {
            if (repo.language) languages.add(repo.language);
        });

        const langArray = Array.from(languages).sort();
        
        let html = `<button class="filter-btn active" data-filter="all">All</button>`;
        langArray.forEach(lang => {
            html += `<button class="filter-btn" data-filter="${lang.toLowerCase()}">${lang}</button>`;
        });

        filterContainer.innerHTML = html;
    }
    
    filterRepositories() {
        this.filteredRegularRepos = this.regularRepos.filter(repo => {
            let matchesFilter = true;
            if (this.currentFilter !== 'all') {
                matchesFilter = repo.language && repo.language.toLowerCase() === this.currentFilter;
            }
            
            let matchesSearch = true;
            if (this.searchQuery) {
                matchesSearch = repo.name.toLowerCase().includes(this.searchQuery) ||
                               (repo.description && repo.description.toLowerCase().includes(this.searchQuery));
            }
            
            return matchesFilter && matchesSearch;
        });
        
        this.renderRepositories();
    }
    
    renderFeaturedProjects() {
        const featuredContainer = document.getElementById('featuredProjects');
        if (!featuredContainer) return;

        if (this.featuredRepos.length === 0) {
            featuredContainer.innerHTML = `<p style="color: var(--text-muted)">No GitHub Pages projects found yet.</p>`;
            return;
        }

        featuredContainer.innerHTML = this.featuredRepos.map(repo => {
            // Use homepage if set, otherwise default GH Pages URL
            const liveUrl = repo.homepage || `https://${this.username}.github.io/${repo.name}`;
            const tags = repo.topics && repo.topics.length > 0 ? repo.topics : (repo.language ? [repo.language] : []);
            const screenshotUrl = `https://s0.wordpress.com/mshots/v1/${encodeURIComponent(liveUrl)}?w=800`;

            return `
            <div class="featured-card">
                <div class="featured-image" style="background-image: url('${screenshotUrl}');"></div>
                <div class="featured-content">
                    <div style="margin-bottom: 1rem;">
                        <h3 class="featured-title" style="margin-bottom: 0.5rem;">${this.formatRepoName(repo.name)}</h3>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            ${tags.slice(0, 3).map(tag => `
                                <span style="font-size: 0.75rem; padding: 0.25rem 0.75rem; background: rgba(255,255,255,0.05); border-radius: 99px; color: var(--accent-secondary); border: 1px solid rgba(255,255,255,0.1);">${tag}</span>
                            `).join('')}
                        </div>
                    </div>
                    <p class="featured-description">${repo.description || 'A featured web project deployed on GitHub Pages.'}</p>
                    <div class="featured-links">
                        <a href="${liveUrl}" target="_blank" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">
                            <i class="fas fa-external-link-alt"></i> Live App
                        </a>
                        <a href="${repo.html_url}" target="_blank" class="btn btn-secondary" style="padding: 0.6rem 1.2rem; font-size: 0.85rem;">
                            <i class="fab fa-github"></i> Code
                        </a>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    renderRepositories() {
        const container = document.getElementById('reposGrid');
        const noResults = document.getElementById('noResults');
        if (!container || !noResults) return;
        
        if (this.filteredRegularRepos.length === 0) {
            container.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }
        
        noResults.style.display = 'none';
        
        container.innerHTML = this.filteredRegularRepos.map(repo => `
            <div class="repo-card">
                <div class="repo-header">
                    <a href="${repo.html_url}" target="_blank" class="repo-name">${repo.name}</a>
                </div>
                
                <p class="repo-description">${repo.description}</p>
                
                <div class="repo-stats">
                    <div class="stat"><i class="fas fa-star"></i> ${repo.stargazers_count}</div>
                    <div class="stat"><i class="fas fa-code-branch"></i> ${repo.forks_count}</div>
                </div>
                
                <div class="repo-meta">
                    ${repo.language ? `
                        <div style="display: flex; align-items: center;">
                            <span class="language-dot" style="background-color: ${this.getLanguageColor(repo.language)}"></span>
                            <span>${repo.language}</span>
                        </div>
                    ` : '<div></div>'}
                    <div>${this.formatDate(repo.updated_at)}</div>
                </div>
            </div>
        `).join('');
    }
    
    getLanguageColor(language) {
        const colors = {
            'JavaScript': '#f1e05a', 'Python': '#3572A5', 'Java': '#b07219',
            'HTML': '#e34c26', 'CSS': '#563d7c', 'TypeScript': '#3178c6',
            'C++': '#f34b7d', 'C': '#555555', 'Go': '#00ADD8',
            'Rust': '#dea584', 'Swift': '#F05138', 'Kotlin': '#A97BFF',
            'PHP': '#4F5D95', 'Ruby': '#701516', 'C#': '#178600'
        };
        return colors[language] || '#8b5cf6';
    }

    formatRepoName(name) {
        return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 30) return `${diffDays} days ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }
    
    showLoading() {
        const l = document.getElementById('loading');
        const e = document.getElementById('error');
        const r = document.getElementById('reposGrid');
        if (l) l.style.display = 'block';
        if (e) e.style.display = 'none';
        if (r) r.innerHTML = '';
    }
    
    hideLoading() {
        const l = document.getElementById('loading');
        if (l) l.style.display = 'none';
    }
    
    showError() {
        const l = document.getElementById('loading');
        const e = document.getElementById('error');
        const r = document.getElementById('reposGrid');
        if (l) l.style.display = 'none';
        if (e) e.style.display = 'block';
        if (r) r.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GitHubPortfolio();
});

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});