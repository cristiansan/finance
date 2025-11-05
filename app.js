// ===================================
// Authentication System
// ===================================

// Password hash (SHA-256 hash of the password)
// Default password: "finanzas2024"
// To change: generate a new SHA-256 hash of your desired password
const PASSWORD_HASH = 'a1750ecd44c6e1a9b1b843df4486adb56df3dd5ed425b4edd5219f9745ba3c8d';

// Hash function using SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Check authentication on page load
function checkAuthentication() {
    const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';

    if (isAuthenticated) {
        showMainApp();
    } else {
        showLoginScreen();
    }
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

// Show main application
function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();

    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');
    const password = passwordInput.value;

    // Hash the entered password
    const enteredHash = await hashPassword(password);

    // Compare with stored hash
    if (enteredHash === PASSWORD_HASH) {
        // Successful login
        sessionStorage.setItem('authenticated', 'true');
        loginError.style.display = 'none';
        passwordInput.value = '';
        showMainApp();

        // Initialize the application
        initializeApp();
    } else {
        // Failed login
        loginError.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// Handle logout
function logout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        sessionStorage.removeItem('authenticated');
        showLoginScreen();

        // Clear the password input
        document.getElementById('passwordInput').value = '';
    }
}

// Initialize application after successful login
async function initializeApp() {
    // Initialize crypto section first
    await initializeCrypto();

    // Initialize ON section
    updateONDashboard();

    // Update main dashboard
    updateDashboard();
}

// ===================================
// Data Management & LocalStorage
// ===================================

let portfolioChart = null;
let incomeProjectionChart = null;

// ===================================
// Tab Navigation
// ===================================

document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;

        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
    });
});

// Show notification (simple implementation)
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===================================
// Dashboard Updates
// ===================================

function updateDashboard() {
    updateDashboardSummary();
    updateDashboardCharts();
}

function updateDashboardSummary() {
    // Get ZCash value
    const zcashUsdValue = ZCASH_BALANCE * zcashPrice;

    // Get ON annual income
    const onAnnualIncome = calculateAnnualONIncome();

    // Calculate ZCash annual income
    const zcashAnnualIncome = (ZCASH_BALANCE * APR) * zcashPrice;

    // Total portfolio value (we'll use nominal value for ON)
    const onValue = 32050; // Sum of all ON holdings (10050 + 10000 + 10000 + 2000)
    const totalValue = zcashUsdValue + onValue;

    // Total annual income
    const totalAnnualIncome = zcashAnnualIncome + onAnnualIncome;

    // Update dashboard summary cards
    document.getElementById('dashTotalValue').textContent = formatCurrency(totalValue);
    document.getElementById('dashZcashValue').textContent = formatCurrency(zcashUsdValue);
    document.getElementById('dashONValue').textContent = formatCurrency(onValue);
    document.getElementById('dashAnnualIncome').textContent = formatCurrency(totalAnnualIncome);

    // Update ZCash details
    document.getElementById('dashZcashPrice').textContent = formatCurrency(zcashPrice);
    document.getElementById('dashZcashUSD').textContent = formatCurrency(zcashUsdValue);
    document.getElementById('dashZcashAnnual').textContent = formatCurrency(zcashAnnualIncome);
    document.getElementById('dashZcashMonthly').textContent = formatCurrency(zcashAnnualIncome / 12);

    // Update ON details
    const nextPayment = getNextPayment();
    if (nextPayment) {
        document.getElementById('dashONNext').textContent = formatCurrency(nextPayment.amount) + ' - ' + nextPayment.ticker;
    }
    document.getElementById('dashONAnnual').textContent = formatCurrency(onAnnualIncome);
}

function updateDashboardCharts() {
    updatePortfolioChart();
    updateIncomeProjectionChart();
}

