#!/usr/bin/env node

// Detailed analysis of categorization issues
async function analyzeJobs() {
  try {
    console.log("🔍 Fetching sample jobs to analyze classification...\n");

    // Fetch internships to see what's being classified
    const internUrl = "http://localhost:3001/api/recent-matches";
    const response = await fetch(internUrl);
    const result = await response.json();
    
    console.log("Sample jobs from database:\n");
    
    if (result.data && result.data.length > 0) {
      result.data.slice(0, 10).forEach((job) => {
        console.log(`📌 "${job.title}" @ ${job.company}`);
        console.log(`   is_internship: ${job.is_internship}`);
        console.log(`   is_graduate: ${job.is_graduate}`);
        console.log(`   categories: ${job.categories?.join(", ")}`);
        console.log(`   Description preview: ${(job.description || "").substring(0, 150)}...`);
        console.log();
      });
    }

    // Test the classification logic manually
    console.log("\n📊 CLASSIFICATION LOGIC TEST:\n");

    const testCases = [
      {
        title: "Graduate Software Engineer",
        description: "Join our graduate program for software engineers",
        expected: { isInternship: false, isGraduate: true },
      },
      {
        title: "Summer Internship - Engineering",
        description: "3-month internship opportunity",
        expected: { isInternship: true, isGraduate: false },
      },
      {
        title: "Graduate Rotational Program",
        description: "Management trainee programme",
        expected: { isInternship: false, isGraduate: true },
      },
      {
        title: "Intern - Data Science",
        description: "Entry-level data science role",
        expected: { isInternship: true, isGraduate: false },
      },
      {
        title: "Junior Developer",
        description: "We are looking for a junior developer with 0-2 years experience",
        expected: { isInternship: false, isGraduate: false },
      },
    ];

    testCases.forEach((test) => {
      const title = test.title.toLowerCase();
      const description = test.description.toLowerCase();

      const internshipTerms = [
        "intern",
        "internship",
        "stage",
        "praktikum",
        "placement",
        "summer intern",
        "co-op",
      ];

      const graduateTerms = [
        "graduate",
        "grad scheme",
        "graduate trainee",
        "management trainee",
        "trainee program",
        "rotational program",
        "campus hire",
      ];

      const isInternship = internshipTerms.some(
        (term) => title.includes(term) || description.includes(term)
      );

      const isGraduate =
        !isInternship &&
        graduateTerms.some(
          (term) => title.includes(term) || description.includes(term)
        );

      const correct =
        isInternship === test.expected.isInternship &&
        isGraduate === test.expected.isGraduate;

      console.log(`${correct ? "✓" : "✗"} "${test.title}"`);
      if (!correct) {
        console.log(`   Expected: ${JSON.stringify(test.expected)}`);
        console.log(`   Got: {isInternship: ${isInternship}, isGraduate: ${isGraduate}}`);
      }
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

analyzeJobs();

