3D Login / Register — Hacker Theme

How to use:

- Open `index.html` in your browser (double-click or use a local server).
- Use the right-side links to switch between Login and Register.
- Registration is simulated and saved in `localStorage` (no backend).
- After signing in, you'll be redirected to a separate `home.html` page. Use "Sign out" there to return to the login.

Notes:

- This is a front-end demo only. Do not use it for production authentication.
- Authentication state is kept in `localStorage` under the `sessionUser` key; the home page redirects to `index.html` if there's no session.
- The project includes a neon "hacker" theme: a Matrix-like canvas background, neon-green accents, and a glitched terminal header.
- For best effect, open in a modern browser with canvas enabled.

Files:

- `index.html` — login/register UI and `script.js` for auth interactions.
- `home.html` — separate home page and `home.js` for session checks and sign-out.
- `styles.css` — shared styles for both pages.

Customization:

- Change colors in `styles.css` to adjust the theme.
- To add a real backend, replace the `localStorage` logic in `script.js` with API calls.

Enjoy!
