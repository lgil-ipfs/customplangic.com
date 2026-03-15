/* ============================================================
   CUSTOMPLAN FINANCIAL GIC — APP LOGIC
   Live rates via Monarch Wealth API
   Charts via Chart.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── State ──────────────────────────────────────────────
    let ratesData  = null;
    let barChart   = null;
    let growthChart= null;
    let calcChart  = null;
    let calcTerm   = 1;

    const API = prov =>
        `https://api.monarchwealth.ca/gic-rates/public/province/${prov}`;

    const LABELS = {
        NonReg: 'Non-Registered', TFSA: 'TFSA', RSP: 'RRSP',
        RIF: 'RRIF', LIF: 'LIF', Corp: 'Corporate',
        US: 'USD GIC', Foreign: 'Foreign Currency',
    };

    const CHART_COLORS = {
        NonReg: 'rgba(28,38,54,0.85)',   // charcoal
        TFSA:   'rgba(45,122,79,0.85)',   // green
        RSP:    'rgba(154,123,47,0.85)',  // gold
        RIF:    'rgba(62,96,140,0.85)',   // slate blue
        LIF:    'rgba(122,45,45,0.85)',   // muted red
        Corp:   'rgba(90,75,120,0.85)',   // muted purple
        US:     'rgba(90,110,90,0.85)',   // sage
        Foreign:'rgba(110,90,70,0.85)',   // warm brown
    };

    // ── Fetch ──────────────────────────────────────────────
    async function fetchRates(province) {
        try {
            const res = await fetch(API(province));
            if (!res.ok) throw new Error('Network error');
            ratesData = await res.json();
            renderAll(ratesData);
        } catch (e) {
            console.error('Rate fetch error:', e);
            const el = document.getElementById('nonreg-rates');
            if (el) el.innerHTML = '<p style="padding:2rem;color:#666">Unable to load current rates. Please contact us directly.</p>';
        }
    }

    function renderAll(data) {
        renderHeroRate(data);
        renderDate(data);
        renderBestNonReg(data);
        renderRegisteredTable(data, 'TFSA');
        renderCorporateTable(data, 'Corp');
        renderBarChart(data);
        renderGrowthChart(data);
        updateCalculator(data);
    }

    // ── Hero best rate ──────────────────────────────────────
    function renderHeroRate(data) {
        // Find the overall highest single rate across all types
        let best = { rate: 0, term: '', type: '' };
        for (const row of data.rates) {
            for (const [type, info] of Object.entries(row)) {
                if (type === 'term') continue;
                if (info?.rate > best.rate) {
                    best = { rate: info.rate, term: row.term, type };
                }
            }
        }
        const rateEl = document.getElementById('hero-best-rate');
        const termEl = document.getElementById('hero-best-term');
        if (rateEl) rateEl.textContent = best.rate.toFixed(2);
        if (termEl) termEl.textContent =
            `${best.term}-Year ${LABELS[best.type] || best.type} — Subject to change`;
    }

    // ── Date ───────────────────────────────────────────────
    function renderDate(data) {
        const el = document.getElementById('rates-date');
        if (el && data.effective) {
            el.textContent = new Date(data.effective).toLocaleDateString('en-CA', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    }

    // ── Best Non-Reg Cards ──────────────────────────────────
    function renderBestNonReg(data) {
        const container = document.getElementById('nonreg-rates');
        if (!container) return;
        container.innerHTML = '';

        const sorted = [...data.rates].sort((a, b) => +a.term - +b.term);
        const maxRate = Math.max(...sorted.map(r => r.NonReg?.rate || 0));

        for (const item of sorted) {
            const rate = item.NonReg?.rate;
            if (!rate) continue;

            const isTop = rate === maxRate;
            const card  = document.createElement('div');
            card.className = 'best-rate-card' + (isTop ? ' top-rate' : '');

            card.innerHTML = `
                ${isTop ? '<div class="top-rate-badge">Best Available</div>' : '<div style="height:1.4rem"></div>'}
                <div class="brc-term">${item.term}-Year Term</div>
                <div class="brc-rate">${rate.toFixed(2)}<sup>%</sup></div>
                <div class="brc-label">Per annum</div>
                <div class="brc-tag">Non-Registered GIC</div>
                <a href="#contact" class="brc-cta">Request This Rate</a>
            `;
            container.appendChild(card);
        }
    }

    // ── Registered Table ────────────────────────────────────
    function renderRegisteredTable(data, type) {
        const el = document.getElementById('registered-table');
        if (el) { el.innerHTML = buildTable(data, type); bindRateBtns(el); }
    }
    function renderCorporateTable(data, type) {
        const el = document.getElementById('corporate-table');
        if (el) { el.innerHTML = buildTable(data, type); bindRateBtns(el); }
    }

    function buildTable(data, type) {
        const label  = LABELS[type] || type;
        const sorted = [...data.rates].sort((a, b) => +a.term - +b.term);

        let rows = '';
        for (const item of sorted) {
            const info = item[type];
            if (!info) continue;
            const r     = info.rate;
            const term  = parseInt(item.term);
            const proj  = (100000 * Math.pow(1 + r / 100, term)).toFixed(0);
            const earn  = (parseInt(proj) - 100000).toLocaleString('en-CA');
            rows += `<tr>
                <td class="td-term">${item.term} Year</td>
                <td class="td-rate">${r.toFixed(2)}%</td>
                <td>${label}</td>
                <td class="td-projected">
                    $${parseInt(proj).toLocaleString('en-CA')}<br>
                    <span style="font-size:0.75rem;color:var(--text-light)">+$${earn} interest on $100k</span>
                </td>
                <td><button class="btn-rate" data-rate="${r}" data-term="${item.term}">Request Rate</button></td>
            </tr>`;
        }

        if (!rows) return `<p style="padding:1.5rem 2rem;color:var(--text-light);font-size:0.9rem">Rates for ${label} are not currently available for the selected province. Please contact us.</p>`;

        return `<table class="rates-table">
            <thead><tr>
                <th>Term</th><th>Rate</th><th>Account Type</th>
                <th>Projected Value (illustrative)</th><th>Action</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    function bindRateBtns(container) {
        container.querySelectorAll('.btn-rate').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    // ── Bar Chart ───────────────────────────────────────────
    function renderBarChart(data) {
        const ctx = document.getElementById('ratesBarChart');
        if (!ctx) return;
        const c = ctx.getContext('2d');
        const terms = data.rates.map(r => `${r.term}yr`).sort();
        const types = ['NonReg', 'TFSA', 'RSP', 'RIF', 'Corp'];

        const datasets = types.map(type => ({
            label: LABELS[type],
            data: [...data.rates]
                .sort((a, b) => +a.term - +b.term)
                .map(r => r[type]?.rate ?? null),
            backgroundColor: CHART_COLORS[type],
            borderRadius: 3,
            borderSkipped: false,
        }));

        if (barChart) barChart.destroy();
        barChart = new Chart(c, {
            type: 'bar',
            data: { labels: terms, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10, color: '#445166' } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw?.toFixed(2)}%` } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#6B7685', font: { size: 11 } } },
                    y: {
                        min: 2, max: 4.5,
                        ticks: { callback: v => v.toFixed(1) + '%', color: '#6B7685', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    }

    // ── Growth Line Chart ───────────────────────────────────
    function renderGrowthChart(data) {
        const ctx = document.getElementById('growthLineChart');
        if (!ctx) return;
        const c = ctx.getContext('2d');
        const fiveYr = data.rates.find(r => r.term === '5');
        if (!fiveYr) return;

        const principal = 100000;
        const years = [0, 1, 2, 3, 4, 5];
        const types = ['NonReg', 'TFSA', 'RSP'];

        const datasets = types.map(type => {
            const rate = (fiveYr[type]?.rate || 0) / 100;
            return {
                label: LABELS[type],
                data: years.map(y => +(principal * Math.pow(1 + rate, y)).toFixed(2)),
                borderColor: CHART_COLORS[type].replace('0.85', '1'),
                backgroundColor: CHART_COLORS[type].replace('0.85', '0.06'),
                borderWidth: 2,
                fill: true, tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: CHART_COLORS[type].replace('0.85', '1'),
            };
        });

        if (growthChart) growthChart.destroy();
        growthChart = new Chart(c, {
            type: 'line',
            data: { labels: years.map(y => `Year ${y}`), datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10, color: '#445166' } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.raw.toLocaleString('en-CA')}` } }
                },
                scales: {
                    y: {
                        ticks: { callback: v => '$' + Math.round(v / 1000) + 'k', color: '#6B7685', font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: { grid: { display: false }, ticks: { color: '#6B7685', font: { size: 11 } } }
                }
            }
        });
    }

    // ── Calculator ──────────────────────────────────────────
    function updateCalculator(data) {
        const amtInput  = document.getElementById('calc-amount');
        const typeSelect= document.getElementById('calc-type');
        if (!amtInput || !typeSelect) return;

        const refresh = () => {
            const amount  = parseFloat(amtInput.value) || 100000;
            const typeKey = typeSelect.value;
            const termRow = data.rates.find(r => r.term === String(calcTerm));
            const rate    = termRow?.[typeKey]?.rate ?? null;

            if (rate === null) {
                ['res-rate','res-interest','res-total'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = 'N/A';
                });
                return;
            }

            const total    = amount * Math.pow(1 + rate / 100, calcTerm);
            const interest = total - amount;

            const fmt = (n) => '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('res-rate').textContent     = rate.toFixed(2) + '%';
            document.getElementById('res-interest').textContent = fmt(interest);
            document.getElementById('res-total').textContent    = fmt(total);

            renderCalcChart(amount, rate, calcTerm);
        };

        amtInput.addEventListener('input', refresh);
        typeSelect.addEventListener('change', refresh);

        document.querySelectorAll('.term-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.term-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                calcTerm = parseInt(btn.dataset.term);
                refresh();
            });
        });

        refresh();
    }

    function renderCalcChart(amount, rate, term) {
        const ctx = document.getElementById('calcGrowthChart');
        if (!ctx) return;
        const c = ctx.getContext('2d');

        const years     = Array.from({ length: term + 1 }, (_, i) => i);
        const principal = years.map(() => amount);
        const interest  = years.map(y => +(amount * Math.pow(1 + rate / 100, y) - amount).toFixed(2));

        if (calcChart) calcChart.destroy();
        calcChart = new Chart(c, {
            type: 'bar',
            data: {
                labels: years.map(y => y === 0 ? 'Start' : `Year ${y}`),
                datasets: [
                    { label: 'Principal', data: principal, backgroundColor: 'rgba(68,81,102,0.7)', borderRadius: 4, stack: 's' },
                    { label: 'Interest Earned', data: interest, backgroundColor: 'rgba(154,123,47,0.85)', borderRadius: 4, stack: 's' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#445166', font: { size: 11 }, boxWidth: 12, padding: 10 } },
                    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.raw.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` } }
                },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: '#6B7685', font: { size: 11 } } },
                    y: { stacked: true, ticks: { callback: v => '$' + Math.round(v / 1000) + 'k', color: '#6B7685', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
                }
            }
        });
    }

    // ── Province selector ───────────────────────────────────
    const provSel = document.getElementById('province-select');
    if (provSel) provSel.addEventListener('change', e => fetchRates(e.target.value));

    // ── Tab switching — Registered ──────────────────────────
    document.querySelectorAll('#reg-rates .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#reg-rates .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (ratesData) renderRegisteredTable(ratesData, btn.dataset.type);
        });
    });

    // ── Tab switching — Corporate ───────────────────────────
    document.querySelectorAll('#other-rates .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#other-rates .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (ratesData) renderCorporateTable(ratesData, btn.dataset.type);
        });
    });

    // ── FAQ accordion ───────────────────────────────────────
    document.querySelectorAll('.faq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const item   = btn.closest('.faq-item');
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item.open').forEach(i => {
                i.classList.remove('open');
                i.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
            });
            if (!isOpen) {
                item.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // ── Lead form ───────────────────────────────────────────
    const form = document.getElementById('gic-lead-form');
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());
            console.log('Lead submitted:', data);
            form.style.display = 'none';
            document.getElementById('success-message').style.display = 'block';
            form.reset();
        });
    }

    // ── Nav scroll ──────────────────────────────────────────
    const nav = document.getElementById('main-nav');
    window.addEventListener('scroll', () => {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
        // Highlight active nav
        const ids = ['rates', 'how-it-works', 'deposit-insurance', 'faq', 'contact'];
        let current = '';
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el && window.scrollY >= el.offsetTop - 140) current = id;
        }
        document.querySelectorAll('.nav-link').forEach(a => {
            const href = a.getAttribute('href')?.replace('#', '');
            a.classList.toggle('active', href === current);
        });
    }, { passive: true });

    // ── Hamburger ───────────────────────────────────────────
    const hbg = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hbg) hbg.addEventListener('click', () => navLinks?.classList.toggle('open'));
    document.querySelectorAll('.nav-link').forEach(a => {
        a.addEventListener('click', () => navLinks?.classList.remove('open'));
    });

    // ── Init ────────────────────────────────────────────────
    fetchRates('ON');
});
