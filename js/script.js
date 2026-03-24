/* ============================================================
   CUSTOMPLAN FINANCIAL GIC — APP LOGIC
   Live rates via Monarch Wealth API
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── State ──────────────────────────────────────────────
    let ratesData = null;

    const API = prov =>
        `https://api.monarchwealth.ca/gic-rates/public/province/${prov}`;

    const LABELS = {
        NonReg: 'Non-Registered', TFSA: 'TFSA', RSP: 'RRSP',
        RIF: 'RRIF', LIF: 'LIF', Corp: 'Corporate',
        US: 'USD GIC', Foreign: 'Foreign Currency',
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
            if (el) el.innerHTML = '<p style="padding:2rem;color:#666">Unable to load current rates. Please contact us directly at 1-866-253-0030.</p>';
        }
    }

    function renderAll(data) {
        renderHeroRate(data);
        renderDate(data);
        renderBestNonReg(data);
        renderRegisteredTable(data, 'TFSA');
        renderCorporateTable(data, 'Corp');
    }

    // ── Hero best rate ──────────────────────────────────────
    function renderHeroRate(data) {
        let best = { rate: 0, term: '', type: 'NonReg' };
        for (const row of data.rates) {
            if (row.NonReg && row.NonReg.rate > best.rate) {
                best = { rate: row.NonReg.rate, term: row.term, type: 'NonReg' };
            }
        }
        const rateEl = document.getElementById('hero-best-rate');
        const termEl = document.getElementById('hero-best-term');
        if (rateEl) rateEl.textContent = best.rate.toFixed(2);
        if (termEl) termEl.textContent =
            `${best.term}-Year Non-Registered GIC — Subject to change`;
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
                <a href="#contact-inline" class="brc-cta">Get This Rate</a>
            `;
            container.appendChild(card);
        }
    }

    // ── Registered Table ────────────────────────────────────
    function renderRegisteredTable(data, type) {
        const el = document.getElementById('registered-table');
        if (el) { el.innerHTML = buildTable(data, type); bindRateBtns(el, '#contact-inline'); }
    }
    function renderCorporateTable(data, type) {
        const el = document.getElementById('corporate-table');
        if (el) { el.innerHTML = buildTable(data, type); bindRateBtns(el, '#contact-inline'); }
    }

    function buildTable(data, type) {
        const label  = LABELS[type] || type;
        const sorted = [...data.rates].sort((a, b) => +a.term - +b.term);

        let rows = '';
        for (const item of sorted) {
            const info = item[type];
            if (!info) continue;
            const r    = info.rate;
            const term = parseInt(item.term);
            const proj = (100000 * Math.pow(1 + r / 100, term)).toFixed(0);
            const earn = (parseInt(proj) - 100000).toLocaleString('en-CA');
            rows += `<tr>
                <td class="td-term">${item.term} Year</td>
                <td class="td-rate">${r.toFixed(2)}%</td>
                <td>${label}</td>
                <td class="td-projected">
                    $${parseInt(proj).toLocaleString('en-CA')}<br>
                    <span style="font-size:0.75rem;color:var(--text-light)">+$${earn} interest on $100k</span>
                </td>
                <td><button class="btn-rate">Get This Rate</button></td>
            </tr>`;
        }

        if (!rows) return `<p style="padding:1.5rem 2rem;color:var(--text-light);font-size:0.9rem">Rates for ${label} are not currently available for the selected province. Please contact us.</p>`;

        return `<table class="rates-table">
            <thead><tr>
                <th>Term</th><th>Rate</th><th>Account Type</th>
                <th>Projected Value (illustrative, $100k)</th><th>Action</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    // ── Rate buttons → scroll to inline contact form ────────
    function bindRateBtns(container, target) {
        container.querySelectorAll('.btn-rate').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
            });
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

    // ── Lead forms (both inline and bottom) ─────────────────
    function setupForm(formId, successId) {
        const form = document.getElementById(formId);
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            form.style.display = 'none';
            const successEl = document.getElementById(successId);
            if (successEl) successEl.style.display = 'block';
        });
    }
    setupForm('gic-lead-form-inline', 'success-inline');
    setupForm('gic-lead-form-bottom', 'success-bottom');

    // ── Nav active state on scroll ──────────────────────────
    const nav = document.getElementById('main-nav');
    window.addEventListener('scroll', () => {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
        const ids = ['rates', 'deposit-insurance', 'faq', 'contact-bottom'];
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
    const hbg      = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hbg) hbg.addEventListener('click', () => navLinks?.classList.toggle('open'));
    document.querySelectorAll('.nav-link').forEach(a => {
        a.addEventListener('click', () => navLinks?.classList.remove('open'));
    });

    // ── Hero Slideshow ──────────────────────────────────────
    const slides    = document.querySelectorAll('.hero-slide');
    const dots      = document.querySelectorAll('.hero-dot');
    let current     = 0;
    let slideshowTimer;

    function goToSlide(n) {
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = (n + slides.length) % slides.length;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
    }

    function nextSlide() { goToSlide(current + 1); }

    function startTimer() {
        slideshowTimer = setInterval(nextSlide, 5000);
    }

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            clearInterval(slideshowTimer);
            goToSlide(i);
            startTimer();
        });
    });

    if (slides.length > 1) startTimer();

    // ── Init ────────────────────────────────────────────────
    fetchRates('ON');
});
