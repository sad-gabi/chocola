---
title: Getting started
description: Set up a Chocola project from scratch
---

## 1. Set up your directory

```
my-app/
├── src/
│   ├── lib/
│   │   ├── css/
│   │   └── html/
│   ├── static/
│   ├── styles/
│   ├── routes/
│   └── index.html
├── chocola.config.json
├── chocola.server.js
└── index.js
```

## 2. Install Chocola

```sh
npm install chocola
```

## 3. Create a `chocola.config.json` config file

```json
{
  "bundle": {
    "srcDir": "/src",
    "outDir": "/dist",
    "libDir": "/lib",
    "emptyOutDir": true
  },
  "dev": {
    "hostname": "localhost",
    "port": 3000
  }
}
```

## 4. Create `index.js`

```js
// file: index.js
import { app } from "chocola/compiler";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.build(__dirname);
```

## 5. Create `chocola.server.js`

```js
// file: chocola.server.js
import { dev } from "chocola/dev";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dev.server(__dirname);
```

## 6. Initialize your index page

Write something in your `src/index.html` index page. Remember to include an `<app>` element — that's where Chocola applies its magic.

```html
<!-- file: src/index.html -->
<html>
  <head>
    <title>My Chocola App</title>
  </head>
  <body>
    <app>
      Hello World!
    </app>
  </body>
</html>
```

Now you're all set! Run `node chocola.server.js` to see your app in the browser.