function updatePortfolioChart() {
    const zcashUsdValue = ZCASH_BALANCE * zcashPrice;
    const onValue = 32050;

    const ctx = document.getElementById('portfolioChart').getContext('2d');

    if (portfolioChart) {
        portfolioChart.destroy();
    }

    portfolioChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['ZCash', 'Obligaciones Negociables'],
            datasets: [{
                data: [zcashUsdValue, onValue],
                backgroundColor: [
                    '#f7931a',
                    '#3b82f6'
                ],
                borderWidth: 2,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f1f5f9',
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateIncomeProjectionChart() {
    const monthsLabels = [];
    const zcashIncome = [];
    const onIncome = [];

    for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        monthsLabels.push(date.toLocaleString('es', { month: 'short', year: '2-digit' }));

        // ZCash monthly income
        zcashIncome.push((ZCASH_BALANCE * APR / 12) * zcashPrice);

        // ON monthly income (simplified average)
        onIncome.push(calculateAnnualONIncome() / 12);
    }

    const ctx = document.getElementById('incomeProjectionChart').getContext('2d');

    if (incomeProjectionChart) {
        incomeProjectionChart.destroy();
    }

    incomeProjectionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthsLabels,
            datasets: [
                {
                    label: 'ZCash',
                    data: zcashIncome,
                    backgroundColor: 'rgba(247, 147, 26, 0.7)',
                    borderColor: '#f7931a',
                    borderWidth: 1
                },
                {
                    label: 'ON',
                    data: onIncome,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3b82f6',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f1f5f9',
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#334155'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: '#334155'
                    }
                }
            }
        }
    });
}

// ===================================
// Utility Functions
// ===================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ===================================
// Crypto Management
// ===================================

const ZCASH_BALANCE = 20.92269137;
const APR = 0.25; // 25%
let zcashPrice = 0;
let lastPriceUpdate = null;

// Fetch ZCash price from CoinGecko API
async function fetchZcashPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd');
        const data = await response.json();

        if (data.zcash && data.zcash.usd) {
            zcashPrice = data.zcash.usd;
            lastPriceUpdate = new Date();

            // Save to localStorage
            localStorage.setItem('zcashPrice', zcashPrice);
            localStorage.setItem('lastPriceUpdate', lastPriceUpdate.toISOString());

            return zcashPrice;
        } else {
            throw new Error('Invalid response from API');
        }
    } catch (error) {
        console.error('Error fetching ZCash price:', error);

        // Try to load from localStorage as fallback
        const savedPrice = localStorage.getItem('zcashPrice');
        if (savedPrice) {
            zcashPrice = parseFloat(savedPrice);
            const savedUpdate = localStorage.getItem('lastPriceUpdate');
            if (savedUpdate) {
                lastPriceUpdate = new Date(savedUpdate);
            }
            return zcashPrice;
        }

        return null;
    }
}

// Calculate earnings based on APR
function calculateEarnings() {
    const dailyRate = APR / 365;
    const weeklyRate = dailyRate * 7;
    const monthlyRate = APR / 12;
    const annualRate = APR;

    return {
        daily: ZCASH_BALANCE * dailyRate,
        weekly: ZCASH_BALANCE * weeklyRate,
        monthly: ZCASH_BALANCE * monthlyRate,
        annual: ZCASH_BALANCE * annualRate
    };
}

