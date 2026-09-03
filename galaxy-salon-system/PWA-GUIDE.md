# Galaxy Salon System - Install & Offline Guide

**Updated:** August 2026
**Audience:** Salon owner, counter staff, and whoever deploys the app
**Applies to:** Galaxy Salon web app (Vercel frontend + Render API)

---

## 📱 What this is

Galaxy Salon is a **Progressive Web App (PWA)**. That means the same website your staff
already open in a browser can be **installed** onto a phone, tablet or computer, where it
behaves like a normal app:

- its own icon on the home screen / Start menu
- its own window, with no browser tabs or address bar
- it keeps working at the counter **when the internet is down**
- it updates itself, so nobody ever has to reinstall anything

There is **no app store, no APK, no download**. Installing takes a few seconds.

---

## 🚀 Section 1 - For staff: how to install

### The easy path: send them to `/install`

The app has a dedicated install page that detects the phone or computer it is opened on and
shows the right steps for it:

```
https://your-salon-domain.com/install
```

Send that link on WhatsApp. **No login is needed to open it** - a new stylist can install the
app on their first day, before their account is even created.

The rest of this section is the manual version of the same thing.

---

### 1.1 Chrome on Windows or Mac (desktop)

1. Open the salon web address in **Google Chrome**. It must start with `https://`.
2. Look at the **right-hand end of the address bar** for the install icon **⊞** (a small
   screen with an arrow). Click it.
3. Click **Install** in the small box that appears.
4. Galaxy Salon opens in its own window and is added to the **Start menu** (Windows) or
   **Applications** folder (Mac).

> No install icon? Open the **⋮** menu (top-right) and choose
> **Cast, save and share → Install page as app**.

---

### 1.2 Chrome on Android (phone or tablet)

1. Open the salon web address in **Chrome**.
2. Tap the **Install Galaxy Salon** button on the `/install` page, **or** open the **⋮**
   menu and tap **Add to Home screen**.
3. Tap **Install**, then confirm.
4. Close Chrome. From now on, open the app from the **home-screen icon**, not from Chrome.

> Opening it from a Chrome tab still works, but it will not be full-screen and staff tend to
> lose the tab. Train them to use the icon.

---

### 1.3 Safari on iPhone or iPad

Apple does not give websites an install button, so on iOS you add the app by hand.

1. Open the salon web address in **Safari**. **Chrome, Edge and Firefox on an iPhone
   cannot install apps** - they will never show the option.
2. Tap the **Share** button - the square with an arrow pointing up. It is at the **bottom**
   of the screen on an iPhone, **top-right** on an iPad.
3. Scroll down the grey list and tap **Add to Home Screen**.
4. Tap **Add** in the top-right corner.
5. Open **Galaxy Salon** from the new home-screen icon.

---

### 1.4 Microsoft Edge (desktop)

1. Open the salon web address in **Edge**, on an `https://` address.
2. Click the install icon **⊞** in the address bar, **or** open the **⋯** menu and choose
   **Apps → Install this site as an app**.
3. Click **Install**.
4. When Edge offers to **pin it to the taskbar**, say yes. That is the fastest way for the
   front desk to reach the till.

---

### 1.5 Browsers that cannot install

| Browser | Can install? | What to do |
|---|---|---|
| Chrome (desktop, Android) | ✅ Yes | Address-bar icon |
| Edge (desktop, Android) | ✅ Yes | Address-bar icon |
| Safari (iPhone, iPad) | ✅ Yes, manually | Share → Add to Home Screen |
| Safari (Mac) | ✅ Yes | File → Add to Dock |
| Samsung Internet | ✅ Yes | Menu → Add page to → Home screen |
| **Firefox (desktop)** | ❌ No | Use Chrome or Edge on that machine |
| **Chrome / Edge / Firefox on iPhone** | ❌ No | Open the page in Safari instead |

Firefox on **Android** can add a home-screen shortcut, and offline billing still works, but
it will not feel like a separate app.

---

## 📶 Section 2 - What works offline, and what does not

The rule of thumb: **you can keep taking cash bills; you cannot do anything that needs fresh
information from the server.**

### ✅ Works with no internet

