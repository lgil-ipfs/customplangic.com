/* ============================================================
   CUSTOMPLAN GIC - APP LOGIC
   Fetching rates from Monarch Wealth API
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const ratesGrid = document.querySelector('.rates-grid');
    const leadForm = document.getElementById('gic-lead-form');
    const formOverlay = document.getElementById('form-overlay');
    const successMessage = document.getElementById('success-message');

    // Default province if not specified
    const PROVINCE = 'ON';
    const API_URL = `https://api.monarchwealth.ca/gic-rates/public/province/${PROVINCE}`;

    // --- 1. FETCH GIC RATES ---
    async function fetchRates() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            // Map the API data to the UI
            renderRates(data);
        } catch (error) {
            console.error('Error fetching GIC rates:', error);
            ratesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Unable to load current rates. Please contact us for the latest information.</p>';
        }
    }

    function renderRates(data) {
        // Find rates for NonReg or RSP (typically the highest representative rates)
        // Let's pick 1, 2, 3, 5 year terms as they are standard
        const terms = [1, 2, 3, 5];
        const rateItems = data.rates.filter(r => terms.includes(parseInt(r.term)));
        
        ratesGrid.innerHTML = ''; // Clear skeleton/loading

        rateItems.sort((a, b) => parseInt(a.term) - parseInt(b.term)).forEach(item => {
            // Pick NonReg or Corp as representative rate (often the highest)
            const rate = item.NonReg ? item.NonReg.rate : item.highestRates[item.term];
            
            const card = document.createElement('div');
            card.className = 'rate-card';
            card.innerHTML = `
                <h3>${item.term} Year Term</h3>
                <div class="rate-value">${rate.toFixed(2)}<span>%</span></div>
                <p style="margin-bottom: 1.5rem; color: var(--gray-text); font-size: 0.9rem;">Guaranteed Annual Return</p>
                <a href="#get-rate" class="btn-small">Get This Rate</a>
            `;
            
            // Add click listener to scroll to form and prepopulate message
            card.querySelector('.btn-small').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('lead-section').scrollIntoView({ behavior: 'smooth' });
                const message = `I am interested in the ${item.term} Year GIC at ${rate.toFixed(2)}%.`;
                // If I had a message field, I'd put it there. 
                // Since it's a "super simple" form, I'll just focus the first input.
                document.getElementById('name').focus();
            });

            ratesGrid.appendChild(card);
        });
    }

    // --- 2. LEAD FORM HANDLING ---
    if (leadForm) {
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Extract form data
            const formData = new FormData(leadForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone')
            };

            // Log data for "tracking" (in real app, send to server)
            console.log('Lead Submission:', data);

            // Show success message
            leadForm.style.display = 'none';
            successMessage.style.display = 'block';

            // Reset form
            leadForm.reset();
        });
    }

    // Initialize
    fetchRates();
});
