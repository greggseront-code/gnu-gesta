-- Seed de développement
-- Gestionnaire et lecteur de base
INSERT OR IGNORE INTO users (email, role) VALUES
  ('admin@ecole.fr',   'gestionnaire'),
  ('lecteur@ecole.fr', 'lecteur');

-- ── Étudiants ──────────────────────────────────────────────────────────────────
-- 10 à consonance belge, 4 arabes, 3 slaves, 3 sud-américains
INSERT OR IGNORE INTO students (id, matricule, first_name, last_name, email, date_naissance) VALUES
  (1,  'S2024001', 'Kevin',     'Dupont',    'kevin.dupont@student.be',       '2002-03-15'),
  (2,  'S2024002', 'Julie',     'Leroy',     'julie.leroy@student.be',        '2001-07-22'),
  (3,  'S2024003', 'Mathieu',   'Simon',     'mathieu.simon@student.be',      '2002-11-08'),
  (4,  'S2024004', 'Sophie',    'Laurent',   'sophie.laurent@student.be',     '2001-04-30'),
  (5,  'S2024005', 'Nicolas',   'Dumont',    'nicolas.dumont@student.be',     '2003-01-14'),
  (6,  'S2024006', 'Emilie',    'Leclercq',  'emilie.leclercq@student.be',    '2002-09-25'),
  (7,  'S2024007', 'Alexandre', 'Thomas',    'alexandre.thomas@student.be',   '2001-12-03'),
  (8,  'S2024008', 'Charlotte', 'Renard',    'charlotte.renard@student.be',   '2002-06-17'),
  (9,  'S2024009', 'Pierre',    'Maes',      'pierre.maes@student.be',        '2003-02-28'),
  (10, 'S2024010', 'Lucie',     'Willems',   'lucie.willems@student.be',      '2001-08-11'),
  (11, 'S2024011', 'Youssef',   'El Amrani', 'youssef.elamrani@student.be',   '2002-05-20'),
  (12, 'S2024012', 'Amira',     'Benhaddou', 'amira.benhaddou@student.be',    '2001-10-14'),
  (13, 'S2024013', 'Khalil',    'Mansouri',  'khalil.mansouri@student.be',    '2003-03-07'),
  (14, 'S2024014', 'Nadia',     'Ouali',     'nadia.ouali@student.be',        '2002-01-19'),
  (15, 'S2024015', 'Piotr',     'Kowalski',  'piotr.kowalski@student.be',     '2001-06-05'),
  (16, 'S2024016', 'Katarzyna', 'Nowak',     'katarzyna.nowak@student.be',    '2002-08-23'),
  (17, 'S2024017', 'Dmitri',    'Petrov',    'dmitri.petrov@student.be',      '2003-04-11'),
  (18, 'S2024018', 'Carlos',    'Garcia',    'carlos.garcia@student.be',      '2001-09-16'),
  (19, 'S2024019', 'Isabella',  'Rodriguez', 'isabella.rodriguez@student.be', '2002-12-29'),
  (20, 'S2024020', 'Miguel',    'Fernandez', 'miguel.fernandez@student.be',   '2001-11-04');