// Update crypto display
function updateCryptoDisplay() {
    const earnings = calculateEarnings();

    // Update price display
    if (zcashPrice > 0) {
        document.getElementById('zcashPrice').textContent = formatCurrency(zcashPrice);

        // Update USD value
        const totalUsdValue = ZCASH_BALANCE * zcashPrice;
        document.getElementById('zcashUsdValue').textContent = formatCurrency(totalUsdValue);

        // Update earnings in USD
        document.getElementById('dailyEarningsUsd').textContent = formatCurrency(earnings.daily * zcashPrice);
        document.getElementById('weeklyEarningsUsd').textContent = formatCurrency(earnings.weekly * zcashPrice);
        document.getElementById('monthlyEarningsUsd').textContent = formatCurrency(earnings.monthly * zcashPrice);
        document.getElementById('annualEarningsUsd').textContent = formatCurrency(earnings.annual * zcashPrice);

        // Update summary
        const finalBalance = ZCASH_BALANCE + earnings.annual;
        document.getElementById('summaryFinalUsd').textContent = formatCurrency(finalBalance * zcashPrice);

        // Update last updated time
        if (lastPriceUpdate) {
            const timeAgo = getTimeAgo(lastPriceUpdate);
            document.getElementById('lastUpdated').textContent = `Actualizado ${timeAgo}`;
        }
    } else {
        document.getElementById('zcashPrice').textContent = 'Error al cargar';
        document.getElementById('zcashUsdValue').textContent = 'Error';
    }

    // Update crypto earnings (independent of price)
    document.getElementById('dailyEarningsCrypto').textContent = formatZcash(earnings.daily);
    document.getElementById('weeklyEarningsCrypto').textContent = formatZcash(earnings.weekly);
    document.getElementById('monthlyEarningsCrypto').textContent = formatZcash(earnings.monthly);
    document.getElementById('annualEarningsCrypto').textContent = formatZcash(earnings.annual);

    // Update summary
    document.getElementById('summaryYearlyGains').textContent = formatZcash(earnings.annual);
    const finalBalance = ZCASH_BALANCE + earnings.annual;
    document.getElementById('summaryFinalBalance').textContent = formatZcash(finalBalance);
}

// Refresh crypto data
async function refreshCryptoData() {
    const btn = document.querySelector('.crypto-refresh-btn');
    const originalText = btn.textContent;

    btn.textContent = '🔄 Actualizando...';
    btn.disabled = true;

    await fetchZcashPrice();
    updateCryptoDisplay();

    btn.textContent = originalText;
    btn.disabled = false;

    showNotification('Precio actualizado correctamente');
}

// Format ZCash amount
function formatZcash(amount) {
    return amount.toFixed(8) + ' ZEC';
}

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'hace menos de 1 minuto';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;

    const days = Math.floor(hours / 24);
    return `hace ${days} día${days > 1 ? 's' : ''}`;
}

// Initialize crypto data
async function initializeCrypto() {
    await fetchZcashPrice();
    updateCryptoDisplay();

    // Auto-refresh every 5 minutes
    setInterval(async () => {
        await fetchZcashPrice();
        updateCryptoDisplay();
    }, 5 * 60 * 1000);
}

// ===================================
// Obligaciones Negociables Management
// ===================================

const obligacionesNegociables = [
    {
        ticker: 'VSCOD',
        name: 'Vista Oil & Gas',
        holdings: 10050,
        couponRate: 0.085,
        maturityDate: '2028-05-15',
        paymentDates: [
            { date: '2025-05-15', type: 'Interés', amount: 4271.25 },
            { date: '2025-11-15', type: 'Interés', amount: 4271.25 },
            { date: '2026-05-15', type: 'Interés', amount: 4271.25 },
            { date: '2026-11-15', type: 'Interés', amount: 4271.25 },
            { date: '2027-05-15', type: 'Interés', amount: 4271.25 },
            { date: '2027-11-15', type: 'Interés', amount: 4271.25 },
            { date: '2028-05-15', type: 'Interés + Amortización', amount: 1009271.25 }
        ]
    },
    {
        ticker: 'YM35D',
        name: 'YPF - Serie XXXV',
        holdings: 10000,
        couponRate: 0.0775,
        maturityDate: '2035-06-20',
        paymentDates: [
            { date: '2025-06-20', type: 'Interés', amount: 3875.00 },
            { date: '2025-12-20', type: 'Interés', amount: 3875.00 },
            { date: '2026-06-20', type: 'Interés', amount: 3875.00 }
        ]
    },
    {
        ticker: 'YM37D',
        name: 'YPF - Serie XXXVII',
        holdings: 10000,
        couponRate: 0.0825,
        maturityDate: '2037-09-10',
        paymentDates: [
            { date: '2025-03-10', type: 'Interés', amount: 4125.00 },
            { date: '2025-09-10', type: 'Interés', amount: 4125.00 },
            { date: '2026-03-10', type: 'Interés', amount: 4125.00 }
        ]
    },
    {
        ticker: 'T652D',
        name: 'Telecom Argentina',
        holdings: 2000,
        couponRate: 0.09,
        maturityDate: '2025-04-30',
        paymentDates: [
            { date: '2025-04-30', type: 'Interés + Amortización', amount: 2090.00 }
        ]
    }
];

