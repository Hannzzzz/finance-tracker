// ==================== GLOBAL VARIABLES ====================
const accountsKey = 'accounts';
const activeUserKey = 'activeUserEmail';
let accounts = [];
let currentUser = null;
let transactions = [];
let filteredTransactions = [];
let incomeExpenseChart = null;
let categoryChart = null;

// ==================== AUTHENTICATION ====================
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function loadAccounts() {
    accounts = (await window.store.get(accountsKey)) || [];
}

async function saveAccounts() {
    await window.store.set(accountsKey, accounts);
}

function showLoginForm() {
    document.getElementById('auth-tab-login').classList.add('active');
    document.getElementById('auth-tab-register').classList.remove('active');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
}

function showRegisterForm() {
    document.getElementById('auth-tab-login').classList.remove('active');
    document.getElementById('auth-tab-register').classList.add('active');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('welcome-text').textContent = '';
}

async function login() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const error = document.getElementById('login-error');

    error.textContent = '';

    if (!email || !password) {
        error.textContent = 'Harap isi email dan password.';
        return;
    }

    const user = accounts.find(account => account.email === email);
    if (!user) {
        error.textContent = 'Akun tidak ditemukan.';
        return;
    }

    const passwordHash = await hashPassword(password);
    if (user.passwordHash !== passwordHash) {
        error.textContent = 'Email atau password salah.';
        return;
    }

    currentUser = user;
    await window.store.set(activeUserKey, currentUser.email);
    loadUserData();
    render();
    showMainApp();
}

async function createAccount() {
    const email = document.getElementById('register-email').value.trim().toLowerCase();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const error = document.getElementById('register-error');

    error.textContent = '';

    if (!email || !password || !confirmPassword) {
        error.textContent = 'Mohon isi semua field.';
        return;
    }
    if (!email.includes('@')) {
        error.textContent = 'Masukkan email yang valid.';
        return;
    }
    if (password.length < 6) {
        error.textContent = 'Password harus minimal 6 karakter.';
        return;
    }
    if (password !== confirmPassword) {
        error.textContent = 'Password dan konfirmasi tidak cocok.';
        return;
    }
    if (accounts.some(account => account.email === email)) {
        error.textContent = 'Email ini sudah terdaftar.';
        return;
    }

    const passwordHash = await hashPassword(password);
    const user = {
        email,
        passwordHash,
        createdAt: new Date().toISOString(),
        darkMode: false,
        transactions: []
    };

    accounts.push(user);
    await saveAccounts();
    currentUser = user;
    await window.store.set(activeUserKey, currentUser.email);
    loadUserData();
    render();
    showMainApp();
}

function showMainApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('welcome-text').textContent = `Selamat datang, ${currentUser.email}`;
}

function loadUserData() {
    transactions = currentUser.transactions || [];
    filteredTransactions = [...transactions];
    if (currentUser.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

async function saveUserData() {
    currentUser.transactions = transactions;
    await saveAccounts();
}

async function initializeApp() {
    await loadAccounts();

    const activeEmail = await window.store.get(activeUserKey);
    if (activeEmail) {
        const matched = accounts.find(account => account.email === activeEmail);
        if (matched) {
            document.getElementById('login-email').value = matched.email;
        }
    }

    if (accounts.length === 0) {
        showRegisterForm();
    } else {
        showLoginForm();
    }

    showAuthScreen();

    setTimeout(() => {
        const activeInput = document.querySelector('#login-form:not(.hidden) input') || document.querySelector('#register-form input');
        activeInput?.focus();
    }, 100);
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // Allow Enter key to add transaction
    document.getElementById('desc').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTransaction();
    });
    document.getElementById('amount').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTransaction();
    });
    document.getElementById('login-email').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    document.getElementById('register-email').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createAccount();
    });
    document.getElementById('register-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createAccount();
    });
    document.getElementById('register-confirm-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createAccount();
    });

    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('monthly-report-modal');
        if (e.target === modal) {
            closeModal('monthly-report-modal');
        }
    });
});

function logout() {
    if (confirm('Yakin ingin logout?')) {
        currentUser = null;
        transactions = [];
        filteredTransactions = [];
        document.getElementById('login-password').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm-password').value = '';
        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
        window.store.set(activeUserKey, '');
        showLoginForm();
        showAuthScreen();
    }
}

// ==================== DARK MODE ====================
async function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    if (currentUser) {
        currentUser.darkMode = isDarkMode;
        await saveAccounts();
    }
}

// ==================== TRANSACTION MANAGEMENT ====================
async function addTransaction() {
    const desc = document.getElementById('desc').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];

    if (!desc || !amount || !category) {
        alert('Mohon isi semua field!');
        return;
    }

    const transaction = {
        id: Date.now(),
        desc,
        amount,
        category,
        type,
        date
    };

    transactions.unshift(transaction);
    await saveUserData();

    // Clear inputs
    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('category').value = '';
    document.getElementById('type').value = 'expense';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

    filteredTransactions = [...transactions];
    render();
}

async function deleteTransaction(id) {
    if (confirm('Hapus transaksi ini?')) {
        transactions = transactions.filter(t => t.id !== id);
        await saveUserData();
        filteredTransactions = [...transactions];
        render();
    }
}

