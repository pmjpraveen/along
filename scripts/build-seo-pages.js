// Writes the search landing pages (guides and comparisons) to site/public/<slug>/index.html as plain HTML, so search engines read them without running
// any script. Run from the repo root: node scripts/build-seo-pages.js. Competitor facts come from their public websites (checked Oct 2026).
const fs = require("fs");
const SITE = "https://getalong.xyz";
const APP_STORE = "https://apps.apple.com/app/id6817977368";
const PLAY = "https://play.google.com/store/apps/details?id=xyz.getalong.app";
const UPDATED = "2026-10-05";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const PAGES = [
  {
    slug: "split-trip-expenses", kind: "Guide",
    title: "How to split trip expenses with friends | along",
    description: "How to split trip expenses fairly with friends: equal, exact amounts, percentages or shares, who owes whom, and how to settle up with the fewest payments.",
    keywords: "split trip expenses, split expenses with friends, group trip expenses, who owes whom, settle up after a trip, fair way to split costs",
    h1: "How to split trip expenses with friends",
    lead: "Group trips are easier when money is clear. This guide shows the fair ways to split shared costs, how to handle people who skipped an expense, and how to settle up without a spreadsheet.",
    sections: [
      ["Why trip money gets awkward", ["On a group trip one person books the stay, another pays for fuel, someone else covers dinner. By the last day nobody remembers who paid what, and the sums are done in a group chat. The fix is simple: write every shared cost down the moment it happens, and say who it was for."]],
      ["Four fair ways to split a cost", [
        "<strong>Equally.</strong> Best for things everyone used: a rental car, a shared apartment. A ₹3,600 dinner for three is ₹1,200 each.",
        "<strong>By exact amounts.</strong> Best when people ordered differently: one person had ₹1,500 of food and two had ₹1,050 each.",
        "<strong>By percentage.</strong> Useful when one person should carry a fixed share, such as 50% for the host and 25% for each guest.",
        "<strong>By shares.</strong> Useful for rooms of different sizes: a double room counts as 2 shares, a single as 1."]],
      ["Split only between the people who took part", ["Not every cost involves everyone. If two friends took a boat ride, only those two should share it. Pick the participants for each expense instead of assuming everyone on the trip is in. Also keep two facts apart: <em>who paid</em> and <em>who added the entry</em>. They are often different people."]],
      ["Do not lose a single paisa", ["Money should be counted in whole units, never as decimals that drift. If you split ₹100 three ways, the shares are ₹33.34, ₹33.33 and ₹33.33. They always add up to exactly ₹100, with the extra unit given in a fixed order so the result is the same every time."]],
      ["Settle up with the fewest payments", ["After many expenses, do not repay each one. Add up what each person paid and what they owe, then pay only the difference. If Asha is owed ₹800 and Rahul owes ₹800, that is one payment, not ten. Mark each payment as paid when it happens so the balance stays right."]],
      ["Tips that keep trips friendly", ["<ul><li>Add expenses the same day, while everyone remembers.</li><li>Agree the split method before spending, not after.</li><li>Use one currency per trip, and do not convert on the fly.</li><li>Include friends who do not use the app by adding them by name.</li><li>Settle up within a week of getting home.</li></ul>"]],
      ["How along does this", ["along lets you add an expense in a few taps: amount, what it was for, who paid and who shared it. It supports equal, exact amount, percentage and share splits, shows balances in plain words such as “You owe Ben ₹4,500”, and works out the fewest payments to settle the group. Friends without the app can be added by name and still appear in the splits."]],
    ],
    faq: [
      ["What is the fairest way to split trip costs?", "Split shared things equally, split individual things by exact amounts, and include only the people who took part in each expense. Settle the net balance at the end rather than repaying every item."],
      ["How do you split a bill when people ordered different amounts?", "Enter the exact amount for each person. The total of the amounts must equal the bill, so nothing is left over."],
      ["What if a friend does not have the app?", "In along you can add a friend by name. They are included in the plan, the splits and the balances, and can take over their spot later with a personal invite."],
      ["Does along convert currencies?", "No. Each trip has one currency and amounts are never converted, so they never drift. You can choose from every ISO currency."],
    ],
  },
  {
    slug: "group-trip-planner", kind: "Guide",
    title: "Group trip planner app: plan a trip with friends | along",
    description: "A free group trip planner for friends and family: one shared day-by-day plan with maps, invites, exact expense splits, memories and travel stamps. iPhone and Android.",
    keywords: "group trip planner, plan a trip with friends, shared itinerary app, collaborative trip planner, group travel app, family trip planner",
    h1: "A group trip planner everyone can use",
    lead: "Planning a trip with friends usually means a group chat, a spreadsheet and a lot of scrolling. A group trip planner puts the plan, the people and the money in one place that everyone sees the same way.",
    sections: [
      ["Why group trips fall apart", ["The ideas live in screenshots, the dates in someone’s memory and the costs in three different chats. When one person changes the plan, the others find out late. A shared plan fixes that: one source of truth that updates for everyone at once."]],
      ["What a good group trip planner needs", ["<ul><li><strong>One shared plan</strong>, day by day, that everyone can read.</li><li><strong>Places with maps</strong>, so the plan shows where things are.</li><li><strong>Easy invites</strong>, including friends who will not install anything yet.</li><li><strong>Safe editing</strong>: change a plan, move it to another day, undo a delete.</li><li><strong>Shared costs</strong>: who paid, who owes whom.</li><li><strong>Works with weak signal</strong>, because trips are not always online.</li></ul>"]],
      ["How it works in along", ["<ol><li><strong>Start a trip.</strong> Pick a place and the dates. It gets a colour of its own.</li><li><strong>Bring your people.</strong> Share an invite link, add a friend by name, or add someone already on along by email.</li><li><strong>Plan the days.</strong> Add places, notes and times. A map appears for each place. Edit, move or undo, or tap the mic and say it.</li><li><strong>Spend and settle.</strong> Add expenses as you go and settle up in plain words at the end.</li><li><strong>Keep the memories.</strong> Add photos, notes and Google Photos links, and collect a pair of travel stamps for every finished trip.</li></ol>"]],
      ["Who can change what", ["Everyone on the trip can add plans. The person who added a plan, or the trip owner, can edit or delete it, so one person cannot accidentally wipe out the plan. Deleted plans can be brought back with Undo."]],
      ["For friends, family and mixed groups", ["Not everyone wants another app. along treats guests as first-class: a friend added by name has a seat in the plan, the splits and the balances until they join. Anyone with an invite link sees only the trip name, place, dates and head-count until they join."]],
    ],
    faq: [
      ["Is along free?", "Yes, it is free to start. Sign in with Google, create a trip and bring your group. There are no adverts and your data is never sold."],
      ["Do my friends need the app?", "No. You can add a friend by name and include them in the plan and the splits right away. When they are ready, send a personal invite."],
      ["Can several people edit the same plan?", "Yes. Everyone on the trip can add plans, and changes appear for everyone as they happen. The person who added a plan or the trip owner can edit or delete it."],
      ["Which phones does it run on?", "iPhone and Android, with the same features on both."],
    ],
  },
  {
    slug: "trip-expense-tracker", kind: "Guide",
    title: "Group trip expense tracker: who paid, who owes | along",
    description: "Track shared trip expenses in seconds. Record who paid, split exactly, see who owes whom in plain words, and settle up. Works offline. Free on iPhone and Android.",
    keywords: "trip expense tracker, group expense tracker, track shared expenses travel, who paid who owes, shared expenses app, travel expense splitter",
    h1: "A trip expense tracker for groups",
    lead: "A group expense tracker should take seconds to use and never get the maths wrong. Here is what to look for, and how along handles shared trip costs.",
    sections: [
      ["Track as you go, not at the end", ["The easiest way to keep trip money clear is to log each shared cost when it happens. A good tracker makes that take about three taps: an amount, what it was for, and who shared it. By default, the payer is you, the split is equal among the people you select, and the date is today."]],
      ["What to track", ["<ul><li>The amount and the currency of the trip.</li><li>Who paid. This is not always the person who typed it in.</li><li>Who shared the cost, so people are only charged for what they took part in.</li><li>A short note, such as “Fuel” or “Dinner at the shack”.</li></ul>"]],
      ["Balances in plain words", ["Accounting terms confuse people. A friendlier tracker says “You owe Ben ₹4,500” and “Ben is owed ₹4,500”, not debits and ledgers. along also shows the fewest payments that settle the whole group, so a trip with fifty expenses can end with only a few transfers."]],
      ["Works when you have no signal", ["On remote roads and in flights the connection drops. along lets you add an expense offline. It saves on your phone and syncs once, when you are back online, so nothing is entered twice."]],
      ["Exact, not approximate", ["along keeps money in whole units and never in decimals that round away. Every split adds up to the total to the last paisa. Settlements cannot be edited afterwards, so the record stays trustworthy."]],
      ["What it does not do", ["along keeps the record. It does not move money. You pay each other however you like, then mark it paid. It also does not convert currencies: each trip uses one currency."]],
    ],
    faq: [
      ["Does along move money between people?", "No. along keeps the record of who paid, who owes whom and the fewest payments to square up. You pay each other however you like, then mark it paid."],
      ["Can I add an expense without internet?", "Yes. It is saved on your phone and syncs once when you are back online."],
      ["Can I include friends who are not on the app?", "Yes. Add them by name. They appear in the splits and balances, and can take over their spot later."],
      ["Is it free?", "Yes, it is free to start."],
    ],
  },
  {
    slug: "along-vs-wanderlog", kind: "Comparison",
    title: "along vs Wanderlog: which trip planner suits your group? | along",
    description: "along vs Wanderlog compared fairly: itinerary, maps, group expense splitting, guests without the app, offline use and pricing approach. Pick the right trip planner.",
    keywords: "along vs Wanderlog, Wanderlog alternative, Wanderlog alternative for groups, trip planner comparison, group trip expense app",
    h1: "along vs Wanderlog",
    lead: "Wanderlog and along are both trip planners, but they are built for different jobs. Wanderlog is a detailed itinerary and map planner. along is built for groups who share a plan and shared costs. Here is how they differ.",
    table: { head: ["", "along", "Wanderlog"], rows: [
      ["Built mainly for", "A group sharing one plan, costs and memories", "Detailed itinerary and map planning, including solo trips"],
      ["Itinerary", "Day-by-day plan with a map for each place, edit, move and undo", "Itinerary and map in one view, with place suggestions and route tools"],
      ["Group expense splitting", "Four split methods (equal, amounts, percent, shares), balances in plain words, fewest payments to settle", "Budgeting and expense tracking is part of the planner"],
      ["Friends without the app", "Added by name, included in plans and splits, can join later", "Collaborators use the app or website"],
      ["Booking import", "Not offered", "Import bookings by email forwarding"],
      ["Memories", "Photos, notes, Google Photos links and travel stamps", "See wanderlog.com for its current options"],
      ["Offline expense entry", "Yes, saved on your phone and synced later", "See wanderlog.com for its offline options"],
    ] },
    sections: [
      ["Choose Wanderlog if", ["<ul><li>You want a detailed, map-first itinerary with place suggestions and route tools.</li><li>You want to pull flight and hotel bookings into the plan from your email.</li><li>You mostly plan alone, or do not need to split costs.</li></ul>"]],
      ["Choose along if", ["<ul><li>You travel with friends or family and need everyone on one plan.</li><li>You want clear, exact answers to “who paid what” and “who owes whom”.</li><li>Some friends will not install an app and should still be in the plan.</li><li>You want to keep memories and collect travel stamps after the trip.</li></ul>"]],
      ["Can you use both?", ["Yes. Some groups research and map the route in a detailed planner, then run the trip, the costs and the memories in along."]],
      ["A note on this page", ["Details about Wanderlog come from its public website and may change. Check wanderlog.com for its current features and pricing. Wanderlog is a trademark of its owner and is not affiliated with along."]],
    ],
    faq: [
      ["Is along a good Wanderlog alternative for groups?", "If your main need is a shared plan with exact expense splitting and friends who may not have the app, along is built for that. If you want booking import and detailed route tools, Wanderlog is stronger there."],
      ["Does along import flight and hotel bookings?", "No. along keeps the plan, costs and memories, but does not import bookings."],
      ["Is along free?", "Yes, it is free to start on iPhone and Android."],
    ],
  },
  {
    slug: "along-vs-oneplan", kind: "Comparison",
    title: "along vs OnePlan: group trip apps compared | along",
    description: "along vs OnePlan compared: shared itineraries, saved places, expense splitting, guests without the app, memories and travel stamps. See which group trip app fits.",
    keywords: "along vs OnePlan, OnePlan alternative, group trip app comparison, shared itinerary and expenses app",
    h1: "along vs OnePlan",
    lead: "OnePlan and along share a goal: one place for a group’s plan and shared costs. They put the emphasis in different places. Here is a fair look at both.",
    table: { head: ["", "along", "OnePlan"], rows: [
      ["Starting point", "A group trip with dates, people and a day-by-day plan", "Saving places from videos and social posts, then planning"],
      ["Shared itinerary", "Yes, with maps, edit, move, undo and voice notes", "Yes, build a day-by-day itinerary together"],
      ["Expense splitting", "Four split methods, plain-words balances, fewest payments", "Track shared expenses and see who owes whom"],
      ["Friends without the app", "Added by name, can join later", "Invite friends to the trip"],
      ["Memories", "Photos, notes, Google Photos links, travel stamps", "See oneplan.space for its current options"],
      ["Special features", "Works offline, travel stamps, exact money maths", "Ready-made travel plans, and Payments for foreign visitors in Vietnam"],
    ] },
    sections: [
      ["Choose OnePlan if", ["<ul><li>You collect travel ideas from videos and social posts and want to turn them into places.</li><li>You want ready-made plans for inspiration.</li><li>You are a foreign visitor in Vietnam and want its QR payment feature.</li></ul>"]],
      ["Choose along if", ["<ul><li>You already have a trip and need the group, the plan and the money organised.</li><li>You want exact splits by amount, percentage or shares.</li><li>You want to add expenses offline and sync later.</li><li>You like keeping memories and collecting travel stamps after each trip.</li></ul>"]],
      ["A note on this page", ["Details about OnePlan come from its public website and may change. Check oneplan.space for its current features. OnePlan is a trademark of its owner and is not affiliated with along."]],
    ],
    faq: [
      ["How is along different from OnePlan?", "along starts from the trip and the group: a shared plan, exact expense splits, guests by name, memories and travel stamps. OnePlan puts more weight on saving places from videos and finding ready-made plans."],
      ["Can I use along outside India?", "Yes. Pick any ISO currency for a trip and plan anywhere in the world."],
      ["Is along free?", "Yes, it is free to start on iPhone and Android."],
    ],
  },
];

