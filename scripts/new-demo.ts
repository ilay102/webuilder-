/**
 * new-demo.ts
 * Creates a customized demo page from any template.
 *
 * Usage:
 *   npx ts-node scripts/new-demo.ts
 *
 * Then edit the CLIENT config below and run again.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ═══════════════════════════════════════════════
//  👇 EDIT THIS FOR EACH NEW CLIENT DEMO
// ═══════════════════════════════════════════════
const CLIENT = {
  // What template to clone: 'dental' | 'accountant' | 'lawyer'
  template: 'dental',

  // The URL route — will be live at /[route]
  // Use kebab-case, no spaces: 'cohen-dental', 'levi-tax', etc.
  route: 'cohen-dental',

  // Clinic / business name (shown everywhere on the page)
  businessName: 'Dr. Cohen Dental',

  // Short tagline shown in hero
  tagline: 'Gentle Care for Every Smile',

  // City (shown in chatbot + contact section)
  city: 'Tel Aviv',

  // Phone number (shown in contact + chatbot)
  phone: '03-123-4567',

  // Business hours (shown in chatbot)
  hours: 'Sun–Thu 9:00–18:00',

  // Cal.com booking link — format: 'username/event-name'
  calLink: 'ilay-lankin/15min',

  // YOUR email — where lead alerts go
  clientEmail: 'ilay1bgu@gmail.com',

  // YOUR WhatsApp number for alerts — digits only, no + or spaces
  clientWhatsapp: '972501234567',

  // Push to GitHub after generating? true = auto-deploy to Vercel
  autoDeploy: false,
};
// ═══════════════════════════════════════════════

// ─── Maps: what to find → what to replace ───────────────────────

function buildReplacements(c: typeof CLIENT): [RegExp, string][] {
  return [
    // Cal.com link
    [/const CAL_LINK = '[^']*'/, `const CAL_LINK = '${c.calLink}'`],

    // Chatbot config block — all fields
    [/name: '[^']*',(\s*\/\/.*)?(\n\s*type:)/, `name: '${c.businessName}',$2`],
    [/location: '[^']*'/, `location: '${c.city}'`],
    [/phone: '[^-\d]*[\d-]*'(?=,\s*\n\s*hours)/, `phone: '${c.phone}'`],
    [/hours: '[^']*'/, `hours: '${c.hours}'`],
    [/clientEmail: '[^']*'/, `clientEmail: '${c.clientEmail}'`],
    [/clientWhatsapp: '[^']*'/, `clientWhatsapp: '${c.clientWhatsapp}'`],

    // Greeting message
    [
      /greeting: "Hi! 👋 I'm the [^"]* assistant\./,
      `greeting: "Hi! 👋 I'm the ${c.businessName} assistant.`
    ],

    // Footer copyright line
    [/© \d{4} [^.]+\./, `© 2026 ${c.businessName}.`],

    // Config: name field in chatbot (standalone)
    [
      /config=\{\{\s*\n\s*name: '[^']*'/,
      `config={{\n        name: '${c.businessName}'`
    ],
  ];
}

// ─── Dental-specific replacements ───────────────────────────────

function buildDentalReplacements(c: typeof CLIENT): [RegExp, string][] {
  return [
    ...buildReplacements(c),
    // Hero headline (dental specific)
    [/'Restorative Sanctuary'/, `'${c.businessName}'`],
    [/Smile Studio/g, c.businessName],
    [/smile studio/gi, c.businessName.toLowerCase()],
  ];
}

// ─── Accountant-specific replacements ───────────────────────────

function buildAccountantReplacements(c: typeof CLIENT): [RegExp, string][] {
  return [
    ...buildReplacements(c),
    [/Goldberg & Associates/g, c.businessName],
    [/goldberg & associates/gi, c.businessName.toLowerCase()],
  ];
}

// ─── Lawyer-specific replacements ───────────────────────────────

function buildLawyerReplacements(c: typeof CLIENT): [RegExp, string][] {
  return [
    ...buildReplacements(c),
    [/Avi Mizrahi Law/g, c.businessName],
    [/avi mizrahi law/gi, c.businessName.toLowerCase()],
  ];
}

// ─── Main ────────────────────────────────────────────────────────

function main() {
  const templatePath = path.join(process.cwd(), 'app', CLIENT.template, 'page.tsx');
  const outDir       = path.join(process.cwd(), 'app', CLIENT.route);
  const outPath      = path.join(outDir, 'page.tsx');

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: app/${CLIENT.template}/page.tsx`);
    process.exit(1);
  }

  // Read the base template
  let code = fs.readFileSync(templatePath, 'utf-8');

  // Choose replacements based on template type
  let replacements: [RegExp, string][];
  if (CLIENT.template === 'dental')     replacements = buildDentalReplacements(CLIENT);
  else if (CLIENT.template === 'accountant') replacements = buildAccountantReplacements(CLIENT);
  else                                  replacements = buildLawyerReplacements(CLIENT);

  // Apply all replacements
  for (const [pattern, replacement] of replacements) {
    code = code.replace(pattern, replacement);
  }

  // Write to new route
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, code);

  console.log(`\n✅ Demo created: app/${CLIENT.route}/page.tsx`);
  console.log(`📋 Client:  ${CLIENT.businessName}`);
  console.log(`📍 City:    ${CLIENT.city}`);
  console.log(`📞 Phone:   ${CLIENT.phone}`);
  console.log(`📅 Cal:     ${CLIENT.calLink}`);
  console.log(`📧 Email:   ${CLIENT.clientEmail}`);

  if (CLIENT.autoDeploy) {
    console.log('\n🚀 Pushing to GitHub...');
    execSync(`git add app/${CLIENT.route} && git commit -m "add demo: ${CLIENT.route}" && git push`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`\n🌍 Live in ~1 min at: webuilder-liart.vercel.app/${CLIENT.route}`);
  } else {
    console.log(`\n💡 To deploy, run:`);
    console.log(`   git add app/${CLIENT.route} && git commit -m "add demo: ${CLIENT.route}" && git push`);
    console.log(`   Then live at: webuilder-liart.vercel.app/${CLIENT.route}`);
  }
}

main();
