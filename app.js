/**
 * GitTrends Hub v3.3 - Individual Prompt Exporter & Open-Source Engine
 * Suporte a cópia de prompts individuais dentro do modal de marcados
 */

// APPROVED FREE OPEN SOURCE LICENSES (OSI Compliant)
const FREE_OPEN_SOURCE_LICENSES = [
  'mit', 'apache-2.0', 'gpl-3.0', 'gpl-2.0', 'bsd-3-clause', 'bsd-2-clause', 
  'agpl-3.0', 'mpl-2.0', 'unlicense', 'isc', 'lgpl-3.0', 'cc0-1.0'
];

// STATE MANAGEMENT
const state = {
  query: '',
  preset: 'trending-today',
  freeOnly: true,
  license: 'opensource-all',
  language: '',
  minStars: 100,
  periodDays: 30,
  sortBy: 'stars',
  page: 1,
  perPage: 24,
  autoTranslate: true,
  githubToken: localStorage.getItem('gittrends_pat') || '',
  favorites: JSON.parse(localStorage.getItem('gittrends_favs') || '[]'),
  blockedRepos: JSON.parse(localStorage.getItem('gittrends_blocked') || '[]'),
  summaryCache: {},
  currentRepos: [],
  selectedRepo: null
};

// LINGUAGEM DE CORES DO GITHUB
const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  'C++': '#f34b7d',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  React: '#61dafb',
  PHP: '#4F5D95',
  Shell: '#89e051',
  C: '#555555',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Ruby: '#701516'
};

// DOM ELEMENTS
const dom = {
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  toggleFreeOnly: document.getElementById('toggle-free-only'),
  toggleAutoTranslate: document.getElementById('toggle-auto-translate'),
  presetChips: document.querySelectorAll('.chip'),
  filterLicense: document.getElementById('filter-license'),
  filterLanguage: document.getElementById('filter-language'),
  filterStars: document.getElementById('filter-stars'),
  filterPeriod: document.getElementById('filter-period'),
  filterSort: document.getElementById('filter-sort'),
  
  resultsCount: document.getElementById('results-count'),
  rateLimitRemaining: document.getElementById('rate-limit-remaining'),
  
  repoGrid: document.getElementById('repo-grid'),
  loadingSpinner: document.getElementById('loading-spinner'),
  emptyState: document.getElementById('empty-state'),
  
  btnPrevPage: document.getElementById('btn-prev-page'),
  btnNextPage: document.getElementById('btn-next-page'),
  pageIndicator: document.getElementById('page-indicator'),
  
  // Detail Modal
  detailModal: document.getElementById('detail-modal'),
  btnCloseDetail: document.getElementById('btn-close-detail'),
  detailOwnerAvatar: document.getElementById('detail-owner-avatar'),
  detailRepoName: document.getElementById('detail-repo-name'),
  detailRepoLink: document.getElementById('detail-repo-link'),
  detailStars: document.getElementById('detail-stars'),
  detailForks: document.getElementById('detail-forks'),
  detailLicense: document.getElementById('detail-license'),
  detailIssues: document.getElementById('detail-issues'),
  detailLang: document.getElementById('detail-lang'),
  detailDescPt: document.getElementById('detail-desc-pt'),
  detailIdeasContainer: document.getElementById('detail-ideas-container'),
  detailTopics: document.getElementById('detail-topics'),
  btnStarDetailRepo: document.getElementById('btn-star-detail-repo'),
  btnStarDetailText: document.getElementById('btn-star-detail-text'),
  btnCopySingleAi: document.getElementById('btn-copy-single-ai'),

  // Favorites Modal
  btnOpenFavorites: document.getElementById('btn-open-favorites'),
  favCountBadge: document.getElementById('fav-count-badge'),
  favoritesModal: document.getElementById('favorites-modal'),
  btnCloseFavorites: document.getElementById('btn-close-favorites'),
  favListContainer: document.getElementById('fav-list-container'),
  btnCopyAiMarkdown: document.getElementById('btn-copy-ai-markdown'),
  btnClearAllFavs: document.getElementById('btn-clear-all-favs'),
  aiMarkdownPreview: document.getElementById('ai-markdown-preview'),
  
  // Token Modal
  btnTokenModal: document.getElementById('btn-token-modal'),
  tokenModal: document.getElementById('token-modal'),
  btnCloseToken: document.getElementById('btn-close-token'),
  githubTokenInput: document.getElementById('github-token-input'),
  btnSaveToken: document.getElementById('btn-save-token'),
  btnRemoveToken: document.getElementById('btn-remove-token'),
  
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
};

