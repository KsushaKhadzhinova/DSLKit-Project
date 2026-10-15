# Practical Session No. 3. Routing in React Applications

## 1 Purpose of the Work

To master routing in a React application: configure routes, build a single-page application with several pages, use dynamic routes and protected routes on the example of the DSLKit project, a web editor for diagrams as code (SaaS direction).

## 2 Choice of the React Router Version

The assignment names React Router v6 with a note "v6?". The `react-router-dom` library version 7.18.4 is used. The whole API from the assignment (`BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`, `Outlet`, `Navigate`, `useParams`, `useNavigate`, `useLocation`) works in version 7 library mode the same way as in v6. Version 7 is maintained, compatible with React 19 and already used in the application from the first part of the course. If needed, the code moves to v6 with `npm i react-router-dom@6` without changes.

## 3 Work Progress

### 3.1 Route Map

The application consists of the pages shown in Table 1. All pages live inside the shared layout route `Layout`, which renders the menu and inserts the page content through `Outlet`.

Table 1 – Application routes

| Path           | Page                   | Access                          |
| -------------- | ---------------------- | ------------------------------- |
| `/`            | Home                   | open                            |
| `/catalog`     | Template catalog       | open                            |
| `/catalog/:id` | Template card          | open, a wrong `id` leads to 404 |
| `/about`       | About                  | open                            |
| `/login`       | Sign in (simulated)    | open                            |
| `/logout`      | Sign out, redirect `/` | open                            |
| `/dashboard`   | Dashboard              | after sign-in only              |
| `*`            | 404                    | open                            |

### 3.2 Menu and Dynamic Route

The menu is built with `NavLink`, the function in `className` receives the `isActive` flag and adds the active item class. The home link has `end` so that it does not stay active on every path. The `/catalog/:id` page reads the parameter with `useParams`, looks up the template in the data and, if none is found, sends the user to the 404 page with the `Navigate` component. The "Back" button calls `navigate(-1)`. The code is given in Appendix A.

### 3.3 Protected Route and Simulated Sign-in

The `PrivateRoute` component works as a layout route: when the `isAuth` flag is set it renders `Outlet`, otherwise it redirects to `/login` and passes the requested path in `state`, without showing it in the address. The flag is kept in the `AuthProvider` state and in `localStorage`. After "Sign in" is pressed, `Login` calls `navigate` to the requested page or to `/dashboard`. Sign-out is a separate route `/logout`: it clears the flag and returns home declaratively. The first version with `navigate('/')` and `logout()` in one handler did not work, because `PrivateRoute` managed to redirect to `/login` first.

### 3.4 Testing

Thirteen automated tests on `MemoryRouter` cover all pages, the `NavLink` highlight, menu navigation, the dynamic route with a wrong `id`, the 404 page, the guest redirect to `/login`, the return after sign-in, sign-out and keeping the sign-in between loads. The manual check is described in `README.md`.

## Conclusion

The Vite application contains seven routes, a menu with the active item highlighted, a dynamic route handling an unknown parameter, a 404 page and a protected dashboard with simulated sign-in and programmatic navigation. `react-router-dom` 7 is chosen, its API for the tasks of this work matches v6.

## Appendix A – Key Code Fragments

```jsx
// App.jsx: route map, Layout provides the menu and Outlet
<Routes>
  <Route element={<Layout />}>
    <Route index element={<Home />} />
    <Route path="catalog/:id" element={<CatalogItem />} />
    <Route path="logout" element={<Logout />} />
    <Route element={<PrivateRoute />}>
      <Route path="dashboard" element={<Dashboard />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Route>
</Routes>
```

```jsx
// CatalogItem: URL parameter and redirect to 404
const { id } = useParams();
const template = findTemplate(id);
if (!template) return <Navigate to="/not-found" replace />;
```

```jsx
// PrivateRoute: protection and remembering the requested path
return isAuth ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
```

```jsx
// Login: programmatic navigation after the simulated sign-in
login();
navigate(location.state?.from ?? '/dashboard', { replace: true });
```
