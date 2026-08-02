-- Données de démonstration — chargées automatiquement au premier lancement
-- (déclenchement : table students vide)
-- Toutes les insertions utilisent OR IGNORE pour être sûres en cas de re-run.

-- ============================================================
-- 1. Étudiants (20 — mix belge/français + arabe + espagnol + slave)
-- ============================================================
INSERT OR IGNORE INTO students (id, matricule, first_name, last_name, email, date_naissance) VALUES
  -- Belge / Français
  (1,  'E2024001', 'Léa',          'Dupont',      'lea.dupont@etud.vinci.be',          '2002-03-15'),
  (2,  'E2024002', 'Antoine',      'Martin',      'antoine.martin@etud.vinci.be',      '2001-11-22'),
  (3,  'E2024003', 'Camille',      'Lebrun',      'camille.lebrun@etud.vinci.be',      '2002-07-08'),
  (4,  'E2024004', 'Noah',         'Fontaine',    'noah.fontaine@etud.vinci.be',       '2003-01-30'),
  (5,  'E2024005', 'Emma',         'Desmet',      'emma.desmet@etud.vinci.be',         '2002-09-12'),
  (6,  'E2024006', 'Hugo',         'Claes',       'hugo.claes@etud.vinci.be',          '2001-05-03'),
  (7,  'E2024007', 'Manon',        'Jacobs',      'manon.jacobs@etud.vinci.be',        '2003-04-19'),
  (8,  'E2024008', 'Victor',       'Willems',     'victor.willems@etud.vinci.be',      '2002-12-01'),
  (9,  'E2024009', 'Lucie',        'Adam',        'lucie.adam@etud.vinci.be',          '2001-08-27'),
  (10, 'E2024010', 'Romain',       'Charlier',    'romain.charlier@etud.vinci.be',     '2003-06-14'),
  -- Arabe
  (11, 'E2024011', 'Yasmine',      'Benali',      'yasmine.benali@etud.vinci.be',      '2002-02-18'),
  (12, 'E2024012', 'Karim',        'Mansouri',    'karim.mansouri@etud.vinci.be',      '2001-10-05'),
  (13, 'E2024013', 'Nour',         'El Amrani',   'nour.elamrani@etud.vinci.be',       '2003-03-22'),
  (14, 'E2024014', 'Amine',        'Tabbara',     'amine.tabbara@etud.vinci.be',       '2002-07-31'),
  -- Espagnol
  (15, 'E2024015', 'Sofia',        'Ramirez',     'sofia.ramirez@etud.vinci.be',       '2001-12-09'),
  (16, 'E2024016', 'Diego',        'Morales',     'diego.morales@etud.vinci.be',       '2003-05-16'),
  (17, 'E2024017', 'Carmen',       'Vega',        'carmen.vega@etud.vinci.be',         '2002-08-03'),
  -- Slave
  (18, 'E2024018', 'Aleksandra',   'Nowak',       'aleksandra.nowak@etud.vinci.be',    '2001-04-25'),
  (19, 'E2024019', 'Dmitri',       'Petrov',      'dmitri.petrov@etud.vinci.be',       '2002-11-17'),
  (20, 'E2024020', 'Katarzyna',    'Kowalska',    'katarzyna.kowalska@etud.vinci.be',  '2003-02-07');