// INIT APP
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  updateFavBadge();
  if (state.githubToken) {
    dom.githubTokenInput.value = state.githubToken;
  }
  fetchRepositories();
});

function initEventListeners() {
  let searchTimeout;
  dom.searchInput.addEventListener('input', (e) => {
    state.query = e.target.value.trim();
    if (state.query) {
      dom.btnClearSearch.classList.remove('hidden');
    } else {
      dom.btnClearSearch.classList.add('hidden');
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.page = 1;
      fetchRepositories();
    }, 450);
  });

  dom.btnClearSearch.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.query = '';
    dom.btnClearSearch.classList.add('hidden');
    state.page = 1;
    fetchRepositories();
  });

  dom.toggleFreeOnly.addEventListener('change', (e) => {
    state.freeOnly = e.target.checked;
    state.page = 1;
    fetchRepositories();
  });

  dom.toggleAutoTranslate.addEventListener('change', (e) => {
    state.autoTranslate = e.target.checked;
    renderRepos(state.currentRepos);
  });

  dom.presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      dom.presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.preset = chip.dataset.preset;
      state.page = 1;
      fetchRepositories();
    });
  });

  dom.filterLicense.addEventListener('change', (e) => {
    state.license = e.target.value;
    state.page = 1;
    fetchRepositories();
  });

  dom.filterLanguage.addEventListener('change', (e) => {
    state.language = e.target.value;
    state.page = 1;
    fetchRepositories();
  });

  dom.filterStars.addEventListener('change', (e) => {
    state.minStars = parseInt(e.target.value, 10);
    state.page = 1;
    fetchRepositories();
  });

  dom.filterSort.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    state.page = 1;
    fetchRepositories();
  });

  dom.btnPrevPage.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      fetchRepositories();
    }
  });

  dom.btnNextPage.addEventListener('click', () => {
    state.page++;
    fetchRepositories();
  });

  dom.btnCloseDetail.addEventListener('click', () => dom.detailModal.classList.add('hidden'));
  dom.detailModal.addEventListener('click', (e) => {
    if (e.target === dom.detailModal) dom.detailModal.classList.add('hidden');
  });

  dom.btnStarDetailRepo.addEventListener('click', () => {
    if (state.selectedRepo) {
      toggleFavorite(state.selectedRepo, state.summaryCache[state.selectedRepo.id]);
      updateDetailModalStarBtn();
    }
  });

  dom.btnCopySingleAi.addEventListener('click', () => {
    if (!state.selectedRepo) return;
    const repo = state.selectedRepo;
    const summary = state.summaryCache[repo.id] || {};
    const prompt = generateSingleRepoAiMarkdown(repo, summary);

    navigator.clipboard.writeText(prompt).then(() => {
      showToast('Prompt deste repositório Open-Source copiado em Português!');
    });
  });

  dom.btnOpenFavorites.addEventListener('click', openFavoritesModal);
  dom.btnCloseFavorites.addEventListener('click', closeFavoritesModal);
  dom.favoritesModal.addEventListener('click', (e) => {
    if (e.target === dom.favoritesModal) closeFavoritesModal();
  });

  dom.btnCopyAiMarkdown.addEventListener('click', copyAiMarkdownToClipboard);
  dom.btnClearAllFavs.addEventListener('click', clearAllFavorites);

  dom.btnTokenModal.addEventListener('click', () => dom.tokenModal.classList.remove('hidden'));
  dom.btnCloseToken.addEventListener('click', () => dom.tokenModal.classList.add('hidden'));
  dom.tokenModal.addEventListener('click', (e) => {
    if (e.target === dom.tokenModal) dom.tokenModal.classList.add('hidden');
  });

  dom.btnSaveToken.addEventListener('click', () => {
    const token = dom.githubTokenInput.value.trim();
    if (token) {
      localStorage.setItem('gittrends_pat', token);
      state.githubToken = token;
      showToast('Token do GitHub salvo com sucesso!');
    } else {
      localStorage.removeItem('gittrends_pat');
      state.githubToken = '';
      showToast('Token removido.');
    }
    dom.tokenModal.classList.add('hidden');
    fetchRepositories();
  });

  dom.btnRemoveToken.addEventListener('click', () => {
    localStorage.removeItem('gittrends_pat');
    state.githubToken = '';
    dom.githubTokenInput.value = '';
    showToast('Token removido.');
    dom.tokenModal.classList.add('hidden');
    fetchRepositories();
  });
}

