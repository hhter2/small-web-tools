# Privacy Policy & Data Processing Disclosure

**First Published:** July 19, 2026  
**Last Updated:** July 22, 2026  
**Repository:** [github.com/hhter2/small-web-tools](https://github.com/hhter2/small-web-tools) (MIT License)  
**Maintainer Contact:** Rhosiqs (<contact@rhosiqs.com>)

---

## 1. Overview & Local-First Philosophy

Small Web Tools is designed with a **privacy-first, client-side execution philosophy**. 

The vast majority of utilities (including Password Generator, Word Counter, Color Converter, Casing Switcher, ASCII/Unicode Converters, DNA/RNA Converters, Codon Table, Media Splitter, Random Wheel, Typing Speed Test, QR Code Generator/Scanner, Folder Analyzer, and Metadata Viewers) process all data **100% locally inside your web browser**. 

Your files, text inputs, images, audio, and videos are **never uploaded** to any server.

---

## 2. Comprehensive Third-Party Services & Network Requests Data Table

For tools that require external web data or remote APIs, network requests are strictly limited to necessary features. Below is the complete disclosure of all external data interactions:

| Service / Provider | Purpose | Trigger Condition | Data Transmitted | Local Fallback Option | Provider Privacy Policy |
|---|---|---|---|---|---|
| **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) | Web typography rendering | Initial page load | IP Address, User-Agent, HTTP Referrer | Browser default fallback fonts | [Google Privacy Policy](https://policies.google.com/privacy) |
| **Open Exchange Rates API** (`open.er-api.com`) | Currency Converter live exchange rates | Currency Converter tool load | Standard HTTP GET request | Manual Rate Override (100% Local) | [Open Exchange Rates Privacy](https://openexchangerates.org/privacy) |
| **IP Geolocation Provider** (`ipapi.co` / Proxy) | IP Lookup details | IP Lookup tool load or search | Target IP address | Local IP format validation | [ipapi Privacy Policy](https://ipapi.co/privacy/) |
| **OpenStreetMap Tiles** (`tile.openstreetmap.org`) | Map view rendering in IP Lookup | User opts in / clicks "View Map" | Map tile coordinate requests | Coordinates display without map tiles | [OpenStreetMap Privacy](https://wiki.osmfoundation.org/wiki/Privacy_Policy) |
| **Cloudflare Pages & Functions** | Website hosting & API proxying | Page load & API proxy calls | Standard edge request & security logs | N/A (Hosting Infrastructure) | [Cloudflare Privacy](https://www.cloudflare.com/privacypolicy/) |
| **Website Font Extractor API** (`/api/extract-fonts`) | Parsing font CSS of external sites | User submits website URL | Target website URL | N/A (Web inspection tool) | Per target website policy |

---

## 3. Google Fonts Notice

Google Fonts stylesheets and font binaries are fetched directly on initial page load to provide uniform typography. Standard HTTP request headers (IP address and User-Agent) are sent to Google servers during font file retrieval. No cookies or personal identity tracking tokens are sent.

---

## 4. Local Storage & Consent Settings

This website uses browser storage (`localStorage` and `sessionStorage`) solely to preserve user interface settings, active tool state, and consent preferences. No tracking cookies or analytics trackers are used.

- **Consent Storage Key:** `small_web_tools_consent`
- **Resetting Consent:** You can clear or update consent preferences at any time through your browser's site settings or by clearing local storage.

---

## 5. Local File Safety Guarantee

All local file inspection tools (including Image Metadata, Audio Metadata, Video Metadata, Office Metadata, Folder Analyzer, and Media Splitter) run entirely inside the browser's JavaScript environment using HTML5 File APIs. Files selected from your device are **never uploaded, transmitted, or logged**.

---

## 6. Open Source & License

The source code of this project is open-source and licensed under the [MIT License](LICENSE). You may review, fork, inspect, and host the code independently.

---

## 7. Change Log & Policy Updates

- **July 19, 2026:** Initial publication of Privacy Policy.
- **July 22, 2026:** Detailed data flow disclosure table, local fallback options, and third-party consent keys added.