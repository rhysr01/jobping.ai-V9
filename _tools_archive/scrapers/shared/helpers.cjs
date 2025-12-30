const GRADUATE_REGEX =
	/(graduate|new.?grad|recent.?graduate|campus.?hire|graduate.?scheme|graduate.?program|rotational.?program|university.?hire|college.?hire|entry.?level|junior|trainee|intern|internship|placement|analyst|assistant|fellowship|apprenticeship|apprentice|stagiaire|alternant|alternance|d[ée]butant|formation|dipl[oô]m[eé]|apprenti|poste.?d.?entr[ée]e|niveau.?d[ée]butant|praktikum|praktikant|traineeprogramm|berufseinstieg|absolvent|absolventenprogramm|ausbildung|auszubildende|werkstudent|einsteiger|becario|pr[aá]cticas|programa.?de.?graduados|reci[eé]n.?titulado|aprendiz|nivel.?inicial|puesto.?de.?entrada|j[uú]nior|formaci[oó]n.?dual|tirocinio|stagista|apprendista|apprendistato|neolaureato|formazione|inserimento.?lavorativo|stage|stagiair|starterfunctie|traineeship|afgestudeerde|leerwerkplek|instapfunctie|fresher|nyuddannet|nyutdannet|nyexaminerad|neo.?laureato|nuovo.?laureato|reci[eé]n.?graduado|nuevo.?graduado|joven.?profesional|nieuwe.?medewerker)/i;
const SENIOR_REGEX =
	/(senior|lead|principal|director|head.?of|vp|vice\s+president|chief|executive\s+level|executive\s+director|5\+.?years|7\+.?years|10\+.?years|experienced\s+professional|architect\b|team.?lead|tech.?lead|staff\b|distinguished|manager|managing|headcount|senioritätsniveau|executive)/i;
const EXPERIENCE_REGEX =
	/(proven.?track.?record|extensive.?experience|minimum.?3.?years|minimum.?5.?years|minimum.?7.?years|prior.?experience|relevant.?experience|3\+.?years|5\+.?years|7\+.?years|10\+.?years)/i;

const CAREER_PATH_KEYWORDS = {
	strategy: [
		"strategy",
		"consult",
		"business analyst",
		"transformation",
		"growth",
	],
	finance: [
		"finance",
		"financial",
		"banking",
		"investment",
		"audit",
		"account",
		"treasury",
	],
	sales: [
		"sales",
		"business development",
		"account executive",
		"sdr",
		"bdr",
		"customer success",
	],
	marketing: [
		"marketing",
		"brand",
		"growth",
		"digital",
		"content",
		"communications",
	],
	product: [
		"product manager",
		"product management",
		"product analyst",
		"product owner",
	],
	operations: [
		"operations",
		"supply chain",
		"logistics",
		"process",
		"project coordinator",
	],
	"general-management": [
		"management trainee",
		"leadership programme",
		"general management",
	],
	data: ["data", "analytics", "bi analyst", "insight", "business intelligence"],
	"people-hr": ["hr", "people", "talent", "recruit", "human resources"],
	legal: ["legal", "compliance", "paralegal", "law", "regulation"],
	sustainability: ["sustainability", "esg", "environment", "impact", "climate"],
	creative: ["design", "creative", "ux", "ui", "graphic", "copywriter"],
};

function normalizeString(value) {
	return String(value || "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");
}

function classifyEarlyCareer(job) {
	const text = normalizeString(`${job?.title || ""} ${job?.description || ""}`);
	if (!text) return false;

	if (SENIOR_REGEX.test(text) || EXPERIENCE_REGEX.test(text)) {
		return false;
	}

	return GRADUATE_REGEX.test(text);
}

function makeJobHash(job) {
	const normalizedTitle = normalizeString(job?.title);
	const normalizedCompany = normalizeString(job?.company);
	const normalizedLocation = normalizeString(job?.location);
	const hashString = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;

	let hash = 0;
	for (let i = 0; i < hashString.length; i += 1) {
		const code = hashString.charCodeAt(i);
		hash = (hash << 5) - hash + code;
		hash |= 0;
	}
	return Math.abs(hash).toString(36);
}

module.exports = {
	classifyEarlyCareer,
	makeJobHash,
	normalizeString,
	CAREER_PATH_KEYWORDS,
};