function buildQueryString() {
  const parts = [];

  if (state.query) {
    parts.push(state.query);
  }

  if (!state.query) {
    switch (state.preset) {
      case 'trending-today':
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        parts.push(`pushed:>${yesterday}`);
        break;
      case 'trending-week':
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        parts.push(`pushed:>${lastWeek}`);
        break;
      case 'new-stars':
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        parts.push(`created:>${lastMonth}`);
        break;
      case 'ai-agents':
        parts.push(`(agent OR llm OR ai OR rag OR openai OR claude OR gemini)`);
        break;
      case 'frontend-tools':
        parts.push(`(ui OR frontend OR react OR vue OR tailwind OR component OR webapp)`);
        break;
      case 'dev-tools':
        parts.push(`(cli OR tool OR devops OR terminal OR docker OR compiler)`);
        break;
      case 'backend-db':
        parts.push(`(database OR postgres OR redis OR backend OR api OR graphql)`);
        break;
    }
  }

  if (state.freeOnly && state.license !== 'opensource-all') {
    parts.push(`license:${state.license}`);
  }

  if (state.language) {
    parts.push(`language:${state.language}`);
  }

  if (state.minStars > 0) {
    parts.push(`stars:>=${state.minStars}`);
  }

  return parts.join(' ');
}