// ==================== FILTER TRANSACTIONS ====================
function applyFilters() {
    const search = document.getElementById('filter-search').value.toLowerCase();
    const category = document.getElementById('filter-category').value;
    const type = document.getElementById('filter-type').value;
    const dateStart = document.getElementById('filter-date-start').value;
    const dateEnd = document.getElementById('filter-date-end').value;

    filteredTransactions = transactions.filter(t => {
        const matchSearch = t.desc.toLowerCase().includes(search);
        const matchCategory = !category || t.category === category;
        const matchType = !type || t.type === type;
        const matchDateStart = !dateStart || t.date >= dateStart;
        const matchDateEnd = !dateEnd || t.date <= dateEnd;

        return matchSearch && matchCategory && matchType && matchDateStart && matchDateEnd;
    });

    render();
}

function resetFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';

    filteredTransactions = [...transactions];
    render();
}

// ==================== STATISTICS & CHARTS ====================
function calculateStats() {
    const income = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const balance = income - expense;

    document.getElementById('total-income').textContent = formatCurrency(income);
    document.getElementById('total-expense').textContent = formatCurrency(expense);
    document.getElementById('total-balance').textContent = formatCurrency(balance);

    return { income, expense, balance };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function updateCharts() {
    const stats = calculateStats();

    // Income vs Expense Chart
    const ctx1 = document.getElementById('income-expense-chart');
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }
    incomeExpenseChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Pendapatan', 'Pengeluaran'],
            datasets: [{
                data: [stats.income, stats.expense],
                backgroundColor: ['#4CAF50', '#FF6B6B'],
                borderColor: ['#388E3C', '#D32F2F'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-primary') || '#212121'
                    }
                }
            }
        }
    });

    // Category Distribution Chart
    const categoryData = {};
    filteredTransactions.forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + parseFloat(t.amount);
    });

    const ctx2 = document.getElementById('category-chart');
    if (categoryChart) {
        categoryChart.destroy();
    }
    categoryChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                label: 'Jumlah (Rp)',
                data: Object.values(categoryData),
                backgroundColor: [
                    '#FF6B6B',
                    '#4ECDC4',
                    '#45B7D1',
                    '#FFA07A',
                    '#98D8C8',
                    '#F7DC6F',
                    '#BB8FCE'
                ],
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#757575'
                    }
                },
                y: {
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#757575'
                    }
                }
            }
        }
    });
}

// ==================== MONTHLY REPORT ====================
function showMonthlyReport() {
    const monthlyData = {};

    transactions.forEach(t => {
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
            monthlyData[month] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            monthlyData[month].income += parseFloat(t.amount);
        } else {
            monthlyData[month].expense += parseFloat(t.amount);
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort().reverse();
    let reportHTML = '<table class="report-table"><thead><tr><th>Bulan</th><th>Pendapatan</th><th>Pengeluaran</th><th>Saldo</th></tr></thead><tbody>';

    sortedMonths.forEach(month => {
        const data = monthlyData[month];
        const balance = data.income - data.expense;
        const monthName = new Date(month + '-01').toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });

        reportHTML += `
            <tr>
                <td>${monthName}</td>
                <td class="income">${formatCurrency(data.income)}</td>
                <td class="expense">${formatCurrency(data.expense)}</td>
                <td class="${balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(balance)}</td>
            </tr>
        `;
    });

    reportHTML += '</tbody></table>';
    document.getElementById('monthly-report-content').innerHTML = reportHTML;
    document.getElementById('monthly-report-modal').classList.remove('hidden');
}

// ==================== EXPORT TO CSV ====================
function exportToCSV() {
    const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah'];
    const csvContent = [
        headers.join(','),
        ...transactions.map(t =>
            `${t.date},"${t.desc}",${t.category},${t.type},${t.amount}`
        )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `finance-tracker-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('File CSV berhasil didownload!');
}

// ==================== MODAL MANAGEMENT ====================
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ==================== DASHBOARD RENDERING ====================
function getTopCategory() {
    const totals = {};
    transactions.forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount);
    });
    const topCategory = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .map(item => item[0])[0];
    return topCategory || '-';
}

function renderDashboard() {
    const stats = calculateStats();
    document.getElementById('card-balance').textContent = formatCurrency(stats.balance);
    document.getElementById('card-income').textContent = formatCurrency(stats.income);
    document.getElementById('card-expense').textContent = formatCurrency(stats.expense);
    document.getElementById('card-top-category').textContent = getTopCategory();
    document.getElementById('sidebar-user').textContent = currentUser ? currentUser.email : '-';
}

// ==================== RENDER FUNCTION ====================
function render() {
    renderDashboard();
    updateCharts();
    renderTransactionTable();
}

function renderTransactionTable() {
    const container = document.getElementById('transactions-table-container');
    if (!container) {
        return;
    }

    if (filteredTransactions.length === 0) {
        container.innerHTML = '<div class="table-empty">Tidak ada transaksi yang sesuai filter.</div>';
        return;
    }

    const rows = filteredTransactions.map(t => {
        const formattedDate = new Date(t.date + 'T00:00:00').toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${t.desc}</td>
                <td>${t.category}</td>
                <td class="transaction-type ${t.type}">${t.type === 'income' ? 'Pendapatan' : 'Pengeluaran'}</td>
                <td>${formatCurrency(t.amount)}</td>
                <td><button class="btn btn-tertiary" onclick="deleteTransaction(${t.id})">Hapus</button></td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table-wrapper">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Deskripsi</th>
                        <th>Kategori</th>
                        <th>Tipe</th>
                        <th>Jumlah</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}
