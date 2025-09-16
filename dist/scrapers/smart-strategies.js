// Minimal smart strategies helper (restored)
function withFallback(fn, fallback) {
    try {
        const val = fn();
        return val == null ? fallback : val;
    }
    catch (_a) {
        return fallback;
    }
}
function getSmartDateStrategy(scraper = 'default') {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    try {
        switch (String(scraper).toLowerCase()) {
            case 'jsearch':
            case 'muse':
            case 'jooble':
            case 'greenhouse':
            case 'adzuna':
                // weekdays: wider; weekends: freshest
                if (day === 0 || day === 6)
                    return '3';
                return hour < 12 ? '3' : '7';
            default:
                return '7';
        }
    }
    catch (_a) {
        return '7';
    }
}
function getSmartPaginationStrategy(scraper = 'default') {
    const hour = new Date().getHours();
    try {
        switch (String(scraper).toLowerCase()) {
            case 'jsearch':
            case 'muse':
            case 'jooble':
            case 'adzuna':
                if (hour < 8)
                    return { startPage: 1, endPage: 2 };
                if (hour < 16)
                    return { startPage: 1, endPage: 3 };
                return { startPage: 1, endPage: 5 };
            default:
                return { startPage: 1, endPage: 3 };
        }
    }
    catch (_a) {
        return { startPage: 1, endPage: 3 };
    }
}
module.exports = { withFallback, getSmartDateStrategy, getSmartPaginationStrategy };
