/**
 * GitTrends Hub - Smart Deep Summary & Project Intelligence Engine
 * Descobre, gera resumos detalhados em PT-BR e analisa repositórios do GitHub
 */

// STATE MANAGEMENT
const state = {
  query: '',
  preset: 'trending-today',
  language: '',
  minStars: 100,
  periodDays: 30,
  sortBy: 'stars',
  page: 1,
  perPage: 12,
  autoTranslate: true,
  githubToken: localStorage.getItem('gittrends_pat') || '',
  favorites: JSON.parse(localStorage.getItem('gittrends_favs') || '[]'),
  summaryCache: {}, // Memory cache for detailed PT-BR summaries
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
  toggleAutoTranslate: document.getElementById('toggle-auto-translate'),
  presetChips: document.querySelectorAll('.chip'),
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

// SETUP EVENT LISTENERS
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

  dom.filterPeriod.addEventListener('change', (e) => {
    state.periodDays = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
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
    const prompt = `Olá Antigravity! Analisei este repositório no GitHub e gostaria de debater ideias de desenvolvimento com você:

### Repositório: [${repo.full_name}](${repo.html_url})
📌 **O que é**: ${summary.what || repo.description}
🎯 **Para que serve**: ${summary.purpose || 'Ferramenta especializada para desenvolvimento'}
⚡ **Recursos Chave**: ${(summary.features || []).join(', ') || (repo.topics || []).slice(0, 5).join(', ')}
💻 **Linguagem**: ${repo.language || 'N/A'} | ⭐ **Estrelas**: ${repo.stargazers_count.toLocaleString('pt-BR')} | 🍴 **Forks**: ${repo.forks_count.toLocaleString('pt-BR')}

**Análise & Próximos Passos:**
1. Como podemos adaptar as melhores ideias deste projeto para o nosso ecossistema?
2. Quais são os principais diferenciais que tornam esse projeto popular?
3. Como podemos criar algo melhor ou integrar suas funcionalidades?`;

    navigator.clipboard.writeText(prompt).then(() => {
      showToast('Prompt detalhado deste repositório copiado para a IA em Português!');
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

// CONSTRUCT GITHUB SEARCH QUERY
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

  if (state.language) {
    parts.push(`language:${state.language}`);
  }

  if (state.minStars > 0) {
    parts.push(`stars:>=${state.minStars}`);
  }

  if (state.periodDays !== 'all' && state.preset !== 'new-stars' && state.preset !== 'trending-today' && state.preset !== 'trending-week') {
    const days = parseInt(state.periodDays, 10);
    const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    parts.push(`created:>${dateLimit}`);
  }

  return parts.join(' ');
}

// FETCH REPOSITORIES FROM GITHUB API
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
    state.currentRepos = data.items || [];
    
    dom.resultsCount.textContent = `${data.total_count.toLocaleString('pt-BR')} repositórios em destaque`;
    dom.pageIndicator.textContent = `Página ${state.page}`;
    dom.btnPrevPage.disabled = state.page === 1;
    dom.btnNextPage.disabled = state.currentRepos.length < state.perPage;

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

// RENDER REPOSITORY CARDS WITH DETAILED PT-BR SUMMARIES
async function renderRepos(repos) {
  dom.repoGrid.innerHTML = '';

  for (const repo of repos) {
    const isFav = state.favorites.some(f => f.id === repo.id);
    const langColor = LANGUAGE_COLORS[repo.language] || '#9ca3af';

    // Generate Deep Summary in PT-BR
    const summary = await getOrGenerateDeepSummary(repo);

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
          <button class="btn-star-repo ${isFav ? 'is-starred' : ''}" title="${isFav ? 'Remover dos interessantes' : 'Marcar como interessante'}">
            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
          </button>
        </div>

        <div class="repo-description-box">
          <span class="pt-br-badge"><i class="fa-solid fa-sparkles"></i> Análise Detalhada (PT-BR)</span>
          
          <div class="deep-summary-preview">
            <p class="summary-line"><strong>📌 O que é:</strong> ${escapeHtml(summary.what)}</p>
            <p class="summary-line"><strong>🎯 Para que serve:</strong> ${escapeHtml(summary.purpose)}</p>
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

    // Click on Card -> Open Detail Modal
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-star-repo')) return;
      openDetailModal(repo, summary);
    });

    // Star Button Click Listener
    const starBtn = card.querySelector('.btn-star-repo');
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(repo, summary);
    });

    dom.repoGrid.appendChild(card);
  }
}