-- ============================================================
-- 3. Entreprises (56)
-- ============================================================
INSERT OR IGNORE INTO companies (id, name, address, general_email) VALUES
  (1,  'BrusselsLogic SPRL',         'Rue de la Loi 42, 1000 Bruxelles',            'contact@brusselslogic.be'),
  (2,  'DataNord SA',                'Avenue du Parc 8, 1020 Bruxelles',            'info@datanord.be'),
  (3,  'CyberShield Belgium',        'Rue Royale 110, 1000 Bruxelles',              'info@cybershield.be'),
  (4,  'CloudArch Bruxelles',        'Boulevard du Midi 30, 1000 Bruxelles',        'hello@cloudarch.be'),
  (5,  'MobileFirst SPRL',           'Rue du Commerce 55, 1040 Bruxelles',          'contact@mobilefirst.be'),
  (6,  'LeodiumSoft',                'Rue Saint-Gilles 7, 4000 Liège',              'info@leodiumsoft.be'),
  (7,  'UrbanData Charleroi',        'Rue de la Science 22, 6000 Charleroi',        'data@urbandata.be'),
  (8,  'UXLab Louvain',              'Naamsestraat 12, 3000 Leuven',                'studio@uxlab.be'),
  (9,  'EmbeddedTech Charleroi',     'Avenue de Waterloo 3, 6000 Charleroi',        'tech@embeddedtech.be'),
  (10, 'MediaHub Bruxelles',         'Place Flagey 1, 1050 Bruxelles',              'hello@mediahub.be'),
  (11, 'FinSoft Belgium',            'Avenue Louise 149, 1050 Bruxelles',           'contact@finsoft.be'),
  (12, 'HealthTech Namur',           'Rue de Fer 44, 5000 Namur',                   'info@healthtech.be'),
  (13, 'EcoDigital Mons',            'Grand-Place 17, 7000 Mons',                   'eco@ecodigital.be'),
  (14, 'RetailSync Anvers',          'Meir 20, 2000 Antwerpen',                     'sync@retailsync.be'),
  (15, 'LogiPorts Zeebrugge',        'Havenstraat 5, 8380 Zeebrugge',               'info@logiports.be'),
  (16, 'AgroTech Gembloux',          'Passage des Déportés 2, 5030 Gembloux',       'agro@agrotech.be'),
  (17, 'SafeNet Hasselt',            'Kempische Steenweg 293, 3500 Hasselt',        'info@safenet.be'),
  (18, 'GhentBytes',                 'Korenmarkt 3, 9000 Gent',                     'hello@ghentbytes.be'),
  (19, 'MediTech Louvain',           'Rue des Wallons 14, 3000 Leuven',             'contact@meditech.be'),
  (20, 'Ixelles Digital',            'Chaussée d''Ixelles 80, 1050 Bruxelles',      'digital@ixellesdigital.be'),
  (21, 'Technobel ASBL',             'Rue du Tilleul 13, 5020 Namur',               'info@technobel.be'),
  (22, 'NamurWeb',                   'Rue de Bruxelles 61, 5000 Namur',             'contact@namurweb.be'),
  (23, 'LiègeSystems',               'Boulevard de la Constitution 45, 4020 Liège', 'systems@liegesystems.be'),
  (24, 'ProxiDev Solutions',         'Boulevard du Roi Albert II, 1030 Bruxelles',  'dev@proxidev.be'),
  (25, 'DataVault Belgium',          'Rue du Trône 68, 1050 Bruxelles',             'vault@datavault.be'),
  (26, 'OpenStack Bruxelles',        'Rue de la Montagne 30, 1000 Bruxelles',       'info@openstack.be'),
  (27, 'Vinci Solutions',            'Rue des Palais 44, 1030 Bruxelles',           'hello@vincisolutions.be'),
  (28, 'Infratech Gand',             'Sint-Pietersnieuwstraat 7, 9000 Gent',        'info@infratech.be'),
  (29, 'BelCloud SA',                'Rue de la Régence 4, 1000 Bruxelles',         'cloud@belcloud.be'),
  (30, 'SmartCity Labs',             'Place Communale 2, 1090 Bruxelles',            'labs@smartcity.be'),
  (31, 'Axys Consulting',            'Avenue Ariane 5, 1200 Bruxelles',             'consulting@axys.be'),
  (32, 'Cegeka Liège',               'Rue Natalis 2, 4020 Liège',                   'liege@cegeka.be'),
  (33, 'BrainIT Bruxelles',          'Rue du Midi 90, 1000 Bruxelles',              'info@brainit.be'),
  (34, 'Sopra Steria Belgium',       'Rue du Marquis 1, 1000 Bruxelles',            'belgium@soprasteria.be'),
  (35, 'Ordina Belgium',             'Generaal De Wittelaan 17, 2800 Mechelen',     'info@ordina.be'),
  (36, 'Proximus Digital Lab',       'Boulevard du Roi Albert II 27, 1030 Bruxelles','digitallab@proximus.be'),
  (37, 'ING Tech Belgium',           'Avenue Marnix 24, 1000 Bruxelles',            'tech@ing.be'),
  (38, 'Belfius Innovation',         'Boulevard Pachéco 44, 1000 Bruxelles',        'innovation@belfius.be'),
  (39, 'Deloitte Digital Belgium',   'Berkeley Square 1, 1050 Bruxelles',           'digital@deloitte.be'),
  (40, 'KPMG IT Belgium',            'Avenue du Bourget 40, 1130 Bruxelles',        'it@kpmg.be'),
  (41, 'Accenture Belgium',          'Rue du Commerce 31, 1000 Bruxelles',          'belgium@accenture.be'),
  (42, 'Capgemini Belgium',          'Bessenveldstraat 19, 1831 Diegem',            'info@capgemini.be'),
  (43, 'IBM Client Center Belgium',  'Bourgetlaan 42, 1130 Bruxelles',              'clientcenter@ibm.be'),
  (44, 'Microsoft Belgium',          'Avenue du Bourget 100, 1140 Bruxelles',       'info@microsoft.be'),
  (45, 'Google Belgium',             'Rue de la Loi 65, 1040 Bruxelles',            'hello@google.be'),
  (46, 'Amadeus IT Belgium',         'Avenue de Tervueren 300, 1150 Bruxelles',     'it@amadeus.be'),
  (47, 'SWIFT Belgium',              'Avenue Adèle 1, 1310 La Hulpe',               'info@swift.be'),
  (48, 'Euroclear Technology',       'Avenue du Roi 1, 1210 Bruxelles',             'tech@euroclear.be'),
  (49, 'Besix Digital',              'Avenue des Communautés 100, 1200 Bruxelles',  'digital@besix.be'),
  (50, 'UCB Digital Health',         'Allée de la Recherche 60, 1070 Bruxelles',    'digital@ucb.be'),
  (51, 'AB InBev TechLab',           'Avenue de Broqueville 80, 1200 Bruxelles',    'techlab@abinbev.be'),
  (52, 'Bekaert IT',                 'Bekaertstraat 2, 8550 Zwevegem',              'it@bekaert.be'),
  (53, 'Umicore Digital',            'Rue du Marais 31, 1000 Bruxelles',            'digital@umicore.be'),
  (54, 'Ethias Innovation',          'Rue des Croisiers 24, 4000 Liège',            'innovation@ethias.be'),
  (55, 'Partena Numérique',          'Rue des Chartreux 45, 1000 Bruxelles',        'numerique@partena.be'),
  (56, 'SPW Digital',                'Place Joséphine-Charlotte 2, 5100 Namur',     'digital@spw.be');