-- ── Entreprises ────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO companies (id, name, address, general_email) VALUES
  (1,  'Accenture Belgium',   'Avenue des Arts 56, 1000 Bruxelles',           'careers@accenture.be'),
  (2,  'BNP Paribas Fortis',  'Montagne du Parc 3, 1000 Bruxelles',           'stages@bnpparibas.be'),
  (3,  'Proximus',             'Bld du Roi Albert II 27, 1030 Bruxelles',      'internship@proximus.be'),
  (4,  'UCB Pharma',          'Allée de la Recherche 60, 1070 Bruxelles',     'rh@ucb.com'),
  (5,  'Colruyt Group',       'Edingensesteenweg 196, 1500 Halle',            'stages@colruyt.be'),
  (6,  'ING Belgium',         'Avenue Marnix 24, 1000 Bruxelles',             'recrutement@ing.be'),
  (7,  'Deloitte Belgium',    'Gateway Building, Aéroport de Bruxelles',      'careers@deloitte.be'),
  (8,  'Belfius Bank',        'Place Charles Rogier 11, 1210 Bruxelles',      'stages@belfius.be'),
  (9,  'SNCB / NMBS',         'Rue de France 56, 1060 Bruxelles',             'rh.it@sncb.be'),
  (10, 'Bekaert',             'Bekaertstraat 2, 8550 Zwevegem',               'stages@bekaert.com'),
  (11, 'TechNova Solutions',  'Rue Saint-Gilles 12, 4000 Liège',              'hello@technova.be'),
  (12, 'DataSphere',          'Koningin Astridplein 7, 9000 Gent',            'jobs@datasphere.be'),
  (13, 'WebCraft Studio',     'Rue du Midi 40, 1000 Bruxelles',               'contact@webcraft.be'),
  (14, 'Euroclear',           'Bld du Roi Albert II 1, 1210 Bruxelles',       'talent@euroclear.com'),
  (15, 'Ageas',               'Rue du Marquis 1, 1000 Bruxelles',             'internship@ageas.be'),
  (16, 'Umicore',             'Broekstraat 31, 1000 Bruxelles',               'rh@umicore.com'),
  (17, 'KBC Group',           'Havenlaan 2, 1080 Bruxelles',                  'stages@kbc.be'),
  (18, 'AB InBev',            'Brouwerijplein 1, 3000 Leuven',                'talent@ab-inbev.com'),
  (19, 'Softnology',          'Rue des Brasseurs 8, 5000 Namur',              'info@softnology.be'),
  (20, 'ClickMedia',          'Rue de la Loi 15, 1040 Bruxelles',             'stages@clickmedia.be');

-- ── Contacts entreprises (1-2 par entreprise) ───────────────────────────────────
INSERT OR IGNORE INTO company_contacts (id, company_id, first_name, last_name, email, phone, roles) VALUES
  (1,  1,  'Julie',       'Martin',       'j.martin@accenture.be',       '+32 2 226 11 11', '["Responsable recrutement"]'),
  (2,  2,  'Pierre',      'Dubois',       'p.dubois@bnpparibas.be',      '+32 2 565 10 00', '["Directeur RH"]'),
  (3,  3,  'Marc',        'Lefevre',      'm.lefevre@proximus.be',       '+32 2 202 41 11', '["Manager IT"]'),
  (4,  4,  'Anne',        'Gillard',      'a.gillard@ucb.com',           '+32 2 559 99 99', '["HR Business Partner"]'),
  (5,  5,  'Tom',         'Vandenberghe', 't.vandenberghe@colruyt.be',   '+32 2 363 55 45', '["IT Talent Manager"]'),
  (6,  6,  'Sarah',       'Jansen',       's.jansen@ing.be',             '+32 2 547 21 11', '["Talent Acquisition"]'),
  (7,  7,  'Philippe',    'Gilles',       'p.gilles@deloitte.be',        '+32 2 800 20 00', '["Senior Manager"]'),
  (8,  8,  'Christine',   'Maes',         'c.maes@belfius.be',           '+32 2 222 12 01', '["HR Business Partner"]'),
  (9,  9,  'Jean-Pierre', 'Bodart',       'jp.bodart@sncb.be',           '+32 2 525 21 11', '["Responsable SI"]'),
  (10, 10, 'Lien',        'Claeys',       'l.claeys@bekaert.com',        '+32 56 76 61 11', '["Chargée RH"]'),
  (11, 11, 'Romain',      'Smet',         'r.smet@technova.be',          '+32 4 221 33 44', '["CTO"]'),
  (12, 12, 'Laura',       'Pieters',      'l.pieters@datasphere.be',     '+32 9 234 56 78', '["Data Lead"]'),
  (13, 13, 'Antoine',     'Pirard',       'a.pirard@webcraft.be',        '+32 2 318 72 40', '["Fondateur"]'),
  (14, 14, 'Nathalie',    'Gossuin',      'n.gossuin@euroclear.com',     '+32 2 326 12 11', '["HR Manager"]'),
  (15, 15, 'Bernard',     'Declercq',     'b.declercq@ageas.be',         '+32 2 557 57 57', '["IT Director"]'),
  (16, 16, 'Sofie',       'Baert',        's.baert@umicore.com',         '+32 2 227 71 11', '["Chargée RH"]'),
  (17, 17, 'Wouter',      'Vermeersch',   'w.vermeersch@kbc.be',         '+32 2 429 12 40', '["Squad Lead"]'),
  (18, 18, 'Carmen',      'Lopez',        'c.lopez@ab-inbev.com',        '+32 16 27 61 11', '["HR Technology"]'),
  (19, 19, 'Gregoire',    'Fontaine',     'g.fontaine@softnology.be',    '+32 81 23 45 67', '["CEO"]'),
  (20, 20, 'Maxime',      'Collignon',    'm.collignon@clickmedia.be',   '+32 2 318 90 12', '["Digital Manager"]'),
  (21, 1,  'David',       'Chen',         'd.chen@accenture.be',         '+32 2 226 11 12', '["Technical Lead"]'),
  (22, 3,  'Eva',         'Dubois',       'e.dubois@proximus.be',        '+32 2 202 41 12', '["HR Coordinator"]'),
  (23, 7,  'Maria',       'Santos',       'm.santos@deloitte.be',        '+32 2 800 20 01', '["HR Manager"]'),
  (24, 12, 'James',       'Williams',     'j.williams@datasphere.be',    '+32 9 234 56 79', '["MLOps Lead"]'),
  (25, 17, 'Hanne',       'Claes',        'h.claes@kbc.be',              '+32 2 429 12 41', '["HR Coordinator"]');