// SMART DEEP SUMMARY GENERATOR ENGINE (Generates structured Portuguese explanations)
async function getOrGenerateDeepSummary(repo) {
  if (state.summaryCache[repo.id]) return state.summaryCache[repo.id];

  const rawDesc = repo.description || '';
  let translatedDesc = rawDesc;

  // Translate raw description first if available
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
      console.warn('Fallback para tradução bruta');
    }
  }

  // Deduce categories & purpose from topics + name + description
  const topicsStr = (repo.topics || []).join(' ').toLowerCase();
  const nameLower = repo.name.toLowerCase();
  const descLower = rawDesc.toLowerCase();
  const lang = repo.language || 'Software';

  let category = 'Ferramenta de Software';
  let purpose = 'Facilitar a criação e manutenção de sistemas modernos.';
  let features = [];

  if (topicsStr.includes('agent') || nameLower.includes('agent') || descLower.includes('agent')) {
    category = 'Framework / Agente de IA';
    purpose = 'Automatizar tarefas complexas usando Inteligência Artificial e LLMs autônomos.';
    features.push('Agentes Autônomos', 'Orquestração de LLMs', 'Automação de Fluxos');
  } else if (topicsStr.includes('ui') || topicsStr.includes('react') || topicsStr.includes('component') || nameLower.includes('ui')) {
    category = 'Biblioteca de Interface (UI)';
    purpose = 'Acelerar o desenvolvimento de interfaces web elegantes e responsivas.';
    features.push('Componentes Reutilizáveis', 'Design Moderno', 'Alta Performance');
  } else if (topicsStr.includes('database') || topicsStr.includes('sql') || topicsStr.includes('orm') || nameLower.includes('db')) {
    category = 'Banco de Dados / ORM';
    purpose = 'Armazenar, consultar e gerenciar dados com segurança e alta velocidade.';
    features.push('Persistência de Dados', 'Consultas Rápidas', 'Escalabilidade');
  } else if (topicsStr.includes('cli') || nameLower.includes('cli') || descLower.includes('terminal')) {
    category = 'Ferramenta de Linha de Comando (CLI)';
    purpose = 'Aumentar a produtividade no terminal via automação e atalhos rápidos.';
    features.push('Execução via Terminal', 'Scriptável', 'Baixo Consumo');
  } else if (topicsStr.includes('python') || lang === 'Python') {
    category = 'Ecossistema Python';
    purpose = 'Oferecer pacotes e utilitários otimizados para Python.';
    features.push('Sintaxe Limpa', 'Suporte a Scripts', 'Módulos Integrados');
  } else if (topicsStr.includes('rust') || lang === 'Rust') {
    category = 'Sistema de Alta Performance (Rust)';
    purpose = 'Fornecer soluções de baixíssima latência com segurança de memória garantida.';
    features.push('Super Rápido', 'Memory Safe', 'Compilação Nativa');
  }

  // Construct structured summary object
  const summaryObj = {
    what: translatedDesc || `${category} desenvolvido em ${lang}.`,
    purpose: purpose,
    category: category,
    features: features.length ? features : (repo.topics || []).slice(0, 3),
    rawTranslated: translatedDesc
  };

  state.summaryCache[repo.id] = summaryObj;
  return summaryObj;
}