async function fetchRepositories() {
  showLoading(true);

  const q = buildQueryString();
  const sortParam = state.sortBy === 'updated' ? 'updated' : (state.sortBy === 'forks' ? 'forks' : 'stars');
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${sortParam}&order=desc&page=${state.page}&per_page=${state.perPage}`;

  const headers = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (state.githubToken) {
    headers['Authorization'] = `token ${state.githubToken}`;
  }

  try {
    const response = await fetch(url, { headers });

    const limit = response.headers.get('X-RateLimit-Limit') || '60';
    const remaining = response.headers.get('X-RateLimit-Remaining') || '--';
    dom.rateLimitRemaining.textContent = `${remaining}/${limit}`;

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Limite da API atingido. Adicione um GitHub Token no topo para liberar 5.000 buscas/hora.');
      }
      throw new Error(`Erro na busca: ${response.statusText}`);
    }

    const data = await response.json();
    let rawItems = data.items || [];

    rawItems = rawItems.filter(repo => !state.blockedRepos.includes(repo.id));

    if (state.freeOnly) {
      rawItems = rawItems.filter(repo => isRepoStrictlyFreeOpenSource(repo));
    }

    state.currentRepos = rawItems.slice(0, 12);
    
    dom.resultsCount.textContent = `${state.currentRepos.length} repositórios Open-Source gratuitos encontrados`;
    dom.pageIndicator.textContent = `Página ${state.page}`;
    dom.btnPrevPage.disabled = state.page === 1;
    dom.btnNextPage.disabled = rawItems.length === 0;

    if (state.currentRepos.length === 0) {
      showEmptyState(true);
    } else {
      showEmptyState(false);
      await renderRepos(state.currentRepos);
    }
  } catch (error) {
    console.error('Erro ao buscar repositórios:', error);
    showToast(error.message || 'Erro ao carregar dados do GitHub');
    dom.resultsCount.textContent = 'Erro ao carregar';
    showEmptyState(true);
  } finally {
    showLoading(false);
  }
}

function isRepoStrictlyFreeOpenSource(repo) {
  if (repo.license && repo.license.key) {
    const key = repo.license.key.toLowerCase();
    if (!FREE_OPEN_SOURCE_LICENSES.includes(key)) return false;
  }

  const desc = (repo.description || '').toLowerCase();
  const topics = (repo.topics || []).join(' ').toLowerCase();

  const paidKeywords = [
    'pricing required', 'paid license', 'commercial license', 'freemium',
    'subscription', 'paid service', 'enterprise edition required', 'paywall',
    'paid api required', 'trial required', 'paid plan'
  ];
  
  for (const kw of paidKeywords) {
    if (desc.includes(kw) || topics.includes(kw)) return false;
  }

  return true;
}

async function renderRepos(repos) {
  dom.repoGrid.innerHTML = '';

  for (const repo of repos) {
    const isFav = state.favorites.some(f => f.id === repo.id);
    const langColor = LANGUAGE_COLORS[repo.language] || '#9ca3af';

    const summary = await getOrGenerateRichSummary(repo);
    const licenseName = repo.license ? repo.license.spdx_id || repo.license.name : 'Open Source';

    const card = document.createElement('div');
    card.className = 'repo-card';
    card.dataset.id = repo.id;

    card.innerHTML = `
      <div>
        <div class="repo-card-header">
          <div class="repo-title-wrapper">
            <img src="${repo.owner.avatar_url}" alt="${repo.owner.login}" class="owner-avatar" loading="lazy" />
            <span class="repo-name">${repo.name}</span>
          </div>
          <div class="card-actions-top">
            <button class="btn-star-repo ${isFav ? 'is-starred' : ''}" title="${isFav ? 'Remover dos interessantes' : 'Marcar como interessante'}">
              <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
            </button>
            <button class="btn-block-repo" title="Ocultar este repositório">
              <i class="fa-solid fa-eye-slash"></i>
            </button>
          </div>
        </div>

        <div class="repo-description-box">
          <div class="summary-badge-header">
            <span class="free-badge"><i class="fa-solid fa-circle-check text-green"></i> 100% Grátis (${licenseName})</span>
            <span class="category-pill">${summary.category}</span>
          </div>

          <div class="deep-summary-preview">
            <p class="summary-line"><strong>📌 O que é:</strong> ${escapeHtml(summary.what)}</p>
            <p class="summary-line"><strong>🎯 Para que serve:</strong> ${escapeHtml(summary.purpose)}</p>
            <p class="summary-line"><strong>⚡ Por que usar:</strong> ${escapeHtml(summary.whyUse)}</p>
          </div>
        </div>

        <div class="repo-topics">
          ${(repo.topics || []).slice(0, 4).map(t => `<span class="topic-tag">#${t}</span>`).join('')}
        </div>
      </div>

      <div class="repo-stats-footer">
        ${repo.language ? `
          <div class="stat-item">
            <span class="lang-dot" style="background-color: ${langColor};"></span>
            <span>${repo.language}</span>
          </div>
        ` : '<div></div>'}

        <div class="stat-item" title="Estrelas">
          <i class="fa-solid fa-star text-gold"></i>
          <span>${formatNumber(repo.stargazers_count)}</span>
        </div>

        <div class="stat-item" title="Forks">
          <i class="fa-solid fa-code-fork text-blue"></i>
          <span>${formatNumber(repo.forks_count)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-star-repo') || e.target.closest('.btn-block-repo')) return;
      openDetailModal(repo, summary);
    });

    const starBtn = card.querySelector('.btn-star-repo');
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(repo, summary);
    });

    const blockBtn = card.querySelector('.btn-block-repo');
    blockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      blockRepository(repo.id, repo.name);
    });

    dom.repoGrid.appendChild(card);
  }
}

