/**
 * GitTrends Hub - Main Application Logic
 * Descobre, filtra e traduz repositórios em alta no GitHub para Português (PT-BR)
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
  translatedCache: {}, // Memory cache for PT-BR translations
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
  // Search input debounce
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

  // Auto-translate toggle
  dom.toggleAutoTranslate.addEventListener('change', (e) => {
    state.autoTranslate = e.target.checked;
    renderRepos(state.currentRepos);
  });

  // Preset Chips
  dom.presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      dom.presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.preset = chip.dataset.preset;
      state.page = 1;
      fetchRepositories();
    });
  });

  // Filters dropdown
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

  // Pagination
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

  // Detail Modal Events
  dom.btnCloseDetail.addEventListener('click', () => dom.detailModal.classList.add('hidden'));
  dom.detailModal.addEventListener('click', (e) => {
    if (e.target === dom.detailModal) dom.detailModal.classList.add('hidden');
  });

  dom.btnStarDetailRepo.addEventListener('click', () => {
    if (state.selectedRepo) {
      toggleFavorite(state.selectedRepo, dom.detailDescPt.textContent);
      updateDetailModalStarBtn();
    }
  });

  dom.btnCopySingleAi.addEventListener('click', () => {
    if (!state.selectedRepo) return;
    const repo = state.selectedRepo;
    const desc = dom.detailDescPt.textContent;
    const prompt = `Olá Antigravity! Analisei este repositório no GitHub e gostaria de debater ideias com você:

### Repositório: [${repo.full_name}](${repo.html_url})
- **Resumo (PT-BR)**: ${desc}
- **Linguagem**: ${repo.language || 'N/A'}
- **Estrelas**: ${repo.stargazers_count.toLocaleString('pt-BR')} | **Forks**: ${repo.forks_count.toLocaleString('pt-BR')}
- **Tópicos**: ${(repo.topics || []).slice(0, 5).join(', ')}

**Ideias para explorarmos juntas:**
1. Como podemos adaptar o conceito principal deste projeto para o nosso ecossistema?
2. Quais módulos ou funcionalidades seriam mais valiosos para integrar aos nossos projetos atuais?
3. Quais melhorias ou diferenciais poderíamos criar para lançar uma solução ainda melhor?`;

    navigator.clipboard.writeText(prompt).then(() => {
      showToast('Prompt deste repositório copiado para a IA em Português!');
    });
  });

  // Favorites Modal Events
  dom.btnOpenFavorites.addEventListener('click', openFavoritesModal);
  dom.btnCloseFavorites.addEventListener('click', closeFavoritesModal);
  dom.favoritesModal.addEventListener('click', (e) => {
    if (e.target === dom.favoritesModal) closeFavoritesModal();
  });

  dom.btnCopyAiMarkdown.addEventListener('click', copyAiMarkdownToClipboard);
  dom.btnClearAllFavs.addEventListener('click', clearAllFavorites);

  // Token Modal Events
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

// RENDER REPOSITORY CARDS
async function renderRepos(repos) {
  dom.repoGrid.innerHTML = '';

  for (const repo of repos) {
    const isFav = state.favorites.some(f => f.id === repo.id);
    const langColor = LANGUAGE_COLORS[repo.language] || '#9ca3af';
    
    const rawDesc = repo.description || 'Sem descrição fornecida.';
    let displayDesc = rawDesc;
    let isTranslated = false;

    if (state.autoTranslate && rawDesc !== 'Sem descrição fornecida.') {
      displayDesc = await translateToPtBr(rawDesc, repo.id);
      isTranslated = true;
    }

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
          ${isTranslated ? `<span class="pt-br-badge"><i class="fa-solid fa-language"></i> Resumo PT-BR</span>` : ''}
          <p class="repo-desc-text" id="desc-${repo.id}">${escapeHtml(displayDesc)}</p>
          ${!state.autoTranslate ? `<button class="btn-translate-card" data-id="${repo.id}"><i class="fa-solid fa-language"></i> Traduzir para PT-BR</button>` : ''}
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
      if (e.target.closest('.btn-star-repo') || e.target.closest('.btn-translate-card')) {
        return; // don't open modal if star or translate button was clicked
      }
      openDetailModal(repo, displayDesc);
    });

    // Star Button Click Listener
    const starBtn = card.querySelector('.btn-star-repo');
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(repo, displayDesc);
    });

    // Manual Translate Click Listener
    const translateBtn = card.querySelector('.btn-translate-card');
    if (translateBtn) {
      translateBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        translateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traduzindo...';
        const translated = await translateToPtBr(rawDesc, repo.id);
        const descElement = card.querySelector(`#desc-${repo.id}`);
        descElement.textContent = translated;
        translateBtn.remove();
        card.querySelector('.repo-description-box').insertAdjacentHTML('afterbegin', `<span class="pt-br-badge"><i class="fa-solid fa-language"></i> Resumo PT-BR</span>`);
      });
    }

    dom.repoGrid.appendChild(card);
  }
}

// OPEN REPO DETAIL MODAL WITH PROJECT IDEAS
async function openDetailModal(repo, descPtBr) {
  state.selectedRepo = repo;
  dom.detailOwnerAvatar.src = repo.owner.avatar_url;
  dom.detailRepoName.textContent = repo.full_name;
  dom.detailRepoLink.href = repo.html_url;
  dom.detailStars.textContent = repo.stargazers_count.toLocaleString('pt-BR');
  dom.detailForks.textContent = repo.forks_count.toLocaleString('pt-BR');
  dom.detailIssues.textContent = repo.open_issues_count ? repo.open_issues_count.toLocaleString('pt-BR') : '0';
  dom.detailLang.textContent = repo.language || 'Geral';
  dom.detailDescPt.textContent = descPtBr || repo.description || 'Sem descrição';

  // Topics
  dom.detailTopics.innerHTML = (repo.topics || []).map(t => `<span class="topic-tag">#${t}</span>`).join('');

  // AI Project Ideas Generator
  const ideas = generateProjectIdeas(repo, descPtBr);
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
function generateProjectIdeas(repo, descPtBr) {
  const name = repo.name.toLowerCase();
  const desc = (descPtBr || repo.description || '').toLowerCase();
  const lang = (repo.language || '').toLowerCase();

  return [
    {
      icon: 'fa-solid fa-plug',
      title: '1. Integração Direta',
      desc: `Conectar o ${repo.name} aos nossos projetos atuais como um módulo ou biblioteca para acelerar o desenvolvimento.`
    },
    {
      icon: 'fa-solid fa-cube',
      title: '2. Criação de Versão SaaS / Web',
      desc: `Criar uma interface web ou dashboard amigável em cima desta ferramenta para oferecer como produto ou utilitário.`
    },
    {
      icon: 'fa-solid fa-wand-magic-sparkles',
      title: '3. Evolução Assistida por IA',
      desc: `Usar a arquitetura deste projeto como base e adicionar novos recursos inteligentes de IA com a nossa Antigravity.`
    }
  ];
}

// CLIENT-SIDE TRANSLATION HELPER
async function translateToPtBr(text, repoId) {
  if (!text || text.trim() === '') return 'Sem descrição.';
  if (state.translatedCache[repoId]) return state.translatedCache[repoId];

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt-BR`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        let result = data.responseData.translatedText;
        result = result.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        state.translatedCache[repoId] = result;
        return result;
      }
    }
  } catch (err) {
    console.warn('Erro na tradução automática:', err);
  }

  state.translatedCache[repoId] = text;
  return text;
}

// TOGGLE FAVORITE
function toggleFavorite(repo, descPtBr) {
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
      description_pt: descPtBr || repo.description,
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
        <p>${escapeHtml(fav.description_pt || 'Sem descrição')}</p>
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

  let md = `Olá Antigravity! Analisei os seguintes repositórios no GitHub e os marquei como interessantes para criarmos algo novo ou evoluirmos nossos projetos atuais:\n\n`;

  state.favorites.forEach((fav, index) => {
    md += `### ${index + 1}. [${fav.full_name}](${fav.html_url})\n`;
    md += `- **Resumo (PT-BR)**: ${fav.description_pt}\n`;
    md += `- **Linguagem Principal**: ${fav.language || 'N/A'}\n`;
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
    showToast('Resumo em Português copiado! Cole no chat para debatermos.');
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
