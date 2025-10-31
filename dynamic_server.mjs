import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';
import {default as chartjs} from 'chart.js/auto.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8080;
const root = path.join(__dirname, 'public');
const template = path.join(__dirname, 'templates');

const db = new sqlite3.Database('./alcohol.sqlite3', sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log("Error connecting to database");
    } else {
        console.log("Successfully connected to database");
    }
});

let app = express();
app.use(express.static(root));

app.get('/', (req, res) => {
  res.sendFile(path.join(template, 'index.html'));
});

app.listen(port, () => {
    console.log('Now listening on port ' + port);
});