// OPEN REPO DETAIL MODAL WITH DEEP PROJECT ANALYSIS
async function openDetailModal(repo, summary) {
  state.selectedRepo = repo;
  dom.detailOwnerAvatar.src = repo.owner.avatar_url;
  dom.detailRepoName.textContent = repo.full_name;
  dom.detailRepoLink.href = repo.html_url;
  dom.detailStars.textContent = repo.stargazers_count.toLocaleString('pt-BR');
  dom.detailForks.textContent = repo.forks_count.toLocaleString('pt-BR');
  dom.detailIssues.textContent = repo.open_issues_count ? repo.open_issues_count.toLocaleString('pt-BR') : '0';
  dom.detailLang.textContent = repo.language || 'Geral';

  // Rich HTML breakdown inside Detail Modal
  dom.detailDescPt.innerHTML = `
    <div class="detail-breakdown-box">
      <p class="breakdown-item"><strong>📌 O que o projeto faz:</strong> ${escapeHtml(summary.what)}</p>
      <p class="breakdown-item"><strong>🎯 Qual problema ele resolve:</strong> ${escapeHtml(summary.purpose)}</p>
      <p class="breakdown-item"><strong>🛠️ Categoria &amp; Tecnologias:</strong> <span class="badge-category">${escapeHtml(summary.category)}</span> em <strong>${repo.language || 'Código Aberto'}</strong></p>
      ${repo.license ? `<p class="breakdown-item"><strong>📜 Licença:</strong> ${repo.license.name}</p>` : ''}
    </div>
  `;

  dom.detailTopics.innerHTML = (repo.topics || []).map(t => `<span class="topic-tag">#${t}</span>`).join('');

  // AI Project Ideas
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

// GENERATE 3 CREATIVE PROJECT IDEAS IN PT-BR
function generateProjectIdeas(repo, summary) {
  return [
    {
      icon: 'fa-solid fa-plug',
      title: '1. Integração Direta no Nosso Código',
      desc: `Aproveitar o ${repo.name} como dependência para adicionar o recurso de "${summary.purpose}" nos nossos sistemas.`
    },
    {
      icon: 'fa-solid fa-cube',
      title: '2. Criar Versão SaaS / WebApp',
      desc: `Construir um painel amigável em cima desta solução para oferecer como produto ou micro-serviço web.`
    },
    {
      icon: 'fa-solid fa-wand-magic-sparkles',
      title: '3. Potencializar com Agente de IA',
      desc: `Conectar a infraestrutura deste repositório com os nossos Agentes de IA da Antigravity para automatizar o uso.`
    }
  ];
}

// TOGGLE FAVORITE
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

// UPDATE FAVORITE BADGE
function updateFavBadge() {
  dom.favCountBadge.textContent = state.favorites.length;
}

// OPEN FAVORITES MODAL
function openFavoritesModal() {
  renderFavoriteList();
  updateAiMarkdownPreview();
  dom.favoritesModal.classList.remove('hidden');
}

function closeFavoritesModal() {
  dom.favoritesModal.classList.add('hidden');
}

// RENDER FAVORITES IN MODAL
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

  state.favorites.forEach(fav => {
    const item = document.createElement('div');
    item.className = 'fav-item-card';
    item.innerHTML = `
      <div class="fav-item-info">
        <h4><a href="${fav.html_url}" target="_blank" style="color:#fff; text-decoration:none;">${fav.full_name}</a> <span style="font-size:0.8rem; color:var(--accent-gold);">★ ${formatNumber(fav.stars)}</span></h4>
        <p><strong>📌 O que é:</strong> ${escapeHtml(fav.summary_what || 'Sem descrição')}</p>
        <p><strong>🎯 Para que serve:</strong> ${escapeHtml(fav.summary_purpose || 'Utilitário de desenvolvimento')}</p>
      </div>
      <button class="btn-icon btn-remove-fav" title="Remover" style="color:#f87171;">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;

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

// CLEAR ALL FAVORITES
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

// GENERATE & COPY AI MARKDOWN PROMPT IN PT-BR
function generateAiMarkdown() {
  if (state.favorites.length === 0) {
    return 'Nenhum repositório marcado como interessante para exportar.';
  }

  let md = `Olá Antigravity! Analisei os seguintes repositórios no GitHub e selecionei os marcados abaixo com suas descrições detalhadas para debatermos novas ideias ou evoluirmos nossos projetos atuais:\n\n`;

  state.favorites.forEach((fav, index) => {
    md += `### ${index + 1}. [${fav.full_name}](${fav.html_url})\n`;
    md += `- **📌 O que é**: ${fav.summary_what}\n`;
    md += `- **🎯 Para que serve**: ${fav.summary_purpose}\n`;
    md += `- **Linguagem**: ${fav.language || 'N/A'}\n`;
    md += `- **Estrelas**: ${fav.stars.toLocaleString('pt-BR')} | **Forks**: ${fav.forks.toLocaleString('pt-BR')}\n`;
    if (fav.topics && fav.topics.length > 0) {
      md += `- **Tópicos**: ${fav.topics.slice(0, 5).join(', ')}\n`;
    }
    md += `\n`;
  });

  md += `---\nO que você acha desses projetos? Qual deles tem o maior potencial de integração ou inspirar algo novo para o nosso escopo? Como podemos aperfeiçoar essas ideias?`;

  return md;
}

function updateAiMarkdownPreview() {
  dom.aiMarkdownPreview.value = generateAiMarkdown();
}

function copyAiMarkdownToClipboard() {
  const text = generateAiMarkdown();
  navigator.clipboard.writeText(text).then(() => {
    showToast('Resumo detalhado em Português copiado! Cole no chat para debatermos.');
  }).catch(err => {
    console.error('Erro ao copiar:', err);
    showToast('Não foi possível copiar automaticamente. Selecione o texto na caixa.');
  });
}

// UTILITY FUNCTIONS
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
