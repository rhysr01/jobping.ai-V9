// Test the categorization accuracy
function categorizeJob(title, description = '', currentCategories = []) {
  const text = `${title} ${description}`.toLowerCase();
  const newCategories = new Set(currentCategories);

  // Add tech categories
  if (text.includes('software') || text.includes('developer') || text.includes('engineer') ||
      text.includes('programmer') || text.includes('architect') || text.includes('tech')) {
    newCategories.add('tech-transformation');
  }
  if (text.includes('data') || text.includes('analyst') || text.includes('scientist') ||
      text.includes('machine learning') || text.includes('ml') || text.includes('ai')) {
    newCategories.add('data-analytics');
  }
  if (text.includes('business analyst') || text.includes('business intelligence')) {
    newCategories.add('data-analytics');
    newCategories.add('strategy-business-design');
  }

  return Array.from(newCategories);
}

// Sample job titles from the test data
const sampleTitles = [
  "Unilever Internship Programme: Program Stażowy – Procurement",
  "Teaching Assistant - Ongoing",
  "Junior Associate - Litigation and Dispute Resolution Team - Rome",
  "Junior SOC Analyst",
  "Personale Per Eventi - Profilo Junior a Roma",
  "Junior Consultant - Internal Audit, Litigation and",
  "Medico Generale Junior",
  "Junior HR Risorse Umane",
  "Back Office Rc Auto",
  "Junior Promoter - Eventi a Roma"
];

console.log('🧪 Testing categorization accuracy on sample job titles:\n');

sampleTitles.forEach((title, i) => {
  const categories = categorizeJob(title, '', ['early-career']);
  const hasTech = categories.includes('tech-transformation');
  const hasData = categories.includes('data-analytics');

  console.log(`${i + 1}. "${title}"`);
  console.log(`   Categories: ${JSON.stringify(categories)}`);
  console.log(`   Tech: ${hasTech}, Data: ${hasData}`);
  console.log('');
});

console.log('🎯 Expected results:');
console.log('- "Junior SOC Analyst" should have data-analytics (SOC = Security Operations Center)');
console.log('- Most others should remain early-career only');
console.log('- "Junior Consultant - Internal Audit" might be miscategorized as too generic');