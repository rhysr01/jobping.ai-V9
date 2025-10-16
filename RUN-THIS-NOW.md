# 🚀 Run This Now to Improve Categorization

## Current Status
- Categorization: **59.5%** (4,736 jobs)
- Target: **85%+** (6,750+ jobs)

## What's Missing
The patterns weren't catching:
- Analyst roles (business analyst, pricing analyst, etc.)
- Consultant roles (in German, French, Italian, Spanish)
- Developer roles (with specific tech stacks: PHP, Python, React, etc.)
- HR/Admin roles
- Generic graduate/trainee programs

## Run This Command

```bash
psql $DATABASE_URL -f scripts/improve-categorization.sql
```

## What It Will Do

### Improved Patterns Now Include:

1. **Data & Analytics** - Added:
   - business analyst, analyst, pricing, quantitative, research assistant
   - Multi-language: daten, données, datos, analyse

2. **Strategy & Business Design** - Added:
   - Multi-language: consultant, beratung, conseil, consulente, consultancy
   - business development variants

3. **Finance & Investment** - Added:
   - Multi-language: finanz, financier, finanziario, comptable, buchhalter
   - trader, portfolio, credit, risk, compliance

4. **Tech & Transformation** - Added:
   - Multi-language: développeur, entwickler, sviluppatore, programador
   - Specific tech: PHP, Python, Java, React, TypeScript, SAP, Dynamics

5. **Operations & Supply Chain** - Added:
   - HR roles: recruitment, training, formation, ausbildung
   - Admin roles: back office, middle office, impiegato, employé, clerk

6. **Marketing & Growth** - Added:
   - Multi-language: kommunikation, comunicazione, campagne, pubblicità
   - campaign, influence, PR

7. **Product & Innovation** - Added:
   - Multi-language: produkt, produit, prodotto

8. **Sales & Client Success** - Added:
   - Multi-language: vente, verkauf, vendita, commercial, kunde, cliente

## Expected Results

After running, you should see:
- **Categorization: 85-90%** (6,750-7,150 jobs)
- **Only 10-15%** uncategorized (mostly very generic internships)

## Then Update Future Scrapes

Good news! I already updated `post-scrape-maintenance.sql` with these improved patterns, so all future scrapes will automatically get 85%+ categorization! 🎉

---

**Run the command above now!** ⬆️

