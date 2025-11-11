// ===================================
// Authentication System
// ===================================

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
    const authData = localStorage.getItem('authData');

    if (authData) {
        try {
            const { authenticated, expiresAt } = JSON.parse(authData);
            const now = new Date().getTime();

            // Check if authenticated and not expired
            if (authenticated === true && now < expiresAt) {
                showMainApp();
                return;
            } else {
                // Session expired, clear it
                localStorage.removeItem('authData');
            }
        } catch (error) {
            // Invalid data, clear it
            localStorage.removeItem('authData');
        }
    }

    showLoginScreen();
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
        // Successful login - save with 1 month expiration
        const now = new Date().getTime();
        const oneMonthInMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        const expiresAt = now + oneMonthInMs;

        const authData = {
            authenticated: true,
            expiresAt: expiresAt
        };

        localStorage.setItem('authData', JSON.stringify(authData));
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
        localStorage.removeItem('authData');
        showLoginScreen();

        // Clear the password input
        document.getElementById('passwordInput').value = '';
    }
}

// Initialize application after successful login
async function initializeApp() {
    // Initialize crypto section first
    await initializeCrypto();

    // Initialize ACN stocks section
    await initializeACN();

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

// Portfolio values for header display
let portfolioValues = {
    total: 0,
    fdusd: 0,
    acn: 0,
    on: 32050
};

// ===================================
// Tab Navigation
// ===================================

// Update header value based on active tab
function updateHeaderForTab(tabName) {
    const headerLabel = document.getElementById('headerLabel');
    const headerValue = document.getElementById('headerValue');

    switch(tabName) {
        case 'dashboard':
            headerLabel.textContent = 'Valor Total Portfolio';
            headerValue.textContent = formatCurrency(portfolioValues.total);
            break;
        case 'crypto':
            headerLabel.textContent = 'Valor FDUSD';
            headerValue.textContent = formatCurrency(portfolioValues.fdusd);
            break;
        case 'acn':
            headerLabel.textContent = 'Valor ACN';
            headerValue.textContent = formatCurrency(portfolioValues.acn);
            break;
        case 'on':
            headerLabel.textContent = 'Valor ON';
            headerValue.textContent = formatCurrency(portfolioValues.on);
            break;
        default:
            headerLabel.textContent = 'Valor Total Portfolio';
            headerValue.textContent = formatCurrency(portfolioValues.total);
    }
}

document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;

        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');

        // Update header value for the selected tab
        updateHeaderForTab(tabName);
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
    // Get FDUSD value
    const fdusdUsdValue = FDUSD_BALANCE * fdusdPrice;

    // Get ACN value
    const acnValue = ACN_SHARES * acnPrice;

    // Get ON annual income
    const onAnnualIncome = calculateAnnualONIncome();

    // Calculate FDUSD annual income
    const fdusdAnnualIncome = (FDUSD_BALANCE * APR) * fdusdPrice;

    // Calculate ACN annual dividend income
    const acnAnnualIncome = ACN_ANNUAL_DIVIDEND; // $184.96

    // Total portfolio value (we'll use nominal value for ON)
    const onValue = 32050; // Sum of all ON holdings (10050 + 10000 + 10000 + 2000)
    const totalValue = fdusdUsdValue + acnValue + onValue;

    // Total annual income (FDUSD staking + ON interest + ACN dividends)
    const totalAnnualIncome = fdusdAnnualIncome + onAnnualIncome + acnAnnualIncome;

    // Update global portfolio values for header display
    portfolioValues.fdusd = fdusdUsdValue;
    portfolioValues.acn = acnValue;
    portfolioValues.on = onValue;
    portfolioValues.total = totalValue;

    // Update dashboard summary cards
    document.getElementById('dashFdusdValue').textContent = formatCurrency(fdusdUsdValue);
    document.getElementById('dashONValue').textContent = formatCurrency(onValue);
    document.getElementById('dashACNValue').textContent = formatCurrency(acnValue);

    // Update header for current tab
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    updateHeaderForTab(activeTab);

    // Update FDUSD details
    document.getElementById('dashFdusdPrice').textContent = formatCurrency(fdusdPrice);
    document.getElementById('dashFdusdUSD').textContent = formatCurrency(fdusdUsdValue);
    document.getElementById('dashFdusdAnnual').textContent = formatCurrency(fdusdAnnualIncome);
    document.getElementById('dashFdusdMonthly').textContent = formatCurrency(fdusdAnnualIncome / 12);

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

// Cache last portfolio values to prevent unnecessary redraws
let lastPortfolioValues = { fdusd: 0, acn: 0, on: 0 };

function updatePortfolioChart() {
    const fdusdUsdValue = FDUSD_BALANCE * fdusdPrice;
    const acnValue = ACN_SHARES * acnPrice;
    const onValue = 32050;

    // Skip if prices not loaded yet
    if (fdusdPrice === 0 || acnPrice === 0) {
        return;
    }

    // Skip if values haven't changed (prevent unnecessary redraws)
    if (Math.abs(fdusdUsdValue - lastPortfolioValues.fdusd) < 1 &&
        Math.abs(acnValue - lastPortfolioValues.acn) < 1 &&
        Math.abs(onValue - lastPortfolioValues.on) < 1) {
        return;
    }

    // Update cached values
    lastPortfolioValues = { fdusd: fdusdUsdValue, acn: acnValue, on: onValue };

    const ctx = document.getElementById('portfolioChart').getContext('2d');

    if (portfolioChart) {
        portfolioChart.destroy();
    }

    portfolioChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['FDUSD', 'ACN Stocks', 'Obligaciones Negociables'],
            datasets: [{
                data: [fdusdUsdValue, acnValue, onValue],
                backgroundColor: [
                    '#f7931a',
                    '#10b981',
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

// Cache last prices used for income chart to prevent unnecessary redraws
let lastIncomeChartPrices = { fdusd: 0, acn: 0 };

function updateIncomeProjectionChart() {
    // Skip if prices not loaded yet
    if (fdusdPrice === 0 || acnPrice === 0) {
        return;
    }

    // Skip if prices haven't changed (prevent unnecessary redraws)
    if (Math.abs(fdusdPrice - lastIncomeChartPrices.fdusd) < 0.01 &&
        Math.abs(acnPrice - lastIncomeChartPrices.acn) < 0.01) {
        return;
    }

    // Update cached prices
    lastIncomeChartPrices = { fdusd: fdusdPrice, acn: acnPrice };

    const monthsLabels = [];
    const fdusdIncome = [];
    const onIncome = [];
    const acnIncome = [];

    // Calculate monthly compound rate for FDUSD (25% APR)
    const monthlyRate = Math.pow(1 + APR, 1/12) - 1; // Compound monthly rate
    let currentFdusdBalance = FDUSD_BALANCE;

    // Track monthly totals to detect outliers
    const monthlyTotals = [];

    for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        monthsLabels.push(date.toLocaleString('es', { month: 'short', year: '2-digit' }));

        // FDUSD monthly income with compound growth
        const monthlyFdusdGain = currentFdusdBalance * monthlyRate;
        const fdusdValue = monthlyFdusdGain * fdusdPrice;
        fdusdIncome.push(fdusdValue);
        currentFdusdBalance += monthlyFdusdGain; // Compound the balance

        // ON monthly income - get actual payments for this month
        const onPayment = getONPaymentForMonth(date);
        onIncome.push(onPayment);

        // ACN quarterly dividend income
        const month = date.getMonth();
        // ACN typically pays dividends in Feb, May, Aug, Nov (quarters)
        const isDividendMonth = (month === 1 || month === 4 || month === 7 || month === 10);
        const acnValue = isDividendMonth ? (ACN_ANNUAL_DIVIDEND / 4) : 0;
        acnIncome.push(acnValue);

        // Track total for outlier detection
        monthlyTotals.push(fdusdValue + onPayment + acnValue);
    }

    // Detect outliers and calculate appropriate Y-axis max
    const maxTotal = Math.max(...monthlyTotals);
    const normalMax = Math.max(...monthlyTotals.filter(val => val < 1500)); // Filter out large payments
    const suggestedYMax = normalMax < 1000 ? 1000 : Math.ceil(normalMax / 100) * 100 + 200;

    // Create dynamic colors for ON bars - highlight months with large payments
    const onColors = onIncome.map((payment, index) => {
        const total = monthlyTotals[index];
        return total > suggestedYMax ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)'; // Red for outliers, green for normal
    });
    const onBorderColors = onIncome.map((payment, index) => {
        const total = monthlyTotals[index];
        return total > suggestedYMax ? '#ef4444' : '#10b981';
    });

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
                    label: 'FDUSD',
                    data: fdusdIncome,
                    backgroundColor: 'rgba(247, 147, 26, 0.7)',
                    borderColor: '#f7931a',
                    borderWidth: 1
                },
                {
                    label: 'ON',
                    data: onIncome,
                    backgroundColor: onColors,
                    borderColor: onBorderColors,
                    borderWidth: 1
                },
                {
                    label: 'ACN Dividendos',
                    data: acnIncome,
                    backgroundColor: 'rgba(168, 85, 247, 0.7)',
                    borderColor: '#a855f7',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
                    mode: 'index',
                    intersect: false,
                    position: 'nearest',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#e2e8f0',
                    borderColor: '#475569',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: true,
                    titleFont: {
                        size: 13,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 12
                    },
                    callbacks: {
                        title: function(tooltipItems) {
                            return '📅 ' + tooltipItems[0].label;
                        },
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;

                            if (value === 0) return null; // Hide zero values

                            const formattedValue = formatCurrency(value);

                            // Add icons for better visual identification
                            let icon = '';
                            if (label === 'FDUSD') icon = '💵';
                            else if (label === 'ON') icon = '📄';
                            else if (label === 'ACN Dividendos') icon = '📈';

                            return icon + ' ' + label + ': ' + formattedValue;
                        },
                        afterBody: function(tooltipItems) {
                            const monthIndex = tooltipItems[0].dataIndex;
                            const total = monthlyTotals[monthIndex];

                            let text = '\n💰 Total: ' + formatCurrency(total);

                            // Only show warning for large payments
                            if (total > suggestedYMax) {
                                text += '\n⚠️ Pago grande (vencimiento ON)';
                            }

                            return text;
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
                    suggestedMax: suggestedYMax,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 100,
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
    // Parse date correctly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ===================================
// Crypto Management
// ===================================

const FDUSD_BALANCE = 12832; // FDUSD balance in USD
const APR = 0.1129; // 11.29%
let fdusdPrice = 1.00; // FDUSD is a stablecoin pegged to $1
let lastPriceUpdate = null;

// Fetch FDUSD price (stablecoin pegged to $1)
async function fetchFdusdPrice() {
    // FDUSD is a stablecoin pegged to $1, no need to fetch from API
    fdusdPrice = 1.00;
    lastPriceUpdate = new Date();

    // Save to localStorage
    localStorage.setItem('fdusdPrice', fdusdPrice);
    localStorage.setItem('lastPriceUpdate', lastPriceUpdate.toISOString());

    return fdusdPrice;
}

// Calculate earnings based on APR (using compound interest)
function calculateEarnings() {
    // Use compound interest formulas for accurate calculations
    const dailyRate = Math.pow(1 + APR, 1/365) - 1;
    const weeklyRate = Math.pow(1 + APR, 7/365) - 1;
    const monthlyRate = Math.pow(1 + APR, 1/12) - 1;
    const annualRate = APR;

    return {
        daily: FDUSD_BALANCE * dailyRate,
        weekly: FDUSD_BALANCE * weeklyRate,
        monthly: FDUSD_BALANCE * monthlyRate,
        annual: FDUSD_BALANCE * annualRate
    };
}

// Update crypto display
function updateCryptoDisplay() {
    const earnings = calculateEarnings();

    // Update price display (FDUSD is always $1)
    document.getElementById('fdusdPrice').textContent = formatCurrency(fdusdPrice);

    // Update USD value (FDUSD is 1:1 with USD)
    const totalUsdValue = FDUSD_BALANCE * fdusdPrice;
    document.getElementById('fdusdUsdValue').textContent = formatCurrency(totalUsdValue);

    // Update earnings in USD
    document.getElementById('dailyEarningsUsd').textContent = formatCurrency(earnings.daily * fdusdPrice);
    document.getElementById('weeklyEarningsUsd').textContent = formatCurrency(earnings.weekly * fdusdPrice);
    document.getElementById('monthlyEarningsUsd').textContent = formatCurrency(earnings.monthly * fdusdPrice);
    document.getElementById('annualEarningsUsd').textContent = formatCurrency(earnings.annual * fdusdPrice);

    // Update summary
    const finalBalance = FDUSD_BALANCE + earnings.annual;
    document.getElementById('summaryFinalUsd').textContent = formatCurrency(finalBalance * fdusdPrice);

    // Update last updated time
    if (lastPriceUpdate) {
        const timeAgo = getTimeAgo(lastPriceUpdate);
        document.getElementById('lastUpdated').textContent = `Actualizado ${timeAgo}`;
    }

    // Update crypto earnings (in FDUSD, which equals USD)
    document.getElementById('dailyEarningsCrypto').textContent = formatCurrency(earnings.daily);
    document.getElementById('weeklyEarningsCrypto').textContent = formatCurrency(earnings.weekly);
    document.getElementById('monthlyEarningsCrypto').textContent = formatCurrency(earnings.monthly);
    document.getElementById('annualEarningsCrypto').textContent = formatCurrency(earnings.annual);

    // Update summary
    document.getElementById('summaryYearlyGains').textContent = formatCurrency(earnings.annual);
    document.getElementById('summaryFinalBalance').textContent = formatCurrency(finalBalance);
}

// Refresh crypto data
async function refreshCryptoData() {
    const btn = document.querySelector('.crypto-refresh-btn');
    const originalText = btn.textContent;

    btn.textContent = '🔄 Actualizando...';
    btn.disabled = true;

    await fetchFdusdPrice();
    updateCryptoDisplay();

    btn.textContent = originalText;
    btn.disabled = false;

    showNotification('Precio actualizado correctamente');
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
    await fetchFdusdPrice();
    updateCryptoDisplay();

    // Auto-refresh every 5 minutes (though FDUSD price doesn't change)
    setInterval(async () => {
        await fetchFdusdPrice();
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
        couponRate: 0.065,
        maturityDate: '2027-03-06',
        paymentDates: [
            { date: '2026-03-06', type: 'Interés', amount: 321.70 },
            { date: '2026-09-06', type: 'Interés', amount: 321.70 },
            { date: '2027-03-06', type: 'Interés + Amortización', amount: 10371.70 }
        ]
    },
    {
        ticker: 'YM35D',
        name: 'YPF - Serie XXXV',
        holdings: 10000,
        couponRate: 0.0625,
        maturityDate: '2027-03-01',
        paymentDates: [
            { date: '2025-11-27', type: 'Interés', amount: 153.90 },
            { date: '2026-02-27', type: 'Interés', amount: 153.90 },
            { date: '2026-05-27', type: 'Interés', amount: 153.90 },
            { date: '2026-08-27', type: 'Interés', amount: 153.90 },
            { date: '2026-11-27', type: 'Interés', amount: 153.90 },
            { date: '2027-03-01', type: 'Interés + Amortización', amount: 10153.90 }
        ]
    },
    {
        ticker: 'YM37D',
        name: 'YPF - Serie XXXVII',
        holdings: 10000,
        couponRate: 0.07,
        maturityDate: '2027-05-07',
        paymentDates: [
            { date: '2025-11-07', type: 'Interés', amount: 172.30 },
            { date: '2026-02-09', type: 'Interés', amount: 172.30 },
            { date: '2026-05-07', type: 'Interés', amount: 172.30 },
            { date: '2026-08-07', type: 'Interés', amount: 172.30 },
            { date: '2026-11-09', type: 'Interés', amount: 172.30 },
            { date: '2027-02-08', type: 'Interés', amount: 172.30 },
            { date: '2027-05-07', type: 'Interés + Amortización', amount: 10172.30 }
        ]
    },
    {
        ticker: 'T652D',
        name: 'Tarjeta Naranja',
        holdings: 2000,
        couponRate: 0.074,
        maturityDate: '2026-05-26',
        paymentDates: [
            { date: '2025-11-26', type: 'Interés', amount: 36.00 },
            { date: '2026-02-26', type: 'Interés', amount: 36.00 },
            { date: '2026-05-26', type: 'Interés + Amortización', amount: 2036.00 }
        ]
    }
];

// Get total ON payments for a specific month
function getONPaymentForMonth(targetDate) {
    let totalPayment = 0;
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    obligacionesNegociables.forEach(on => {
        on.paymentDates.forEach(payment => {
            // Parse date correctly to avoid timezone issues
            const [year, month, day] = payment.date.split('-').map(Number);
            const paymentDate = new Date(year, month - 1, day);

            if (paymentDate.getMonth() === targetMonth && paymentDate.getFullYear() === targetYear) {
                totalPayment += payment.amount;
            }
        });
    });

    return totalPayment;
}

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

// Get all payments (not just upcoming ones)
function getUpcomingPayments() {
    const allPayments = [];

    obligacionesNegociables.forEach(on => {
        on.paymentDates.forEach(payment => {
            // Parse date correctly to avoid timezone issues
            const [year, month, day] = payment.date.split('-').map(Number);
            const paymentDate = new Date(year, month - 1, day);

            allPayments.push({
                ticker: on.ticker,
                name: on.name,
                date: paymentDate,
                dateStr: payment.date,
                type: payment.type,
                amount: payment.amount
            });
        });
    });

    // Sort by date
    allPayments.sort((a, b) => a.date - b.date);

    return allPayments;
}

// Get next payment
function getNextPayment() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    let nextPayment = null;

    obligacionesNegociables.forEach(on => {
        on.paymentDates.forEach(payment => {
            // Parse date correctly to avoid timezone issues
            const [year, month, day] = payment.date.split('-').map(Number);
            const paymentDate = new Date(year, month - 1, day);

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
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    let totalIncome = 0;

    obligacionesNegociables.forEach(on => {
        on.paymentDates.forEach(payment => {
            // Parse date correctly to avoid timezone issues
            const [year, month, day] = payment.date.split('-').map(Number);
            const paymentDate = new Date(year, month - 1, day);

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
        timelineContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay pagos registrados</p>';
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
// ACN Stocks Management
// ===================================

const ACN_SHARES = 34;
const ACN_AVG_PRICE = 246.34; // Precio promedio de compra
const ACN_TOTAL_INVESTED = ACN_SHARES * ACN_AVG_PRICE;
const ACN_DIVIDEND_PER_SHARE = 5.44; // Dividendo anual por acción (USD)
const ACN_ANNUAL_DIVIDEND = ACN_SHARES * ACN_DIVIDEND_PER_SHARE; // ~$184.96
let acnPrice = 0;
let acnPreviousClose = 0;
let acnLastUpdate = null;

// Fetch ACN stock price from Finnhub API (free tier, CORS-friendly)
// NOTE: To get real-time prices, get a free API key at https://finnhub.io/register
// Replace 'demo' with your API key in the URL below
async function fetchACNPrice() {
    try {
        const API_KEY = 'demo'; // Replace with your free Finnhub API key
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=ACN&token=${API_KEY}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Finnhub returns: {c: current, pc: previous close, ...}
        if (data && data.c && data.c > 0) {
            const newPrice = data.c;
            const newPreviousClose = data.pc || newPrice;

            // Only update if price actually changed (prevent unnecessary chart updates)
            if (Math.abs(newPrice - acnPrice) > 0.01) {
                acnPrice = newPrice;
                acnPreviousClose = newPreviousClose;
                acnLastUpdate = new Date();

                // Save to localStorage
                localStorage.setItem('acnPrice', acnPrice);
                localStorage.setItem('acnPreviousClose', acnPreviousClose);
                localStorage.setItem('acnLastUpdate', acnLastUpdate.toISOString());

                return acnPrice;
            }

            // Price unchanged, just update the timestamp
            acnLastUpdate = new Date();
            return acnPrice;
        } else {
            throw new Error('Invalid response from API');
        }
    } catch (error) {
        console.warn('⚠️ No se pudo obtener precio en tiempo real de ACN.');
        console.info('💡 Para obtener precios actualizados, registra una API key gratuita en: https://finnhub.io/register');
        console.info('📝 Luego reemplaza "demo" en app.js línea 823 con tu API key');

        // Try to load from localStorage as fallback
        const savedPrice = localStorage.getItem('acnPrice');
        if (savedPrice) {
            acnPrice = parseFloat(savedPrice);
            const savedPreviousClose = localStorage.getItem('acnPreviousClose');
            if (savedPreviousClose) {
                acnPreviousClose = parseFloat(savedPreviousClose);
            }
            const savedUpdate = localStorage.getItem('acnLastUpdate');
            if (savedUpdate) {
                acnLastUpdate = new Date(savedUpdate);
            }
            console.info('✓ Usando precio guardado anteriormente: $' + acnPrice.toFixed(2));
            return acnPrice;
        }

        // If no saved data, use the average price as fallback
        acnPrice = ACN_AVG_PRICE;
        acnPreviousClose = ACN_AVG_PRICE;
        console.info('✓ Usando precio promedio de compra: $' + acnPrice.toFixed(2));
        return acnPrice;
    }
}

// Calculate ACN investment metrics
function calculateACNMetrics() {
    const currentValue = ACN_SHARES * acnPrice;
    const gainLoss = currentValue - ACN_TOTAL_INVESTED;
    const gainLossPercent = ((gainLoss / ACN_TOTAL_INVESTED) * 100);

    const dayChange = acnPrice - acnPreviousClose;
    const dayChangePercent = ((dayChange / acnPreviousClose) * 100);
    const dayChangeValue = ACN_SHARES * dayChange;

    return {
        currentValue,
        gainLoss,
        gainLossPercent,
        dayChange,
        dayChangePercent,
        dayChangeValue
    };
}

// Update ACN display
function updateACNDisplay() {
    const metrics = calculateACNMetrics();

    // Update price display
    if (acnPrice > 0) {
        document.getElementById('acnPrice').textContent = formatCurrency(acnPrice);

        // Update total value
        document.getElementById('acnTotalValue').textContent = formatCurrency(metrics.currentValue);
        document.getElementById('acnCurrentValueUsd').textContent = formatCurrency(metrics.currentValue);
        document.getElementById('acnMarketValue').textContent = formatCurrency(metrics.currentValue);

        // Update gain/loss
        const gainLossElement = document.getElementById('acnGainLossUsd');
        const gainLossPercentElement = document.getElementById('acnGainLossPercent');
        const totalGainLossElement = document.getElementById('acnTotalGainLoss');

        gainLossElement.textContent = formatCurrency(metrics.gainLoss);
        gainLossPercentElement.textContent = (metrics.gainLossPercent >= 0 ? '+' : '') + metrics.gainLossPercent.toFixed(2) + '%';
        totalGainLossElement.textContent = formatCurrency(metrics.gainLoss);

        // Apply color based on gain/loss
        if (metrics.gainLoss >= 0) {
            gainLossElement.style.color = 'var(--success-color)';
            gainLossPercentElement.style.color = 'var(--success-color)';
            totalGainLossElement.style.color = 'var(--success-color)';
        } else {
            gainLossElement.style.color = 'var(--danger-color)';
            gainLossPercentElement.style.color = 'var(--danger-color)';
            totalGainLossElement.style.color = 'var(--danger-color)';
        }

        // Update day change
        const dayChangeElement = document.getElementById('acnDayChangeUsd');
        const dayChangePercentElement = document.getElementById('acnDayChange');

        dayChangeElement.textContent = formatCurrency(metrics.dayChangeValue);
        dayChangePercentElement.textContent = (metrics.dayChangePercent >= 0 ? '+' : '') + metrics.dayChangePercent.toFixed(2) + '%';

        // Apply color based on day change
        if (metrics.dayChangePercent >= 0) {
            dayChangeElement.style.color = 'var(--success-color)';
            dayChangePercentElement.style.color = 'var(--success-color)';
        } else {
            dayChangeElement.style.color = 'var(--danger-color)';
            dayChangePercentElement.style.color = 'var(--danger-color)';
        }

        // Update last updated time
        if (acnLastUpdate) {
            const timeAgo = getTimeAgo(acnLastUpdate);
            document.getElementById('acnLastUpdated').textContent = `Actualizado ${timeAgo}`;
        }

        // Update dividend yield based on current price
        const dividendYield = (ACN_DIVIDEND_PER_SHARE / acnPrice) * 100;
        document.getElementById('acnDividendYield').textContent = `~${dividendYield.toFixed(2)}%`;
    } else {
        document.getElementById('acnPrice').textContent = 'Error al cargar';
        document.getElementById('acnTotalValue').textContent = 'Error';
    }
}

// Refresh ACN data
async function refreshACNData() {
    const btn = document.querySelector('.crypto-refresh-btn[onclick="refreshACNData()"]');
    const originalText = btn.textContent;

    btn.textContent = '🔄 Actualizando...';
    btn.disabled = true;

    await fetchACNPrice();
    updateACNDisplay();
    updateDashboard(); // Update main dashboard with new ACN data

    btn.textContent = originalText;
    btn.disabled = false;

    showNotification('Precio de ACN actualizado correctamente');
}

// Initialize ACN data
async function initializeACN() {
    // Load from localStorage if available, otherwise use average price
    const savedPrice = localStorage.getItem('acnPrice');
    if (savedPrice) {
        acnPrice = parseFloat(savedPrice);
        const savedPreviousClose = localStorage.getItem('acnPreviousClose');
        if (savedPreviousClose) {
            acnPreviousClose = parseFloat(savedPreviousClose);
        }
        const savedUpdate = localStorage.getItem('acnLastUpdate');
        if (savedUpdate) {
            acnLastUpdate = new Date(savedUpdate);
        }
    } else {
        // Use average purchase price as default (no API call on startup)
        acnPrice = ACN_AVG_PRICE;
        acnPreviousClose = ACN_AVG_PRICE;
    }

    updateACNDisplay();

    // NOTE: Auto-refresh disabled to prevent chart resize issues
    // Users can manually refresh using the button to get real-time prices
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
    const authData = localStorage.getItem('authData');
    if (authData) {
        try {
            const { authenticated, expiresAt } = JSON.parse(authData);
            const now = new Date().getTime();
            if (authenticated === true && now < expiresAt) {
                initializeApp();
            }
        } catch (error) {
            // Invalid auth data, ignore
        }
    }
});