const LINKS = PAGES.map((p) => [p.slug, p.h1]);
const css = `*{box-sizing:border-box}body{margin:0;background:#fff;color:#222;font:17px/1.6 Geist,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}a{color:#222}
header{max-width:760px;margin:0 auto;padding:20px;display:flex;align-items:center;justify-content:space-between}header img{height:28px;display:block}
.btn{display:inline-flex;align-items:center;min-height:44px;padding:0 22px;border-radius:999px;background:#222;color:#fff;text-decoration:none;font-weight:500;font-size:15px}.btn.alt{background:#f4f4f4;color:#222}
main{max-width:760px;margin:0 auto;padding:8px 20px 56px}.kind{color:#6a6a6a;font-size:14px;font-weight:500;margin:24px 0 0}h1{font-size:clamp(2.2rem,7vw,3.6rem);line-height:1.04;letter-spacing:-.04em;margin:8px 0 16px;font-weight:600}
.lead{font-size:20px;color:#444;margin:0 0 32px}h2{font-size:26px;letter-spacing:-.025em;line-height:1.2;margin:40px 0 12px;font-weight:600}p{margin:0 0 14px}ul,ol{padding-left:22px;margin:0 0 14px}li{margin:6px 0}
.tw{overflow-x:auto}table{width:100%;min-width:520px;border-collapse:collapse;margin:8px 0 8px;font-size:15px}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #e6e6e6;vertical-align:top}th{font-weight:600}td:first-child{font-weight:500;color:#444;width:24%}
details{background:#f4f4f4;border-radius:20px;padding:16px 20px;margin:10px 0}summary{cursor:pointer;font-weight:500;font-size:18px}details p{margin:10px 0 0;color:#444}
.cta{background:#ffc091;border-radius:28px;padding:32px 24px;margin:48px 0 8px;text-align:center}.cta h2{margin:0 0 8px}.cta p{margin:0 0 18px}.cta .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.more li{margin:8px 0}footer{max-width:760px;margin:0 auto;padding:0 20px 40px;font-size:13px;color:#6a6a6a}footer a{color:#6a6a6a;margin-right:16px;display:inline-block;padding:10px 0}`;