| Feature | Notes |
|---|---|
| Opening the app | Launches from the icon, no connection required |
| The POS / billing screen | Fully usable |
| Service, product and employee lists | Served from the copy cached the last time you were online |
| Customer list | Same - the cached copy, not live |
| Creating a **cash** bill | Saved to a queue on the device and uploaded later |
| Printing a receipt | Prints a **provisional** receipt (see below) |
| Seeing how many bills are waiting | The offline indicator shows the pending count |

### ❌ Needs the internet

| Feature | Why |
|---|---|
| **Logging in** | The password is checked by the server. Sign in **once while online**; the session then lasts 7 days. |
| **UPI / card payment** (Razorpay) | The payment gateway is an online service. Offline, take **cash** only. |
| Reports and the dashboard | These are calculated on the server from live data. |
| Appointments | Booking and calendar views read and write live server data. |
| Inventory changes, adding staff, editing services | Any write other than a bill is not queued. |
| Anything that must show *today's* server data | The cached catalogue can be hours or days old. |

### About provisional bill numbers

A bill created offline is given a temporary number that looks like:

```
OFFLINE-1
OFFLINE-2
OFFLINE-3
```

That number appears on the printed receipt. It is **not** the real bill number. When the
device gets back online and the bill uploads, the server issues the **real bill number**, and
that is the one stored in reports and in the customer's history.

**Tell staff:** an `OFFLINE-` receipt is a valid receipt for the customer, but if they ever
need to look the bill up later, search by the **customer's phone number**, not by the
`OFFLINE-` number.

---

## 🔄 Section 3 - How syncing works

### Where offline bills are kept

Each offline bill is stored in the browser's own database (**IndexedDB**) on **that one
device, in that one browser**. Nothing is sent anywhere until the connection comes back.

Each queued bill carries a unique reference (`clientRef`), a timestamp, a status, and how
many times upload has been attempted.

### When the app tries to upload

The app replays the queue **oldest bill first**, and it tries at all of these moments:

| Trigger | When it happens |
|---|---|
| Connection restored | The moment the device reports it is back online |
| Tab or app regains focus | Staff switch back to the app after using something else |
| Every 30 seconds | Repeats while anything is still waiting in the queue |
| Manual | Tapping **Sync now** on the offline / sync indicator |

Staff do not need to do anything. In practice a bill taken during a two-minute internet
outage is uploaded before the customer has finished paying.

### Why a bill is never charged twice

Every queued bill carries its own `clientRef`. The server checks that reference before
creating anything:

- **First time it sees the reference** → creates the bill, returns `201`.
- **Any later time** → returns the **existing** bill with `200` and `duplicate: true`.

So if the connection cuts out *after* the server saved the bill but *before* the phone heard
the answer, the retry finds the same bill instead of making a second one. **No double
billing, no duplicate stock deduction.**

### When a bill fails

Some bills the server will refuse - most often **not enough stock** for a product, but also a
deleted service or a stale price. That bill is marked **failed** and the app **stops
retrying it**, because retrying will not change the answer.

A failed bill needs a human:

1. Open the app on the **device that took the bill** (the queue is local to it).
2. Read the error shown against the bill.
3. Fix the cause - restock the product, correct the price - then retry.
4. Or re-enter the bill by hand and discard the failed one.

**A failed bill is money you have taken but not recorded.** Check the queue at the end of
every shift.

### Bill statuses

| Status | Meaning |
|---|---|
| `pending` | Waiting for a connection |
| `syncing` | Being uploaded right now |
| `synced` | On the server, real bill number issued |
| `failed` | The server rejected it - needs a person |

---

## ⚠️ Section 4 - Important limitations (please read)

These are real constraints of how offline billing works. They are not bugs, and no setting
turns them off.

### 4.1 The queue lives on one device, in one browser

An offline bill taken on the **front-desk phone** does **not** exist anywhere else until it
syncs. The back-desk computer cannot see it, the owner's dashboard cannot see it, and it does
not appear in any report.

- If that phone is switched off, lost, or left in a drawer, those bills stay unsent.
- The same browser profile matters too: bills queued in Chrome are invisible to Edge on the
  same computer.

**What to do:** after any internet outage, walk to each till, open the app, and confirm the
pending count is zero.

### 4.2 Clearing browser data destroys unsynced bills

"Clear browsing data", "Clear site data", resetting the browser, or uninstalling the app
while bills are still queued will **permanently delete** those bills. They cannot be
recovered - they never reached the server.

