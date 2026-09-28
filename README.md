# Kelvin Sakyi · Portfolio

Live site: https://kelvin-sakyi.netlify.app

Personal portfolio of Kelvin Sakyi, Software Engineer (Quality Assurance & AI-Assisted Web Development).

## Stack

Plain HTML, CSS and JavaScript. No framework and no build step.

```
public/
  index.html       the whole site (one page)
  404.html         "page not found"
  css/styles.css   design tokens + all styles (mobile-first)
  js/theme-init.js applies the saved theme before the page paints
  js/main.js       theme toggle, menu, tabs, contact form, live page checks
  js/qa-lab.js     the QA Lab: BMI calculator + test session
netlify.toml       hosting config and security headers
```

## Run locally

```bash
python3 -m http.server 4321 --directory public
```

Then open http://localhost:4321.

## Deploy

Hosted on Netlify from GitHub. Publish directory: `public`. No build command.
The contact form uses Netlify Forms, so it only sends on the deployed site.
