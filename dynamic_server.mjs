import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8080;
const root = path.join(__dirname, 'public');
const templateDir = path.join(__dirname, 'templates');

// Try to open DB (read-only). If it doesn't exist or isn't useful, we'll fall back to CSV.
const dbPath = path.join(__dirname, 'alcohol.sqlite3');
let db = null;
try {
    if (fs.existsSync(dbPath)) {
        db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.log('Error connecting to database:', err.message);
                db = null;
            } else {
                console.log('Successfully connected to database');
            }
        });
    } else {
        console.log('Database not found, will use CSV fallback');
    }
} catch (e) {
    console.log('DB check failed, using CSV fallback', e?.message || e);
}

// Simple CSV fallback loader for `drinks.csv` (alcohol data). Produces an array of objects.
const csvPath = path.join(__dirname, 'drinks.csv');
let drinks = [];
if (fs.existsSync(csvPath)) {
    const raw = fs.readFileSync(csvPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim());
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < headers.length) continue;
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            const key = headers[j];
            let val = cols[j];
            // convert numeric fields
            if (key !== 'country') {
                val = Number(val);
            }
            obj[key] = val;
        }
        drinks.push(obj);
    }
    // sort alphabetically by country for consistent prev/next behavior
    drinks.sort((a, b) => a.country.localeCompare(b.country));
    console.log(`Loaded ${drinks.length} rows from drinks.csv`);
} else {
    console.log('drinks.csv not found; dynamic routes will be limited');
}

// Helpers
const loadTemplate = (name) => {
    const p = path.join(templateDir, name);
    try {
        return fs.readFileSync(p, 'utf8');
    } catch (e) {
        console.error('Template load error', p, e?.message || e);
        return null;
    }
};

const render = (tpl, replacements) => {
    let out = tpl;
    for (const k of Object.keys(replacements)) {
        const token = k;
        out = out.split(token).join(replacements[k]);
    }
    return out;
};

const slug = (s) => s.toString().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const slugToCountry = {};
const countryOrder = [];
for (const row of drinks) {
    const s = slug(row.country);
    slugToCountry[s] = row.country;
    countryOrder.push(row.country);
}

const app = express();
app.use(express.static(root));

// Home: render index.html and populate $$$DRINKS_LIST$$$ with links to the three drink pages
app.get('/', (req, res) => {
    const tpl = loadTemplate('index.html');
    if (!tpl) return res.status(500).send('Missing template');
    const listHtml = ['beer', 'wine', 'spirits'].map(t => `<li><a href="/${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</a></li>`).join('\n');
    const out = render(tpl, {'$$$DRINKS_LIST$$$': listHtml});
    res.send(out);
});

// Helper to build table rows
const buildTable = (rows, keyName) => {
    return rows.map(r => `<tr><td><a href="/country/${slug(r.country)}">${r.country}</a></td><td>${r[keyName]}</td></tr>`).join('\n');
};

app.get('/beer', (req, res) => {
    const tpl = loadTemplate('beer.html');
    if (!tpl) return res.status(500).send('Missing template');
    const rows = drinks.slice().sort((a,b) => b.beer_servings - a.beer_servings);
    const table = buildTable(rows, 'beer_servings');
    const out = render(tpl, {'$$$BEER_TABLE$$$': table});
    res.send(out);
});

app.get('/wine', (req, res) => {
    const tpl = loadTemplate('wine.html');
    if (!tpl) return res.status(500).send('Missing template');
    const rows = drinks.slice().sort((a,b) => b.wine_servings - a.wine_servings);
    const table = buildTable(rows, 'wine_servings');
    const out = render(tpl, {'$$$WINE_TABLE$$$': table});
    res.send(out);
});

app.get('/spirits', (req, res) => {
    const tpl = loadTemplate('spirits.html');
    if (!tpl) return res.status(500).send('Missing template');
    const rows = drinks.slice().sort((a,b) => b.spirit_servings - a.spirit_servings);
    const table = buildTable(rows, 'spirit_servings');
    const out = render(tpl, {'$$$SPIRITS_TABLE$$$': table});
    res.send(out);
});

// Country page with prev/next links and a small Chart.js chart (uses CDN)
app.get('/country/:slug', (req, res) => {
    const s = req.params.slug;
    const countryName = slugToCountry[s];
    if (!countryName) {
        return res.status(404).send(`Error: no data for country ${s}`);
    }
    const row = drinks.find(r => r.country === countryName);
    if (!row) return res.status(404).send(`Error: no data for country ${countryName}`);

    // find prev/next indices (wrap-around)
    const idx = countryOrder.indexOf(countryName);
    const prev = countryOrder[(idx - 1 + countryOrder.length) % countryOrder.length];
    const next = countryOrder[(idx + 1) % countryOrder.length];

    const tpl = loadTemplate('drinks.html');
    if (!tpl) return res.status(500).send('Missing template');

    // build details list and embed a canvas for Chart.js
    const details = `
        <li>Beer servings: ${row.beer_servings}</li>
        <li>Wine servings: ${row.wine_servings}</li>
        <li>Spirit servings: ${row.spirit_servings}</li>
        <li>Total litres of pure alcohol: ${row.total_litres_of_pure_alcohol}</li>
        <li><a href="/country/${slug(prev)}">&larr; Prev</a> | <a href="/country/${slug(next)}">Next &rarr;</a></li>
        <li><canvas id="chart" width="400" height="200"></canvas></li>
    `;

    let out = render(tpl, {'$$$DRINK_TYPE$$$': countryName, '$$$DRINKS_LIST$$$': details});

    // Append Chart.js script (CDN) and inline data script
    const chartScript = `\n<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n<script>\nconst ctx = document.getElementById('chart');\nif (ctx) {\n  new Chart(ctx, {\n    type: 'bar',\n    data: {\n      labels: ['Beer','Wine','Spirits'],\n      datasets: [{ label: 'Servings', data: [${row.beer_servings}, ${row.wine_servings}, ${row.spirit_servings}], backgroundColor: ['#4f8bc9','#c94f8b','#8bc94f'] }]\n    },\n    options: { responsive: true, maintainAspectRatio: false }\n  });\n}\n</script>`;

    out = out + chartScript;
    res.send(out);
});

// Basic 404 handler for other routes
app.use((req, res) => {
    res.status(404).send(`Error: unknown route ${req.originalUrl}`);
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});