for (const p of PAGES) {
  const url = `${SITE}/${p.slug}`;
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const pageLd = { "@context": "https://schema.org", "@type": "Article", headline: p.h1, description: p.description, mainEntityOfPage: url, dateModified: UPDATED, datePublished: UPDATED, image: `${SITE}/og-image.jpg`, author: { "@type": "Organization", name: "Along", url: SITE }, publisher: { "@type": "Organization", name: "Along", logo: { "@type": "ImageObject", url: `${SITE}/apple-touch-icon.png` } } };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "along", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: p.h1, item: url }] };
  const table = p.table ? `<div class="tw"><table><thead><tr>${p.table.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${p.table.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  const body = p.sections.map(([h, ps]) => `<h2>${esc(h)}</h2>${ps.map((x) => (x.startsWith("<ul>") || x.startsWith("<ol>") ? x : `<p>${x}</p>`)).join("")}`).join("");
  const faq = `<h2>Frequently asked questions</h2>${p.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}`;
  const more = LINKS.filter(([s]) => s !== p.slug).map(([s, t]) => `<li><a href="/${s}">${esc(t)}</a></li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}"><meta name="keywords" content="${esc(p.keywords)}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:site_name" content="along"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og-image.jpg"><meta name="twitter:card" content="summary_large_image"><meta name="apple-itunes-app" content="app-id=6817977368"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet"><style>${css}</style><script type="application/ld+json">${JSON.stringify(pageLd)}</script><script type="application/ld+json">${JSON.stringify(faqLd)}</script><script type="application/ld+json">${JSON.stringify(crumbs)}</script></head><body><header><a href="/" aria-label="along"><img src="/footer/logo-mask.svg" alt="along" width="73" height="28"></a><a class="btn" href="${APP_STORE}">Get the app</a></header><main><p class="kind">${p.kind}</p><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p>${table}${body}${faq}<div class="cta"><h2>Plan your next trip with along</h2><p>Free to start. Sign in with Google, make a trip and bring your group.</p><div class="row"><a class="btn" href="${APP_STORE}">Download on the App Store</a><a class="btn alt" href="${PLAY}">Get it on Google Play</a></div></div><h2>More from along</h2><ul class="more"><li><a href="/">along: group trip planner and expense splitter</a></li>${more}</ul></main><footer><a href="/">Home</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms of use</a><a href="/delete-account">Delete your account</a><a href="mailto:alongtravel.app@gmail.com">alongtravel.app@gmail.com</a></footer></body></html>`;
  fs.mkdirSync(`site/public/${p.slug}`, { recursive: true });
  fs.writeFileSync(`site/public/${p.slug}/index.html`, html);
}
// Sitemap: the home page, the guides and the legal pages (the join pages are private).
const urls = [["/", "1.0", "weekly"], ...PAGES.map((p) => [`/${p.slug}`, "0.8", "monthly"]), ["/privacy", "0.3", "yearly"], ["/terms", "0.3", "yearly"], ["/delete-account", "0.3", "yearly"]];
fs.writeFileSync("site/public/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([p, pr, c]) => `  <url><loc>${SITE}${p}</loc><lastmod>${UPDATED}</lastmod><changefreq>${c}</changefreq><priority>${pr}</priority></url>`).join("\n")}\n</urlset>\n`);
console.log(PAGES.length, "pages");