function blockRepository(repoId, repoName) {
  if (!state.blockedRepos.includes(repoId)) {
    state.blockedRepos.push(repoId);
    localStorage.setItem('gittrends_blocked', JSON.stringify(state.blockedRepos));
    showToast(`"${repoName}" foi ocultado da sua lista!`);
    fetchRepositories();
  }
}

async function getOrGenerateRichSummary(repo) {
  if (state.summaryCache[repo.id]) return state.summaryCache[repo.id];

  const rawDesc = repo.description || '';
  let translatedDesc = '';

  if (rawDesc.trim() !== '') {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(rawDesc)}&langpair=en|pt-BR`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.responseData && data.responseData.translatedText) {
          translatedDesc = data.responseData.translatedText.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        }
      }
    } catch (e) {
      console.warn('Fallback para síntese inteligente');
    }
  }

  const topicsStr = (repo.topics || []).join(' ').toLowerCase();
  const nameLower = repo.name.toLowerCase();
  const lang = repo.language || 'Código Aberto';

  let category = 'Software Open-Source';
  let purpose = 'Código 100% gratuito e livre para usar, modificar e integrar.';
  let whyUse = 'Projeto gratuito sem paywalls, altamente avaliado pela comunidade dev.';

  if (topicsStr.includes('agent') || nameLower.includes('agent')) {
    category = 'Agente de IA (Grátis)';
    purpose = 'Framework open-source para criar agentes de IA autônomos sem pagar licenças de terceiros.';
    whyUse = 'Permite ter seu próprio sistema de IA rodando localmente de graça.';
  } else if (topicsStr.includes('ui') || topicsStr.includes('react') || topicsStr.includes('component') || nameLower.includes('ui') || topicsStr.includes('tailwind')) {
    category = 'Componentes UI (Grátis)';
    purpose = 'Interface e componentes visuais 100% gratuitos para construir sistemas web modernos.';
    whyUse = 'Acelera a criação do frontend sem custos de licença ou mensalidades.';
  } else if (topicsStr.includes('database') || topicsStr.includes('sql') || topicsStr.includes('orm') || nameLower.includes('db') || topicsStr.includes('postgres')) {
    category = 'Banco de Dados (Open Source)';
    purpose = 'Armazenar e consultar dados de forma gratuita, segura e escalável.';
    whyUse = 'Código aberto com controle total dos seus dados sem surpresas no orçamento.';
  } else if (topicsStr.includes('cli') || nameLower.includes('cli')) {
    category = 'Ferramenta CLI (Grátis)';
    purpose = 'Utilitário de terminal open-source para automação diária de tarefas.';
    whyUse = 'Ferramenta leve, gratuita e totalmente customizável.';
  } else if (topicsStr.includes('scraper') || topicsStr.includes('crawler') || nameLower.includes('scrape')) {
    category = 'Extrator de Dados (Open Source)';
    purpose = 'Raspagem de dados web e extração gratuita sem pagar por planos de web scraping.';
    whyUse = 'Economize dinheiro extraindo dados com sua própria infraestrutura livre.';
  }

  const whatText = translatedDesc || `${category} desenvolvido em ${lang} com código 100% aberto.`;

  const summaryObj = {
    what: whatText,
    purpose: purpose,
    whyUse: whyUse,
    category: category
  };

  state.summaryCache[repo.id] = summaryObj;
  return summaryObj;
}

function openDetailModal(repo, summary) {
  state.selectedRepo = repo;
  dom.detailOwnerAvatar.src = repo.owner.avatar_url;
  dom.detailRepoName.textContent = repo.full_name;
  dom.detailRepoLink.href = repo.html_url;
  dom.detailStars.textContent = repo.stargazers_count.toLocaleString('pt-BR');
  dom.detailForks.textContent = repo.forks_count.toLocaleString('pt-BR');
  dom.detailLicense.textContent = repo.license ? repo.license.spdx_id || repo.license.name : 'Open Source (Grátis)';
  dom.detailIssues.textContent = repo.open_issues_count ? repo.open_issues_count.toLocaleString('pt-BR') : '0';
  dom.detailLang.textContent = repo.language || 'Geral';

  dom.detailDescPt.innerHTML = `
    <div class="detail-breakdown-box">
      <p class="breakdown-item"><strong>🟢 Status da Licença:</strong> <span class="free-badge"><i class="fa-solid fa-circle-check text-green"></i> 100% Grátis &amp; Open-Source (${repo.license ? repo.license.name : 'Open Source'})</span></p>
      <p class="breakdown-item"><strong>📌 O que o projeto faz:</strong> ${escapeHtml(summary.what)}</p>
      <p class="breakdown-item"><strong>🎯 Qual problema ele resolve:</strong> ${escapeHtml(summary.purpose)}</p>
      <p class="breakdown-item"><strong>⚡ Por que ele vale a pena:</strong> ${escapeHtml(summary.whyUse)}</p>
    </div>
  `;

  dom.detailTopics.innerHTML = (repo.topics || []).map(t => `<span class="topic-tag">#${t}</span>`).join('');

  const ideas = generateProjectIdeas(repo, summary);
  dom.detailIdeasContainer.innerHTML = ideas.map(idea => `
    <div class="idea-card">
      <h4><i class="${idea.icon} text-purple"></i> ${idea.title}</h4>
      <p>${idea.desc}</p>
    </div>
  `).join('');

  updateDetailModalStarBtn();
  dom.detailModal.classList.remove('hidden');
}

