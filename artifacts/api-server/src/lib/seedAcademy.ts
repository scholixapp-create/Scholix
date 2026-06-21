import { db, tutorArticlesTable } from "@workspace/db";
import { logger } from "./logger";

const SEED_ARTICLES = [
  {
    title: "Do I Need an ABN as a Tutor?",
    slug: "do-i-need-abn-as-tutor",
    category: "ABN Basics",
    summary: "Most tutors operating as independent contractors need an ABN. Here's what you need to know and how to get one in under 10 minutes.",
    content: `## What is an ABN?

An Australian Business Number (ABN) is an 11-digit number that identifies your business to the government and other businesses. As an independent tutor, you are running a business — even if it feels like you're "just" helping students.

## Do I Need One?

If you're providing tutoring services as an independent contractor (not employed by a school or tutoring company), you generally need an ABN. Without one:

- Clients (or platforms like Scholix) may be required to withhold 47% of your payments for tax purposes
- You cannot register for GST
- You cannot claim many business deductions

## How to Get an ABN

Applying for an ABN is free and takes about 10 minutes through the Australian Business Register:

1. Go to abr.business.gov.au
2. Click "Apply for an ABN"
3. Select "Sole trader" (most tutors)
4. Enter your personal details and the nature of your business (e.g. "Education services — private tutoring")
5. Submit — you may receive your ABN immediately or within 28 days

## Is My ABN Valid?

You can check any ABN (including your own) at abr.business.gov.au. Make sure your details are up to date, including your address and business name if you use one.

## Summary

Getting an ABN is simple, free, and essential for tutoring as an independent professional. Once you have yours, add it to your Scholix profile to complete your verification.`,
    type: "article",
    isPublished: true,
  },
  {
    title: "Understanding Your Tax Obligations as a Tutor",
    slug: "tutor-tax-obligations",
    category: "Tax Responsibilities",
    summary: "As an independent contractor, you're responsible for your own tax. Here's a plain-English guide to what you owe and when.",
    content: `## You're Responsible for Your Own Tax

Unlike employees, Scholix does not withhold tax from your earnings. As an independent contractor, you are responsible for:

- Declaring all tutoring income in your annual tax return
- Paying tax on your net income (income minus allowable deductions)
- Making PAYG instalments if the ATO asks you to

## What Income Do You Need to Declare?

All money you receive from tutoring is assessable income, including session fees and reimbursements.

## Allowable Deductions

As a tutor, you may be able to claim deductions for expenses directly related to your work, such as:

- Textbooks, workbooks, and teaching materials
- Printing costs for student handouts
- A portion of your home internet if you teach online
- Professional development courses
- Travel to and from student locations (if applicable)
- A home office deduction if you have a dedicated workspace

## PAYG Instalments

If your tax bill exceeds a threshold after your first year of operating, the ATO may ask you to pay tax in quarterly instalments rather than a lump sum at year end.

## Getting Help

A registered tax agent or accountant who works with small businesses and contractors is worth engaging, especially in your first year. The cost is itself tax deductible.

*Disclaimer: This content is for general educational purposes only and does not constitute tax advice. Always consult a registered tax professional for advice specific to your situation.*`,
    type: "article",
    isPublished: true,
  },
  {
    title: "GST and Tutoring: Do You Need to Register?",
    slug: "gst-and-tutoring",
    category: "GST Explained",
    summary: "GST registration is only required if your tutoring income exceeds $75,000 per year. Here's what that means for you.",
    content: `## What is GST?

The Goods and Services Tax (GST) is a 10% tax added to most goods and services sold in Australia. Businesses registered for GST collect this tax from customers and pass it to the ATO.

## Do Tutors Need to Register for GST?

You must register for GST if your annual tutoring turnover is $75,000 or more. Below this threshold, GST registration is optional.

**Most independent tutors do not need to register for GST**, particularly when starting out or tutoring part-time.

## What Happens if You Register?

If you register for GST:
- You must charge 10% GST on top of your session fees
- You submit quarterly Business Activity Statements (BAS) to the ATO
- You can claim back GST paid on business expenses

## What Happens if You Don't Register?

If you're under the $75,000 threshold:
- You do not charge GST to clients
- You cannot claim GST credits on business purchases
- You only need to lodge an annual income tax return

## Monitoring Your Threshold

Track your annual tutoring income carefully. If you approach or exceed $75,000, you must register within 21 days of crossing the threshold.

*Disclaimer: This content is general information only. Consult a registered tax professional or BAS agent for advice specific to your circumstances.*`,
    type: "article",
    isPublished: true,
  },
  {
    title: "How to Price Your Tutoring Services",
    slug: "how-to-price-tutoring-services",
    category: "Pricing Strategy",
    summary: "Pricing too low undervalues your expertise. Pricing too high loses clients. Here's how to find the right rate and grow it over time.",
    content: `## The Minimum and What It Means

Scholix sets a minimum rate of $65/hr. This reflects the professional value of quality tutoring. Charging below this erodes the market for all tutors.

## Factors That Affect Your Rate

**Subject difficulty and demand**
- VCE specialist subjects, advanced maths, and selective school prep command higher rates
- High-demand subjects with few qualified tutors support premium pricing

**Your experience and qualifications**
- University students or recent graduates might start around $65–80/hr
- Experienced teachers with strong results can reasonably charge $90–130/hr
- Specialist VCE tutors with high student ATARs often charge $120–180/hr

**Track record on Scholix**
- As you accumulate completed sessions and positive parent feedback, you earn the credibility to raise your rates

## Raising Your Rate

Give existing clients advance notice (e.g. 4 weeks). Frame it positively: "As of [date], my rate will be $X/hr to reflect my ongoing professional development." New clients book at your new rate immediately.

## Rate Psychology

Clients often associate price with quality. A tutor charging $120/hr is frequently perceived as more expert than one charging $65/hr. Don't race to the bottom.

## Summary

Start at a rate that reflects your qualifications. Build your reputation on Scholix. Raise your rate as your results and reviews accumulate.`,
    type: "article",
    isPublished: true,
  },
  {
    title: "Getting More Students: A Practical Guide",
    slug: "getting-more-students",
    category: "Student Acquisition",
    summary: "A strong Scholix profile, great reviews, and smart word-of-mouth strategies are the foundation of a full tutoring calendar.",
    content: `## Your Scholix Profile is Your Shop Window

Parents make quick decisions based on your profile. Make yours work hard:

- **Write a strong bio**: Be specific — "I've helped 15 VCE students achieve study scores above 40" is more compelling than "I'm passionate about maths."
- **Add your subjects clearly**: Parents search by subject. List every subject you teach.
- **Set your rate confidently**: Don't undersell yourself. Parents often interpret a low rate as inexperience.
- **Keep your availability current**: Profiles with available slots attract more bookings.

## Build Your Reviews

Reviews are the single biggest trust signal for new parents. Deliver consistent quality — one great review leads to another. Address any concerns promptly and professionally.

## Word of Mouth

Your existing students are your best marketing channel:
- When a student achieves a great result, let the parent know
- Ask if they know anyone else who could benefit
- Connect with local school communities

## Expand Your Subjects

Can you add an additional subject or year level? Each new subject is a new set of potential students. Common high-demand subjects include VCE Maths Methods, Specialist, English, Sciences, and selective school preparation.

## Use Your Profile Link

Share your Scholix profile link in your email signature, LinkedIn profile, and local parent communities.

## Summary

The tutors with the fullest calendars are the ones with complete profiles, strong reviews, and active word-of-mouth.`,
    type: "article",
    isPublished: true,
  },
  {
    title: "Setting Aside Tax: The Envelope Method",
    slug: "setting-aside-tax-envelope-method",
    category: "Setting Aside Tax",
    summary: "The most common mistake new tutors make is spending money they owe the ATO. Here's a simple system to prevent that.",
    content: `## The Problem

Many first-year self-employed tutors are shocked at tax time. Because no one has been withholding tax throughout the year, they suddenly owe the ATO a significant amount — money they've already spent.

The solution is simple: set aside tax as you earn it.

## How Much to Set Aside?

A rough guide based on your total tutoring income:

- Under $18,200: 0% (below tax-free threshold if no other income)
- $18,201–$45,000: 20–25%
- $45,001–$120,000: 30–35%
- Over $120,000: 38–45%

If tutoring is secondary income (you have a primary job), set aside 35–45% to be safe.

## The Digital Envelope Method

Open a separate savings account labelled "Tax". Every time a tutoring payment arrives:

1. Calculate your set-aside percentage on the gross payment
2. Transfer that amount to your Tax account immediately
3. Leave it there until tax time

This amount is not your money — it belongs to the ATO. Don't touch it.

## Claims Reduce Your Bill

Track every business expense. At tax time, deductions reduce your taxable income, which lowers your tax bill. Money left in your tax account after paying what you owe is yours to keep.

*Disclaimer: This is general guidance only. Consult a registered tax professional for personalised advice.*`,
    type: "article",
    isPublished: true,
  },
  {
    title: "Professional Tutoring: Standards That Build Your Reputation",
    slug: "professional-tutoring-standards",
    category: "Professional Tutoring Tips",
    summary: "The tutors who build thriving businesses treat tutoring as a profession, not a side gig. Here's what that looks like in practice.",
    content: `## Preparation is Everything

Before each session:
- Review what was covered last session and any notes you recorded
- Know exactly what you plan to cover and have materials ready
- Anticipate the points your student is likely to find difficult
- Have extension material ready for students who progress quickly

## Progress Notes That Matter

After every session:
- Summarise what was covered in plain language parents can understand
- Note any breakthroughs or challenges
- Suggest what the student could work on independently before next session

Parents who feel informed are parents who keep booking.

## Communicate Proactively

Don't wait for parents to come to you. If a student is making strong progress, let them know. If there's a challenge that needs addressing, flag it early.

## Handle Cancellations Professionally

When you need to cancel or reschedule:
- Give as much notice as possible
- Propose alternative times proactively
- Never leave a parent waiting without an update

## Build Independence, Not Dependency

Great tutors help students become more capable, not more reliant. The goal is for your student to eventually not need you — at least for the topic at hand. A student who achieves their goal and credits your support will refer their friends and siblings.`,
    type: "article",
    isPublished: true,
  },
  {
    title: "Superannuation Basics for Independent Tutors",
    slug: "superannuation-basics-tutors",
    category: "Superannuation Basics",
    summary: "As an independent contractor, super isn't automatic. Here's what you need to know about contributing to your own retirement savings.",
    content: `## Super as an Employee vs Contractor

When you're employed, your employer pays 11% superannuation on top of your salary. As an independent tutor, there is no employer making super contributions on your behalf.

**Super is your responsibility.**

## Do I Have To Contribute?

No, there is no legal requirement for sole traders to contribute to superannuation. However, there are strong financial reasons to do so:

- Super investments grow in a low-tax environment (15% tax on earnings)
- Consistent contributions compound significantly over time
- The government offers a co-contribution for lower-income earners

## How to Contribute to Your Super

1. If you have an existing super fund from previous employment, you can contribute to it directly
2. If not, set up a super fund — most major funds accept personal contributions
3. Make contributions regularly — even $50–100/month makes a difference over time
4. Claim a tax deduction: personal contributions to super are generally tax-deductible for sole traders

## Setting Aside Super

A reasonable target: aim for 10–11% of your tutoring income as a super contribution. Set up a regular bank transfer to your super fund.

## Government Co-contribution

If your income is under $43,445 (2024–25 threshold), the government may match your personal super contributions by up to 50 cents per dollar, up to $500 per year.

*Disclaimer: This content is general information only and does not constitute financial advice. Consult a licensed financial adviser for personal superannuation guidance.*`,
    type: "article",
    isPublished: true,
  },
];

export async function seedAcademyArticles() {
  const existing = await db.select().from(tutorArticlesTable).limit(1);
  if (existing.length > 0) return;

  logger.info("Seeding Scholix Academy articles...");
  for (const article of SEED_ARTICLES) {
    await db.insert(tutorArticlesTable).values(article);
  }
  logger.info({ count: SEED_ARTICLES.length }, "Academy articles seeded");
}
