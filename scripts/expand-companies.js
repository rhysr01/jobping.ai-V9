#!/usr/bin/env node

/**
 * Company Expansion Script
 * 
 * This script adds many more companies to your graduate employers list
 * across all platforms (Greenhouse, Lever, Workday, SmartRecruiters)
 */

const fs = require('fs');
const path = require('path');

// New companies to add by platform
const NEW_COMPANIES = {
  greenhouse: [
    {
      name: 'Microsoft',
      url: 'https://boards.greenhouse.io/microsoft',
      graduatePrograms: ['Microsoft Graduate Program', 'Microsoft Engineering Residency'],
      locations: ['London', 'Dublin', 'Amsterdam', 'Berlin', 'Paris'],
      visaSponsorship: true,
      applicationDeadlines: ['September', 'October'],
      programDuration: '2 years'
    },
    {
      name: 'Meta',
      url: 'https://boards.greenhouse.io/meta',
      graduatePrograms: ['Meta Graduate Program', 'Meta Engineering Residency'],
      locations: ['London', 'Dublin', 'Amsterdam', 'Berlin'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Amazon',
      url: 'https://boards.greenhouse.io/amazon',
      graduatePrograms: ['Amazon Graduate Program', 'Amazon Engineering Residency'],
      locations: ['London', 'Dublin', 'Amsterdam', 'Berlin', 'Paris'],
      visaSponsorship: true,
      applicationDeadlines: ['September', 'October'],
      programDuration: '2 years'
    },
    {
      name: 'Netflix',
      url: 'https://boards.greenhouse.io/netflix',
      graduatePrograms: ['Netflix Graduate Program', 'Netflix Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Uber',
      url: 'https://boards.greenhouse.io/uber',
      graduatePrograms: ['Uber Graduate Program', 'Uber Engineering Residency'],
      locations: ['London', 'Amsterdam', 'Berlin', 'Paris'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Lyft',
      url: 'https://boards.greenhouse.io/lyft',
      graduatePrograms: ['Lyft Graduate Program', 'Lyft Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'DoorDash',
      url: 'https://boards.greenhouse.io/doordash',
      graduatePrograms: ['DoorDash Graduate Program', 'DoorDash Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Instacart',
      url: 'https://boards.greenhouse.io/instacart',
      graduatePrograms: ['Instacart Graduate Program', 'Instacart Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Pinterest',
      url: 'https://boards.greenhouse.io/pinterest',
      graduatePrograms: ['Pinterest Graduate Program', 'Pinterest Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Snap Inc',
      url: 'https://boards.greenhouse.io/snap',
      graduatePrograms: ['Snap Graduate Program', 'Snap Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Twitter',
      url: 'https://boards.greenhouse.io/twitter',
      graduatePrograms: ['Twitter Graduate Program', 'Twitter Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'LinkedIn',
      url: 'https://boards.greenhouse.io/linkedin',
      graduatePrograms: ['LinkedIn Graduate Program', 'LinkedIn Engineering Residency'],
      locations: ['London', 'Dublin', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Salesforce',
      url: 'https://boards.greenhouse.io/salesforce',
      graduatePrograms: ['Salesforce Graduate Program', 'Salesforce Engineering Residency'],
      locations: ['London', 'Dublin', 'Amsterdam', 'Berlin'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Adobe',
      url: 'https://boards.greenhouse.io/adobe',
      graduatePrograms: ['Adobe Graduate Program', 'Adobe Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Oracle',
      url: 'https://boards.greenhouse.io/oracle',
      graduatePrograms: ['Oracle Graduate Program', 'Oracle Engineering Residency'],
      locations: ['London', 'Dublin', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    }
  ],
  
  workday: [
    {
      name: 'Apple',
      url: 'https://jobs.apple.com',
      graduatePrograms: ['Apple Graduate Program', 'Apple Engineering Residency'],
      locations: ['London', 'Amsterdam', 'Berlin'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Intel',
      url: 'https://intel.wd12.myworkdayjobs.com/External',
      graduatePrograms: ['Intel Graduate Program', 'Intel Engineering Residency'],
      locations: ['London', 'Amsterdam', 'Berlin'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'AMD',
      url: 'https://amd.wd12.myworkdayjobs.com/External',
      graduatePrograms: ['AMD Graduate Program', 'AMD Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'NVIDIA',
      url: 'https://nvidia.wd12.myworkdayjobs.com/External',
      graduatePrograms: ['NVIDIA Graduate Program', 'NVIDIA Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Qualcomm',
      url: 'https://qualcomm.wd12.myworkdayjobs.com/External',
      graduatePrograms: ['Qualcomm Graduate Program', 'Qualcomm Engineering Residency'],
      locations: ['London', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Cisco',
      url: 'https://cisco.wd12.myworkdayjobs.com/External',
      graduatePrograms: ['Cisco Graduate Program', 'Cisco Engineering Residency'],
      locations: ['London', 'Amsterdam', 'Berlin'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'JPMorgan Chase',
      url: 'https://jpmorganchase.wd12.myworkdayjobs.com/External',
      graduatePrograms: ['JPMorgan Chase Graduate Program', 'JPMorgan Chase Engineering Residency'],
      locations: ['London', 'Dublin', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Goldman Sachs',
      url: 'https://goldmansachs.wd12.myworkdayjobs.com/External',
      graduatePrograms: ['Goldman Sachs Graduate Program', 'Goldman Sachs Engineering Residency'],
      locations: ['London', 'Dublin', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Morgan Stanley',
      url: 'https://morganstanley.wd12.myworkdayjobs.com/External',
      graduatePrograms: ['Morgan Stanley Graduate Program', 'Morgan Stanley Engineering Residency'],
      locations: ['London', 'Dublin', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    },
    {
      name: 'Deutsche Bank',
      url: 'https://db.wd12.myworkdayjobs.com/External',
      graduatePrograms: ['Deutsche Bank Graduate Program', 'Deutsche Bank Engineering Residency'],
      locations: ['London', 'Frankfurt', 'Amsterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2 years'
    }
  ],
  
  smartrecruiters: [
    {
      name: 'Mercedes-Benz',
      url: 'https://www.mercedes-benz.com/careers',
      graduatePrograms: ['Mercedes-Benz Graduate Program', 'Mercedes-Benz Engineering Residency'],
      locations: ['Stuttgart', 'Berlin', 'London'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    },
    {
      name: 'Audi',
      url: 'https://www.audi.com/careers',
      graduatePrograms: ['Audi Graduate Program', 'Audi Engineering Residency'],
      locations: ['Ingolstadt', 'Berlin', 'London'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    },
    {
      name: 'Porsche',
      url: 'https://www.porsche.com/careers',
      graduatePrograms: ['Porsche Graduate Program', 'Porsche Engineering Residency'],
      locations: ['Stuttgart', 'Berlin', 'London'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    },
    {
      name: 'Siemens',
      url: 'https://www.siemens.com/careers',
      graduatePrograms: ['Siemens Graduate Program', 'Siemens Engineering Residency'],
      locations: ['Munich', 'Berlin', 'London'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    },
    {
      name: 'Bosch',
      url: 'https://www.bosch.com/careers',
      graduatePrograms: ['Bosch Graduate Program', 'Bosch Engineering Residency'],
      locations: ['Stuttgart', 'Berlin', 'London'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    },
    {
      name: 'Philips',
      url: 'https://www.philips.com/careers',
      graduatePrograms: ['Philips Graduate Program', 'Philips Engineering Residency'],
      locations: ['Amsterdam', 'Eindhoven', 'London'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    },
    {
      name: 'ASML',
      url: 'https://www.asml.com/careers',
      graduatePrograms: ['ASML Graduate Program', 'ASML Engineering Residency'],
      locations: ['Eindhoven', 'Amsterdam', 'London'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    },
    {
      name: 'Nestlé',
      url: 'https://www.nestle.com/careers',
      graduatePrograms: ['Nestlé Graduate Program', 'Nestlé Engineering Residency'],
      locations: ['Vevey', 'Amsterdam', 'London'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    },
    {
      name: 'Unilever',
      url: 'https://www.unilever.com/careers',
      graduatePrograms: ['Unilever Graduate Program', 'Unilever Engineering Residency'],
      locations: ['London', 'Amsterdam', 'Rotterdam'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    },
    {
      name: 'Heineken',
      url: 'https://www.heineken.com/careers',
      graduatePrograms: ['Heineken Graduate Program', 'Heineken Engineering Residency'],
      locations: ['Amsterdam', 'London'],
      visaSponsorship: true,
      applicationDeadlines: ['October', 'November'],
      programDuration: '2-3 years'
    }
  ]
};

function generateTypeScriptCode() {
  let code = '';
  
  Object.entries(NEW_COMPANIES).forEach(([platform, companies]) => {
    code += `\n  // Additional ${platform.charAt(0).toUpperCase() + platform.slice(1)} Employers\n`;
    
    companies.forEach(company => {
      code += `  {
    name: '${company.name}',
    url: '${company.url}',
    platform: '${platform}',
    graduatePrograms: [${company.graduatePrograms.map(p => `'${p}'`).join(', ')}],
    locations: [${company.locations.map(l => `'${l}'`).join(', ')}],
    visaSponsorship: ${company.visaSponsorship},
    applicationDeadlines: [${company.applicationDeadlines.map(d => `'${d}'`).join(', ')}],
    programDuration: '${company.programDuration}'
  },\n`;
    });
  });
  
  return code;
}

function generateSummary() {
  console.log('\n📊 COMPANY EXPANSION SUMMARY');
  console.log('='.repeat(50));
  
  Object.entries(NEW_COMPANIES).forEach(([platform, companies]) => {
    console.log(`\n🎯 ${platform.toUpperCase()} PLATFORM:`);
    console.log(`   Companies to add: ${companies.length}`);
    companies.forEach(company => {
      console.log(`   ✅ ${company.name} (${company.locations.join(', ')})`);
    });
  });
  
  const totalCompanies = Object.values(NEW_COMPANIES).reduce((sum, companies) => sum + companies.length, 0);
  console.log(`\n📈 TOTAL: ${totalCompanies} new companies to add`);
  
  console.log('\n💡 NEXT STEPS:');
  console.log('   1. Copy the TypeScript code below');
  console.log('   2. Add it to your Utils/graduateEmployers.ts file');
  console.log('   3. Test the scrapers with the new companies');
  console.log('   4. Monitor job extraction and filtering');
}

function main() {
  console.log('🚀 Company Expansion Script');
  console.log('='.repeat(50));
  console.log('This script adds many more companies to your graduate employers list.\n');
  
  generateSummary();
  
  console.log('\n📝 TYPESCRIPT CODE TO ADD:');
  console.log('='.repeat(50));
  console.log(generateTypeScriptCode());
  
  console.log('\n✅ Copy the code above and add it to your graduateEmployers.ts file!');
}

if (require.main === module) {
  main();
}

module.exports = { NEW_COMPANIES, generateTypeScriptCode };