-- ── Offres (30) ────────────────────────────────────────────────────────────────
-- 5 soumise · 12 validee_et_visible · 8 prise · 3 non_disponible · 2 refusee
INSERT OR IGNORE INTO offers
  (id, company_id, priority_contact_id, description, location, technologies, objectives,
   remote_allowed, remote_percentage, status, created_by_company_id, source_type)
VALUES
  -- soumise (5) ──────────────────────────────────────────────────────────────
  (2,  1,  1,
   'Stage Data Analyst — exploitation de données clients via Power BI et Azure Data Factory. Construction de dashboards KPI et automatisation des rapports hebdomadaires.',
   'Bruxelles', 'Power BI, Azure Data Factory, SQL, Python',
   'Maîtriser la visualisation de données et automatiser les reportings métier.',
   1, 40, 'soumise', 1, 'company'),

  (6,  4,  4,
   'Stage Data Scientist — développement de modèles prédictifs pour l''optimisation des essais cliniques. Collaboration avec les équipes R&D dans un contexte pharmaceutique international.',
   'Bruxelles', 'Python, scikit-learn, R, Jupyter, SQL',
   'Appliquer le machine learning à des cas d''usage pharma et comprendre les contraintes réglementaires.',
   0, NULL, 'soumise', 4, 'company'),

  (15, 10, 10,
   'Stage développeur embarqué — programmation de contrôleurs sur chaînes de production automatisées. Travail en C/C++ sur microcontrôleurs ARM dans un environnement industriel.',
   'Zwevegem', 'C, C++, ARM Cortex, RTOS, CAN bus',
   'Développer en environnement contraint et comprendre les systèmes embarqués industriels.',
   0, NULL, 'soumise', 10, 'company'),

  (24, 16, 16,
   'Stage Data Analyst — analyse des flux de production et construction d''indicateurs de performance énergétique. Traitement de séries temporelles industrielles.',
   'Bruxelles', 'Python, R, SQL, Tableau, Power BI',
   'Analyser des données industrielles complexes et produire des insights actionnables.',
   0, NULL, 'soumise', 16, 'company'),

  (29, 19, 19,
   'Stage développeur VBA/Excel — automatisation des processus de gestion financière et création de macros avancées pour les équipes comptables.',
   'Namur', 'VBA, Excel, Access, SQL',
   'Automatiser des flux métier et travailler avec des équipes non-techniques.',
   1, 20, 'soumise', 19, 'company'),

  -- validee_et_visible (12) ──────────────────────────────────────────────────
  (1,  1,  1,
   'Stage développeur Java Spring Boot — intégration au sein de l''équipe Integration Services. Développement d''API REST, participation aux sprints agiles et mise en place de tests unitaires. Infrastructure Docker/Kubernetes.',
   'Bruxelles', 'Java 17, Spring Boot, PostgreSQL, Docker, Kubernetes',
   'Concevoir et livrer des APIs REST robustes et s''intégrer dans une équipe agile internationale.',
   1, 50, 'validee_et_visible', 1, 'company'),

  (3,  2,  2,
   'Stage développeur Front-End React — renforcement de l''équipe digitale sur la plateforme bancaire en ligne. Création de composants réutilisables, intégration de maquettes UX et optimisation des performances.',
   'Bruxelles', 'React 18, TypeScript, Redux, Jest, Figma',
   'Maîtriser le développement React en contexte bancaire réglementé et collaborer avec les équipes UX.',
   1, 60, 'validee_et_visible', 2, 'company'),

  (4,  3,  3,
   'Stage ingénieur DevOps — automatisation des pipelines CI/CD et gestion de l''infrastructure cloud. Participation à la migration vers Kubernetes et mise en place de pratiques SRE.',
   'Bruxelles', 'Jenkins, Kubernetes, Terraform, AWS, Python',
   'Concevoir des pipelines CI/CD fiables et appliquer les principes DevOps en production.',
   1, 40, 'validee_et_visible', 3, 'company'),

  (7,  5,  5,
   'Stage développeur .NET — développement de modules back-end pour le système de gestion des stocks. Intégration avec les systèmes ERP existants et optimisation des requêtes SQL Server.',
   'Halle', '.NET 8, C#, SQL Server, Entity Framework, Azure',
   'Développer en .NET en contexte retail grande échelle et comprendre les contraintes d''un SI complexe.',
   0, NULL, 'validee_et_visible', 5, 'company'),

  (9,  6,  6,
   'Stage développeur Backend Node.js — développement de microservices financiers avec APIs GraphQL et intégration avec des systèmes de paiement temps réel.',
   'Bruxelles', 'Node.js, TypeScript, GraphQL, Redis, PostgreSQL',
   'Développer des microservices haute disponibilité et comprendre les exigences du secteur bancaire.',
   1, 50, 'validee_et_visible', 6, 'company'),

  (10, 7,  7,
   'Stage consultant SAP S/4HANA — implémentation de modules pour des clients grands comptes. Participation aux ateliers de collecte des besoins et rédaction de spécifications fonctionnelles.',
   'Bruxelles', 'SAP S/4HANA, ABAP, SAP Fiori, SQL',
   'Comprendre les processus métier ERP et développer ses compétences en conseil fonctionnel.',
   0, NULL, 'validee_et_visible', 7, 'company'),

  (13, 9,  9,
   'Stage développeur Java microservices — développement de services métier pour la gestion des horaires et des réservations. Travail en Scrum avec des équipes pluridisciplinaires.',
   'Bruxelles', 'Java, Spring Cloud, Kafka, MongoDB, Docker',
   'Maîtriser l''architecture microservices et contribuer à des systèmes critiques à grande échelle.',
   1, 30, 'validee_et_visible', 9, 'company'),

  (16, 11, 11,
   'Stage Full Stack React/Node.js — développement de la plateforme SaaS de gestion de projets. Participation à toutes les phases : conception, développement, tests et déploiement en production.',
   'Liège', 'React, Node.js, TypeScript, PostgreSQL, Docker',
   'Travailler sur un produit de bout en bout dans une startup en forte croissance.',
   1, 80, 'validee_et_visible', 11, 'company'),

  (18, 12, 12,
   'Stage Data Engineer — construction et maintenance de pipelines de données massives. Conception de flux ETL et optimisation des performances sur stack Big Data.',
   'Gand', 'Python, Apache Spark, dbt, Airflow, Snowflake',
   'Concevoir des pipelines de données robustes et scalables et travailler sur des volumes importants.',
   1, 60, 'validee_et_visible', 12, 'company'),

  (21, 14, 14,
   'Stage développeur .NET/Azure — développement de modules pour la plateforme de compensation financière post-marché. Environnement hautement sécurisé et réglementé.',
   'Bruxelles', '.NET, C#, Azure DevOps, SQL Server, WCF',
   'Développer dans un contexte financier de haute criticité et respecter les normes ISO et réglementaires.',
   0, NULL, 'validee_et_visible', 14, 'company'),

  (22, 15, 15,
   'Stage développeur Angular — refonte de l''interface de gestion des contrats d''assurance. Collaboration avec les équipes métier pour moderniser les outils de souscription.',
   'Bruxelles', 'Angular 17, TypeScript, NgRx, SCSS, REST APIs',
   'Moderniser une application métier critique et travailler directement avec les utilisateurs finaux.',
   1, 40, 'validee_et_visible', 15, 'company'),

  (25, 17, 17,
   'Stage développeur iOS Swift — contribution à l''application mobile KBC. Développement de nouvelles fonctionnalités dans un contexte agile et sécurisé.',
   'Bruxelles', 'Swift, SwiftUI, Xcode, REST, Git',
   'Livrer des fonctionnalités dans une app mobile utilisée par des millions d''utilisateurs.',
   1, 30, 'validee_et_visible', 17, 'company'),

  -- prise (8) ────────────────────────────────────────────────────────────────
  (5,  3,  3,
   'Stage développeur mobile React Native — développement de fonctionnalités pour l''app Proximus My. Publication sur App Store et Google Play.',
   'Bruxelles', 'React Native, JavaScript, REST, Firebase, Git',
   'Livrer des features mobile de qualité et gérer le cycle de vie d''une app grand public.',
   1, 50, 'prise', 3, 'company'),

  (8,  5,  5,
   'Stage analyste Business Intelligence — conception de tableaux de bord pour le pilotage des ventes. Modélisation des données et développement de rapports Power BI pour les directions métier.',
   'Halle', 'Power BI, SQL Server, DAX, Excel',
   'Traduire les besoins métier en indicateurs visuels et travailler avec les directions opérationnelles.',
   0, NULL, 'prise', 5, 'company'),

  (11, 7,  7,
   'Stage développeur Python Django — développement d''une plateforme interne de gestion de missions de conseil. Conception du modèle de données et intégration avec des outils tiers.',
   'Bruxelles', 'Python, Django, PostgreSQL, Celery, Docker',
   'Concevoir et développer une application web complète en méthodologie agile.',
   1, 60, 'prise', 7, 'company'),

  (14, 9,  9,
   'Stage ingénieur tests & QA — mise en place d''une stratégie de tests automatisés pour les applications critiques. Rédaction de plans de tests et automatisation Selenium.',
   'Bruxelles', 'Selenium, Cucumber, Java, Jenkins, Jira',
   'Maîtriser les techniques de test automatisé et contribuer à l''amélioration de la qualité logicielle.',
   0, NULL, 'prise', 9, 'company'),

  (17, 11, 11,
   'Stage DevOps / SRE — mise en place de l''infrastructure cloud et des pratiques SRE pour la plateforme TechNova. Déploiement AWS et monitoring Prometheus/Grafana.',
   'Liège', 'AWS, Terraform, Docker, Kubernetes, Prometheus, Grafana',
   'Déployer et opérer une infrastructure cloud moderne en appliquant les principes SRE.',
   1, 70, 'prise', 11, 'company'),

  (19, 12, 12,
   'Stage Machine Learning Engineer — développement et mise en production de modèles NLP pour l''analyse de données non structurées. Fine-tuning de LLMs et déploiement MLOps.',
   'Gand', 'Python, HuggingFace, PyTorch, MLflow, FastAPI',
   'Mettre en production des modèles ML et comprendre les défis du MLOps en entreprise.',
   1, 80, 'prise', 12, 'company'),

  (23, 15, 15,
   'Stage architecte Cloud AWS — conception de l''architecture de la nouvelle plateforme sinistres cloud-native. Définition des patterns d''intégration et accompagnement des équipes.',
   'Bruxelles', 'AWS, Lambda, ECS, API Gateway, Terraform, Python',
   'Concevoir une architecture cloud scalable et travailler en mode architecture as code.',
   1, 50, 'prise', 15, 'company'),

  (26, 17, 17,
   'Stage ingénieur Data Platform — développement et maintenance du data lake centralisé du groupe KBC. Migration des pipelines legacy vers une stack cloud-native moderne.',
   'Bruxelles', 'Spark, Databricks, Delta Lake, Python, Azure',
   'Construire une data platform fiable à l''échelle du groupe et maîtriser les architectures lakehouse.',
   0, NULL, 'prise', 17, 'company'),

  -- non_disponible (3) ───────────────────────────────────────────────────────
  (20, 13, 13,
   'Stage développeur WordPress/PHP — développement de thèmes et plugins sur mesure pour des clients PME. Intégration des maquettes Figma et optimisation des performances.',
   'Bruxelles', 'WordPress, PHP, JavaScript, SCSS, Figma',
   'Développer des solutions web sur mesure et gérer la relation client directement.',
   1, 20, 'non_disponible', 13, 'company'),

  (27, 18, 18,
   'Stage développeur SAP ABAP — développement de rapports et d''améliorations pour le SI SAP d''AB InBev. Travail en ABAP et SAP Fiori dans un environnement international.',
   'Leuven', 'SAP ABAP, SAP Fiori, OData, RFC, BAPI',
   'Développer en ABAP dans un contexte SAP enterprise et comprendre les processus supply chain.',
   0, NULL, 'non_disponible', 18, 'company'),

  (28, 19, 19,
   'Stage développeur C#/.NET — maintenance et évolution d''un ERP destiné aux PME belges. Ajout de modules fonctionnels et optimisation des performances applicatives.',
   'Namur', 'C#, .NET, WinForms, SQL Server',
   'Travailler sur un produit ERP en production et comprendre les contraintes des clients PME.',
   0, NULL, 'non_disponible', 19, 'company'),

  -- refusee (2) ──────────────────────────────────────────────────────────────
  (12, 8,  8,
   'Stage développeur PHP Symfony — développement du portail client Belfius. Intégration avec les APIs internes et mise en conformité RGPD.',
   'Bruxelles', 'PHP 8, Symfony 6, MySQL, Twig, REST',
   'Développer en PHP/Symfony en contexte bancaire et appliquer les bonnes pratiques de sécurité.',
   1, 30, 'refusee', 8, 'company'),

  (30, 20, 20,
   'Stage développeur analytique web — implémentation de solutions de tracking avancées et développement de dashboards SEO. Automatisation des rapports marketing via API Google.',
   'Bruxelles', 'Google Analytics 4, Tag Manager, Python, Looker Studio',
   'Maîtriser l''écosystème analytics web et automatiser les reportings marketing.',
   1, 40, 'refusee', 20, 'company');