**What to do:** never clear browser data on a till device without first checking the pending
count is zero. Tell whoever cleans up the computers.

### 4.3 Offline stock is not reserved - overselling is possible

Product stock is only reduced **when the bill reaches the server**. Offline, the app is
working from a cached stock number that may be hours old.

If two tills are offline at the same time and both sell the last bottle of shampoo, both
bills are accepted locally. When they sync, the first one succeeds and the second may fail
for insufficient stock - or, depending on the count, both succeed and the stock figure goes
negative.

**What to do:** for a busy salon, take **services** offline freely, and be careful with
**product sales** of low-stock items during an outage.

### 4.4 Cached lists can be stale

The service, product and staff lists shown offline are whatever the device downloaded the
last time it was online. A price changed this morning on the office computer will not reach
an offline phone until that phone reconnects.

**What to do:** open the app online on every till at the start of the day. That refreshes the
cache once and covers the whole shift.

### 4.5 Other limits worth knowing

- **Login expires.** The session lasts 7 days. A device that has been offline for longer will
  need the internet to sign in again.
- **iOS can evict storage.** Apple may clear a web app's data if the device is very low on
  space or the app is unused for weeks. Sync promptly on iPhones.
- **Private / incognito windows** discard everything on close. Never bill from one.
- **Offline is for outages, not a way of working.** It is designed to cover a few minutes or
  a few hours of lost internet, not days.

---

## 🔧 Section 5 - Deployment requirements

For the install and offline features to work at all, the deployment must satisfy these. See
`DEPLOYMENT.md` for the full deployment procedure.

### 5.1 HTTPS is mandatory

Service workers - the piece that makes offline work - **only run on `https://`**. On plain
`http://` the browser silently disables everything: no install button, no offline, no
syncing, and no error message explaining why.

- `http://localhost` is the **one exception**, so local development still works.
- **Vercel gives every deployment HTTPS automatically**, so a standard Vercel deployment
  needs nothing extra.
- A custom domain must have its certificate finish provisioning before installs work.
- Serving the app from a LAN IP such as `http://192.168.1.10:3000` will **not** work. Use the
  public HTTPS address even inside the salon.

### 5.2 Build-time environment variable

`NEXT_PUBLIC_API_URL` is **baked into the JavaScript at build time**, not read when the app
runs. It must be set in Vercel **before** the build:

| Where | Key | Value |
|---|---|---|
| Vercel → Settings → Environment Variables | `NEXT_PUBLIC_API_URL` | `https://<your-service>.onrender.com/api` |

Changing it later requires a **redeploy**. Editing it without redeploying changes nothing.

### 5.3 CORS on the API

The Render API must list the frontend origin in `CORS_ORIGINS` (comma-separated, **no
trailing slash**):

```
CORS_ORIGINS=https://galaxy-salon-prod.vercel.app,https://your-custom-domain.com
```

If the frontend origin is missing, every request is blocked by the browser and staff see a
login that never completes.

### 5.4 Deployment checklist

- [ ] Site is served over HTTPS
- [ ] `NEXT_PUBLIC_API_URL` set in Vercel and the project redeployed afterwards
- [ ] `CORS_ORIGINS` on Render includes the exact frontend origin, no trailing slash
- [ ] `https://your-domain.com/manifest.webmanifest` loads in a browser
- [ ] `https://your-domain.com/sw.js` loads in a browser
- [ ] `https://your-domain.com/install` shows an install button in desktop Chrome
- [ ] Installed app opens in its own window with the Galaxy Salon icon
- [ ] Turning off Wi-Fi still lets you reach the POS screen and save a cash bill

---

## 🆘 Section 6 - Troubleshooting

### Issue: There is no Install button

Work through these in order:

1. **Is the address `https://`?** On `http://` the browser disables installation entirely.
   This is the most common cause.
2. **Is it already installed?** Chrome hides the button once the app is installed. Check the
   Start menu / Applications folder, or open `chrome://apps`.
3. **Is it an iPhone?** Safari never shows an install button. Use **Share → Add to Home
   Screen**. And it must be Safari - Chrome on an iPhone cannot do it.
4. **Is it Firefox on a desktop?** Firefox does not support installing web apps. Use Chrome
   or Edge.