function updateDetailModalStarBtn() {
  if (!state.selectedRepo) return;
  const isFav = state.favorites.some(f => f.id === state.selectedRepo.id);
  if (isFav) {
    dom.btnStarDetailText.textContent = 'Remover dos Marcados';
    dom.btnStarDetailRepo.className = 'btn btn-outline';
  } else {
    dom.btnStarDetailText.textContent = 'Marcar como Interessante';
    dom.btnStarDetailRepo.className = 'btn btn-primary';
  }
}

function generateProjectIdeas(repo, summary) {
  return [
    {
      icon: 'fa-solid fa-plug',
      title: '1. Usar Código Grátis no Nosso Projeto',
      desc: `Aproveitar o código fonte open-source de "${repo.name}" sem custos de licença nos nossos sistemas.`
    },
    {
      icon: 'fa-solid fa-cube',
      title: '2. Criar Aplicação / SaaS com Base Grátis',
      desc: `Desenvolver uma solução em cima deste repositório sem pagar royalties ou mensalidades.`
    },
    {
      icon: 'fa-solid fa-wand-magic-sparkles',
      title: '3. Automação Gratuita com a IA',
      desc: `Conectar este código open-source com a IA Antigravity para automatizar o uso.`
    }
  ];
}

function toggleFavorite(repo, summary) {
  const index = state.favorites.findIndex(f => f.id === repo.id);
  if (index >= 0) {
    state.favorites.splice(index, 1);
    showToast(`"${repo.name}" removido dos interessantes.`);
  } else {
    state.favorites.push({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      summary_what: summary.what,
      summary_purpose: summary.purpose,
      summary_why: summary.whyUse,
      license: repo.license ? repo.license.name : 'Open Source',
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics || []
    });
    showToast(`"${repo.name}" salvo nos interessantes! ⭐`);
  }

  localStorage.setItem('gittrends_favs', JSON.stringify(state.favorites));
  updateFavBadge();
  renderRepos(state.currentRepos);
}

function updateFavBadge() {
  dom.favCountBadge.textContent = state.favorites.length;
}

function openFavoritesModal() {
  renderFavoriteList();
  updateAiMarkdownPreview();
  dom.favoritesModal.classList.remove('hidden');
}

function closeFavoritesModal() {
  dom.favoritesModal.classList.add('hidden');
}

