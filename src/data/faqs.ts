/**
 * FAQ data — centralized question/answer sets.
 *
 * Import named arrays and combine them as needed:
 * ```ts
 * import { webDevFaqs, generalFaqs } from "../data/faqs";
 * <FAQ items={[...webDevFaqs, ...generalFaqs]} />
 * ```
 *
 * ## Formatting answers
 *
 * Answer strings are rendered with `set:html`, so inline HTML is supported:
 *
 * - `<br><br>`              — paragraph break
 * - `<strong>text</strong>` — bold text
 * - `•`                     — bullet character (combine with `<br>` for lists)
 * - `<a href="/">link</a>`  — inline links
 * - `<em>`, `<span>`, etc.  — any other inline HTML
 *
 * Example:
 * ```ts
 * {
 *   question: "What's the difference?",
 *   answer: "<strong>Option A</strong> does X.<br><br><strong>Option B</strong> does Y.<br><br>• Point one<br>• Point two",
 * }
 * ```
 */

export interface FAQItem {
  question: string;
  answer: string;
}

/* ── General / shared FAQs ─────────────────────────────────────────────── */

export const generalFaqs: FAQItem[] = [
  {
    question: "How long does it take to design and develop a website?",
    answer:
      "We build custom websites that are individually tailored to each client, which means the scope and size of each project is different. The average timeline for a design and build is 4-6 weeks. Projects that are strictly development oriented can be completed in 2-3 weeks depending on scope and availability. If you need a project completed quicker, get in touch. We have fully designed and built projects in less than 2 weeks (with a lot of coffee).",
  },
  {
    question: "Why do you use Webflow over other builders like WordPress?",
    answer:
      "Webflow is a powerful low-code builder. It allows us to build dynamic, scalable, and SEO friendly websites fast. It also doesn't come with the design limitations and headaches of other platforms. There are no plug-ins to manage and update, which makes our and your life easier, as well as it insures your website remains fully functional.",
  },
  {
    question: "Are the websites you build SEO friendly?",
    answer:
      "Absolutely! We use technical SEO best practices when building your site. As well as the copy we write is optimized around your target keywords. We work hard to provide you a solid foundation on which you can build an SEO campaign.",
  },
  {
    question: "Why should I work with your agency?",
    answer:
      "Besides living and breathing design and development, we are Webflow experts. We are also able to do the jobs of multiple professionals. We not only excel in design and development, but we are able to help with brand strategy, copywriting, SEO, and photography. Avoid the hassle of finding, vetting, and communicating with multiple professionals. Let us be your one point of contact.",
  },
  {
    question: "How much does a website cost?",
    answer:
      "Each project is priced differently depending on its scope and size as well as other factors such as timeline and integrations. But typically projects fall into a range from 5k - 15k. To get your custom bid, we like to have a strategy call. On the call, I'll learn about your business, your needs, and be able to make recommendations as well as provide you a quote. This is a 100% free no pressure call.",
  },
  {
    question: "How do I get started with a website project?",
    answer:
      "We are excited you are considering working with us. The easiest way to get started with a project is for us to have a strategy call. Fill out our form to start the process of setting up that call. All our strategy calls are 100% free and no pressure. We see it as an opportunity to get to know each other to see if we would be a good fit to work together.",
  },
];

/* ── Web Development FAQs ──────────────────────────────────────────────── */