-- ── Liaisons offre-contact ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO offer_contacts (offer_id, contact_id) VALUES
  (1, 1), (1, 21),
  (2, 1),
  (3, 2),
  (4, 3), (4, 22),
  (5, 3), (5, 22),
  (6, 4),
  (7, 5),
  (8, 5),
  (9, 6),
  (10, 7), (10, 23),
  (11, 7),
  (12, 8),
  (13, 9),
  (14, 9),
  (15, 10),
  (16, 11),
  (17, 11),
  (18, 12), (18, 24),
  (19, 12), (19, 24),
  (20, 13),
  (21, 14),
  (22, 15),
  (23, 15),
  (24, 16),
  (25, 17), (25, 25),
  (26, 17),
  (27, 18),
  (28, 19),
  (29, 19),
  (30, 20);

-- ── Candidatures ───────────────────────────────────────────────────────────────
-- Offres "prise" : une candidature sélectionnée par offre
-- Offres "validee_et_visible" : quelques candidatures en attente
INSERT OR IGNORE INTO applications (offer_id, student_id, selected) VALUES
  (5,   1, 1),
  (8,   3, 1),
  (11,  5, 1),
  (14, 11, 1),
  (17, 15, 1),
  (19, 12, 1),
  (23, 18, 1),
  (26,  7, 1),
  (1,   2, 0),
  (1,   4, 0),
  (3,   6, 0),
  (9,   9, 0),
  (13, 14, 0),
  (16, 16, 0),
  (16, 17, 0),
  (18, 19, 0),
  (22,  8, 0),
  (25, 20, 0);