// Toggle payment schedule visibility
function togglePaymentSchedule(ticker) {
    const schedule = document.getElementById(`schedule-${ticker}`);
    const button = schedule.previousElementSibling;

    if (schedule.style.display === 'none') {
        schedule.style.display = 'block';
        button.textContent = button.textContent.replace('▼', '▲');
    } else {
        schedule.style.display = 'none';
        button.textContent = button.textContent.replace('▲', '▼');
    }
}

// Get all upcoming payments
function getUpcomingPayments() {
    const today = new Date();
    const sixMonthsLater = new Date(today);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const upcomingPayments = [];

    obligacionesNegociables.forEach(on => {
        on.paymentDates.forEach(payment => {
            const paymentDate = new Date(payment.date);
            if (paymentDate >= today && paymentDate <= sixMonthsLater) {
                upcomingPayments.push({
                    ticker: on.ticker,
                    name: on.name,
                    date: paymentDate,
                    dateStr: payment.date,
                    type: payment.type,
                    amount: payment.amount
                });
            }
        });
    });

    // Sort by date
    upcomingPayments.sort((a, b) => a.date - b.date);

    return upcomingPayments;
}

// Get next payment
function getNextPayment() {
    const today = new Date();
    let nextPayment = null;

    obligacionesNegociables.forEach(on => {
        on.paymentDates.forEach(payment => {
            const paymentDate = new Date(payment.date);
            if (paymentDate >= today) {
                if (!nextPayment || paymentDate < nextPayment.date) {
                    nextPayment = {
                        ticker: on.ticker,
                        date: paymentDate,
                        dateStr: payment.date,
                        amount: payment.amount
                    };
                }
            }
        });
    });

    return nextPayment;
}

// Calculate annual income
function calculateAnnualONIncome() {
    const today = new Date();
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    let totalIncome = 0;

    obligacionesNegociables.forEach(on => {
        on.paymentDates.forEach(payment => {
            const paymentDate = new Date(payment.date);
            if (paymentDate >= today && paymentDate <= oneYearLater) {
                totalIncome += payment.amount;
            }
        });
    });

    return totalIncome;
}

// Update ON dashboard
function updateONDashboard() {
    // Update next payment
    const nextPayment = getNextPayment();
    if (nextPayment) {
        document.getElementById('onNextPayment').textContent = formatCurrency(nextPayment.amount);
        document.getElementById('onNextPaymentDate').textContent = formatDate(nextPayment.dateStr);
    }

    // Update annual income
    const annualIncome = calculateAnnualONIncome();
    document.getElementById('onAnnualIncome').textContent = formatCurrency(annualIncome);

    // Update upcoming payments timeline
    updateUpcomingPaymentsTimeline();
}

// Update upcoming payments timeline
function updateUpcomingPaymentsTimeline() {
    const upcomingPayments = getUpcomingPayments();
    const timelineContainer = document.getElementById('upcomingPaymentsList');

    if (upcomingPayments.length === 0) {
        timelineContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay pagos próximos en los próximos 6 meses</p>';
        return;
    }

    timelineContainer.innerHTML = upcomingPayments.map(payment => `
        <div class="timeline-item">
            <div class="timeline-date">${formatDate(payment.dateStr)}</div>
            <div class="timeline-content">
                <div class="timeline-ticker">${payment.ticker}</div>
                <div class="timeline-amount">${formatCurrency(payment.amount)}</div>
                <div class="timeline-type">${payment.type}</div>
            </div>
        </div>
    `).join('');
}

// ===================================
// Initialize App
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    checkAuthentication();

    // Add login form event listener
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);

    // If already authenticated, initialize the app
    const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';
    if (isAuthenticated) {
        initializeApp();
    }
});