export const webDevFaqs: FAQItem[] = [
  {
    question: "How long does a typical web development project take?",
    answer:
      "Most projects take 4 to 6 weeks from kickoff to launch. The timeline depends on the scope — a focused site lands closer to 4 weeks, while larger builds with custom functionality or extensive content take longer. We'll give you a clear timeline during discovery.",
  },
  {
    question: "Why Webflow instead of WordPress or custom code?",
    answer:
      "Webflow gives you the best of both worlds: a custom-designed site with a visual CMS your team can actually update without a developer. No plugins to maintain, no security patches, and the performance is excellent out of the box.",
  },
  {
    question: "Do I need to have my content ready before we start?",
    answer:
      'No. Our <a href="/m2m-framework" class="u-text-style-underline">M2M process</a> starts with ICP research and messaging strategy — we help you figure out what to say before we design anything. You\'ll have clear, conversion-focused copy before we touch a single layout.',
  },
  {
    question: "What does ongoing support look like after launch?",
    answer:
      "Every project includes 30 days of free support plus training and SOP documentation. After that, we offer ongoing support packages for teams that want a hands-off approach to updates, optimizations, and new pages.",
  },
  {
    question: 'What does "Webflow Certified Partner" actually mean?',
    answer:
      "It's a recognition Webflow gives to a small percentage of developers who've passed technical review, maintained high client satisfaction, and demonstrated they can solve real problems with the platform. It's not a paid certification — you earn it through your work. For you, it means you're hiring someone Webflow itself trusts to build on its platform.",
  },
  {
    question: "How do you handle performance and Core Web Vitals?",
    answer:
      "Every site we build targets green Core Web Vitals scores at launch. That means properly sized responsive images, lazy-loading below-the-fold content, minimal JavaScript, and a performance audit before launch. We also train your team on image optimization before upload, because the fastest way to slow down a site after launch is a 12MB hero image nobody compressed first.",
  },
  {
    question: "Can my team actually update the site without breaking it?",
    answer:
      "Yes — that's the point of how we build. Your team gets a CMS structured around how editors actually work: clear collection names, reference fields, image rules, and templates that prevent the most common breakage. We also provide live training and SOP documentation in Notion so your team has answers without calling us.",
  },
  {
    question:
      "What if I need a custom integration or feature Webflow doesn't natively support?",
    answer:
      'Most of the time, we can build it. GSAP animations, custom interactions, API integrations, third-party tool embeds, custom code components — Webflow plus light custom code covers almost everything growth-stage teams need. If we hit a real limitation, we\'ll tell you on the <a href="/book-a-call" class="u-text-style-underline">strategy call</a> before scoping the project.',
  },
  {
    question: "Will my site be SEO-ready out of the box?",
    answer:
      "Yes. We implement technical SEO best practices from day one: clean URL structure, proper heading hierarchy, schema markup where appropriate, AEO-ready content structure, and fast page loads. You launch ranking, not playing catch-up.",
  },
  {
    question: "How much does a Webflow project cost?",
    answer:
      'It depends on what\'s included. Visit our <a href="/how-we-work" class="u-text-style-underline">How We Work</a> page for a full breakdown of what\'s in each engagement and what to expect for investment. <br><br>If you\'d rather just talk through it, <a href="/book-a-call" class="u-text-style-underline">book a free strategy call</a> and we\'ll scope your specific project.',
  },
  {
    question: "How do I get started?",
    answer:
      "<a href=\"/book-a-call\" class=\"u-text-style-underline\">Book a free strategy call</a>. <br><br>We'll dig into your business, look at what's working and what's not, and figure out your next step. No pressure, no hard sell. Just an honest conversation about whether we're a good fit.",
  },
];

/* ── Web Design FAQs ─────────────────────────────────────────────────── */

export const webDesignFaqs: FAQItem[] = [
  {
    question: "What makes your web design process different?",
    answer:
      'We don\'t start with templates or mood boards. We start with your ideal customer. Our <a href="/m2m-framework" class="u-text-style-underline">M2M Framework</a> researches who\'s buying, what language they use, and what drives their decisions. Then we design every page around that insight. The result is a site engineered to convert, not just look good.',
  },
  {
    question: "I already have a website. Why do I need a redesign?",
    answer:
      "If your business has grown but your website still looks like day one, prospects notice. An outdated site erodes trust before you ever get to pitch. <br><br>More importantly, the messaging you launched with probably isn't the messaging your business needs now. <br><br>A strategic redesign updates both, locking in messaging that speaks to the right customer and a design that carries that messaging through every page. The result is visitors who actually convert, instead of bounce-rate statistics.",
  },
  {
    question: "What does the M2M Framework actually involve?",
    answer:
      '<a href="/m2m-framework" class="u-text-style-underline">M2M (Market to Message)</a> is our research-driven process that maps your ideal customer\'s pain points, decision triggers, and the exact language they use when searching for a solution like yours. That research shapes everything: the messaging hierarchy, page structure, calls to action, and even which objections to address and where.',
  },
  {
    question: "Do you write the website copy, or do I need to provide it?",
    answer:
      'We handle it. The <a href="/m2m-framework" class="u-text-style-underline">M2M Framework</a> produces conversion-focused messaging based on real customer research, not generic filler. You\'ll review and approve everything, but you won\'t need to stare at a blank page.',
  },
  {
    question: "Do I need to have my brand identity ready before we start?",
    answer:
      "Not necessarily. If you already have strong branding like a logo, colors, and fonts, we design within those guidelines. If your brand needs work, we can address that too. <br><br>The only thing we won't do is design a website around branding that fights your messaging. If we find a real conflict, we'll talk it through before we start the design phase.",
  },
  {
    question:
      "Can you redesign just one section or page, or do I need a full redesign?",
    answer:
      'In most cases, a full redesign is the right call. The reason is that messaging and design have to work together across the whole site. Redesigning one page often exposes inconsistencies that pull the rest of the site down. <br><br>That said, if you\'ve recently completed a redesign and just need a specific page or section reworked, we can talk through it on a <a href="/book-a-call" class="u-text-style-underline">strategy call</a>.',
  },
  {
    question: "How long does a web design project take?",
    answer:
      "Most projects take 4 to 6 weeks from kickoff to launch. The timeline depends on scope. A focused site lands closer to 4 weeks, while larger builds with custom functionality take longer. We'll give you a clear timeline during our strategy call.",
  },
  {
    question: "How much does a web design project cost?",
    answer:
      'It depends on what\'s included. Visit our <a href="/how-we-work" class="u-text-style-underline">How We Work</a> page for a full breakdown of what\'s in each engagement and what to expect for investment. <br><br>If you\'d rather just talk through it, <a href="/book-a-call" class="u-text-style-underline">book a free strategy call</a> and we\'ll scope your specific project.',
  },
  {
    question: "Why Webflow instead of WordPress or Squarespace?",
    answer:
      "Webflow gives you a custom-designed site with a visual CMS your team can actually update without a developer. No plugins to maintain, no security patches, and performance is excellent out of the box. It eliminates the headaches that come with WordPress while giving us full design freedom.",
  },
  {
    question: "Will my new site be optimized for SEO?",
    answer:
      "Yes. SEO is built in from day one, not bolted on after. We implement technical SEO best practices, keyword-aligned page structure, and AEO-ready content so you launch ranking instead of playing catch-up.",
  },
  {
    question: "What happens after my site launches?",
    answer:
      "Every project includes 30 days of free support plus training and SOP documentation so your team can manage day-to-day updates. <br><br> After that, we offer ongoing support packages for teams that want a hands-off approach to updates, optimizations, and new pages.",
  },
  {
    question: "How do I get started?",
    answer:
      "<a href=\"/book-a-call\" class=\"u-text-style-underline\">Book a free strategy call</a>. <br><br>We'll dig into your business, look at what's working and what's not, and figure out your next step. No pressure, no hard sell. Just an honest conversation about whether we're a good fit.",
  },
];