-- ============================================================
-- 4. Contacts entreprise (~70 — au moins 1 par entreprise)
-- ============================================================
INSERT OR IGNORE INTO company_contacts (id, company_id, first_name, last_name, email, phone, roles) VALUES
  (1,  1,  'Marie',      'Lambert',    'mlambert@brusselslogic.be',    '+32 2 123 45 67', '["maitre_de_stage"]'),
  (2,  1,  'Pierre',     'Dumont',     'pdumont@brusselslogic.be',     '+32 2 123 45 68', '["responsable_administratif"]'),
  (3,  2,  'Sophie',     'Renard',     'srenard@datanord.be',          '+32 2 234 56 78', '["maitre_de_stage","encadrant_technique"]'),
  (4,  3,  'Kevin',      'Bastin',     'kbastin@cybershield.be',       '+32 4 345 67 89', '["maitre_de_stage"]'),
  (5,  4,  'Lucie',      'Pirard',     'lpirard@cloudarch.be',         '+32 2 456 78 90', '["maitre_de_stage"]'),
  (6,  5,  'Thomas',     'Collin',     'tcollin@mobilefirst.be',       '+32 2 567 89 01', '["encadrant_technique"]'),
  (7,  6,  'Nathalie',   'Gilles',     'ngilles@leodiumsoft.be',       '+32 4 678 90 12', '["maitre_de_stage"]'),
  (8,  7,  'Frédéric',   'Nizet',      'fnizet@urbandata.be',          '+32 71 789 01 23', '["maitre_de_stage","responsable_administratif"]'),
  (9,  8,  'Alice',      'Moulin',     'amoulin@uxlab.be',             '+32 16 890 12 34', '["encadrant_technique"]'),
  (10, 9,  'Sébastien',  'Bodart',     'sbodart@embeddedtech.be',      '+32 71 901 23 45', '["maitre_de_stage"]'),
  (11, 10, 'Julie',      'Lecomte',    'jlecomte@mediahub.be',         '+32 2 012 34 56', '["responsable_administratif"]'),
  (12, 11, 'Bernard',    'Maes',       'bmaes@finsoft.be',             '+32 2 123 45 67', '["maitre_de_stage"]'),
  (13, 12, 'Céline',     'Hardy',      'chardy@healthtech.be',         '+32 81 234 56 78', '["maitre_de_stage","encadrant_technique"]'),
  (14, 13, 'François',   'Goffin',     'fgoffin@ecodigital.be',        '+32 65 345 67 89', '["maitre_de_stage"]'),
  (15, 14, 'Annelies',   'De Smedt',   'adesmedt@retailsync.be',       '+32 3 456 78 90', '["encadrant_technique"]'),
  (16, 15, 'Pieter',     'Vandenber',  'pvandenberghe@logiports.be',   '+32 50 567 89 01', '["maitre_de_stage"]'),
  (17, 16, 'Jean-Marc',  'Pirotte',    'jmpirotte@agrotech.be',        '+32 81 678 90 12', '["responsable_administratif"]'),
  (18, 17, 'Els',        'Wouters',    'ewouters@safenet.be',          '+32 11 789 01 23', '["maitre_de_stage"]'),
  (19, 18, 'Raf',        'Van Damme',  'rvandamme@ghentbytes.be',      '+32 9 890 12 34', '["encadrant_technique","maitre_de_stage"]'),
  (20, 19, 'Isabelle',   'Dupuis',     'idupuis@meditech.be',          '+32 16 901 23 45', '["maitre_de_stage"]'),
  (21, 20, 'Laure',      'Nelis',      'lnelis@ixellesdigital.be',     '+32 2 012 34 56', '["maitre_de_stage"]'),
  (22, 21, 'Stéphane',   'Delvaux',    'sdelvaux@technobel.be',        '+32 81 123 45 67', '["responsable_administratif"]'),
  (23, 22, 'Carine',     'Lepage',     'clepage@namurweb.be',          '+32 81 234 56 78', '["maitre_de_stage"]'),
  (24, 23, 'Olivier',    'Vanbever',   'ovanbever@liegesystems.be',    '+32 4 345 67 89', '["encadrant_technique"]'),
  (25, 24, 'Véronique',  'Claes',      'vclaes@proxidev.be',           '+32 2 456 78 90', '["maitre_de_stage"]'),
  (26, 25, 'Damien',     'Schreurs',   'dschreurs@datavault.be',       '+32 2 567 89 01', '["maitre_de_stage","responsable_administratif"]'),
  (27, 26, 'Nadine',     'Leclercq',   'nleclercq@openstack.be',       '+32 2 678 90 12', '["encadrant_technique"]'),
  (28, 27, 'Christophe', 'Noël',       'cnoel@vincisolutions.be',      '+32 2 789 01 23', '["maitre_de_stage"]'),
  (29, 28, 'Liesbeth',   'Janssen',    'ljanssen@infratech.be',        '+32 9 890 12 34', '["maitre_de_stage"]'),
  (30, 29, 'Guillaume',  'Franck',     'gfranck@belcloud.be',          '+32 2 901 23 45', '["encadrant_technique"]'),
  (31, 30, 'Hélène',     'Vandermeer', 'hvandermeersch@smartcity.be',  '+32 2 012 34 56', '["maitre_de_stage"]'),
  (32, 31, 'Éric',       'Boulanger',  'eboulanger@axys.be',           '+32 2 123 45 67', '["responsable_administratif","maitre_de_stage"]'),
  (33, 32, 'Marianne',   'Giot',       'mgiot@cegeka.be',              '+32 4 234 56 78', '["maitre_de_stage"]'),
  (34, 33, 'Patrick',    'Thys',       'pthys@brainit.be',             '+32 2 345 67 89', '["encadrant_technique"]'),
  (35, 34, 'Aurélie',    'Defays',     'adefays@soprasteria.be',       '+32 2 456 78 90', '["maitre_de_stage"]'),
  (36, 35, 'Wouter',     'Martens',    'wmartens@ordina.be',           '+32 15 567 89 01', '["maitre_de_stage","encadrant_technique"]'),
  (37, 36, 'Sarah',      'Peeters',    'speeters@proximus.be',         '+32 2 678 90 12', '["responsable_administratif"]'),
  (38, 37, 'Laurent',    'Collignon',  'lcollignon@ing.be',            '+32 2 789 01 23', '["maitre_de_stage"]'),
  (39, 38, 'Nadia',      'Léonard',    'nleonard@belfius.be',          '+32 2 890 12 34', '["encadrant_technique"]'),
  (40, 39, 'Quentin',    'Derouaux',   'qderouaux@deloitte.be',        '+32 2 901 23 45', '["maitre_de_stage"]'),
  (41, 40, 'Vanessa',    'Henin',      'vhenin@kpmg.be',               '+32 2 012 34 56', '["responsable_administratif"]'),
  (42, 41, 'Michael',    'Bastin',     'mbastin@accenture.be',         '+32 2 123 45 67', '["maitre_de_stage","encadrant_technique"]'),
  (43, 42, 'Delphine',   'Renkin',     'drenkin@capgemini.be',         '+32 2 234 56 78', '["maitre_de_stage"]'),
  (44, 43, 'Robert',     'Hanon',      'rhanon@ibm.be',                '+32 2 345 67 89', '["encadrant_technique"]'),
  (45, 44, 'Anke',       'De Backer',  'adebacker@microsoft.be',       '+32 2 456 78 90', '["maitre_de_stage"]'),
  (46, 45, 'Simon',      'Leroy',      'sleroy@google.be',             '+32 2 567 89 01', '["maitre_de_stage","responsable_administratif"]'),
  (47, 46, 'Brigitte',   'Michaux',    'bmichaux@amadeus.be',          '+32 2 678 90 12', '["encadrant_technique"]'),
  (48, 47, 'Nicolas',    'Gérardy',    'ngerardy@swift.be',            '+32 2 789 01 23', '["maitre_de_stage"]'),
  (49, 48, 'Caroline',   'Docquier',   'cdocquier@euroclear.be',       '+32 2 890 12 34', '["maitre_de_stage","encadrant_technique"]'),
  (50, 49, 'Benoit',     'Fontaine',   'bfontaine@besix.be',           '+32 2 901 23 45', '["responsable_administratif"]'),
  (51, 50, 'Laura',      'Habran',     'lhabran@ucb.be',               '+32 2 012 34 56', '["maitre_de_stage"]'),
  (52, 51, 'Axel',       'Deprez',     'adeprez@abinbev.be',           '+32 2 123 45 67', '["encadrant_technique"]'),
  (53, 52, 'Katrien',    'Verbeke',    'kverbeke@bekaert.be',          '+32 56 234 56 78', '["maitre_de_stage"]'),
  (54, 53, 'Thierry',    'Brion',      'tbrion@umicore.be',            '+32 2 345 67 89', '["maitre_de_stage","responsable_administratif"]'),
  (55, 54, 'Dominique',  'Wattier',    'dwattier@ethias.be',           '+32 4 456 78 90', '["encadrant_technique"]'),
  (56, 55, 'Gaëlle',     'Lison',      'glison@partena.be',            '+32 2 567 89 01', '["maitre_de_stage"]'),
  (57, 56, 'Arnaud',     'Beaumont',   'abeaumont@spw.be',             '+32 81 678 90 12', '["responsable_administratif"]'),
  -- Contacts supplémentaires (2e contact pour certaines entreprises clés)
  (58, 2,  'Marc',       'Pierard',    'mpierard@datanord.be',         '+32 2 234 56 79', '["responsable_administratif"]'),
  (59, 6,  'Isabelle',   'Fonteneau',  'ifonteneau@leodiumsoft.be',    '+32 4 678 90 13', '["encadrant_technique"]'),
  (60, 11, 'Valérie',    'Thonon',     'vthonon@finsoft.be',           '+32 2 123 45 68', '["encadrant_technique"]'),
  (61, 18, 'Jonas',      'Claes',      'jclaes@ghentbytes.be',         '+32 9 890 12 35', '["responsable_administratif"]'),
  (62, 24, 'Serge',      'Gevers',     'sgevers@proxidev.be',          '+32 2 456 78 91', '["encadrant_technique"]'),
  (63, 36, 'Mohamed',    'El Khatib',  'melkhatib@proximus.be',        '+32 2 678 90 13', '["maitre_de_stage","encadrant_technique"]'),
  (64, 41, 'Lara',       'Gonzalez',   'lgonzalez@accenture.be',       '+32 2 123 45 68', '["responsable_administratif"]'),
  (65, 44, 'Yannick',    'Nijs',       'ynijs@microsoft.be',           '+32 2 456 78 91', '["encadrant_technique"]'),
  (66, 45, 'Amira',      'Rachidi',    'arachidi@google.be',           '+32 2 567 89 02', '["encadrant_technique"]'),
  (67, 48, 'Gilles',     'Mazy',       'gmazy@euroclear.be',           '+32 2 890 12 35', '["responsable_administratif"]'),
  (68, 50, 'Tarek',      'Bouzid',     'tbouzid@ucb.be',               '+32 2 012 34 57', '["encadrant_technique"]');

