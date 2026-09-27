class LibraryApp {
  constructor() {
    this.currentTab = 'dashboard';
    this.catalogView = 'table';
    this.books = [];
    this.members = [];
    this.loans = [];
    this.currentLoanFilter = 'All';

    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  async init() {
    this.setupGlobalShortcuts();
    await this.refreshAllData();
  }

  setupGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }

  async refreshAllData() {
    await Promise.all([
      this.fetchStats(),
      this.fetchBooks(),
      this.fetchMembers(),
      this.fetchLoans()
    ]);
    this.renderCurrentView();
  }

  async api(endpoint, options = {}) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        let errorMsg = `Error ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData.detail) {
            errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      if (response.status === 204) return null;
      return await response.json();
    } catch (err) {
      this.toast(err.message, 'error');
      throw err;
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('active'));
    const activeNavBtn = document.getElementById(`nav-${tabName}`);
    if (activeNavBtn) activeNavBtn.classList.add('active');

    ['dashboard', 'books', 'members', 'loans', 'settings'].forEach(view => {
      const el = document.getElementById(`view-${view}`);
      if (el) {
        if (view === tabName) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    this.toggleMobileSidebar(false);
    this.renderCurrentView();
  }

  toggleMobileSidebar(show) {
    const sidebar = document.getElementById('sidebar-nav');
    const backdrop = document.getElementById('mobile-sidebar-backdrop');
    if (sidebar && backdrop) {
      if (show) {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
      } else {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
      }
    }
  }

  setCatalogView(mode) {
    this.catalogView = mode;

    const tableContainer = document.getElementById('catalog-table-container');
    const gridContainer = document.getElementById('catalog-grid-container');
    const btnTable = document.getElementById('view-btn-table');
    const btnGrid = document.getElementById('view-btn-grid');

    if (mode === 'table') {
      if (tableContainer) tableContainer.classList.remove('hidden');
      if (gridContainer) gridContainer.classList.add('hidden');
      if (btnTable) btnTable.classList.add('active-view-btn');
      if (btnGrid) btnGrid.classList.remove('active-view-btn');
    } else {
      if (tableContainer) tableContainer.classList.add('hidden');
      if (gridContainer) gridContainer.classList.remove('hidden');
      if (btnTable) btnTable.classList.remove('active-view-btn');
      if (btnGrid) btnGrid.classList.add('active-view-btn');
    }

    this.renderBooksCatalog();
  }

  renderCurrentView() {
    switch (this.currentTab) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'books':
        this.renderBooksCatalog();
        break;
      case 'members':
        this.renderMembersTable();
        break;
      case 'loans':
        this.renderLoansTable();
        break;
    }
    this.updateIcons();
  }

  updateIcons() {
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 10);
    }
  }

  async fetchStats() {
    try {
      const stats = await this.api('/api/stats');
      if (stats) {
        document.getElementById('stat-total-books').textContent = stats.total_books;
        document.getElementById('stat-total-copies').textContent = stats.total_copies;
        document.getElementById('stat-available-copies').textContent = stats.available_copies;
        document.getElementById('stat-total-members').textContent = stats.total_members;
        document.getElementById('stat-active-loans').textContent = stats.active_loans;
        document.getElementById('stat-overdue-loans').textContent = stats.overdue_loans;

        const navBooks = document.getElementById('nav-badge-books');
        if (navBooks) navBooks.textContent = stats.total_books;

        const navLoans = document.getElementById('nav-badge-loans');
        if (navLoans) navLoans.textContent = stats.active_loans;

        const alertOverdue = document.getElementById('alert-overdue-count');
        if (alertOverdue) {
          if (stats.overdue_loans > 0) {
            alertOverdue.textContent = stats.overdue_loans;
            alertOverdue.classList.remove('hidden');
          } else {
            alertOverdue.classList.add('hidden');
          }
        }
      }
    } catch (_) {}
  }

  renderDashboard() {
    const recentContainer = document.getElementById('dashboard-recent-loans');
    if (recentContainer) {
      const activeLoans = this.loans.filter(l => l.status === 'borrowed' || l.status === 'overdue').slice(0, 5);

      if (activeLoans.length === 0) {
        recentContainer.innerHTML = `
          <tr>
            <td colspan="5" class="py-6 text-center text-zinc-500 font-medium">No active loans circulating right now.</td>
          </tr>
        `;
      } else {
        recentContainer.innerHTML = activeLoans.map(loan => `
          <tr class="hover:bg-zinc-800/40 transition">
            <td class="py-3 font-semibold text-white">${this.escapeHtml(loan.book ? loan.book.title : 'Book #' + loan.book_id)}</td>
            <td class="py-3 text-zinc-400">${this.escapeHtml(loan.member ? loan.member.full_name : 'Member #' + loan.member_id)}</td>
            <td class="py-3 text-zinc-400 font-mono text-[11px]">${new Date(loan.due_date).toLocaleDateString()}</td>
            <td class="py-3">${this.getStatusBadge(loan.status)}</td>
            <td class="py-3 text-right">
              <button onclick="app.returnBook(${loan.id})" class="px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:text-white bg-blue-500/10 border border-blue-500/20 rounded-md hover:bg-blue-600 transition">Return</button>
            </td>
          </tr>
        `).join('');
      }
    }

    const popularContainer = document.getElementById('dashboard-popular-books');
    if (popularContainer) {
      popularContainer.innerHTML = this.books.slice(0, 4).map(book => `
        <div class="flex items-center space-x-3 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition">
          <img src="${book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80'}" alt="Cover" class="w-9 h-12 object-cover rounded flex-shrink-0">
          <div class="flex-grow min-w-0">
            <h4 class="text-xs font-bold text-white truncate">${this.escapeHtml(book.title)}</h4>
            <p class="text-[11px] text-zinc-400 truncate">${this.escapeHtml(book.author)}</p>
            <div class="mt-1 flex items-center justify-between text-[10px]">
              <span class="text-zinc-500 font-mono">${this.escapeHtml(book.genre || 'General')}</span>
              <span class="font-semibold text-emerald-400">${book.available_quantity}/${book.total_quantity} left</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  async fetchBooks(search = '', genre = '') {
    let url = '/api/books';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (genre && genre !== 'All') params.append('genre', genre);
    if ([...params].length > 0) url += `?${params.toString()}`;

    try {
      this.books = await this.api(url) || [];
      if (this.currentTab === 'books') this.renderBooksCatalog();
    } catch (_) {}
  }

  handleBookSearch() {
    const search = document.getElementById('books-search-input').value;
    const genre = document.getElementById('books-genre-filter').value;
    this.fetchBooks(search, genre);
  }

  handleGlobalSearch() {
    const query = document.getElementById('global-search-input').value;
    if (this.currentTab !== 'books' && this.currentTab !== 'loans' && this.currentTab !== 'members') {
      this.switchTab('books');
    }
    if (this.currentTab === 'books') {
      document.getElementById('books-search-input').value = query;
      this.fetchBooks(query);
    } else if (this.currentTab === 'members') {
      document.getElementById('members-search-input').value = query;
      this.fetchMembers(query);
    }
  }

  handleTopFilter(value) {
    if (value === 'overdue') {
      this.switchTab('loans');
      this.filterLoans('overdue');
    } else if (value === 'available') {
      this.switchTab('books');
      this.fetchBooks('', '');
    } else {
      this.switchTab('books');
      this.fetchBooks();
    }
  }

  renderBooksCatalog() {
    if (this.catalogView === 'table') {
      this.renderBooksTable();
    } else {
      this.renderBooksGrid();
    }
    this.updateIcons();
  }

  renderBooksTable() {
    const tbody = document.getElementById('books-table-body');
    if (!tbody) return;

    if (this.books.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6" class="py-8 text-center text-zinc-500 font-medium">No catalog volumes match query criteria.</td></tr>
      `;
      return;
    }

    tbody.innerHTML = this.books.map(book => `
      <tr class="hover:bg-zinc-800/40 transition">
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <img src="${book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=300&q=80'}" alt="Cover" class="w-8 h-11 object-cover rounded shadow-sm flex-shrink-0">
            <div>
              <p class="font-bold text-white text-xs">${this.escapeHtml(book.title)}</p>
              <p class="text-[11px] text-zinc-400">${this.escapeHtml(book.author)}</p>
            </div>
          </div>
        </td>
        <td class="px-5 py-3 font-mono text-[11px] text-zinc-400">${this.escapeHtml(book.isbn)}</td>
        <td class="px-5 py-3 text-zinc-400">${this.escapeHtml(book.genre || 'General')}</td>
        <td class="px-5 py-3 font-semibold text-zinc-200">
          <span class="${book.available_quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}">${book.available_quantity}</span> / ${book.total_quantity}
        </td>
        <td class="px-5 py-3">
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-md ${book.available_quantity > 0 ? 'badge-available' : 'badge-out'}">
            ${book.available_quantity > 0 ? 'Available' : 'Out of Stock'}
          </span>
        </td>
        <td class="px-5 py-3 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="app.quickBorrow(${book.id})" ${book.available_quantity < 1 ? 'disabled' : ''} title="Checkout" class="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-md text-[11px] font-semibold transition border border-blue-500/30">
              Checkout
            </button>
            <button onclick="app.openBookModal(${book.id})" title="Edit" class="p-1 text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800 rounded-md hover:bg-zinc-800 transition">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="app.deleteBook(${book.id})" title="Delete" class="p-1 text-rose-400 hover:text-rose-300 bg-zinc-950 border border-zinc-800 rounded-md hover:bg-zinc-800 transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  renderBooksGrid() {
    const container = document.getElementById('catalog-grid-container');
    if (!container) return;

    if (this.books.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center text-zinc-500 font-medium">
          <i data-lucide="book-open" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          <p>No books found matching search criteria.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.books.map(book => `
      <div class="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition shadow-sm group">
        <div>
          <div class="relative w-full aspect-cover overflow-hidden bg-zinc-950">
            <img src="${book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'}" alt="Cover" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            
            <span class="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-bold rounded-md ${book.available_quantity > 0 ? 'badge-available' : 'badge-out'} shadow-md">
              ${book.available_quantity > 0 ? `${book.available_quantity} Left` : 'Out of Stock'}
            </span>
          </div>

          <div class="p-3.5 space-y-1">
            <span class="text-[10px] uppercase font-semibold text-blue-400 tracking-wider">${this.escapeHtml(book.genre || 'General')}</span>
            <h3 class="font-bold text-xs text-white truncate" title="${this.escapeHtml(book.title)}">${this.escapeHtml(book.title)}</h3>
            <p class="text-[11px] text-zinc-400 truncate">${this.escapeHtml(book.author)}</p>
            <p class="text-[10px] text-zinc-500 font-mono pt-1">ISBN: ${this.escapeHtml(book.isbn)}</p>
          </div>
        </div>

        <div class="p-3 pt-0 border-t border-zinc-800/60 mt-2 flex items-center justify-between gap-1.5">
          <button onclick="app.quickBorrow(${book.id})" ${book.available_quantity < 1 ? 'disabled' : ''} class="flex-grow py-1 px-2.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-md text-[11px] font-semibold transition border border-blue-500/30">
            Checkout
          </button>
          <button onclick="app.openBookModal(${book.id})" title="Edit" class="p-1.5 text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800 rounded-md hover:bg-zinc-800 transition">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="app.deleteBook(${book.id})" title="Delete" class="p-1.5 text-rose-400 hover:text-rose-300 bg-zinc-950 border border-zinc-800 rounded-md hover:bg-zinc-800 transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  async fetchMembers(search = '') {
    let url = '/api/members';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    try {
      this.members = await this.api(url) || [];
      if (this.currentTab === 'members') this.renderMembersTable();
    } catch (_) {}
  }

  handleMemberSearch() {
    const search = document.getElementById('members-search-input').value;
    this.fetchMembers(search);
  }

  renderMembersTable() {
    const tbody = document.getElementById('members-table-body');
    if (!tbody) return;

    if (this.members.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7" class="py-8 text-center text-zinc-500 font-medium">No active patrons registered.</td></tr>
      `;
      return;
    }

    tbody.innerHTML = this.members.map(member => `
      <tr class="hover:bg-zinc-800/40 transition">
        <td class="px-6 py-4 font-mono font-semibold text-blue-400 text-xs">${this.escapeHtml(member.membership_code)}</td>
        <td class="px-6 py-4 font-bold text-white">${this.escapeHtml(member.full_name)}</td>
        <td class="px-6 py-4 text-zinc-300">${this.escapeHtml(member.email)}</td>
        <td class="px-6 py-4 text-zinc-400">${this.escapeHtml(member.phone || 'N/A')}</td>
        <td class="px-6 py-4 font-semibold text-blue-400">${member.active_loans_count}</td>
        <td class="px-6 py-4">
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-md ${member.is_active ? 'badge-available' : 'badge-out'}">
            ${member.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="app.openMemberModal(${member.id})" title="Edit" class="p-1 text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800 rounded-md hover:bg-zinc-800 transition">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="app.deleteMember(${member.id})" title="Delete" class="p-1 text-rose-400 hover:text-rose-300 bg-zinc-950 border border-zinc-800 rounded-md hover:bg-zinc-800 transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    this.updateIcons();
  }

  async fetchLoans() {
    try {
      this.loans = await this.api('/api/loans') || [];
      if (this.currentTab === 'loans' || this.currentTab === 'dashboard') this.renderCurrentView();
    } catch (_) {}
  }

  filterLoans(status) {
    this.currentLoanFilter = status;
    ['All', 'borrowed', 'overdue', 'returned'].forEach(st => {
      const btn = document.getElementById(`loan-filter-${st}`);
      if (btn) {
        if (st === status) {
          btn.className = 'px-3 py-1 rounded-md text-zinc-100 font-semibold bg-zinc-800';
        } else {
          btn.className = 'px-3 py-1 rounded-md text-zinc-400 hover:text-white transition';
        }
      }
    });
    this.renderLoansTable();
  }

  renderLoansTable() {
    const tbody = document.getElementById('loans-table-body');
    if (!tbody) return;

    let filtered = this.loans;
    if (this.currentLoanFilter !== 'All') {
      filtered = this.loans.filter(l => l.status === this.currentLoanFilter);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7" class="py-8 text-center text-zinc-500 font-medium">No loan records match selected filter.</td></tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(loan => `
      <tr class="hover:bg-zinc-800/40 transition">
        <td class="px-6 py-4 font-mono text-zinc-500 text-[11px]">#${loan.id}</td>
        <td class="px-6 py-4 font-bold text-white">${this.escapeHtml(loan.book ? loan.book.title : 'Book #' + loan.book_id)}</td>
        <td class="px-6 py-4 text-zinc-300">${this.escapeHtml(loan.member ? loan.member.full_name : 'Member #' + loan.member_id)}</td>
        <td class="px-6 py-4 text-zinc-400 font-mono text-[11px]">${new Date(loan.borrow_date).toLocaleDateString()}</td>
        <td class="px-6 py-4 font-medium text-zinc-200 font-mono text-[11px]">${new Date(loan.due_date).toLocaleDateString()}</td>
        <td class="px-6 py-4">${this.getStatusBadge(loan.status)}</td>
        <td class="px-6 py-4 text-right">
          ${loan.status !== 'returned' ? `
            <button onclick="app.returnBook(${loan.id})" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-sm transition">Return</button>
          ` : '<span class="text-zinc-500 text-xs">Closed</span>'}
        </td>
      </tr>
    `).join('');
    this.updateIcons();
  }

  async returnBook(loanId) {
    try {
      await this.api(`/api/loans/return/${loanId}`, { method: 'POST' });
      this.toast('Book returned successfully!', 'success');
      await this.refreshAllData();
    } catch (_) {}
  }

  quickBorrow(bookId) {
    this.openBorrowModal(bookId);
  }

  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  openBookModal(bookId = null) {
    const form = document.getElementById('form-book');
    form.reset();
    document.getElementById('book-form-id').value = '';

    if (bookId) {
      const book = this.books.find(b => b.id === bookId);
      if (book) {
        document.getElementById('modal-book-title').innerHTML = `
          <i data-lucide="edit-3" class="w-4 h-4 text-blue-400"></i>
          <span>Edit Book Details</span>
        `;
        document.getElementById('book-form-id').value = book.id;
        document.getElementById('book-form-title').value = book.title;
        document.getElementById('book-form-author').value = book.author;
        document.getElementById('book-form-isbn').value = book.isbn;
        document.getElementById('book-form-genre').value = book.genre || '';
        document.getElementById('book-form-quantity').value = book.total_quantity;
        document.getElementById('book-form-cover').value = book.cover_url || '';
        document.getElementById('book-form-description').value = book.description || '';
      }
    } else {
      document.getElementById('modal-book-title').innerHTML = `
        <i data-lucide="book-plus" class="w-4 h-4 text-blue-400"></i>
        <span>Add New Book</span>
      `;
    }
    this.openModal('modal-book');
    this.updateIcons();
  }

  async submitBookForm(e) {
    e.preventDefault();
    const id = document.getElementById('book-form-id').value;
    const payload = {
      title: document.getElementById('book-form-title').value,
      author: document.getElementById('book-form-author').value,
      isbn: document.getElementById('book-form-isbn').value,
      genre: document.getElementById('book-form-genre').value || 'General',
      total_quantity: parseInt(document.getElementById('book-form-quantity').value, 10),
      cover_url: document.getElementById('book-form-cover').value || null,
      description: document.getElementById('book-form-description').value || null
    };

    try {
      if (id) {
        await this.api(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        this.toast('Book updated successfully!', 'success');
      } else {
        await this.api('/api/books', { method: 'POST', body: JSON.stringify(payload) });
        this.toast('Book added to catalog!', 'success');
      }
      this.closeModal('modal-book');
      await this.refreshAllData();
    } catch (_) {}
  }

  async deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this volume from catalog?')) return;
    try {
      await this.api(`/api/books/${bookId}`, { method: 'DELETE' });
      this.toast('Book volume deleted.', 'info');
      await this.refreshAllData();
    } catch (_) {}
  }

  openMemberModal(memberId = null) {
    const form = document.getElementById('form-member');
    form.reset();
    document.getElementById('member-form-id').value = '';

    if (memberId) {
      const member = this.members.find(m => m.id === memberId);
      if (member) {
        document.getElementById('modal-member-title').innerHTML = `
          <i data-lucide="user-check" class="w-4 h-4 text-blue-400"></i>
          <span>Edit Member</span>
        `;
        document.getElementById('member-form-id').value = member.id;
        document.getElementById('member-form-name').value = member.full_name;
        document.getElementById('member-form-email').value = member.email;
        document.getElementById('member-form-phone').value = member.phone || '';
        document.getElementById('member-form-code').value = member.membership_code;
      }
    } else {
      document.getElementById('modal-member-title').innerHTML = `
        <i data-lucide="user-plus" class="w-4 h-4 text-blue-400"></i>
        <span>Register New Member</span>
      `;
      document.getElementById('member-form-code').value = 'LIB-2026-' + Math.floor(100 + Math.random() * 900);
    }
    this.openModal('modal-member');
    this.updateIcons();
  }

  async submitMemberForm(e) {
    e.preventDefault();
    const id = document.getElementById('member-form-id').value;
    const payload = {
      full_name: document.getElementById('member-form-name').value,
      email: document.getElementById('member-form-email').value,
      phone: document.getElementById('member-form-phone').value || null,
      membership_code: document.getElementById('member-form-code').value
    };

    try {
      if (id) {
        await this.api(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        this.toast('Member profile updated!', 'success');
      } else {
        await this.api('/api/members', { method: 'POST', body: JSON.stringify(payload) });
        this.toast('Member registered successfully!', 'success');
      }
      this.closeModal('modal-member');
      await this.refreshAllData();
    } catch (_) {}
  }

  async deleteMember(memberId) {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await this.api(`/api/members/${memberId}`, { method: 'DELETE' });
      this.toast('Member removed.', 'info');
      await this.refreshAllData();
    } catch (_) {}
  }

  openBorrowModal(preselectedBookId = null) {
    const bookSelect = document.getElementById('borrow-book-select');
    const memberSelect = document.getElementById('borrow-member-select');

    const availableBooks = this.books.filter(b => b.available_quantity > 0);
    bookSelect.innerHTML = availableBooks.map(b => `
      <option value="${b.id}" ${b.id === preselectedBookId ? 'selected' : ''}>${this.escapeHtml(b.title)} (${b.available_quantity} available)</option>
    `).join('');

    if (availableBooks.length === 0) {
      bookSelect.innerHTML = '<option value="">No books currently available in stock</option>';
    }

    const activeMembers = this.members.filter(m => m.is_active);
    memberSelect.innerHTML = activeMembers.map(m => `
      <option value="${m.id}">${this.escapeHtml(m.full_name)} (${m.membership_code})</option>
    `).join('');

    if (activeMembers.length === 0) {
      memberSelect.innerHTML = '<option value="">No active members registered</option>';
    }

    this.openModal('modal-borrow');
    this.updateIcons();
  }

  async submitBorrowForm(e) {
    e.preventDefault();
    const book_id = parseInt(document.getElementById('borrow-book-select').value, 10);
    const member_id = parseInt(document.getElementById('borrow-member-select').value, 10);
    const days = parseInt(document.getElementById('borrow-days').value, 10);

    if (!book_id || !member_id) {
      this.toast('Please select both a valid book and a member.', 'error');
      return;
    }

    try {
      await this.api('/api/loans/borrow', {
        method: 'POST',
        body: JSON.stringify({ book_id, member_id, days })
      });
      this.toast('Loan issued successfully!', 'success');
      this.closeModal('modal-borrow');
      await this.refreshAllData();
    } catch (_) {}
  }

  getStatusBadge(status) {
    switch (status) {
      case 'borrowed':
        return '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md badge-borrowed">Active Loan</span>';
      case 'overdue':
        return '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md badge-overdue">Overdue</span>';
      case 'returned':
        return '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md badge-returned">Returned</span>';
      default:
        return `<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-800 text-zinc-300">${status}</span>`;
    }
  }

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle-2';
    if (type === 'error') iconName = 'alert-circle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 ${type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-rose-400' : 'text-blue-400'}"></i>
      <span class="text-xs font-medium">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    this.updateIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.app = new LibraryApp();