/* ── SEO FAQs ──────────────────────────────────────────────────────────── */

export const seoFaqs: FAQItem[] = [
  {
    question: "What's the difference between SEO & AEO and Marketing Partner?",
    answer:
      'SEO &amp; AEO is a reach strategy. We help more people find you through Google and AI search tools. <a href="/services/marketing-partner" class="u-text-style-underline">Marketing Partner</a> is a full-funnel engagement. It covers reach, but also conversion, email nurture, lead magnets, case studies, and the messaging foundation that connects all of it. If your primary goal is organic visibility, SEO &amp; AEO is the right fit. If you need someone to run marketing with you across the board, that\'s Marketing Partner.',
  },
  {
    question: "What's the difference between SEO & AEO and Website Support?",
    answer:
      'SEO &amp; AEO includes strategy. We research your market, build the content roadmap, produce the content, and handle the technical markup. <a href="/services/webflow-website-support" class="u-text-style-underline">Website Support</a> is execution without strategy. You bring the plan and we build what you need. Some clients use both: SEO &amp; AEO for organic growth, Website Support for everything else on the site.',
  },
  {
    question: "Why one tier instead of three?",
    answer:
      "Because the strategy doesn't change at different price points. Every client needs the same foundation: M2M research, a content gap audit, and consistent monthly content production with proper schema. Splitting that into tiers meant some clients were getting a watered-down version of the work. One tier means everyone gets the full approach.",
  },
  {
    question: "Why a 3-month minimum?",
    answer:
      "Because SEO and AEO don't produce meaningful results in one month. Committing to less than three months sets you up to feel like the work isn't working before it has a real chance to. The minimum protects your investment more than it protects ours.",
  },
  {
    question: "Can I add Website Support to my SEO & AEO retainer?",
    answer:
      'Yes. They stack cleanly. SEO &amp; AEO handles your organic visibility. <a href="/services/webflow-website-support" class="u-text-style-underline">Website Support</a> handles design updates, new landing pages, CMS work, form connections, and anything else your site needs. If you\'re running both and start feeling like you need someone to own the whole picture, that\'s the <a href="/services/marketing-partner" class="u-text-style-underline">Marketing Partner</a> conversation.',
  },
];

/* ── M2M Framework FAQs ────────────────────────────────────────────────── */

export const m2mFaqs: FAQItem[] = [
  {
    question:
      "Why does a website built with the M2M Framework cost more than a typical Webflow project?",
    answer:
      "Because you're not paying for a website. You're paying for research, strategy, and a messaging system that happens to be delivered as a website. Most agencies quote the design and development hours. We quote the entire process, including the work that happens before design starts and the thinking that makes the design actually work. The cost difference reflects what's actually being built.",
  },
  {
    question: "How long does the research phase take?",
    answer:
      'The Know Your Market phase typically runs 1-3 weeks depending on project complexity and how much existing customer data you have. It\'s not a delay, it’s the reason the rest of the project moves faster. When we start design with clear answers instead of assumptions, there are fewer revisions, fewer pivots, and fewer "let me think about it" moments from stakeholders.',
  },
  {
    question: "Can't I just do this research myself?",
    answer:
      "You can, and the free M2M Workbook is built to help you start. What you're paying us for is the structured process, the outside perspective, and the decades of experience applying research to actual messaging and design decisions. Most founders know their business cold but have a hard time seeing the patterns in their own customer data. That's where we come in.",
  },
  {
    question: "What if I already know my ideal customer?",
    answer:
      "Then Step 1 will move fast and feel like validation instead of discovery. Most clients who say this at the start of a project still find 2-3 insights they hadn't considered, usually about decision triggers or the specific language their best clients use. The framework adapts to what you already know instead of restarting from zero.",
  },
  {
    question: "Do you use the M2M Framework on every project?",
    answer:
      "Yes. Every website, every rebrand, every messaging engagement starts here. It's not an upsell or a premium tier, it's the foundation of how we work. If we skip it, we're just another Webflow shop guessing at what looks good.",
  },
];