-- ============================================================
-- 5. Offres de stage (10)
-- Répartition : 5 soumise, 2 validee_et_visible, 1 refusee, 1 prise, 1 non_disponible
-- ============================================================
INSERT OR IGNORE INTO offers
  (id, company_id, priority_contact_id, description, location, technologies, objectives,
   remote_allowed, remote_percentage, remarks, status, source_type, created_by_company_id, submitted_by_student_id)
VALUES
  -- 1. soumise — Dev web full-stack (BrusselsLogic)
  (1, 1, 1,
   'Stage développement web full-stack au sein de notre équipe produit. Vous participerez à la conception et au développement de nouvelles fonctionnalités pour notre plateforme SaaS de gestion documentaire.',
   'Bruxelles (Ixelles)',
   'React, Node.js, TypeScript, PostgreSQL, REST API',
   'Contribuer à au moins deux nouvelles fonctionnalités livrées en production. Rédiger les tests unitaires associés.',
   0, NULL,
   'Possibilité de prolongation en CDI à l''issue du stage.',
   'soumise', 'company', 1, NULL),

  -- 2. soumise — Data engineering (DataNord)
  (2, 2, 3,
   'Stage data engineering et pipelines ETL. Vous intégrerez l''équipe Data pour construire et maintenir nos pipelines de transformation de données à grande échelle.',
   'Bruxelles (centre)',
   'Python, dbt, BigQuery, Airflow, SQL',
   'Automatiser l''ingestion de trois nouvelles sources de données et documenter les pipelines existants.',
   1, 50,
   'Environnement cloud-first, forte culture DevOps.',
   'soumise', 'company', 2, NULL),

  -- 3. soumise — Cybersécurité (CyberShield)
  (3, 3, 4,
   'Stage cybersécurité et audit de systèmes d''information. Vous participerez à des missions de tests d''intrusion internes et à la rédaction de rapports d''audit pour nos clients.',
   'Liège',
   'Kali Linux, Metasploit, OWASP, Nmap, Burp Suite',
   'Réaliser deux audits complets et proposer un plan de remédiation.',
   0, NULL,
   'Profil avec sensibilité éthique requise. Habilitation de sécurité possible.',
   'soumise', 'company', 3, NULL),

  -- 4. soumise — DevOps (CloudArch)
  (4, 4, 5,
   'Stage DevOps et industrialisation CI/CD. Vous rejoindrez notre équipe infrastructure pour moderniser nos pipelines de déploiement et améliorer l''observabilité de nos services.',
   'Bruxelles (quartier européen)',
   'Docker, Kubernetes, Jenkins, Terraform, Prometheus, Grafana',
   'Mettre en place un pipeline CI/CD complet pour au moins un service existant. Rédiger la documentation opérationnelle.',
   1, 100,
   'Télétravail total possible. Réunions hebdomadaires en présentiel optionnelles.',
   'soumise', 'company', 4, NULL),

  -- 5. soumise — Mobile Flutter (MobileFirst)
  (5, 5, 6,
   'Stage développement mobile cross-platform. Vous contribuerez au développement de notre application grand public disponible sur iOS et Android.',
   'Anvers',
   'Flutter, Dart, Firebase, REST API, Git',
   'Implémenter deux nouvelles fonctionnalités et publier une version bêta sur les stores.',
   0, NULL,
   'Équipe jeune et dynamique. Déplacements Bruxelles-Anvers possibles.',
   'soumise', 'company', 5, NULL),

  -- 6. validee_et_visible — Backend Java (LeodiumSoft)
  (6, 6, 7,
   'Stage backend Java Spring Boot dans notre division Santé. Vous développerez des API REST consommées par des applications médicales utilisées par des hôpitaux belges.',
   'Liège (Guillemins)',
   'Java 17, Spring Boot, Oracle DB, Maven, Swagger',
   'Livrer deux endpoints REST documentés et couverts par des tests d''intégration.',
   1, 50,
   'Contexte médical sensible. Rigueur et confidentialité exigées.',
   'validee_et_visible', 'company', 6, NULL),

  -- 7. validee_et_visible — BI & Data (UrbanData Charleroi)
  (7, 7, 8,
   'Stage analyse de données et Business Intelligence. Vous construirez des tableaux de bord décisionnels pour des clients publics (communes, intercommunales) dans le cadre de projets de smart city.',
   'Charleroi',
   'Power BI, SQL Server, DAX, Excel, Python (pandas)',
   'Concevoir et livrer trois tableaux de bord opérationnels validés par les clients.',
   0, NULL,
   'Déplacements réguliers chez les clients de la région wallonne.',
   'validee_et_visible', 'company', 7, NULL),

  -- 8. refusee — UX/UI (UXLab Louvain)
  (8, 8, 9,
   'Stage UX research et design d''interface. Vous mènerez des entretiens utilisateurs, créerez des wireframes et conduirez des tests d''utilisabilité pour notre nouvelle application RH.',
   'Louvain',
   'Figma, Adobe XD, Maze, Notion, Miro',
   'Livrer un prototype haute fidélité validé par trois sessions de tests utilisateurs.',
   0, NULL,
   'Stage refusé : sujet insuffisamment technique pour le profil informatique visé.',
   'refusee', 'company', 8, NULL),

  -- 9. prise — Embarqué IoT (EmbeddedTech)
  (9, 9, 10,
   'Stage développement embarqué et IoT. Vous travaillerez sur un système de monitoring industriel communicant via MQTT avec notre plateforme cloud.',
   'Charleroi (zone industrielle)',
   'C, FreeRTOS, STM32, MQTT, Python (scripts cloud)',
   'Développer le firmware de collecte de données et l''intégration avec la plateforme cloud.',
   0, NULL,
   'Matériel fourni. Environnement laboratoire disponible sur site.',
   'prise', 'company', 9, NULL),

  -- 10. non_disponible — Marketing digital (MediaHub)
  (10, 10, 11,
   'Stage marketing digital et optimisation SEO/SEA. Vous gérerez les campagnes publicitaires en ligne et analyserez les performances pour optimiser le retour sur investissement.',
   'Bruxelles (Flagey)',
   'Google Analytics 4, Google Ads, SEMrush, HubSpot, Canva',
   'Augmenter le trafic organique de 20 % et réduire le coût par acquisition de 15 %.',
   1, 25,
   'Stage pourvu par un stagiaire d''une autre école.',
   'non_disponible', 'company', 10, NULL),

  -- 11. validee_et_visible — Développement .NET (FinSoft Belgium)
  (11, 11, 12,
   'Stage développement backend .NET dans notre division Asset Management. Vous participerez à la refonte d''un module de calcul de risque financier en C# avec une architecture microservices.',
   'Bruxelles (Louise)',
   'C#, .NET 8, Azure Service Bus, SQL Server, Docker',
   'Migrer deux modules legacy vers la nouvelle architecture microservices et rédiger les tests d''intégration.',
   1, 50,
   'Profil rigoureux apprécié. Contexte financier réglementé.',
   'validee_et_visible', 'company', 11, NULL),

  -- 12. validee_et_visible — Data Science santé (HealthTech Namur)
  (12, 12, 13,
   'Stage data science appliquée au domaine médical. Vous développerez des modèles prédictifs d''aide au diagnostic à partir de données cliniques anonymisées en collaboration avec des médecins partenaires.',
   'Namur',
   'Python, scikit-learn, pandas, Jupyter, PostgreSQL',
   'Entraîner et évaluer au moins deux modèles de classification et présenter les résultats à l''équipe médicale.',
   1, 25,
   'Données sensibles — charte de confidentialité à signer. Très bon encadrement scientifique.',
   'validee_et_visible', 'company', 12, NULL),

  -- 13. validee_et_visible — Green IT (EcoDigital Mons)
  (13, 13, 14,
   'Stage éco-conception logicielle et mesure d''impact environnemental. Vous analyserez l''empreinte carbone de nos applications web et proposerez des optimisations concrètes.',
   'Mons',
   'JavaScript, Lighthouse, Green Software Foundation tools, Python',
   'Produire un rapport d''audit carbone de trois applications et implémenter au moins cinq optimisations mesurables.',
   1, 75,
   'Entreprise engagée B Corp. Équipe passionnée de tech responsable.',
   'validee_et_visible', 'company', 13, NULL),

  -- 14. validee_et_visible — E-commerce & intégration (RetailSync)
  (14, 14, 15,
   'Stage développement e-commerce et intégration de systèmes. Vous travaillerez sur les connecteurs entre notre plateforme Magento et les ERP de nos clients retailers belges et néerlandais.',
   'Anvers',
   'PHP, Magento 2, REST API, MySQL, RabbitMQ',
   'Livrer deux connecteurs ERP opérationnels et documentés, avec tests de non-régression.',
   0, NULL,
   'Bonne maîtrise du néerlandais un atout. Équipe multiculturelle.',
   'validee_et_visible', 'company', 14, NULL),

  -- 15. validee_et_visible — Logistique & IoT (LogiPorts)
  (15, 15, 16,
   'Stage développement d''une solution de tracking de conteneurs en temps réel. Vous intégrerez des capteurs IoT dans notre système de gestion portuaire pour améliorer la traçabilité des marchandises.',
   'Zeebrugge',
   'Python, MQTT, InfluxDB, Grafana, Docker',
   'Déployer le système de tracking sur un quai pilote et valider la fiabilité des données sur deux semaines.',
   0, NULL,
   'Environnement portuaire industriel. EPI fournis. Possibilité de visites de navires.',
   'validee_et_visible', 'company', 15, NULL),

  -- 16. validee_et_visible — AgriTech (AgroTech Gembloux)
  (16, 16, 17,
   'Stage développement d''une application mobile d''aide à la décision pour agriculteurs. Vous créerez une app qui agrège données météo, satellites et capteurs sol pour optimiser les traitements.',
   'Gembloux',
   'React Native, Node.js, API météo (OpenWeatherMap), PostgreSQL, PostGIS',
   'Livrer une version bêta fonctionnelle testée avec trois agriculteurs partenaires.',
   1, 50,
   'Déplacements terrain possibles. Contexte startup en forte croissance.',
   'validee_et_visible', 'company', 16, NULL),

  -- 17. validee_et_visible — Cybersécurité industrielle (SafeNet Hasselt)
  (17, 17, 18,
   'Stage sécurité des systèmes industriels (ICS/SCADA). Vous évaluerez la surface d''attaque de systèmes de contrôle industriels chez nos clients et proposerez un plan de hardening.',
   'Hasselt',
   'Nmap, Wireshark, SCADA protocols (Modbus, DNP3), Python',
   'Auditer deux sites industriels et remettre des rapports de vulnérabilité avec plan de remédiation priorisé.',
   0, NULL,
   'Habilitation de sécurité requise. Déplacements en Belgique et aux Pays-Bas.',
   'validee_et_visible', 'company', 17, NULL),

  -- 18. validee_et_visible — Plateforme open source (GhentBytes)
  (18, 18, 19,
   'Stage contribution à une plateforme open source de gestion de communautés locales. Vous développerez de nouvelles fonctionnalités en Ruby on Rails et participerez aux code reviews de la communauté.',
   'Gand',
   'Ruby on Rails, PostgreSQL, Stimulus.js, RSpec, GitHub Actions',
   'Merger au moins trois pull requests significatives dans le dépôt public du projet.',
   1, 100,
   'Télétravail total. Réunions hebdomadaires à Gand. Esprit open source valorisé.',
   'validee_et_visible', 'company', 18, NULL),

  -- 19. validee_et_visible — Santé numérique (MediTech Louvain)
  (19, 19, 20,
   'Stage développement d''une application de suivi de patients chroniques. Vous concevrez et implémenterez un module de rappels intelligents basé sur les données de santé du patient.',
   'Louvain',
   'Vue.js, Node.js, MongoDB, HL7 FHIR, Docker',
   'Livrer le module de rappels intégré au dossier patient électronique, avec tests utilisateurs auprès de deux médecins.',
   1, 50,
   'Contexte médical. Très bonne documentation requise. Encadrement académique UCLouvain disponible.',
   'validee_et_visible', 'company', 19, NULL),

  -- 20. validee_et_visible — Transformation digitale (Ixelles Digital)
  (20, 20, 21,
   'Stage accompagnement à la transformation digitale de PME bruxelloises. Vous analyserez les processus métier de nos clients, proposerez des outils adaptés et accompagnerez leur mise en place.',
   'Bruxelles (Ixelles)',
   'Power Automate, SharePoint, Notion, Make (Integromat), Google Workspace',
   'Déployer une solution no-code/low-code chez deux clients PME et former leurs équipes.',
   1, 25,
   'Excellent sens du contact client requis. Profil polyvalent tech + conseil.',
   'validee_et_visible', 'company', 20, NULL);

