# RecipeRoom

A culinary discovery & meal kit marketplace built for CS353 — Database Systems (Group 7).

Browse recipes, adjust serving sizes, and order fresh ingredients directly from local suppliers; all in one.

---

## Stack

- **Backend** — Node.js + Express, MySQL (raw SQL, no ORM)
- **Frontend** — React (Vite), Tailwind, lucide-react, react-router

## Running locally

```bash
# backend (port 3001)
cd backend && npm install && npm start

# frontend (port 5173)
cd frontend && npm install && npm run dev
```

The frontend expects the backend at `http://localhost:3001/api` (see `frontend/src/api/client.js`).

## Where things live

```
backend/  Express app — routes, db pool, auth
frontend/ Vite + React app
  src/api/        Deniz's API wrappers — pages call these, never axios directly
  src/components/ Shared UI kit (RecipeCard, FilterSidebar, IngredientRow, …)
  src/hooks/      Shared hooks (useIngredientSearch)
  src/pages/      One file per route
  src/constants/  Tag taxonomy
  src/context/    AuthContext, ToastContext
sql/      Schema + seeds
```

## Status

See [TASKS.md](TASKS.md) for the full master checklist. As of this commit:

- ✅ Frontend pages: Home, Recipes, RecipeDetail, CreateRecipe, Challenges, Profile (with Flavor Profile tab), Cart, Checkout, AdminPanel
- ✅ Frontend shared: API wrappers, auth/routing, toast, NotFound, shared UI kit, SubstitutionManager, SubstitutionPicker
- ✅ Backend: auth, users, admin (incl. admin/users + supplier verification) done
- ⏳ Backend: recipes/orders/suppliers/challenges/highlights still landing
- ⏳ Pending pages: Supplier dashboard/inventory/orders, Admin highlights

## Team

| Name | ID |
|---|---|
| Deniz Çağlar | 22201738 |
| Ahmet Kenan Ataman | 22203434 |
| Tolga Yanar | 22202597 |
| Yağmur Demirer | 22202829 |
| Işıl Ünveren | 22202444 |