/* ── Marketing Partner FAQs ────────────────────────────────────────────── */

export const marketingPartnerFaqs: FAQItem[] = [
  {
    question: "How is Marketing Partner different from an SEO retainer?",
    answer:
      "SEO is a tactic. Marketing Partner is the system that uses SEO as one of its inputs. An SEO retainer drives more traffic to your site. We do that and make sure the site converts, the email nurtures, the case studies prove you, and the messaging is the same everywhere your buyer meets you.",
  },
  {
    question: "How is this different from hiring a fractional CMO?",
    answer:
      "A fractional CMO usually hands you strategy and leaves the execution to your team. We do both. We give you the playbook for marketing your business through your website. Then we run it with you, every month.",
  },
  {
    question: "Why not just hire an in-house marketer?",
    answer:
      "An in-house marketer runs $8,000 to $13,000 a month with benefits, and you still have to direct the work. You're paying us a portion of that, we don't ask for benefits, and you're getting senior strategy plus the execution.",
  },
  {
    question: "Who actually does the work?",
    answer:
      "We do. CL Creative is a small studio by design. You work directly with us every week. No account manager between you and the people doing the work. We use AI where it makes sense, so production moves faster without the strategy getting watered down.",
  },
  {
    question: "What if I don't have a Webflow site?",
    answer:
      "We'll talk through it on the strategy call. If your current site can carry the work, we'll start there. If it can't, we offer a Marketing-Ready Migration as a separate engagement before Marketing Partner begins.",
  },
  {
    question: "How long until I see results?",
    answer:
      "The first 90 days are about laying the foundation: messaging dialed in, site working as the hub, email and lead magnets in place, analytics set up properly. Meaningful traffic and conversion lifts usually show up in months 4 through 6. Compounding starts around month 9 and continues into 12 months. Marketing Partner is not a one and done implementation. You are working with a partner to continue to grow your business.",
  },
  {
    question: "What's the commitment? Can I cancel?",
    answer:
      "90-day initial commitment. Month-to-month after that. You can cancel with 30 days' notice. We don't lock anyone into a year because the work should earn the next month.",
  },
  {
    question: "Do you handle social media, paid ads, or PR?",
    answer:
      "No. Marketing Partner is focused on your website as the hub and the email, content, and lead magnets that feed it. We give you the messaging foundation that flows out to social, podcast, and video, but you post there. If you need paid ads, PR, or full-service social, we'll point you to people who do that well.",
  },
  {
    question: "Do you guarantee results?",
    answer:
      "No, and anyone who does is lying. We guarantee the work, the cadence, and the strategy. Marketing compounds when someone runs it consistently. That's what we're on the hook for.",
  },
  {
    question: "What if my business changes mid-engagement?",
    answer:
      "That's the point of the monthly working session. We adjust. If you launch a new offer, change your ICP, or move into a new market, the playbook moves with you. The site updates with it.",
  },
  {
    question: "Why $5,000 a month flat?",
    answer:
      "Flat means no surprise invoices and no scope arguments. The retainer covers everything in the monthly deliverables list. If something falls outside it (a full rebrand, paid ad management, a separate website project), we'll quote it separately. No surprises either direction.",
  },
  {
    question: "What if we already have an M2M Messaging Framework?",
    answer:
      'We use yours. The <a href="/m2m-framework" class="u-text-style-underline">M2M Framework</a> is included as Month 1 only when you don\'t have one. If you do, Month 1 starts with the audit and the 90-day plan instead.',
  },
];

/* ── Website Support FAQs ──────────────────────────────────────────────── */

