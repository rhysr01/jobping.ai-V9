-- COMPREHENSIVE CITY NORMALIZATION MIGRATION
-- This migration normalizes ALL city variations to canonical forms
-- CRITICAL: Run this to fix location data quality issues

BEGIN;

-- ============================================================================
-- 1. MAJOR CITY NAME VARIATIONS (Native names -> English standard)
-- ============================================================================

-- German city name variations
UPDATE jobs SET city = 'Munich' WHERE city IN ('München', 'Garching Bei München', 'Flughafen München', 'Garching', 'Neufahrn Bei Freising');
UPDATE jobs SET city = 'Cologne' WHERE city IN ('Köln');
UPDATE jobs SET city = 'Hamburg' WHERE city IN ('Hamburg-altona', 'Hamburg Harvestehude', 'Hamburg-harburg');
UPDATE jobs SET city = 'Frankfurt' WHERE city = 'Frankfurt am Main';
UPDATE jobs SET city = 'Berlin' WHERE city LIKE 'Berlin%' AND city != 'Berlin';

-- Austrian city name variations
UPDATE jobs SET city = 'Vienna' WHERE city IN ('Wien', 'Wiener Neudorf');

-- Czech city name variations  
UPDATE jobs SET city = 'Prague' WHERE city LIKE 'Praha%';

-- Italian city name variations
UPDATE jobs SET city = 'Milan' WHERE city IN ('Milano');
UPDATE jobs SET city = 'Rome' WHERE city IN ('Roma');

-- Spanish city name variations
UPDATE jobs SET city = 'Barcelona' WHERE city IN ('L''hospitalet De Llobregat', 'El Prat De Llobregat', 'Sant Cugat Del Vallès', 'Sant Boi De Llobregat', 'Sant Joan Despí', 'Parets Del Vallès', 'Montcada I Reixac', 'Santa Perpètua De Mogoda', 'Polinyà', 'Viladecans', 'Viladecavalls');
UPDATE jobs SET city = 'Madrid' WHERE city IN ('Alcalá De Henares', 'Alcobendas', 'Pozuelo De Alarcón', 'Tres Cantos', 'Torrejón De Ardoz', 'Las Rozas De Madrid', 'La Moraleja', 'Getafe', 'Leganés', 'Fuenlabrada');

-- French city name variations (Paris suburbs -> Paris)
UPDATE jobs SET city = 'Paris' WHERE city IN ('Levallois-perret', 'Boulogne-billancourt', 'Charenton-le-pont', 'Saint-cloud', 'Saint-ouen', 'Ivry-sur-seine', 'Noisy-le-grand', 'Noisy-le-sec', 'Fontenay-sous-bois', 'Clichy', 'Courbevoie', 'Nanterre', 'Montreuil', 'Montrouge', 'Puteaux', 'Issy-les-moulineaux', 'Roissy-en-france', 'Tremblay-en-france', 'Ville-d''avray', 'Villebon', 'Villeparisis', 'La Défense', 'Antony', 'Bagneux', 'Cergy', 'Clamart', 'Creil', 'Ennery', 'Épinay', 'Fourqueux', 'Franconville', 'Gagny', 'Livry-gargan', 'Massy', 'Meaux', 'Pontault-combault', 'Rueil-malmaison', 'Saint-cyr', 'Stains', 'Vélizy', 'Brétigny-sur-orge', 'Braine-l''alleud');

-- Belgian city name variations (Brussels area)
UPDATE jobs SET city = 'Brussels' WHERE city IN ('Bruxelles', 'Bruxelles Ixelles', 'Bruxelles Saint-gilles', 'Bruxelles Schaarbeek', 'Elsene', 'Diegem', 'Machelen', 'Zaventem', 'Dilbeek', 'Mechelen', 'Mortsel', 'Kontich', 'Kortenberg', 'Kampenhout', 'Puurs', 'Rixensart', 'Strombeek-bever', 'Wemmel', 'Courcelles', 'Drogenbos', 'Erembodegem', 'Heist-op-den-berg', 'Lede', 'Ninove', 'Nivelles', 'Sint-katelijne-waver', 'Tirlemont', 'Zottegem', 'Zwijnaarde', 'Zwijndrecht');