5. **Did the manifest or an icon fail to load?** Open **DevTools (F12) → Application →
   Manifest**. Any red error there - a missing icon, a bad `start_url` - stops the install
   prompt. Confirm `/manifest.webmanifest` and `/icons/icon-192.png` both load directly in a
   browser tab.
6. **Chrome sometimes just waits.** It likes a little engagement with the page first. Click
   around for 30 seconds and reload.

### Issue: The app is stuck on an old version

New versions install in the background and take effect when the app next restarts.

1. **Take the Reload prompt.** When an update is ready the app shows a small
   "A new version is available - Reload" toast. Tapping it is the intended fix.
2. **Close it completely and reopen.** On a phone, swipe the app out of the recents list -
   minimising is not enough.
3. **Force the update:** open the app in a browser tab, then
   **DevTools → Application → Service Workers → Unregister**, and reload the page twice. The
   first reload fetches fresh files, the second runs them.
4. **Nuclear option:** **DevTools → Application → Storage → Clear site data**.
   ⚠️ **This deletes unsynced bills.** Confirm the pending count is zero first.

The app's caches are named `galaxy-shell-*`, `galaxy-assets-*` and `galaxy-data-*` under
**Application → Cache Storage**, if you need to see which version is live.

### Issue: I need to see what is stuck in the queue

1. Open the app in a **browser tab** (not the installed window - it has no DevTools).
2. Press **F12** → **Application** tab.
3. In the left sidebar: **Storage → IndexedDB → `galaxy-salon-offline` → `queuedBills`**.
4. Each row is one bill. The useful fields:

| Field | What it tells you |
|---|---|
| `status` | `pending`, `syncing`, `failed` or `synced` |
| `localBillNumber` | The `OFFLINE-n` number printed on the customer's receipt |
| `syncedBillNumber` | The real bill number, once it has uploaded |
| `lastError` | Why the server refused it - this is what you act on |
| `attempts` | How many upload attempts have been made |
| `createdAt` | When the bill was taken |
| `clientRef` | The reference the server deduplicates on |

Do not edit these rows by hand.

### Issue: Bills are not uploading even though we are online

1. Check the device really has internet - open any other website.
2. If the API is on **Render's free tier**, it sleeps after ~15 minutes idle and the first
   request takes ~50 seconds to wake it. Wait a minute and try again. (See `DEPLOYMENT.md`
   §4.6.)
3. Check `https://<your-service>.onrender.com/api/health` returns `"db":"connected"`.
4. Open **DevTools → Console** and look for CORS errors - that means `CORS_ORIGINS` is wrong
   (§5.3).
5. If the session has expired the app bounces to the login page. Sign in; the queue survives
   and resumes.

### Issue: A bill says "failed"

Read its `lastError`. Common ones:

| Error mentions | Cause | Fix |
|---|---|---|
| insufficient stock | Product sold below the stock the server knows about | Restock the product, then retry |
| service / product not found | The item was deleted after the device cached it | Re-enter the bill with a current item |
| validation | Something in the bill no longer passes the server's rules | Re-enter the bill by hand |
| unauthorized / 401 | The session expired | Sign in again, then retry |

### Issue: Staff keep opening the website instead of the app

They are using the old bookmark. Delete the browser bookmark from the till device and leave
only the installed icon. On Android, put the icon in the dock. On a desktop, pin it to the
taskbar.

---

## 📋 Quick reference card for the counter

Print this and stick it near the till.

> **The internet is down. What can I do?**
>
> ✅ Take **cash** bills as normal - they save automatically and upload later.
> ✅ Print the receipt. It will say **OFFLINE-1**, **OFFLINE-2** and so on. That is fine.
> ❌ **No UPI or card** - the machine needs internet. Cash only.
> ❌ No reports, no appointments, no new staff or products.
>
> **When the internet comes back:** do nothing. The bills upload on their own within
> about 30 seconds and get their real bill numbers.
>
> ⚠️ **Do not** clear browser data, log out, or uninstall the app while the indicator still
> shows bills waiting.

---

## 📞 Related documents

- `DEPLOYMENT.md` - full Vercel + Render + MongoDB Atlas deployment procedure
- `SETUP.md` - local development setup
- `README.md` - project overview

---

**Last Updated:** August 2026
**Version:** 1.0 - PWA and offline billing