export const websiteSupportFaqs: FAQItem[] = [
  {
    question: "How is this different from your SEO & AEO service?",
    answer:
      "Website Support is execution-focused. You bring the work and we build it. You're in the driver's seat. We're your expert hands. <a href=\"/services/seo\" class=\"u-text-style-underline\">SEO &amp; AEO</a> is strategy-focused. We research your market, build a content roadmap, produce the content, and handle the technical markup. If you already have a marketing plan and need someone to execute it, Website Support is the right fit. If you need someone to come up with the plan and produce organic content, that's SEO &amp; AEO.",
  },
  {
    question: "How is this different from Marketing Partner?",
    answer:
      'Website Support builds what you bring us. <a href="/services/marketing-partner" class="u-text-style-underline">Marketing Partner</a> brings the strategy and builds it with you. If you have a marketing team or a clear plan and just need reliable Webflow help, Website Support is the right fit. If you need someone to own the marketing playbook and run it alongside you, that\'s Marketing Partner.',
  },
  {
    question: "What exactly does each plan include?",
    answer:
      "Website Care Plan covers content updates, image swaps, CMS management, and general site maintenance. Growth Support includes everything in Website Care, plus new landing pages, section and component design, form and CRM connections, lead magnet design, and custom development work. Both tiers include email and text support.",
  },
  {
    question: "How quickly will updates be made?",
    answer:
      "Website Care has a 72-hour response time. Growth Support has a 24-hour response time. Most updates are completed within 24-48 hours of acknowledgment.",
  },
  {
    question: "What if I need more work than my plan covers?",
    answer:
      "Website Care Plan is scoped for 2-3 hours per month. Growth Support is scoped for 10-12 hours. If you consistently push past the top of your range, we'll let you know before billing any overage. Additional work is billed at $150/hour. If it keeps happening, we'll talk about moving to a higher tier or scoping a separate project.",
  },
  {
    question: "Do unused hours roll over?",
    answer:
      "No. Each month is a fresh range. Some months you'll use 3 hours, some months you'll use the full range. It averages out. If you consistently come in well under your range, we can talk about adjusting your tier.",
  },
  {
    question: "Can I pause or cancel my plan?",
    answer:
      "Yes. Plans are month-to-month with no long-term contracts. Let us know before your next billing cycle. When you're ready to pick back up, we start fresh.",
  },
  {
    question: "Can I add SEO & AEO to my Website Support plan?",
    answer:
      'Yes. They stack cleanly. Website Support handles the hands-on site work. <a href="/services/seo" class="u-text-style-underline">SEO &amp; AEO</a> handles your organic visibility and content production. If you\'re running both and start feeling like you need someone to own the whole picture, that\'s the <a href="/services/marketing-partner" class="u-text-style-underline">Marketing Partner</a> conversation.',
  },
  {
    question: "Will you work on a site you didn't build?",
    answer:
      "Absolutely. We're happy to support any Webflow site. We'll do a quick audit first to understand the current setup and make sure we can provide the best care.",
  },
];

/* ── M2M Messaging Sprint FAQs ─────────────────────────────────────────── */

export const m2mMessagingSprintFaqs: FAQItem[] = [
  {
    question: "How is this different from hiring a copywriter?",
    answer:
      "A copywriter writes the words. The Sprint figures out who you're writing for and what to say to them. After the Sprint, a copywriter has something real to work from. Without the Sprint, they're guessing.",
  },
  {
    question: "How is this different from a brand strategy engagement?",
    answer:
      "Brand strategy is broader — visual identity, brand voice, market positioning, sometimes pricing. The Sprint is laser-focused on messaging: who you're talking to, what to say, where to deploy it. If you need the full brand work, we'll point you to someone we trust. If you need messaging, you're in the right place.",
  },
  {
    question: "What if I don't have a website yet?",
    answer:
      "The Sprint still works. You'll come out of it with the messaging system you need to brief a web designer (us or someone else). It's actually the right order: figure out what to say first, then build the site around it.",
  },
  {
    question: "Will you write my homepage copy?",
    answer:
      'Not as part of the Sprint. The Sprint hands you the messaging system; writing pages of website copy is a different scope. If you want both, the <a href="/how-we-work" class="u-text-style-underline">Full Marketing Foundation</a> engagement includes the Sprint plus full website copywriting and design.',
  },
  {
    question: "How long does the Sprint actually take?",
    answer:
      "Two to three weeks. Most clients land at two and a half. The variable is mostly how quickly you can complete the M2M Workbook and review drafts.",
  },
  {
    question: "Where does the research come from?",
    answer:
      "Your buyers have already told you what matters to them. We pull their actual language from where it already lives: your sales calls, reviews, support tickets, the questions you get asked most, and the way your competitors talk to the same audience. Combined with the M2M Workbook you complete, that's enough to build a messaging system grounded in real buyer language, not guesses.",
  },
  {
    question: "What if I don't like the messaging you deliver?",
    answer:
      "The Sprint includes a structured review window in week two specifically for this. We don't ship final messaging until you've signed off on the direction. If something fundamentally doesn't fit, we'll rework it within the original timeline.",
  },
  {
    question: "Can I upgrade to the Full Marketing Foundation later?",
    answer:
      "Yes — and most Sprint clients eventually do. The Sprint is designed as a real standalone product, but the messaging system from the Sprint becomes the foundation for the full engagement if you decide to build the website around it. The Sprint cost is also rolled into the larger engagement if you upgrade within 30 days.",
  },
];

/* ── Book a Call FAQs ──────────────────────────────────────────────────── */