// RENDER FAVORITES LIST WITH INDIVIDUAL PROMPT COPY BUTTON
function renderFavoriteList() {
  dom.favListContainer.innerHTML = '';

  if (state.favorites.length === 0) {
    dom.favListContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 2rem 0;">
        <i class="fa-regular fa-star" style="font-size: 2.5rem; margin-bottom: 0.5rem;"></i>
        <p>Nenhum repositório marcado como interessante ainda.</p>
      </div>
    `;
    return;
  }

  state.favorites.forEach((fav, index) => {
    const item = document.createElement('div');
    item.className = 'fav-item-card';
    item.innerHTML = `
      <div class="fav-item-info">
        <h4>
          <a href="${fav.html_url}" target="_blank" style="color:#fff; text-decoration:none;">${fav.full_name}</a> 
          <span style="font-size:0.8rem; color:var(--accent-gold); font-weight:700;">★ ${formatNumber(fav.stars)}</span>
        </h4>
        <p><strong>🟢 Licença:</strong> ${fav.license || 'Open-Source Grátis'}</p>
        <p><strong>📌 O que é:</strong> ${escapeHtml(fav.summary_what || 'Sem descrição')}</p>
        <p><strong>🎯 Para que serve:</strong> ${escapeHtml(fav.summary_purpose || 'Utilitário de desenvolvimento')}</p>
      </div>

      <div class="fav-item-actions">
        <button class="btn btn-secondary btn-sm btn-copy-single-fav" title="Copiar prompt apenas deste repositório">
          <i class="fa-solid fa-robot text-purple"></i> Copiar Prompt
        </button>
        <button class="btn-icon btn-remove-fav" title="Remover dos favoritos" style="color:#f87171;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    // Click Single Prompt Copy
    item.querySelector('.btn-copy-single-fav').addEventListener('click', () => {
      const singlePrompt = generateSingleFavAiMarkdown(fav);
      dom.aiMarkdownPreview.value = singlePrompt;
      navigator.clipboard.writeText(singlePrompt).then(() => {
        showToast(`Prompt individual de "${fav.name}" copiado!`);
      });
    });

    // Click Remove Favorite
    item.querySelector('.btn-remove-fav').addEventListener('click', () => {
      state.favorites = state.favorites.filter(f => f.id !== fav.id);
      localStorage.setItem('gittrends_favs', JSON.stringify(state.favorites));
      updateFavBadge();
      renderFavoriteList();
      updateAiMarkdownPreview();
      renderRepos(state.currentRepos);
    });

    dom.favListContainer.appendChild(item);
  });
}

function clearAllFavorites() {
  if (state.favorites.length === 0) return;
  if (confirm('Tem certeza que deseja remover todos os repositórios marcados?')) {
    state.favorites = [];
    localStorage.setItem('gittrends_favs', JSON.stringify(state.favorites));
    updateFavBadge();
    renderFavoriteList();
    updateAiMarkdownPreview();
    renderRepos(state.currentRepos);
    showToast('Lista de interessantes limpa.');
  }
}

// GENERATE SINGLE REPO MARKDOWN PROMPT FOR FAVORITE ITEM
function generateSingleFavAiMarkdown(fav) {
  let md = `Olá Antigravity! Analisei este repositório no GitHub e gostaria de debater ideias de desenvolvimento especificamente sobre ele:\n\n`;
  md += `### [${fav.full_name}](${fav.html_url})\n`;
  md += `- **📜 Licença**: ${fav.license || 'Open Source (100% Grátis)'}\n`;
  md += `- **📌 O que é**: ${fav.summary_what}\n`;
  md += `- **🎯 Para que serve**: ${fav.summary_purpose}\n`;
  md += `- **⚡ Por que usar**: ${fav.summary_why || 'Código aberto de alta popularidade'}\n`;
  md += `- **Linguagem**: ${fav.language || 'N/A'}\n`;
  md += `- **Estrelas**: ${fav.stars ? fav.stars.toLocaleString('pt-BR') : '0'} | **Forks**: ${fav.forks ? fav.forks.toLocaleString('pt-BR') : '0'}\n`;
  if (fav.topics && fav.topics.length > 0) {
    md += `- **Tópicos**: ${fav.topics.slice(0, 5).join(', ')}\n`;
  }
  md += `\n---\nComo podemos utilizar este repositório open-source gratuito para criar algo novo ou aperfeiçoar nossos projetos atuais?`;
  return md;
}

