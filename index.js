// index.js (ES modules)
import express from 'express';
import axios from 'axios';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config'; // loads .env automatically

const app = express();
const PORT = process.env.PORT || 3000;

// In ESM, __dirname is not defined, so we reconstruct it:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// EJS + static assets
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // for form inputs

// Helper: extract ingredients/measures from CocktailDB shape
function mapIngredients(drink) {
  const items = [];
  for (let i = 1; i <= 15; i++) {
    const ing = drink[`strIngredient${i}`];
    const mea = drink[`strMeasure${i}`];
    if (ing && ing.trim() !== '') {
      items.push({ ingredient: ing, measure: mea || '' });
    }
  }
  return items;
}

// Routes
app.get('/', (req, res) => {
  res.render('home');
});

app.get('/random', async (req, res, next) => {
  try {
    const { data } = await axios.get(
      'https://www.thecocktaildb.com/api/json/v1/1/random.php',
      { timeout: 10000 }
    );
    const drink = data?.drinks?.[0];
    if (!drink) {
      return res.render('results', {
        drinks: [],
        query: 'Random',
        info: 'No cocktail found.'
      });
    }

    const cocktail = {
      name: drink.strDrink,
      image: drink.strDrinkThumb,
      instructions: drink.strInstructions,
      ingredients: mapIngredients(drink)
    };

    res.render('results', { drinks: [cocktail], query: 'Random', info: null });
  } catch (err) {
    next(err);
  }
});

app.get('/search', async (req, res, next) => {
  try {
    const name = (req.query.name || '').trim();
    if (!name) {
      return res.render('results', {
        drinks: [],
        query: '',
        info: 'Please enter a drink name.'
      });
    }

    const url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`;
    const { data } = await axios.get(url, { timeout: 10000 });

    const drinks = (data?.drinks || []).map(d => ({
      name: d.strDrink,
      image: d.strDrinkThumb,
      instructions: d.strInstructions,
      ingredients: mapIngredients(d)
    }));

    const info = drinks.length ? null : 'No results. Try another name.';
    res.render('results', { drinks, query: name, info });
  } catch (err) {
    next(err);
  }
});

// Handy health route
app.get('/health', (_req, res) => res.json({ ok: true }));

// 404
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Server error:', err.stack || err);
  res.status(500).render('error', { message: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