export const bookACallFaqs: FAQItem[] = [
  {
    question: "Is this really free? What's the catch?",
    answer:
      "Yes, it's free. There's no catch. I do these calls because they're the best way to figure out if we're a fit, for both of us. If we're not, I'd rather know in 30 minutes than after we've signed a contract.",
  },
  {
    question: "What if I'm not ready to commit to a project yet?",
    answer:
      "That's fine. Most people aren't ready when they book. The point of the call is to figure out if you're ready, what kind of project would actually move the needle for you, and roughly what it would cost. No pressure to commit on the call.",
  },
  {
    question: "Will you try to sell me something on the call?",
    answer:
      "No. If it's a fit and you want to move forward, we can talk about what a project would look like. If it's not a fit, I'll tell you that too, and I'll usually point you toward someone who is.",
  },
  {
    question: "What should I have ready before the call?",
    answer:
      "Nothing required. If you have a website, I'll look at it before the call. If you have specific numbers like traffic, conversion rates, or revenue goals, those help. But come as you are, and we'll work with what you've got.",
  },
  {
    question: "How long does it take to hear back after I book?",
    answer:
      "You'll get a confirmation email immediately with the calendar invite and the Google Meet link. If you need to reschedule, the email has a link for that too.",
  },
  {
    question: "Can we do the call by phone instead of Google Meet?",
    answer:
      "Yes. You'll add your phone number to the booking confirmation, and in the message field where you tell me what's working, what's not, and what your goals are, just let me know you'd prefer a phone call and I'll call you at your scheduled time.",
  },
];

/* ── How We Work FAQs ──────────────────────────────────────────────────── */

export const howWeWorkFaqs: FAQItem[] = [
  {
    question: "Why does every project start with the messaging sprint?",
    answer:
      "Because most websites fail because the message is wrong, not the design. If we skip the messaging work and go straight to design, we're guessing at headlines and CTAs. The sprint takes 2–3 weeks and saves months of \"this doesn't feel right\" revisions later. It also means the messaging works everywhere — not just on the homepage.",
  },
  {
    question: "What if I already have my messaging figured out?",
    answer:
      "Then we'll move faster through the strategy phase. We still need to validate your ICP and lock in the soundbites we'll use across the site, but if you've done the work, we're not starting from zero. Bring whatever you have and we'll build on it.",
  },
  {
    question: "How is this different from hiring a regular Webflow designer?",
    answer:
      "A Webflow designer builds what you tell them to build. I build what your business actually needs based on who you're trying to reach. The site is one part of the work — the strategy, copy, content system, and measurement are the rest of it. You're hiring a marketing foundation, not a redesign.",
  },
  {
    question: "Can I add or remove deliverables based on what I need?",
    answer:
      "Yes. Every quote is built for the specific project. Some clients don't need a blog. Others need more pages than typical. Some only need the messaging sprint. We'll figure out the right scope on the discovery call.",
  },
  {
    question: "What if my project needs more pages than typical?",
    answer:
      "Additional pages are usually $750 each, but it depends on complexity. A simple service page is different from a custom interactive page. We'll quote based on what the page actually needs.",
  },
  {
    question: "What happens after the 30-day support window?",
    answer:
      'You own the site and you\'ve been trained on how to maintain it. Most clients run with it from there. If you want ongoing support, content help, or new feature development, I offer monthly retainers starting at $750/month. See <a href="/services/webflow-website-support" class="u-text-style-underline">Website Support</a> for details.',
  },
  {
    question: "How long until I see results?",
    answer:
      "The website launches in 4–12 weeks. Early lead flow usually starts within the first 30–60 days post-launch, depending on your existing audience and SEO baseline. Compounding results (SEO traffic, content authority, brand recognition) build over 6–12 months. Anyone promising faster than that is selling you something they can't deliver.",
  },
  {
    question: "What if I'm not sure which engagement is right for me?",
    answer:
      "Book a discovery call anyway. The first 15 minutes of the call usually makes it obvious. If you only need the messaging sprint, I'll say so. If you need the full foundation, same. The goal of the call is to figure out what you actually need — not to upsell you.",
  },
];

/* ── Web Design Midlothian FAQs ─────────────────────────────────────────── */

export const webDesignMidlothianFaqs: FAQItem[] = [
  {
    question: "Do you only build websites for businesses in Midlothian?",
    answer:
      "No. We're based in Midlothian and work with clients across Ellis County, throughout the DFW Metroplex, and beyond. We've even worked with a business down in Houston. Being local just means we understand the market a lot of our clients sell into, and it's easy to meet in person when that helps.",
  },
  {
    question:
      "What kinds of Midlothian and Ellis County businesses have you built websites for?",
    answer:
      "Therapists and counselors, coaches, authors, corporate trainers, and home-services companies like landscaping and irrigation. The common thread isn't the industry. It's owners who outgrew a starter website and need one that actually brings in the right customer.",
  },
  {
    question: "Are you part of the local business community?",
    answer:
      'Yes. CL Creative is based in Midlothian, and we\'re a member of the <a href="https://business.waxahachiechamber.com/list/member/cl-creative-6700" target="_blank" rel="noopener noreferrer" class="u-text-style-underline">Waxahachie Chamber of Commerce</a>.',
  },
  {
    question: "Why Webflow instead of WordPress or Squarespace?",
    answer:
      "Webflow gives you a custom-designed site with a visual CMS your team can update without a developer. No plugins to maintain, no security patches, and it's fast out of the box.",
  },
  {
    question: "How much does a website cost?",
    answer:
      'It depends on what\'s included. Visit our <a href="/how-we-work" class="u-text-style-underline">How We Work</a> page for a full breakdown of what\'s in each engagement and what to expect for investment.<br><br>If you\'d rather just talk through it, <a href="/book-a-call" class="u-text-style-underline">book a free strategy call</a> and we\'ll scope your specific project.',
  },
];