-- Dutch city name variations (Amsterdam area)
UPDATE jobs SET city = 'Amsterdam' WHERE city LIKE 'Amsterdam%' OR city IN ('Amstelveen', 'Badhoevedorp', 'Haarlem', 'Hoofddorp', 'Zaandam', 'Halfweg', 'Warmenhuizen', 'Vijfhuizen', 'Nieuw-vennep', 'Utrecht West');
UPDATE jobs SET city = 'Utrecht' WHERE city IN ('Utrecht West');

-- Danish city name variations
UPDATE jobs SET city = 'Copenhagen' WHERE city IN ('København', 'Frederiksberg', 'Bagsværd', 'Birkerød', 'Brøndby', 'Gladsaxe', 'Herlev', 'Hørsholm', 'Humlebæk', 'Ishøj', 'Kastrup', 'Lynge', 'Måløv', 'Roskilde', 'Søborg', 'Täby', 'Vallensbæk');

-- Swedish city name variations
UPDATE jobs SET city = 'Stockholm' WHERE city IN ('Solna', 'Järfälla', 'Johanneshov', 'Kista', 'Sollentuna');

-- Swiss city name variations (Zurich area)
UPDATE jobs SET city = 'Zurich' WHERE city IN ('Zürich', 'Opfikon', 'Wallisellen', 'Schlieren', 'Dübendorf', 'Dübendorf / Bahnhofstrasse', 'Dietikon', 'Dielsdorf', 'Niederglatt', 'Rümlang', 'Rüschlikon', 'Rüti', 'Urdorf', 'Wädenswil', 'Wetzikon', 'Zollikon', 'Affoltern Am Albis', 'Bülach', 'Dällikon', 'Herrliberg', 'Kilchberg', 'Männedorf', 'Stäfa', 'Winterthur');

-- Polish city name variations
UPDATE jobs SET city = 'Warsaw' WHERE city IN ('Warszawa', 'Nowy Dwór Mazowiecki');

-- Irish city name variations (Dublin area)
UPDATE jobs SET city = 'Dublin' WHERE city LIKE 'Dublin%' OR city IN ('Blackrock', 'Clondalkin', 'Clonskeagh', 'Dunboyne', 'Glasnevin', 'Leixlip', 'Maynooth', 'Naas', 'Rathcoole', 'Rathfarnham', 'Rathmines', 'Ratoath', 'Sandyford', 'Ballymount', 'Balbriggan', 'Bray');

-- UK city name variations (London area - normalize all London districts/suburbs to London)
UPDATE jobs SET city = 'London' WHERE city LIKE '%London%' OR city IN ('Bexleyheath', 'Croydon', 'Dartford', 'Erith', 'Farringdon', 'Greenhithe', 'Islington', 'Lambeth', 'Longsight', 'Loughton', 'New Malden', 'Norwood', 'Prestwich', 'Purley', 'Slades Green', 'Staines-upon-thames', 'Teddington', 'Tilbury', 'Tooting', 'Uxbridge', 'Walthamstow', 'Wapping', 'Watford', 'West Brompton', 'West Byfleet', 'Woking', 'Alderley Edge', 'Altrincham', 'Handforth', 'Wilmslow');

-- UK other cities
UPDATE jobs SET city = 'Manchester' WHERE city IN ('Sale', 'Salford', 'Swinton', 'Rochdale', 'Stockport', 'Hyde', 'Huddersfield', 'Bolton', 'Bury', 'Burnley', 'Chorley', 'Darwen', 'Hindley', 'Rossendale', 'Skelmersdale');
UPDATE jobs SET city = 'Birmingham' WHERE city IN ('Solihull', 'Coventry', 'Coleshill', 'West Bromwich', 'Wolverhampton');

-- ============================================================================
-- 2. REMOVE COUNTRIES USED AS CITIES
-- ============================================================================
UPDATE jobs SET city = NULL WHERE city IN (
  'España', 'Deutschland', 'Österreich', 'Nederland', 'Belgique', 
  'United Kingdom', 'UK', 'USA', 'US', 'France', 'Germany', 
  'Spain', 'Austria', 'Netherlands', 'Belgium', 'Ireland', 
  'Schweiz', 'Switzerland', 'Italia', 'Italy', 'Poland', 'Polska',
  'Denmark', 'Danmark', 'Sweden', 'Sverige', 'Czech Republic', 'Czechia'
);

-- ============================================================================
-- 3. REMOVE GENERIC CODES AND INVALID ENTRIES
-- ============================================================================
UPDATE jobs SET city = NULL WHERE city IN ('W', 'Md', 'Ct') OR LENGTH(TRIM(city)) <= 2;