function generateSingleRepoAiMarkdown(repo, summary) {
  let md = `Olá Antigravity! Analisei este repositório no GitHub e gostaria de debater ideias especificamente sobre ele:\n\n`;
  md += `### [${repo.full_name}](${repo.html_url})\n`;
  md += `- **📜 Licença**: ${repo.license ? repo.license.name : 'Open Source (100% Grátis)'}\n`;
  md += `- **📌 O que é**: ${summary.what}\n`;
  md += `- **🎯 Para que serve**: ${summary.purpose}\n`;
  md += `- **⚡ Por que usar**: ${summary.whyUse}\n`;
  md += `- **Linguagem**: ${repo.language || 'N/A'}\n`;
  md += `- **Estrelas**: ${repo.stargazers_count.toLocaleString('pt-BR')} | **Forks**: ${repo.forks_count.toLocaleString('pt-BR')}\n`;
  if (repo.topics && repo.topics.length > 0) {
    md += `- **Tópicos**: ${repo.topics.slice(0, 5).join(', ')}\n`;
  }
  md += `\n---\nComo podemos utilizar este repositório open-source gratuito para criar algo novo ou aperfeiçoar nossos projetos atuais?`;
  return md;
}

function generateAiMarkdown() {
  if (state.favorites.length === 0) {
    return 'Nenhum repositório marcado como interessante para exportar.';
  }

  let md = `Olá Antigravity! Analisei os seguintes repositórios Open-Source 100% GRATUITOS no GitHub e selecionei os marcados abaixo com suas análises detalhadas para debatermos novas ideias ou evoluirmos nossos projetos atuais:\n\n`;

  state.favorites.forEach((fav, index) => {
    md += `### ${index + 1}. [${fav.full_name}](${fav.html_url})\n`;
    md += `- **📜 Licença**: ${fav.license || 'MIT / Open Source (100% Grátis)'}\n`;
    md += `- **📌 O que é**: ${fav.summary_what}\n`;
    md += `- **🎯 Para que serve**: ${fav.summary_purpose}\n`;
    md += `- **⚡ Por que usar**: ${fav.summary_why || 'Código aberto sem custos'}\n`;
    md += `- **Linguagem**: ${fav.language || 'N/A'}\n`;
    md += `- **Estrelas**: ${fav.stars.toLocaleString('pt-BR')} | **Forks**: ${fav.forks.toLocaleString('pt-BR')}\n`;
    if (fav.topics && fav.topics.length > 0) {
      md += `- **Tópicos**: ${fav.topics.slice(0, 5).join(', ')}\n`;
    }
    md += `\n`;
  });

  md += `---\nComo podemos utilizar esses códigos open-source 100% gratuitos para criar algo novo ou aperfeiçoar nossos projetos atuais?`;

  return md;
}

function updateAiMarkdownPreview() {
  dom.aiMarkdownPreview.value = generateAiMarkdown();
}

function copyAiMarkdownToClipboard() {
  const text = generateAiMarkdown();
  navigator.clipboard.writeText(text).then(() => {
    showToast('Resumo Open-Source em Português copiado! Cole no chat para debatermos.');
  }).catch(err => {
    console.error('Erro ao copiar:', err);
    showToast('Não foi possível copiar automaticamente. Selecione o texto na caixa.');
  });
}

function showLoading(isLoading) {
  if (isLoading) {
    dom.loadingSpinner.classList.remove('hidden');
    dom.repoGrid.classList.add('hidden');
  } else {
    dom.loadingSpinner.classList.add('hidden');
    dom.repoGrid.classList.remove('hidden');
  }
}

function showEmptyState(isEmpty) {
  if (isEmpty) {
    dom.emptyState.classList.remove('hidden');
    dom.repoGrid.classList.add('hidden');
  } else {
    dom.emptyState.classList.add('hidden');
    dom.repoGrid.classList.remove('hidden');
  }
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(msg) {
  dom.toastMessage.textContent = msg;
  dom.toast.classList.remove('hidden');
  setTimeout(() => {
    dom.toast.classList.add('hidden');
  }, 3200);
}