-- ============================================================
-- 6. offer_contacts (lien offre ↔ contact(s))
-- ============================================================
INSERT OR IGNORE INTO offer_contacts (offer_id, contact_id) VALUES
  (1,  1),
  (1,  2),
  (2,  3),
  (2,  58),
  (3,  4),
  (4,  5),
  (5,  6),
  (6,  7),
  (6,  59),
  (7,  8),
  (8,  9),
  (9,  10),
  (10, 11),
  (11, 12),
  (11, 60),
  (12, 13),
  (13, 14),
  (14, 15),
  (15, 16),
  (16, 17),
  (17, 18),
  (18, 19),
  (18, 61),
  (19, 20),
  (20, 21);

-- ============================================================
-- 7. Candidatures
-- ============================================================
INSERT OR IGNORE INTO applications (offer_id, student_id, selected) VALUES
  -- Offre 9 (prise) : Camille Lebrun retenue
  (9,  3,  1),
  -- Offre 6 (validee_et_visible) : 3 candidats
  (6,  1,  0),
  (6,  2,  0),
  (6,  11, 0),
  -- Offre 7 (validee_et_visible) : 2 candidats
  (7,  4,  0),
  (7,  15, 0),
  -- Offre 1 (soumise) : 1 candidat
  (1,  5,  0),
  -- Offre 2 (soumise) : 1 candidat
  (2,  12, 0);

-- ============================================================
-- 8. Historique des changements de statut (offres non-soumise)
-- ============================================================
INSERT OR IGNORE INTO offer_status_history (offer_id, from_status, to_status, changed_by) VALUES
  (6,  'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (7,  'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (8,  'soumise',            'refusee',            'admin@ecole.be'),
  (9,  'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (9,  'validee_et_visible', 'prise',              'admin@ecole.be'),
  (10, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (10, 'validee_et_visible', 'non_disponible',     'admin@ecole.be'),
  (11, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (12, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (13, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (14, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (15, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (16, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (17, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (18, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (19, 'soumise',            'validee_et_visible', 'admin@ecole.be'),
  (20, 'soumise',            'validee_et_visible', 'admin@ecole.be');