-- ============================================================================
-- 4. NORMALIZE CASE (Title Case for all cities)
-- ============================================================================
-- This handles any remaining case inconsistencies
UPDATE jobs 
SET city = INITCAP(LOWER(TRIM(city)))
WHERE city IS NOT NULL 
  AND city != INITCAP(LOWER(TRIM(city)));

-- ============================================================================
-- 5. REMOVE TRAILING/LEADING WHITESPACE AND CLEAN UP
-- ============================================================================
UPDATE jobs 
SET city = TRIM(city)
WHERE city IS NOT NULL 
  AND city != TRIM(city);

-- ============================================================================
-- 6. FIX SPECIFIC KNOWN ISSUES
-- ============================================================================

-- Fix "Den Haag" -> "The Hague" (or keep as Den Haag if preferred)
-- UPDATE jobs SET city = 'The Hague' WHERE city = 'Den Haag';

-- Fix "Anvers" -> "Antwerp"
UPDATE jobs SET city = 'Antwerp' WHERE city = 'Anvers';

-- Fix "Gand" -> "Ghent"  
UPDATE jobs SET city = 'Ghent' WHERE city = 'Gand';

-- Fix Italian city variations
UPDATE jobs SET city = 'Milan' WHERE city IN ('Sesto San Giovanni', 'Cologno Monzese', 'Corsico', 'Carugate', 'Bareggio', 'Albuzzano', 'Arcore', 'Arese', 'Bresso', 'Buccinasco', 'Cabiate', 'Cantù', 'Cassano Magnago', 'Cassina De'' Pecchi', 'Cassolnovo', 'Castel Rozzone', 'Cuggiono', 'Curno', 'Cusano Milanino', 'Inzago', 'Lazzate', 'Lesmo', 'Lomagna', 'Melzo', 'Muggiò', 'Novedrate', 'Offanengo', 'Opera', 'Ornago', 'Ospedaletto Lodigiano', 'Pieve Fissiraga', 'Pioltello', 'Pogliano Milanese', 'San Giuliano Milanese', 'Usmate Velate', 'Verano Brianza', 'Vertemate Con Minoprio', 'Vigevano', 'Montano Lucino', 'Comun Nuovo', 'Treviolo');

UPDATE jobs SET city = 'Rome' WHERE city IN ('Fiumicino', 'Capena', 'Formello', 'Guidonia', 'Guidonia Montecelio', 'Pomezia', 'Fiano Romano');

-- German suburbs that should map to main cities
UPDATE jobs SET city = 'Munich' WHERE city IN ('Ottobrunn', 'Freising', 'Erding', 'Ismaning', 'Unterföhring', 'Unterhaching', 'Unterschleißheim', 'Grünwald', 'Pullach Im Isartal', 'Krailling', 'Gräfelfing', 'Martinsried', 'Gilching', 'Taufkirchen', 'Ebersberg', 'Bad Tölz', 'Bad Heilbrunn', 'Garching', 'Neufahrn Bei Freising');

UPDATE jobs SET city = 'Hamburg' WHERE city IN ('Norderstedt');

UPDATE jobs SET city = 'Frankfurt' WHERE city IN ('Eschborn', 'Offenbach', 'Bad Homburg', 'Oberursel', 'Dietzenbach');

UPDATE jobs SET city = 'Stuttgart' WHERE city IN ('Esslingen', 'Ludwigsburg', 'Fellbach', 'Leinfelden-Echterdingen', 'Ostfildern', 'Filderstadt', 'Kornwestheim', 'Waiblingen', 'Böblingen', 'Sindelfingen', 'Herrenberg', 'Renningen');

UPDATE jobs SET city = 'Cologne' WHERE city IN ('Frechen', 'Hürth', 'Brühl', 'Pulheim', 'Leverkusen', 'Bergisch Gladbach');

UPDATE jobs SET city = 'Düsseldorf' WHERE city IN ('Ratingen', 'Meerbusch', 'Neuss', 'Erkrath', 'Hilden', 'Langenfeld', 'Monheim', 'Leverkusen');

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to check results)
-- ============================================================================
-- SELECT COUNT(DISTINCT city) as unique_cities_after FROM jobs WHERE city IS NOT NULL;
-- SELECT city, COUNT(*) FROM jobs WHERE city IS NOT NULL GROUP BY city ORDER BY COUNT(*) DESC LIMIT 50;
-- SELECT COUNT(*) as null_cities FROM jobs WHERE city IS NULL;

COMMIT;