/* ── Web Design Dallas FAQs ─────────────────────────────────────────────── */

export const webDesignDallasFaqs: FAQItem[] = [
  {
    question: "What kinds of Dallas businesses have you built websites for?",
    answer:
      "A wide range. Software companies, recruiting firms, multi-location retailers, salons, printers, professional services, and more. Different industries, same goal: a website that brings in the right customer.",
  },
  {
    question: "Are you based in Dallas?",
    answer:
      "We're based in the Dallas-Fort Worth Metroplex and work with clients throughout it, including a lot of Dallas businesses. We also work with clients beyond North Texas, but Dallas is a core part of what we do.",
  },
  {
    question:
      "Can you handle a full rebrand and rebuild, not just a new website?",
    answer:
      "Yes. We've designed and developed sites as part of a larger brand makeover, including for a multi-location retailer rolling out a new brand image across the Metroplex.",
  },
  {
    question: "Do you only do websites, or other creative work too?",
    answer:
      "Websites are the core of what we do. We've also handled brand, headshot, and campaign photography for Dallas clients, including downtown work for CBRE, when a project calls for it.",
  },
  {
    question: "How much does a website cost?",
    answer:
      'It depends on what\'s included. Visit our <a href="/how-we-work" class="u-text-style-underline">How We Work</a> page for a full breakdown of what\'s in each engagement and what to expect for investment.<br><br>If you\'d rather just talk through it, <a href="/book-a-call" class="u-text-style-underline">book a free strategy call</a> and we\'ll scope your specific project.',
  },
];

/* ── Web Design Waxahachie FAQs ─────────────────────────────────────────── */

export const webDesignWaxahachieFaqs: FAQItem[] = [
  {
    question: "Are you actually local to Waxahachie?",
    answer:
      "We're based just up the road in Midlothian and we're a member of the Waxahachie Chamber of Commerce, so yes, we're part of the same business community. We work with clients across Ellis County and the wider Metroplex.",
  },
  {
    question:
      "Do you work with small downtown and square-area businesses, or only bigger companies?",
    answer:
      "Both. We've built sites for solo practitioners and small teams as well as larger companies. What matters more than size is whether you've outgrown a starter website and need one that actually brings in the right customer.",
  },
  {
    question: "What kinds of businesses have you built websites for?",
    answer:
      "Therapists and counselors, coaches, authors, corporate trainers, and home-services companies like landscaping and irrigation. The common thread is owners who needed their website to finally sound like the business they've become.",
  },
  {
    question: "How long does a website take to build?",
    answer:
      "Most projects run several weeks from kickoff to launch, depending on size and how quickly we get content and feedback. We'll give you a real timeline on the strategy call, not a guess.",
  },
  {
    question: "How much does a website cost?",
    answer:
      'It depends on what\'s included. Visit our <a href="/how-we-work" class="u-text-style-underline">How We Work</a> page for a full breakdown of what\'s in each engagement and what to expect for investment.<br><br>If you\'d rather just talk through it, <a href="/book-a-call" class="u-text-style-underline">book a free strategy call</a> and we\'ll scope your specific project.',
  },
];

export const webDesignRecruitingFirmFaqs: FAQItem[] = [
  {
    question: "Do you understand how recruiting firms actually work?",
    answer:
      "Yes. Before CL Creative, our founder spent four years in staffing as a recruiter, a training lead, and an account manager. We've also built for recruiting clients, including Synergy Sparq and the PopCandi AI recruiting platform. We know the business from the inside, not just as a design project.",
  },
  {
    question:
      "How do you handle a website that needs to speak to both clients and candidates?",
    answer:
      "That's the core challenge with recruiting sites, and it's what we focus on first. We give each audience a clear path so a hiring manager and a job seeker each immediately know the site is for them, instead of trying to serve both with one blurred message.",
  },
  {
    question: "Do you only work with IT and tech recruiting firms?",
    answer:
      "No. That's where our deepest experience is, but we build for recruiting and staffing firms across specialties. The two-audience challenge is the same whether you place engineers, executives, or healthcare workers.",
  },
  {
    question: "How much does a recruiting firm website cost?",
    answer:
      'It depends on what\'s included. Visit our <a href="/how-we-work" class="u-text-style-underline">How We Work</a> page for a full breakdown of what\'s in each engagement and what to expect for investment.<br><br>If you\'d rather just talk through it, <a href="/book-a-call" class="u-text-style-underline">book a free strategy call</a> and we\'ll scope your specific project.',
  },
];

export const webDesignCoachesFaqs: FAQItem[] = [
  {
    question: "Do you work with all kinds of coaches?",
    answer:
      "Yes. We work with business and executive coaches, leadership coaches, and coaches across other specialties. Our deepest experience is with coaches selling serious, high-value engagements, where the website has to earn real trust before someone books. If you're a coach and your site isn't bringing in the right clients, we should talk.",
  },
  {
    question:
      "Why isn't my coaching website booking calls even though it looks good?",
    answer:
      "Usually because it talks about you instead of your client. Coaching sites tend to lead with credentials and methodology, when the visitor mainly wants to know that you understand their problem and can solve it. We rebuild the site around the client's problem first, which is what actually resonates with your potential clients.",
  },
  {
    question: "I sell something intangible. How do you design for that?",
    answer:
      "That's the central challenge with coaching websites, and it's what we focus on. Since a visitor can't try your coaching before they buy, the site has to build trust through clarity: naming their problem, showing you understand it, and making the path to working with you obvious. We've done exactly this for others.",
  },
  {
    question: "How much does a coaching website cost?",
    answer:
      'It depends on what\'s included. Visit our <a href="/how-we-work" class="u-text-style-underline">How We Work</a> page for a full breakdown of what\'s in each engagement and what to expect for investment.<br><br>If you\'d rather just talk through it, <a href="/book-a-call" class="u-text-style-underline">book a free strategy call</a> and we\'ll scope your specific project.',
  },
];

export const webDesignHomeServicesFaqs: FAQItem[] = [
  {
    question:
      "What kinds of home-services businesses do you build websites for?",
    answer:
      "A wide range: irrigation and sprinkler companies, home repair and renovation, spray foam insulation, natural lawn care, and commercial dumpster and large-load hauling. Different trades, same goal: turning local searches into booked jobs.",
  },
  {
    question:
      "Why isn't my home-services website bringing in calls even though it looks fine?",
    answer:
      "Usually because it makes a hurried customer work too hard. If what you do, where you work, and how to call you aren't obvious in the first second on a phone, a ready customer just calls the next company. We rebuild the site so the call is the easiest thing on the page.",
  },
  {
    question: "Do you understand the home-services business, or just websites?",
    answer:
      "Both. Our founder grew up renovating houses with his dad and owns a rental property he maintains, so we understand the seasons, the service calls, and why a missed call is a missed paycheck. We build the website around how your customer actually searches and decides.",
  },
  {
    question: "Will my site work well on a phone?",
    answer:
      "Yes, and for home services that's the whole game. Most of your customers find you on a phone, often in a hurry, so we build mobile-first with fast load times and click-to-call front and center.",
  },
  {
    question: "How much does a home-services website cost?",
    answer:
      'It depends on what\'s included. Visit our <a href="/how-we-work" class="u-text-style-underline">How We Work</a> page for a full breakdown of what\'s in each engagement and what to expect for investment.<br><br>If you\'d rather just talk through it, <a href="/book-a-call" class="u-text-style-underline">book a free strategy call</a> and we\'ll scope your specific project.',
  },
];

export const webDesignChurchesFaqs: FAQItem[] = [
  {
    question: "Do you actually understand how churches work?",
    answer:
      "Yes. Before CL Creative, our founder pastored and built the websites and branding for the churches he led, so we've made these decisions from inside ministry, not as an outside vendor. We've also built for churches and ministries. Some of which are: Potential Church, its pastor's personal site (TroyGramling.com), and a local Baptist association.",
  },
  {
    question: "Why isn't our church website connecting with new people?",
    answer:
      "Usually because it's built for the people already there. Church sites tend to be full of insider language with service times and \"what to expect\" buried, which loses the nervous first-time guest. We rebuild the site to answer a guest's real questions clearly, so the front door is easy to walk through.",
  },
  {
    question:
      "Do you only build for churches, or for ministries and pastors too?",
    answer:
      "We focus on churches, and we also build for the wider ministry world: associations, ministries, and pastors' personal or teaching sites. The heart of the work is the same, helping the right people find you and take a next step.",
  },
  {
    question: "Can you help with more than the website, like a logo or print?",
    answer:
      "Yes. Our founder built the full identity, logo, signage, and print, for the churches he pastored, so we're comfortable helping your church look and sound consistent beyond just the website.",
  },
  {
    question: "How much does a church website cost?",
    answer:
      'It depends on what\'s included. Visit our <a href="/how-we-work" class="u-text-style-underline">How We Work</a> page for a full breakdown of what\'s in each engagement and what to expect for investment.<br><br>If you\'d rather just talk through it, <a href="/book-a-call" class="u-text-style-underline">book a free strategy call</a> and we\'ll scope your specific project.',
  },
];
