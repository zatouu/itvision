-- Auto-generated taxonomy seed from taxonomy.json
-- Version: 1.0.0
-- Categories: 212

BEGIN;

INSERT INTO categories (
  id, parent_id, level, slug, icon, image, order_index, is_active, is_leaf,
  name, seo_title, seo_description, keywords, synonyms, typos, close_categories,
  allowed_units, required_attributes, optional_attributes, search_filters,
  supports_wholesale, supports_dropshipping, supports_group_buying, commission_rate, created_at, updated_at
) VALUES
(
  'cat-root-electronique-informatique', NULL, 1, 'electronique-informatique', 'Cpu', '/categories/electronique-informatique.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Électronique & Informatique\",\"en\":\"Electronics & Computing\",\"ar\":\"إلكترونيات وكمبيوتر\",\"wo\":\"Electoronik ak Ordinateer\"}", "{\"fr\":\"Électronique & Informatique — Achat en gros\",\"en\":\"Electronics & Computing — Wholesale\",\"ar\":\"إلكترونيات وكمبيوتر — بالجملة\",\"wo\":\"Electoronik ak Ordinateer — Capp\"}", "{\"fr\":\"Découvrez Électronique & Informatique au Sénégal.\",\"en\":\"Discover Electronics & Computing in Senegal.\",\"ar\":\"اكتشف إلكترونيات وكمبيوتر في السنغال.\",\"wo\":\"Gis Electoronik ak Ordinateer ci Senegaal.\"}", "{\"fr\":[\"Électronique & Informatique\",\"gros\"],\"en\":[\"Electronics & Computing\",\"wholesale\"],\"ar\":[\"إلكترونيات وكمبيوتر\",\"بالجملة\"],\"wo\":[\"Electoronik ak Ordinateer\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-telephonie', 'cat-root-electronique-informatique', 2, 'telephonie', 'Smartphone', '/categories/telephonie.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Téléphonie\",\"en\":\"Telephony\",\"ar\":\"هاتف\",\"wo\":\"Telfoŋ\"}", "{\"fr\":\"Téléphonie — Achat en gros\",\"en\":\"Telephony — Wholesale\",\"ar\":\"هاتف — بالجملة\",\"wo\":\"Telfoŋ — Capp\"}", "{\"fr\":\"Découvrez Téléphonie au Sénégal.\",\"en\":\"Discover Telephony in Senegal.\",\"ar\":\"اكتشف هاتف في السنغال.\",\"wo\":\"Gis Telfoŋ ci Senegaal.\"}", "{\"fr\":[\"Téléphonie\",\"gros\"],\"en\":[\"Telephony\",\"wholesale\"],\"ar\":[\"هاتف\",\"بالجملة\"],\"wo\":[\"Telfoŋ\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-telephonie-smartphones', 'cat-root-electronique-informatique-telephonie', 3, 'smartphones', 'Smartphone', '/categories/smartphones.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Smartphones\",\"en\":\"Smartphones\",\"ar\":\"الهواتف الذكية\",\"wo\":\"Smartphones\"}", "{\"fr\":\"Smartphones — Achat en gros\",\"en\":\"Smartphones — Wholesale\",\"ar\":\"الهواتف الذكية — بالجملة\",\"wo\":\"Smartphones — Capp\"}", "{\"fr\":\"Découvrez Smartphones au Sénégal.\",\"en\":\"Discover Smartphones in Senegal.\",\"ar\":\"اكتشف الهواتف الذكية في السنغال.\",\"wo\":\"Gis Smartphones ci Senegaal.\"}", "{\"fr\":[\"Smartphones\",\"gros\"],\"en\":[\"Smartphones\",\"wholesale\"],\"ar\":[\"الهواتف الذكية\",\"بالجملة\"],\"wo\":[\"Smartphones\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_5\",\"carton_of_10\",\"palette\"]", "[\"brand\",\"model\",\"os\",\"ram\",\"storage\",\"screen_size\",\"color\",\"condition\"]", "[\"battery_capacity\",\"camera_mp\",\"sim_type\",\"warranty_months\"]", "[\"brand\",\"os\",\"ram\",\"storage\",\"screen_size\",\"price\",\"color\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.06,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-telephonie-telephones-classiques', 'cat-root-electronique-informatique-telephonie', 3, 'telephones-classiques', 'Phone', '/categories/telephones-classiques.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Téléphones classiques\",\"en\":\"Feature Phones\",\"ar\":\"هواتف بسيطة\",\"wo\":\"Telfoŋ yu bees\"}", "{\"fr\":\"Téléphones classiques — Achat en gros\",\"en\":\"Feature Phones — Wholesale\",\"ar\":\"هواتف بسيطة — بالجملة\",\"wo\":\"Telfoŋ yu bees — Capp\"}", "{\"fr\":\"Découvrez Téléphones classiques au Sénégal.\",\"en\":\"Discover Feature Phones in Senegal.\",\"ar\":\"اكتشف هواتف بسيطة في السنغال.\",\"wo\":\"Gis Telfoŋ yu bees ci Senegaal.\"}", "{\"fr\":[\"Téléphones classiques\",\"gros\"],\"en\":[\"Feature Phones\",\"wholesale\"],\"ar\":[\"هواتف بسيطة\",\"بالجملة\"],\"wo\":[\"Telfoŋ yu bees\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_10\",\"carton_of_50\"]", "[\"brand\",\"model\",\"sim_slots\",\"battery_capacity\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"sim_slots\",\"battery_capacity\",\"price\",\"color\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-telephonie-accessoires-de-telephonie', 'cat-root-electronique-informatique-telephonie', 3, 'accessoires-de-telephonie', 'Headphones', '/categories/accessoires-de-telephonie.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Accessoires de téléphonie\",\"en\":\"Phone Accessories\",\"ar\":\"إكسسوارات الهاتف\",\"wo\":\"Ay-qaayu telfoŋ\"}", "{\"fr\":\"Accessoires de téléphonie — Achat en gros\",\"en\":\"Phone Accessories — Wholesale\",\"ar\":\"إكسسوارات الهاتف — بالجملة\",\"wo\":\"Ay-qaayu telfoŋ — Capp\"}", "{\"fr\":\"Découvrez Accessoires de téléphonie au Sénégal.\",\"en\":\"Discover Phone Accessories in Senegal.\",\"ar\":\"اكتشف إكسسوارات الهاتف في السنغال.\",\"wo\":\"Gis Ay-qaayu telfoŋ ci Senegaal.\"}", "{\"fr\":[\"Accessoires de téléphonie\",\"gros\"],\"en\":[\"Phone Accessories\",\"wholesale\"],\"ar\":[\"إكسسوارات الهاتف\",\"بالجملة\"],\"wo\":[\"Ay-qaayu telfoŋ\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_10\",\"carton_of_100\",\"palette\"]", "[\"type\",\"brand\",\"compatibility\",\"color\",\"material\"]", "[\"warranty\",\"connector_type\",\"length\"]", "[\"type\",\"brand\",\"compatibility\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.09,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-telephonie-pieces-detachees-telephonie', 'cat-root-electronique-informatique-telephonie', 3, 'pieces-detachees-telephonie', 'Wrench', '/categories/pieces-detachees-telephonie.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Pièces détachées téléphonie\",\"en\":\"Phone Spare Parts\",\"ar\":\"قطع غيار الهاتف\",\"wo\":\"Benn ci benn telfoŋ\"}", "{\"fr\":\"Pièces détachées téléphonie — Achat en gros\",\"en\":\"Phone Spare Parts — Wholesale\",\"ar\":\"قطع غيار الهاتف — بالجملة\",\"wo\":\"Benn ci benn telfoŋ — Capp\"}", "{\"fr\":\"Découvrez Pièces détachées téléphonie au Sénégal.\",\"en\":\"Discover Phone Spare Parts in Senegal.\",\"ar\":\"اكتشف قطع غيار الهاتف في السنغال.\",\"wo\":\"Gis Benn ci benn telfoŋ ci Senegaal.\"}", "{\"fr\":[\"Pièces détachées téléphonie\",\"gros\"],\"en\":[\"Phone Spare Parts\",\"wholesale\"],\"ar\":[\"قطع غيار الهاتف\",\"بالجملة\"],\"wo\":[\"Benn ci benn telfoŋ\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_5\",\"carton_of_50\"]", "[\"type\",\"brand\",\"model_compatible\",\"quality\",\"condition\"]", "[\"oem\",\"warranty\",\"origin\"]", "[\"type\",\"brand\",\"model_compatible\",\"quality\",\"price\"]",
  TRUE, FALSE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-informatique', 'cat-root-electronique-informatique', 2, 'informatique', 'Laptop', '/categories/informatique.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Informatique\",\"en\":\"Computing\",\"ar\":\"الحوسبة\",\"wo\":\"Informatik\"}", "{\"fr\":\"Informatique — Achat en gros\",\"en\":\"Computing — Wholesale\",\"ar\":\"الحوسبة — بالجملة\",\"wo\":\"Informatik — Capp\"}", "{\"fr\":\"Découvrez Informatique au Sénégal.\",\"en\":\"Discover Computing in Senegal.\",\"ar\":\"اكتشف الحوسبة في السنغال.\",\"wo\":\"Gis Informatik ci Senegaal.\"}", "{\"fr\":[\"Informatique\",\"gros\"],\"en\":[\"Computing\",\"wholesale\"],\"ar\":[\"الحوسبة\",\"بالجملة\"],\"wo\":[\"Informatik\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-informatique-ordinateurs-portables', 'cat-root-electronique-informatique-informatique', 3, 'ordinateurs-portables', 'Laptop', '/categories/ordinateurs-portables.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Ordinateurs portables\",\"en\":\"Laptops\",\"ar\":\"أجهزة الكمبيوتر المحمولة\",\"wo\":\"Ordinateer poortable\"}", "{\"fr\":\"Ordinateurs portables — Achat en gros\",\"en\":\"Laptops — Wholesale\",\"ar\":\"أجهزة الكمبيوتر المحمولة — بالجملة\",\"wo\":\"Ordinateer poortable — Capp\"}", "{\"fr\":\"Découvrez Ordinateurs portables au Sénégal.\",\"en\":\"Discover Laptops in Senegal.\",\"ar\":\"اكتشف أجهزة الكمبيوتر المحمولة في السنغال.\",\"wo\":\"Gis Ordinateer poortable ci Senegaal.\"}", "{\"fr\":[\"Ordinateurs portables\",\"gros\"],\"en\":[\"Laptops\",\"wholesale\"],\"ar\":[\"أجهزة الكمبيوتر المحمولة\",\"بالجملة\"],\"wo\":[\"Ordinateer poortable\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_5\",\"carton_of_10\"]", "[\"brand\",\"model\",\"cpu\",\"ram\",\"storage\",\"screen_size\",\"os\",\"color\",\"condition\"]", "[\"gpu\",\"battery_life\",\"weight\",\"warranty_months\"]", "[\"brand\",\"cpu\",\"ram\",\"storage\",\"screen_size\",\"os\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.06,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-informatique-ordinateurs-de-bureau', 'cat-root-electronique-informatique-informatique', 3, 'ordinateurs-de-bureau', 'Monitor', '/categories/ordinateurs-de-bureau.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Ordinateurs de bureau\",\"en\":\"Desktop Computers\",\"ar\":\"أجهزة الكمبيوتر المكتبية\",\"wo\":\"Ordinateer buro\"}", "{\"fr\":\"Ordinateurs de bureau — Achat en gros\",\"en\":\"Desktop Computers — Wholesale\",\"ar\":\"أجهزة الكمبيوتر المكتبية — بالجملة\",\"wo\":\"Ordinateer buro — Capp\"}", "{\"fr\":\"Découvrez Ordinateurs de bureau au Sénégal.\",\"en\":\"Discover Desktop Computers in Senegal.\",\"ar\":\"اكتشف أجهزة الكمبيوتر المكتبية في السنغال.\",\"wo\":\"Gis Ordinateer buro ci Senegaal.\"}", "{\"fr\":[\"Ordinateurs de bureau\",\"gros\"],\"en\":[\"Desktop Computers\",\"wholesale\"],\"ar\":[\"أجهزة الكمبيوتر المكتبية\",\"بالجملة\"],\"wo\":[\"Ordinateer buro\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_5\",\"carton_of_10\"]", "[\"brand\",\"model\",\"cpu\",\"ram\",\"storage\",\"gpu\",\"os\",\"condition\"]", "[\"form_factor\",\"warranty_months\",\"included_monitor\"]", "[\"brand\",\"cpu\",\"ram\",\"storage\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.06,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-informatique-composants-pieces-pc', 'cat-root-electronique-informatique-informatique', 3, 'composants-pieces-pc', 'Cpu', '/categories/composants-pieces-pc.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Composants & Pièces PC\",\"en\":\"PC Components & Parts\",\"ar\":\"قطع الكمبيوتر\",\"wo\":\"Benn ci benn PC\"}", "{\"fr\":\"Composants & Pièces PC — Achat en gros\",\"en\":\"PC Components & Parts — Wholesale\",\"ar\":\"قطع الكمبيوتر — بالجملة\",\"wo\":\"Benn ci benn PC — Capp\"}", "{\"fr\":\"Découvrez Composants & Pièces PC au Sénégal.\",\"en\":\"Discover PC Components & Parts in Senegal.\",\"ar\":\"اكتشف قطع الكمبيوتر في السنغال.\",\"wo\":\"Gis Benn ci benn PC ci Senegaal.\"}", "{\"fr\":[\"Composants & Pièces PC\",\"gros\"],\"en\":[\"PC Components & Parts\",\"wholesale\"],\"ar\":[\"قطع الكمبيوتر\",\"بالجملة\"],\"wo\":[\"Benn ci benn PC\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_5\",\"carton_of_50\"]", "[\"type\",\"brand\",\"model\",\"compatibility\",\"condition\"]", "[\"warranty\",\"origin\",\"oem\"]", "[\"type\",\"brand\",\"compatibility\",\"condition\",\"price\"]",
  TRUE, FALSE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-informatique-stockage-memoire', 'cat-root-electronique-informatique-informatique', 3, 'stockage-memoire', 'HardDrive', '/categories/stockage-memoire.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Stockage & Mémoire\",\"en\":\"Storage & Memory\",\"ar\":\"التخزين والذاكرة\",\"wo\":\"Stokkaas ak Mëmwaar\"}", "{\"fr\":\"Stockage & Mémoire — Achat en gros\",\"en\":\"Storage & Memory — Wholesale\",\"ar\":\"التخزين والذاكرة — بالجملة\",\"wo\":\"Stokkaas ak Mëmwaar — Capp\"}", "{\"fr\":\"Découvrez Stockage & Mémoire au Sénégal.\",\"en\":\"Discover Storage & Memory in Senegal.\",\"ar\":\"اكتشف التخزين والذاكرة في السنغال.\",\"wo\":\"Gis Stokkaas ak Mëmwaar ci Senegaal.\"}", "{\"fr\":[\"Stockage & Mémoire\",\"gros\"],\"en\":[\"Storage & Memory\",\"wholesale\"],\"ar\":[\"التخزين والذاكرة\",\"بالجملة\"],\"wo\":[\"Stokkaas ak Mëmwaar\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_10\",\"carton_of_100\"]", "[\"type\",\"brand\",\"capacity\",\"interface\",\"condition\"]", "[\"speed\",\"form_factor\",\"warranty_months\"]", "[\"type\",\"brand\",\"capacity\",\"interface\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-audio-video', 'cat-root-electronique-informatique', 2, 'audio-video', 'Speaker', '/categories/audio-video.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Audio & Vidéo\",\"en\":\"Audio & Video\",\"ar\":\"الصوت والفيديو\",\"wo\":\"Audio ak Video\"}", "{\"fr\":\"Audio & Vidéo — Achat en gros\",\"en\":\"Audio & Video — Wholesale\",\"ar\":\"الصوت والفيديو — بالجملة\",\"wo\":\"Audio ak Video — Capp\"}", "{\"fr\":\"Découvrez Audio & Vidéo au Sénégal.\",\"en\":\"Discover Audio & Video in Senegal.\",\"ar\":\"اكتشف الصوت والفيديو في السنغال.\",\"wo\":\"Gis Audio ak Video ci Senegaal.\"}", "{\"fr\":[\"Audio & Vidéo\",\"gros\"],\"en\":[\"Audio & Video\",\"wholesale\"],\"ar\":[\"الصوت والفيديو\",\"بالجملة\"],\"wo\":[\"Audio ak Video\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-audio-video-casques-ecouteurs', 'cat-root-electronique-informatique-audio-video', 3, 'casques-ecouteurs', 'Headphones', '/categories/casques-ecouteurs.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Casques & Écouteurs\",\"en\":\"Headphones & Earphones\",\"ar\":\"السماعات\",\"wo\":\"Casques ak Écouteurs\"}", "{\"fr\":\"Casques & Écouteurs — Achat en gros\",\"en\":\"Headphones & Earphones — Wholesale\",\"ar\":\"السماعات — بالجملة\",\"wo\":\"Casques ak Écouteurs — Capp\"}", "{\"fr\":\"Découvrez Casques & Écouteurs au Sénégal.\",\"en\":\"Discover Headphones & Earphones in Senegal.\",\"ar\":\"اكتشف السماعات في السنغال.\",\"wo\":\"Gis Casques ak Écouteurs ci Senegaal.\"}", "{\"fr\":[\"Casques & Écouteurs\",\"gros\"],\"en\":[\"Headphones & Earphones\",\"wholesale\"],\"ar\":[\"السماعات\",\"بالجملة\"],\"wo\":[\"Casques ak Écouteurs\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_10\",\"carton_of_100\"]", "[\"type\",\"brand\",\"connection\",\"color\",\"condition\"]", "[\"noise_cancellation\",\"battery_life\",\"warranty_months\"]", "[\"type\",\"brand\",\"connection\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.09,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-audio-video-enceintes-sonorisation', 'cat-root-electronique-informatique-audio-video', 3, 'enceintes-sonorisation', 'Speaker', '/categories/enceintes-sonorisation.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Enceintes & Sonorisation\",\"en\":\"Speakers & Sound Systems\",\"ar\":\"المكبرات الصوتية\",\"wo\":\"Enceintes yi\"}", "{\"fr\":\"Enceintes & Sonorisation — Achat en gros\",\"en\":\"Speakers & Sound Systems — Wholesale\",\"ar\":\"المكبرات الصوتية — بالجملة\",\"wo\":\"Enceintes yi — Capp\"}", "{\"fr\":\"Découvrez Enceintes & Sonorisation au Sénégal.\",\"en\":\"Discover Speakers & Sound Systems in Senegal.\",\"ar\":\"اكتشف المكبرات الصوتية في السنغال.\",\"wo\":\"Gis Enceintes yi ci Senegaal.\"}", "{\"fr\":[\"Enceintes & Sonorisation\",\"gros\"],\"en\":[\"Speakers & Sound Systems\",\"wholesale\"],\"ar\":[\"المكبرات الصوتية\",\"بالجملة\"],\"wo\":[\"Enceintes yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_5\",\"carton_of_20\"]", "[\"type\",\"brand\",\"power\",\"connection\",\"condition\"]", "[\"battery\",\"waterproof\",\"warranty_months\"]", "[\"type\",\"brand\",\"power\",\"connection\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-audio-video-televiseurs-projecteurs', 'cat-root-electronique-informatique-audio-video', 3, 'televiseurs-projecteurs', 'Tv', '/categories/televiseurs-projecteurs.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Téléviseurs & Projecteurs\",\"en\":\"TVs & Projectors\",\"ar\":\"التلفزيونات والبروجكتورات\",\"wo\":\"Téléviseurs yi\"}", "{\"fr\":\"Téléviseurs & Projecteurs — Achat en gros\",\"en\":\"TVs & Projectors — Wholesale\",\"ar\":\"التلفزيونات والبروجكتورات — بالجملة\",\"wo\":\"Téléviseurs yi — Capp\"}", "{\"fr\":\"Découvrez Téléviseurs & Projecteurs au Sénégal.\",\"en\":\"Discover TVs & Projectors in Senegal.\",\"ar\":\"اكتشف التلفزيونات والبروجكتورات في السنغال.\",\"wo\":\"Gis Téléviseurs yi ci Senegaal.\"}", "{\"fr\":[\"Téléviseurs & Projecteurs\",\"gros\"],\"en\":[\"TVs & Projectors\",\"wholesale\"],\"ar\":[\"التلفزيونات والبروجكتورات\",\"بالجملة\"],\"wo\":[\"Téléviseurs yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_5\",\"carton_of_10\"]", "[\"brand\",\"size\",\"resolution\",\"type\",\"smart_os\",\"condition\"]", "[\"hdr\",\"refresh_rate\",\"ports\",\"warranty_months\"]", "[\"brand\",\"size\",\"resolution\",\"type\",\"smart_os\",\"price\"]",
  TRUE, TRUE, TRUE, 0.06,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-telecommunications-reseaux', 'cat-root-electronique-informatique', 2, 'telecommunications-reseaux', 'Wifi', '/categories/telecommunications-reseaux.jpg', 4, TRUE, FALSE,
  "{\"fr\":\"Télécommunications & Réseaux\",\"en\":\"Telecommunications & Networks\",\"ar\":\"الاتصالات والشبكات\",\"wo\":\"Télécommunications ak Réseaux\"}", "{\"fr\":\"Télécommunications & Réseaux — Achat en gros\",\"en\":\"Telecommunications & Networks — Wholesale\",\"ar\":\"الاتصالات والشبكات — بالجملة\",\"wo\":\"Télécommunications ak Réseaux — Capp\"}", "{\"fr\":\"Découvrez Télécommunications & Réseaux au Sénégal.\",\"en\":\"Discover Telecommunications & Networks in Senegal.\",\"ar\":\"اكتشف الاتصالات والشبكات في السنغال.\",\"wo\":\"Gis Télécommunications ak Réseaux ci Senegaal.\"}", "{\"fr\":[\"Télécommunications & Réseaux\",\"gros\"],\"en\":[\"Telecommunications & Networks\",\"wholesale\"],\"ar\":[\"الاتصالات والشبكات\",\"بالجملة\"],\"wo\":[\"Télécommunications ak Réseaux\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-telecommunications-reseaux-routeurs-modems', 'cat-root-electronique-informatique-telecommunications-reseaux', 3, 'routeurs-modems', 'Router', '/categories/routeurs-modems.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Routeurs & Modems\",\"en\":\"Routers & Modems\",\"ar\":\"أجهزة التوجيه والمودمات\",\"wo\":\"Routeurs yi\"}", "{\"fr\":\"Routeurs & Modems — Achat en gros\",\"en\":\"Routers & Modems — Wholesale\",\"ar\":\"أجهزة التوجيه والمودمات — بالجملة\",\"wo\":\"Routeurs yi — Capp\"}", "{\"fr\":\"Découvrez Routeurs & Modems au Sénégal.\",\"en\":\"Discover Routers & Modems in Senegal.\",\"ar\":\"اكتشف أجهزة التوجيه والمودمات في السنغال.\",\"wo\":\"Gis Routeurs yi ci Senegaal.\"}", "{\"fr\":[\"Routeurs & Modems\",\"gros\"],\"en\":[\"Routers & Modems\",\"wholesale\"],\"ar\":[\"أجهزة التوجيه والمودمات\",\"بالجملة\"],\"wo\":[\"Routeurs yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"speed\",\"connection\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"speed\",\"connection\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-telecommunications-reseaux-points-d-acces-wif', 'cat-root-electronique-informatique-telecommunications-reseaux', 3, 'points-d-acces-wifi', 'Wifi', '/categories/points-d-acces-wifi.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Points d'accès WiFi\",\"en\":\"WiFi Access Points\",\"ar\":\"نقاط الوصول اللاسلكية\",\"wo\":\"WiFi Access Points yi\"}", "{\"fr\":\"Points d'accès WiFi — Achat en gros\",\"en\":\"WiFi Access Points — Wholesale\",\"ar\":\"نقاط الوصول اللاسلكية — بالجملة\",\"wo\":\"WiFi Access Points yi — Capp\"}", "{\"fr\":\"Découvrez Points d'accès WiFi au Sénégal.\",\"en\":\"Discover WiFi Access Points in Senegal.\",\"ar\":\"اكتشف نقاط الوصول اللاسلكية في السنغال.\",\"wo\":\"Gis WiFi Access Points yi ci Senegaal.\"}", "{\"fr\":[\"Points d'accès WiFi\",\"gros\"],\"en\":[\"WiFi Access Points\",\"wholesale\"],\"ar\":[\"نقاط الوصول اللاسلكية\",\"بالجملة\"],\"wo\":[\"WiFi Access Points yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"speed\",\"coverage\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"speed\",\"coverage\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electronique-informatique-telecommunications-reseaux-cables-connectique', 'cat-root-electronique-informatique-telecommunications-reseaux', 3, 'cables-connectiques-reseau', 'Cable', '/categories/cables-connectiques-reseau.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Câbles & Connectiques réseau\",\"en\":\"Network Cables & Connectors\",\"ar\":\"كابلات وموصلات الشبكة\",\"wo\":\"Câbles réseau yi\"}", "{\"fr\":\"Câbles & Connectiques réseau — Achat en gros\",\"en\":\"Network Cables & Connectors — Wholesale\",\"ar\":\"كابلات وموصلات الشبكة — بالجملة\",\"wo\":\"Câbles réseau yi — Capp\"}", "{\"fr\":\"Découvrez Câbles & Connectiques réseau au Sénégal.\",\"en\":\"Discover Network Cables & Connectors in Senegal.\",\"ar\":\"اكتشف كابلات وموصلات الشبكة في السنغال.\",\"wo\":\"Gis Câbles réseau yi ci Senegaal.\"}", "{\"fr\":[\"Câbles & Connectiques réseau\",\"gros\"],\"en\":[\"Network Cables & Connectors\",\"wholesale\"],\"ar\":[\"كابلات وموصلات الشبكة\",\"بالجملة\"],\"wo\":[\"Câbles réseau yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"meter\",\"carton\",\"reel\"]", "[\"type\",\"brand\",\"length\",\"category_cable\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"length\",\"category_cable\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers', NULL, 1, 'electromenager-appareils-menagers', 'Refrigerator', '/categories/electromenager-appareils-menagers.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Électroménager & Appareils ménagers\",\"en\":\"Home Appliances\",\"ar\":\"الأجهزة المنزلية\",\"wo\":\"Eletromenager\"}", "{\"fr\":\"Électroménager & Appareils ménagers — Achat en gros\",\"en\":\"Home Appliances — Wholesale\",\"ar\":\"الأجهزة المنزلية — بالجملة\",\"wo\":\"Eletromenager — Capp\"}", "{\"fr\":\"Découvrez Électroménager & Appareils ménagers au Sénégal.\",\"en\":\"Discover Home Appliances in Senegal.\",\"ar\":\"اكتشف الأجهزة المنزلية في السنغال.\",\"wo\":\"Gis Eletromenager ci Senegaal.\"}", "{\"fr\":[\"Électroménager & Appareils ménagers\",\"gros\"],\"en\":[\"Home Appliances\",\"wholesale\"],\"ar\":[\"الأجهزة المنزلية\",\"بالجملة\"],\"wo\":[\"Eletromenager\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-gros-electromenager', 'cat-root-electromenager-appareils-menagers', 2, 'gros-electromenager', 'Refrigerator', '/categories/gros-electromenager.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Gros électroménager\",\"en\":\"Major Appliances\",\"ar\":\"الأجهزة الكبيرة\",\"wo\":\"Gros électroménager\"}", "{\"fr\":\"Gros électroménager — Achat en gros\",\"en\":\"Major Appliances — Wholesale\",\"ar\":\"الأجهزة الكبيرة — بالجملة\",\"wo\":\"Gros électroménager — Capp\"}", "{\"fr\":\"Découvrez Gros électroménager au Sénégal.\",\"en\":\"Discover Major Appliances in Senegal.\",\"ar\":\"اكتشف الأجهزة الكبيرة في السنغال.\",\"wo\":\"Gis Gros électroménager ci Senegaal.\"}", "{\"fr\":[\"Gros électroménager\",\"gros\"],\"en\":[\"Major Appliances\",\"wholesale\"],\"ar\":[\"الأجهزة الكبيرة\",\"بالجملة\"],\"wo\":[\"Gros électroménager\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-gros-electromenager-refrigerateurs-co', 'cat-root-electromenager-appareils-menagers-gros-electromenager', 3, 'refrigerateurs-congelateurs', 'Refrigerator', '/categories/refrigerateurs-congelateurs.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Réfrigérateurs & Congélateurs\",\"en\":\"Refrigerators & Freezers\",\"ar\":\"الثلاجات والمجمدات\",\"wo\":\"Réfrigérateurs yi\"}", "{\"fr\":\"Réfrigérateurs & Congélateurs — Achat en gros\",\"en\":\"Refrigerators & Freezers — Wholesale\",\"ar\":\"الثلاجات والمجمدات — بالجملة\",\"wo\":\"Réfrigérateurs yi — Capp\"}", "{\"fr\":\"Découvrez Réfrigérateurs & Congélateurs au Sénégal.\",\"en\":\"Discover Refrigerators & Freezers in Senegal.\",\"ar\":\"اكتشف الثلاجات والمجمدات في السنغال.\",\"wo\":\"Gis Réfrigérateurs yi ci Senegaal.\"}", "{\"fr\":[\"Réfrigérateurs & Congélateurs\",\"gros\"],\"en\":[\"Refrigerators & Freezers\",\"wholesale\"],\"ar\":[\"الثلاجات والمجمدات\",\"بالجملة\"],\"wo\":[\"Réfrigérateurs yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\"]", "[\"brand\",\"type\",\"volume\",\"energy_class\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"volume\",\"energy_class\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-gros-electromenager-cuisinieres-fours', 'cat-root-electromenager-appareils-menagers-gros-electromenager', 3, 'cuisinieres-fours', 'Flame', '/categories/cuisinieres-fours.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Cuisinières & Fours\",\"en\":\"Stoves & Ovens\",\"ar\":\"المواقد والأفران\",\"wo\":\"Cuisinières yi\"}", "{\"fr\":\"Cuisinières & Fours — Achat en gros\",\"en\":\"Stoves & Ovens — Wholesale\",\"ar\":\"المواقد والأفران — بالجملة\",\"wo\":\"Cuisinières yi — Capp\"}", "{\"fr\":\"Découvrez Cuisinières & Fours au Sénégal.\",\"en\":\"Discover Stoves & Ovens in Senegal.\",\"ar\":\"اكتشف المواقد والأفران في السنغال.\",\"wo\":\"Gis Cuisinières yi ci Senegaal.\"}", "{\"fr\":[\"Cuisinières & Fours\",\"gros\"],\"en\":[\"Stoves & Ovens\",\"wholesale\"],\"ar\":[\"المواقد والأفران\",\"بالجملة\"],\"wo\":[\"Cuisinières yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"energy\",\"burners\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"energy\",\"burners\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-gros-electromenager-machines-a-laver', 'cat-root-electromenager-appareils-menagers-gros-electromenager', 3, 'machines-a-laver', 'Droplet', '/categories/machines-a-laver.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Machines à laver\",\"en\":\"Washing Machines\",\"ar\":\"غسالات الملابس\",\"wo\":\"Machines à laver yi\"}", "{\"fr\":\"Machines à laver — Achat en gros\",\"en\":\"Washing Machines — Wholesale\",\"ar\":\"غسالات الملابس — بالجملة\",\"wo\":\"Machines à laver yi — Capp\"}", "{\"fr\":\"Découvrez Machines à laver au Sénégal.\",\"en\":\"Discover Washing Machines in Senegal.\",\"ar\":\"اكتشف غسالات الملابس في السنغال.\",\"wo\":\"Gis Machines à laver yi ci Senegaal.\"}", "{\"fr\":[\"Machines à laver\",\"gros\"],\"en\":[\"Washing Machines\",\"wholesale\"],\"ar\":[\"غسالات الملابس\",\"بالجملة\"],\"wo\":[\"Machines à laver yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"capacity\",\"energy_class\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"capacity\",\"energy_class\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-gros-electromenager-climatiseurs-vent', 'cat-root-electromenager-appareils-menagers-gros-electromenager', 3, 'climatiseurs-ventilateurs', 'Wind', '/categories/climatiseurs-ventilateurs.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Climatiseurs & Ventilateurs\",\"en\":\"Air Conditioners & Fans\",\"ar\":\"المكيفات والمراوح\",\"wo\":\"Climatiseurs yi\"}", "{\"fr\":\"Climatiseurs & Ventilateurs — Achat en gros\",\"en\":\"Air Conditioners & Fans — Wholesale\",\"ar\":\"المكيفات والمراوح — بالجملة\",\"wo\":\"Climatiseurs yi — Capp\"}", "{\"fr\":\"Découvrez Climatiseurs & Ventilateurs au Sénégal.\",\"en\":\"Discover Air Conditioners & Fans in Senegal.\",\"ar\":\"اكتشف المكيفات والمراوح في السنغال.\",\"wo\":\"Gis Climatiseurs yi ci Senegaal.\"}", "{\"fr\":[\"Climatiseurs & Ventilateurs\",\"gros\"],\"en\":[\"Air Conditioners & Fans\",\"wholesale\"],\"ar\":[\"المكيفات والمراوح\",\"بالجملة\"],\"wo\":[\"Climatiseurs yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"power\",\"btu\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"power\",\"btu\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-petit-electromenager', 'cat-root-electromenager-appareils-menagers', 2, 'petit-electromenager', 'Blender', '/categories/petit-electromenager.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Petit électroménager\",\"en\":\"Small Appliances\",\"ar\":\"الأجهزة الصغيرة\",\"wo\":\"Petit électroménager\"}", "{\"fr\":\"Petit électroménager — Achat en gros\",\"en\":\"Small Appliances — Wholesale\",\"ar\":\"الأجهزة الصغيرة — بالجملة\",\"wo\":\"Petit électroménager — Capp\"}", "{\"fr\":\"Découvrez Petit électroménager au Sénégal.\",\"en\":\"Discover Small Appliances in Senegal.\",\"ar\":\"اكتشف الأجهزة الصغيرة في السنغال.\",\"wo\":\"Gis Petit électroménager ci Senegaal.\"}", "{\"fr\":[\"Petit électroménager\",\"gros\"],\"en\":[\"Small Appliances\",\"wholesale\"],\"ar\":[\"الأجهزة الصغيرة\",\"بالجملة\"],\"wo\":[\"Petit électroménager\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-petit-electromenager-mixeurs-blenders', 'cat-root-electromenager-appareils-menagers-petit-electromenager', 3, 'mixeurs-blenders', 'Blender', '/categories/mixeurs-blenders.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Mixeurs & Blenders\",\"en\":\"Mixers & Blenders\",\"ar\":\"الخلاطات\",\"wo\":\"Mixeurs yi\"}", "{\"fr\":\"Mixeurs & Blenders — Achat en gros\",\"en\":\"Mixers & Blenders — Wholesale\",\"ar\":\"الخلاطات — بالجملة\",\"wo\":\"Mixeurs yi — Capp\"}", "{\"fr\":\"Découvrez Mixeurs & Blenders au Sénégal.\",\"en\":\"Discover Mixers & Blenders in Senegal.\",\"ar\":\"اكتشف الخلاطات في السنغال.\",\"wo\":\"Gis Mixeurs yi ci Senegaal.\"}", "{\"fr\":[\"Mixeurs & Blenders\",\"gros\"],\"en\":[\"Mixers & Blenders\",\"wholesale\"],\"ar\":[\"الخلاطات\",\"بالجملة\"],\"wo\":[\"Mixeurs yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"power\",\"capacity\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"power\",\"capacity\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-petit-electromenager-cafetieres-bouil', 'cat-root-electromenager-appareils-menagers-petit-electromenager', 3, 'cafetieres-bouilloires', 'Coffee', '/categories/cafetieres-bouilloires.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Cafetières & Bouilloires\",\"en\":\"Coffee Makers & Kettles\",\"ar\":\"آلات القهوة والغلايات\",\"wo\":\"Cafetières yi\"}", "{\"fr\":\"Cafetières & Bouilloires — Achat en gros\",\"en\":\"Coffee Makers & Kettles — Wholesale\",\"ar\":\"آلات القهوة والغلايات — بالجملة\",\"wo\":\"Cafetières yi — Capp\"}", "{\"fr\":\"Découvrez Cafetières & Bouilloires au Sénégal.\",\"en\":\"Discover Coffee Makers & Kettles in Senegal.\",\"ar\":\"اكتشف آلات القهوة والغلايات في السنغال.\",\"wo\":\"Gis Cafetières yi ci Senegaal.\"}", "{\"fr\":[\"Cafetières & Bouilloires\",\"gros\"],\"en\":[\"Coffee Makers & Kettles\",\"wholesale\"],\"ar\":[\"آلات القهوة والغلايات\",\"بالجملة\"],\"wo\":[\"Cafetières yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"power\",\"capacity\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"power\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-petit-electromenager-fers-a-repasser', 'cat-root-electromenager-appareils-menagers-petit-electromenager', 3, 'fers-a-repasser', 'Iron', '/categories/fers-a-repasser.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Fers à repasser\",\"en\":\"Irons\",\"ar\":\"مكاوي الملابس\",\"wo\":\"Fers yi\"}", "{\"fr\":\"Fers à repasser — Achat en gros\",\"en\":\"Irons — Wholesale\",\"ar\":\"مكاوي الملابس — بالجملة\",\"wo\":\"Fers yi — Capp\"}", "{\"fr\":\"Découvrez Fers à repasser au Sénégal.\",\"en\":\"Discover Irons in Senegal.\",\"ar\":\"اكتشف مكاوي الملابس في السنغال.\",\"wo\":\"Gis Fers yi ci Senegaal.\"}", "{\"fr\":[\"Fers à repasser\",\"gros\"],\"en\":[\"Irons\",\"wholesale\"],\"ar\":[\"مكاوي الملابس\",\"بالجملة\"],\"wo\":[\"Fers yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"power\",\"type\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"power\",\"type\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-electromenager-appareils-menagers-petit-electromenager-aspirateurs', 'cat-root-electromenager-appareils-menagers-petit-electromenager', 3, 'aspirateurs', 'Trash', '/categories/aspirateurs.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Aspirateurs\",\"en\":\"Vacuum Cleaners\",\"ar\":\"المكانس الكهربائية\",\"wo\":\"Aspirateurs yi\"}", "{\"fr\":\"Aspirateurs — Achat en gros\",\"en\":\"Vacuum Cleaners — Wholesale\",\"ar\":\"المكانس الكهربائية — بالجملة\",\"wo\":\"Aspirateurs yi — Capp\"}", "{\"fr\":\"Découvrez Aspirateurs au Sénégal.\",\"en\":\"Discover Vacuum Cleaners in Senegal.\",\"ar\":\"اكتشف المكانس الكهربائية في السنغال.\",\"wo\":\"Gis Aspirateurs yi ci Senegaal.\"}", "{\"fr\":[\"Aspirateurs\",\"gros\"],\"en\":[\"Vacuum Cleaners\",\"wholesale\"],\"ar\":[\"المكانس الكهربائية\",\"بالجملة\"],\"wo\":[\"Aspirateurs yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"power\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"power\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat', NULL, 1, 'maison-habitat', 'Home', '/categories/maison-habitat.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Maison & Habitat\",\"en\":\"Home & Habitat\",\"ar\":\"المنزل والسكن\",\"wo\":\"Kër ak Taax\"}", "{\"fr\":\"Maison & Habitat — Achat en gros\",\"en\":\"Home & Habitat — Wholesale\",\"ar\":\"المنزل والسكن — بالجملة\",\"wo\":\"Kër ak Taax — Capp\"}", "{\"fr\":\"Découvrez Maison & Habitat au Sénégal.\",\"en\":\"Discover Home & Habitat in Senegal.\",\"ar\":\"اكتشف المنزل والسكن في السنغال.\",\"wo\":\"Gis Kër ak Taax ci Senegaal.\"}", "{\"fr\":[\"Maison & Habitat\",\"gros\"],\"en\":[\"Home & Habitat\",\"wholesale\"],\"ar\":[\"المنزل والسكن\",\"بالجملة\"],\"wo\":[\"Kër ak Taax\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.09,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-domotique', 'cat-root-maison-habitat', 2, 'domotique', 'Zap', '/categories/domotique.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Domotique\",\"en\":\"Smart Home\",\"ar\":\"المنزل الذكي\",\"wo\":\"Domotik\"}", "{\"fr\":\"Domotique — Achat en gros\",\"en\":\"Smart Home — Wholesale\",\"ar\":\"المنزل الذكي — بالجملة\",\"wo\":\"Domotik — Capp\"}", "{\"fr\":\"Découvrez Domotique au Sénégal.\",\"en\":\"Discover Smart Home in Senegal.\",\"ar\":\"اكتشف المنزل الذكي في السنغال.\",\"wo\":\"Gis Domotik ci Senegaal.\"}", "{\"fr\":[\"Domotique\",\"gros\"],\"en\":[\"Smart Home\",\"wholesale\"],\"ar\":[\"المنزل الذكي\",\"بالجملة\"],\"wo\":[\"Domotik\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-domotique-serrures-intelligentes', 'cat-root-maison-habitat-domotique', 3, 'serrures-intelligentes', 'Lock', '/categories/serrures-intelligentes.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Serrures intelligentes\",\"en\":\"Smart Locks\",\"ar\":\"الأقفال الذكية\",\"wo\":\"Serrures yu xel\"}", "{\"fr\":\"Serrures intelligentes — Achat en gros\",\"en\":\"Smart Locks — Wholesale\",\"ar\":\"الأقفال الذكية — بالجملة\",\"wo\":\"Serrures yu xel — Capp\"}", "{\"fr\":\"Découvrez Serrures intelligentes au Sénégal.\",\"en\":\"Discover Smart Locks in Senegal.\",\"ar\":\"اكتشف الأقفال الذكية في السنغال.\",\"wo\":\"Gis Serrures yu xel ci Senegaal.\"}", "{\"fr\":[\"Serrures intelligentes\",\"gros\"],\"en\":[\"Smart Locks\",\"wholesale\"],\"ar\":[\"الأقفال الذكية\",\"بالجملة\"],\"wo\":[\"Serrures yu xel\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_2\",\"carton_of_10\"]", "[\"brand\",\"opening_type\",\"connectivity\",\"power_supply\",\"material\",\"color\"]", "[\"fingerprint_count\",\"app_compatible\",\"door_type\",\"warranty_months\"]", "[\"brand\",\"opening_type\",\"connectivity\",\"power_supply\",\"price\",\"color\"]",
  TRUE, TRUE, TRUE, 0.1,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-domotique-cameras-connectees', 'cat-root-maison-habitat-domotique', 3, 'cameras-connectees', 'Camera', '/categories/cameras-connectees.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Caméras connectées\",\"en\":\"Connected Cameras\",\"ar\":\"الكاميرات المتصلة\",\"wo\":\"Caméras yu xel\"}", "{\"fr\":\"Caméras connectées — Achat en gros\",\"en\":\"Connected Cameras — Wholesale\",\"ar\":\"الكاميرات المتصلة — بالجملة\",\"wo\":\"Caméras yu xel — Capp\"}", "{\"fr\":\"Découvrez Caméras connectées au Sénégal.\",\"en\":\"Discover Connected Cameras in Senegal.\",\"ar\":\"اكتشف الكاميرات المتصلة في السنغال.\",\"wo\":\"Gis Caméras yu xel ci Senegaal.\"}", "{\"fr\":[\"Caméras connectées\",\"gros\"],\"en\":[\"Connected Cameras\",\"wholesale\"],\"ar\":[\"الكاميرات المتصلة\",\"بالجملة\"],\"wo\":[\"Caméras yu xel\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_2\",\"carton_of_10\"]", "[\"brand\",\"resolution\",\"connectivity\",\"power_supply\",\"location_type\",\"color\"]", "[\"night_vision\",\"motion_detection\",\"storage\",\"solar\",\"warranty_months\"]", "[\"brand\",\"resolution\",\"connectivity\",\"power_supply\",\"location_type\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-domotique-alarmes-detecteurs', 'cat-root-maison-habitat-domotique', 3, 'alarmes-detecteurs', 'Bell', '/categories/alarmes-detecteurs.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Alarmes & Détecteurs\",\"en\":\"Alarms & Detectors\",\"ar\":\"أنظمة الإنذار والكشف\",\"wo\":\"Alarmes yi\"}", "{\"fr\":\"Alarmes & Détecteurs — Achat en gros\",\"en\":\"Alarms & Detectors — Wholesale\",\"ar\":\"أنظمة الإنذار والكشف — بالجملة\",\"wo\":\"Alarmes yi — Capp\"}", "{\"fr\":\"Découvrez Alarmes & Détecteurs au Sénégal.\",\"en\":\"Discover Alarms & Detectors in Senegal.\",\"ar\":\"اكتشف أنظمة الإنذار والكشف في السنغال.\",\"wo\":\"Gis Alarmes yi ci Senegaal.\"}", "{\"fr\":[\"Alarmes & Détecteurs\",\"gros\"],\"en\":[\"Alarms & Detectors\",\"wholesale\"],\"ar\":[\"أنظمة الإنذار والكشف\",\"بالجملة\"],\"wo\":[\"Alarmes yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"kit\",\"carton_of_10\"]", "[\"type\",\"brand\",\"connectivity\",\"power_supply\",\"color\"]", "[\"siren_volume\",\"zones\",\"app_compatible\",\"warranty_months\"]", "[\"type\",\"brand\",\"connectivity\",\"power_supply\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-domotique-capteurs-interrupteurs-intelligents', 'cat-root-maison-habitat-domotique', 3, 'capteurs-interrupteurs-intelligents', 'ToggleLeft', '/categories/capteurs-interrupteurs-intelligents.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Capteurs & Interrupteurs intelligents\",\"en\":\"Smart Sensors & Switches\",\"ar\":\"المستشعرات والمفاتيح الذكية\",\"wo\":\"Capteurs yi\"}", "{\"fr\":\"Capteurs & Interrupteurs intelligents — Achat en gros\",\"en\":\"Smart Sensors & Switches — Wholesale\",\"ar\":\"المستشعرات والمفاتيح الذكية — بالجملة\",\"wo\":\"Capteurs yi — Capp\"}", "{\"fr\":\"Découvrez Capteurs & Interrupteurs intelligents au Sénégal.\",\"en\":\"Discover Smart Sensors & Switches in Senegal.\",\"ar\":\"اكتشف المستشعرات والمفاتيح الذكية في السنغال.\",\"wo\":\"Gis Capteurs yi ci Senegaal.\"}", "{\"fr\":[\"Capteurs & Interrupteurs intelligents\",\"gros\"],\"en\":[\"Smart Sensors & Switches\",\"wholesale\"],\"ar\":[\"المستشعرات والمفاتيح الذكية\",\"بالجملة\"],\"wo\":[\"Capteurs yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_10\",\"carton_of_50\"]", "[\"type\",\"brand\",\"connectivity\",\"power_supply\",\"color\"]", "[\"app_compatible\",\"voice_control\",\"warranty_months\"]", "[\"type\",\"brand\",\"connectivity\",\"power_supply\",\"price\"]",
  TRUE, TRUE, TRUE, 0.1,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-meubles', 'cat-root-maison-habitat', 2, 'meubles', 'Sofa', '/categories/meubles.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Meubles\",\"en\":\"Furniture\",\"ar\":\"الأثاث\",\"wo\":\"Meubles yi\"}", "{\"fr\":\"Meubles — Achat en gros\",\"en\":\"Furniture — Wholesale\",\"ar\":\"الأثاث — بالجملة\",\"wo\":\"Meubles yi — Capp\"}", "{\"fr\":\"Découvrez Meubles au Sénégal.\",\"en\":\"Discover Furniture in Senegal.\",\"ar\":\"اكتشف الأثاث في السنغال.\",\"wo\":\"Gis Meubles yi ci Senegaal.\"}", "{\"fr\":[\"Meubles\",\"gros\"],\"en\":[\"Furniture\",\"wholesale\"],\"ar\":[\"الأثاث\",\"بالجملة\"],\"wo\":[\"Meubles yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-meubles-meubles-de-salon', 'cat-root-maison-habitat-meubles', 3, 'meubles-de-salon', 'Sofa', '/categories/meubles-de-salon.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Meubles de salon\",\"en\":\"Living Room Furniture\",\"ar\":\"أثاث غرفة المعيشة\",\"wo\":\"Meubles salon\"}", "{\"fr\":\"Meubles de salon — Achat en gros\",\"en\":\"Living Room Furniture — Wholesale\",\"ar\":\"أثاث غرفة المعيشة — بالجملة\",\"wo\":\"Meubles salon — Capp\"}", "{\"fr\":\"Découvrez Meubles de salon au Sénégal.\",\"en\":\"Discover Living Room Furniture in Senegal.\",\"ar\":\"اكتشف أثاث غرفة المعيشة في السنغال.\",\"wo\":\"Gis Meubles salon ci Senegaal.\"}", "{\"fr\":[\"Meubles de salon\",\"gros\"],\"en\":[\"Living Room Furniture\",\"wholesale\"],\"ar\":[\"أثاث غرفة المعيشة\",\"بالجملة\"],\"wo\":[\"Meubles salon\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"dimensions\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-meubles-meubles-de-chambre', 'cat-root-maison-habitat-meubles', 3, 'meubles-de-chambre', 'Bed', '/categories/meubles-de-chambre.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Meubles de chambre\",\"en\":\"Bedroom Furniture\",\"ar\":\"أثاث غرفة النوم\",\"wo\":\"Meubles chamber\"}", "{\"fr\":\"Meubles de chambre — Achat en gros\",\"en\":\"Bedroom Furniture — Wholesale\",\"ar\":\"أثاث غرفة النوم — بالجملة\",\"wo\":\"Meubles chamber — Capp\"}", "{\"fr\":\"Découvrez Meubles de chambre au Sénégal.\",\"en\":\"Discover Bedroom Furniture in Senegal.\",\"ar\":\"اكتشف أثاث غرفة النوم في السنغال.\",\"wo\":\"Gis Meubles chamber ci Senegaal.\"}", "{\"fr\":[\"Meubles de chambre\",\"gros\"],\"en\":[\"Bedroom Furniture\",\"wholesale\"],\"ar\":[\"أثاث غرفة النوم\",\"بالجملة\"],\"wo\":[\"Meubles chamber\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"dimensions\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-meubles-meubles-de-bureau', 'cat-root-maison-habitat-meubles', 3, 'meubles-de-bureau', 'Briefcase', '/categories/meubles-de-bureau.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Meubles de bureau\",\"en\":\"Office Furniture\",\"ar\":\"أثاث المكتب\",\"wo\":\"Meubles bureau\"}", "{\"fr\":\"Meubles de bureau — Achat en gros\",\"en\":\"Office Furniture — Wholesale\",\"ar\":\"أثاث المكتب — بالجملة\",\"wo\":\"Meubles bureau — Capp\"}", "{\"fr\":\"Découvrez Meubles de bureau au Sénégal.\",\"en\":\"Discover Office Furniture in Senegal.\",\"ar\":\"اكتشف أثاث المكتب في السنغال.\",\"wo\":\"Gis Meubles bureau ci Senegaal.\"}", "{\"fr\":[\"Meubles de bureau\",\"gros\"],\"en\":[\"Office Furniture\",\"wholesale\"],\"ar\":[\"أثاث المكتب\",\"بالجملة\"],\"wo\":[\"Meubles bureau\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"dimensions\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-meubles-rangements-etageres', 'cat-root-maison-habitat-meubles', 3, 'rangements-etageres', 'Layers', '/categories/rangements-etageres.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Rangements & Étagères\",\"en\":\"Storage & Shelving\",\"ar\":\"التخزين والأرفف\",\"wo\":\"Rangements yi\"}", "{\"fr\":\"Rangements & Étagères — Achat en gros\",\"en\":\"Storage & Shelving — Wholesale\",\"ar\":\"التخزين والأرفف — بالجملة\",\"wo\":\"Rangements yi — Capp\"}", "{\"fr\":\"Découvrez Rangements & Étagères au Sénégal.\",\"en\":\"Discover Storage & Shelving in Senegal.\",\"ar\":\"اكتشف التخزين والأرفف في السنغال.\",\"wo\":\"Gis Rangements yi ci Senegaal.\"}", "{\"fr\":[\"Rangements & Étagères\",\"gros\"],\"en\":[\"Storage & Shelving\",\"wholesale\"],\"ar\":[\"التخزين والأرفف\",\"بالجملة\"],\"wo\":[\"Rangements yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"dimensions\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-decoration-linge-de-maison', 'cat-root-maison-habitat', 2, 'decoration-linge-de-maison', 'Lamp', '/categories/decoration-linge-de-maison.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Décoration & Linge de maison\",\"en\":\"Home Decor & Linens\",\"ar\":\"الديكور والمفروشات\",\"wo\":\"Décoration ak Linge\"}", "{\"fr\":\"Décoration & Linge de maison — Achat en gros\",\"en\":\"Home Decor & Linens — Wholesale\",\"ar\":\"الديكور والمفروشات — بالجملة\",\"wo\":\"Décoration ak Linge — Capp\"}", "{\"fr\":\"Découvrez Décoration & Linge de maison au Sénégal.\",\"en\":\"Discover Home Decor & Linens in Senegal.\",\"ar\":\"اكتشف الديكور والمفروشات في السنغال.\",\"wo\":\"Gis Décoration ak Linge ci Senegaal.\"}", "{\"fr\":[\"Décoration & Linge de maison\",\"gros\"],\"en\":[\"Home Decor & Linens\",\"wholesale\"],\"ar\":[\"الديكور والمفروشات\",\"بالجملة\"],\"wo\":[\"Décoration ak Linge\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-decoration-linge-de-maison-linge-de-lit', 'cat-root-maison-habitat-decoration-linge-de-maison', 3, 'linge-de-lit', 'Bed', '/categories/linge-de-lit.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Linge de lit\",\"en\":\"Bedding\",\"ar\":\"مفروشات السرير\",\"wo\":\"Linge de lit\"}", "{\"fr\":\"Linge de lit — Achat en gros\",\"en\":\"Bedding — Wholesale\",\"ar\":\"مفروشات السرير — بالجملة\",\"wo\":\"Linge de lit — Capp\"}", "{\"fr\":\"Découvrez Linge de lit au Sénégal.\",\"en\":\"Discover Bedding in Senegal.\",\"ar\":\"اكتشف مفروشات السرير في السنغال.\",\"wo\":\"Gis Linge de lit ci Senegaal.\"}", "{\"fr\":[\"Linge de lit\",\"gros\"],\"en\":[\"Bedding\",\"wholesale\"],\"ar\":[\"مفروشات السرير\",\"بالجملة\"],\"wo\":[\"Linge de lit\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"size\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"size\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-decoration-linge-de-maison-rideaux-stores', 'cat-root-maison-habitat-decoration-linge-de-maison', 3, 'rideaux-stores', 'Columns', '/categories/rideaux-stores.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Rideaux & Stores\",\"en\":\"Curtains & Blinds\",\"ar\":\"الستائر والستائر الدوارة\",\"wo\":\"Rideaux yi\"}", "{\"fr\":\"Rideaux & Stores — Achat en gros\",\"en\":\"Curtains & Blinds — Wholesale\",\"ar\":\"الستائر والستائر الدوارة — بالجملة\",\"wo\":\"Rideaux yi — Capp\"}", "{\"fr\":\"Découvrez Rideaux & Stores au Sénégal.\",\"en\":\"Discover Curtains & Blinds in Senegal.\",\"ar\":\"اكتشف الستائر والستائر الدوارة في السنغال.\",\"wo\":\"Gis Rideaux yi ci Senegaal.\"}", "{\"fr\":[\"Rideaux & Stores\",\"gros\"],\"en\":[\"Curtains & Blinds\",\"wholesale\"],\"ar\":[\"الستائر والستائر الدوارة\",\"بالجملة\"],\"wo\":[\"Rideaux yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"dimensions\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-decoration-linge-de-maison-luminaires', 'cat-root-maison-habitat-decoration-linge-de-maison', 3, 'luminaires', 'Lightbulb', '/categories/luminaires.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Luminaires\",\"en\":\"Lighting Fixtures\",\"ar\":\"الإضاءة الداخلية\",\"wo\":\"Luminaires yi\"}", "{\"fr\":\"Luminaires — Achat en gros\",\"en\":\"Lighting Fixtures — Wholesale\",\"ar\":\"الإضاءة الداخلية — بالجملة\",\"wo\":\"Luminaires yi — Capp\"}", "{\"fr\":\"Découvrez Luminaires au Sénégal.\",\"en\":\"Discover Lighting Fixtures in Senegal.\",\"ar\":\"اكتشف الإضاءة الداخلية في السنغال.\",\"wo\":\"Gis Luminaires yi ci Senegaal.\"}", "{\"fr\":[\"Luminaires\",\"gros\"],\"en\":[\"Lighting Fixtures\",\"wholesale\"],\"ar\":[\"الإضاءة الداخلية\",\"بالجملة\"],\"wo\":[\"Luminaires yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"power\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-decoration-linge-de-maison-tapis-paillassons', 'cat-root-maison-habitat-decoration-linge-de-maison', 3, 'tapis-paillassons', 'Square', '/categories/tapis-paillassons.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Tapis & Paillassons\",\"en\":\"Carpets & Doormats\",\"ar\":\"السجاد والدواسات\",\"wo\":\"Tapis yi\"}", "{\"fr\":\"Tapis & Paillassons — Achat en gros\",\"en\":\"Carpets & Doormats — Wholesale\",\"ar\":\"السجاد والدواسات — بالجملة\",\"wo\":\"Tapis yi — Capp\"}", "{\"fr\":\"Découvrez Tapis & Paillassons au Sénégal.\",\"en\":\"Discover Carpets & Doormats in Senegal.\",\"ar\":\"اكتشف السجاد والدواسات في السنغال.\",\"wo\":\"Gis Tapis yi ci Senegaal.\"}", "{\"fr\":[\"Tapis & Paillassons\",\"gros\"],\"en\":[\"Carpets & Doormats\",\"wholesale\"],\"ar\":[\"السجاد والدواسات\",\"بالجملة\"],\"wo\":[\"Tapis yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"dimensions\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-cuisine-arts-menagers', 'cat-root-maison-habitat', 2, 'cuisine-arts-menagers', 'Utensils', '/categories/cuisine-arts-menagers.jpg', 4, TRUE, FALSE,
  "{\"fr\":\"Cuisine & Arts ménagers\",\"en\":\"Kitchen & Household\",\"ar\":\"المطبخ والمنزل\",\"wo\":\"Cuisine ak Arts ménagers\"}", "{\"fr\":\"Cuisine & Arts ménagers — Achat en gros\",\"en\":\"Kitchen & Household — Wholesale\",\"ar\":\"المطبخ والمنزل — بالجملة\",\"wo\":\"Cuisine ak Arts ménagers — Capp\"}", "{\"fr\":\"Découvrez Cuisine & Arts ménagers au Sénégal.\",\"en\":\"Discover Kitchen & Household in Senegal.\",\"ar\":\"اكتشف المطبخ والمنزل في السنغال.\",\"wo\":\"Gis Cuisine ak Arts ménagers ci Senegaal.\"}", "{\"fr\":[\"Cuisine & Arts ménagers\",\"gros\"],\"en\":[\"Kitchen & Household\",\"wholesale\"],\"ar\":[\"المطبخ والمنزل\",\"بالجملة\"],\"wo\":[\"Cuisine ak Arts ménagers\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-cuisine-arts-menagers-ustensiles-de-cuisine', 'cat-root-maison-habitat-cuisine-arts-menagers', 3, 'ustensiles-de-cuisine', 'Utensils', '/categories/ustensiles-de-cuisine.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Ustensiles de cuisine\",\"en\":\"Kitchen Utensils\",\"ar\":\"أدوات المطبخ\",\"wo\":\"Ustensiles cuisine\"}", "{\"fr\":\"Ustensiles de cuisine — Achat en gros\",\"en\":\"Kitchen Utensils — Wholesale\",\"ar\":\"أدوات المطبخ — بالجملة\",\"wo\":\"Ustensiles cuisine — Capp\"}", "{\"fr\":\"Découvrez Ustensiles de cuisine au Sénégal.\",\"en\":\"Discover Kitchen Utensils in Senegal.\",\"ar\":\"اكتشف أدوات المطبخ في السنغال.\",\"wo\":\"Gis Ustensiles cuisine ci Senegaal.\"}", "{\"fr\":[\"Ustensiles de cuisine\",\"gros\"],\"en\":[\"Kitchen Utensils\",\"wholesale\"],\"ar\":[\"أدوات المطبخ\",\"بالجملة\"],\"wo\":[\"Ustensiles cuisine\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-cuisine-arts-menagers-vaisselle', 'cat-root-maison-habitat-cuisine-arts-menagers', 3, 'vaisselle', 'CupSoda', '/categories/vaisselle.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Vaisselle\",\"en\":\"Tableware\",\"ar\":\"الأواني\",\"wo\":\"Vaisselle\"}", "{\"fr\":\"Vaisselle — Achat en gros\",\"en\":\"Tableware — Wholesale\",\"ar\":\"الأواني — بالجملة\",\"wo\":\"Vaisselle — Capp\"}", "{\"fr\":\"Découvrez Vaisselle au Sénégal.\",\"en\":\"Discover Tableware in Senegal.\",\"ar\":\"اكتشف الأواني في السنغال.\",\"wo\":\"Gis Vaisselle ci Senegaal.\"}", "{\"fr\":[\"Vaisselle\",\"gros\"],\"en\":[\"Tableware\",\"wholesale\"],\"ar\":[\"الأواني\",\"بالجملة\"],\"wo\":[\"Vaisselle\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-cuisine-arts-menagers-conservation-stockage', 'cat-root-maison-habitat-cuisine-arts-menagers', 3, 'conservation-stockage', 'Container', '/categories/conservation-stockage.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Conservation & Stockage\",\"en\":\"Food Storage\",\"ar\":\"التخزين والحفظ\",\"wo\":\"Conservation\"}", "{\"fr\":\"Conservation & Stockage — Achat en gros\",\"en\":\"Food Storage — Wholesale\",\"ar\":\"التخزين والحفظ — بالجملة\",\"wo\":\"Conservation — Capp\"}", "{\"fr\":\"Découvrez Conservation & Stockage au Sénégal.\",\"en\":\"Discover Food Storage in Senegal.\",\"ar\":\"اكتشف التخزين والحفظ في السنغال.\",\"wo\":\"Gis Conservation ci Senegaal.\"}", "{\"fr\":[\"Conservation & Stockage\",\"gros\"],\"en\":[\"Food Storage\",\"wholesale\"],\"ar\":[\"التخزين والحفظ\",\"بالجملة\"],\"wo\":[\"Conservation\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"capacity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"capacity\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-jardin-exterieur', 'cat-root-maison-habitat', 2, 'jardin-exterieur', 'Flower', '/categories/jardin-exterieur.jpg', 5, TRUE, FALSE,
  "{\"fr\":\"Jardin & Extérieur\",\"en\":\"Garden & Outdoor\",\"ar\":\"الحديقة والخارج\",\"wo\":\"Jardin ak Extérieur\"}", "{\"fr\":\"Jardin & Extérieur — Achat en gros\",\"en\":\"Garden & Outdoor — Wholesale\",\"ar\":\"الحديقة والخارج — بالجملة\",\"wo\":\"Jardin ak Extérieur — Capp\"}", "{\"fr\":\"Découvrez Jardin & Extérieur au Sénégal.\",\"en\":\"Discover Garden & Outdoor in Senegal.\",\"ar\":\"اكتشف الحديقة والخارج في السنغال.\",\"wo\":\"Gis Jardin ak Extérieur ci Senegaal.\"}", "{\"fr\":[\"Jardin & Extérieur\",\"gros\"],\"en\":[\"Garden & Outdoor\",\"wholesale\"],\"ar\":[\"الحديقة والخارج\",\"بالجملة\"],\"wo\":[\"Jardin ak Extérieur\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-jardin-exterieur-mobilier-de-jardin', 'cat-root-maison-habitat-jardin-exterieur', 3, 'mobilier-de-jardin', 'Chair', '/categories/mobilier-de-jardin.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Mobilier de jardin\",\"en\":\"Outdoor Furniture\",\"ar\":\"أثاث الحديقة\",\"wo\":\"Mobilier jardin\"}", "{\"fr\":\"Mobilier de jardin — Achat en gros\",\"en\":\"Outdoor Furniture — Wholesale\",\"ar\":\"أثاث الحديقة — بالجملة\",\"wo\":\"Mobilier jardin — Capp\"}", "{\"fr\":\"Découvrez Mobilier de jardin au Sénégal.\",\"en\":\"Discover Outdoor Furniture in Senegal.\",\"ar\":\"اكتشف أثاث الحديقة في السنغال.\",\"wo\":\"Gis Mobilier jardin ci Senegaal.\"}", "{\"fr\":[\"Mobilier de jardin\",\"gros\"],\"en\":[\"Outdoor Furniture\",\"wholesale\"],\"ar\":[\"أثاث الحديقة\",\"بالجملة\"],\"wo\":[\"Mobilier jardin\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-jardin-exterieur-outils-de-jardinage', 'cat-root-maison-habitat-jardin-exterieur', 3, 'outils-de-jardinage', 'Shovel', '/categories/outils-de-jardinage.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Outils de jardinage\",\"en\":\"Gardening Tools\",\"ar\":\"أدوات الحدائق\",\"wo\":\"Outils jardin\"}", "{\"fr\":\"Outils de jardinage — Achat en gros\",\"en\":\"Gardening Tools — Wholesale\",\"ar\":\"أدوات الحدائق — بالجملة\",\"wo\":\"Outils jardin — Capp\"}", "{\"fr\":\"Découvrez Outils de jardinage au Sénégal.\",\"en\":\"Discover Gardening Tools in Senegal.\",\"ar\":\"اكتشف أدوات الحدائق في السنغال.\",\"wo\":\"Gis Outils jardin ci Senegaal.\"}", "{\"fr\":[\"Outils de jardinage\",\"gros\"],\"en\":[\"Gardening Tools\",\"wholesale\"],\"ar\":[\"أدوات الحدائق\",\"بالجملة\"],\"wo\":[\"Outils jardin\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-maison-habitat-jardin-exterieur-piscines-accessoires', 'cat-root-maison-habitat-jardin-exterieur', 3, 'piscines-accessoires', 'Waves', '/categories/piscines-accessoires.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Piscines & Accessoires\",\"en\":\"Swimming Pools & Accessories\",\"ar\":\"المسابح وملحقاتها\",\"wo\":\"Piscines yi\"}", "{\"fr\":\"Piscines & Accessoires — Achat en gros\",\"en\":\"Swimming Pools & Accessories — Wholesale\",\"ar\":\"المسابح وملحقاتها — بالجملة\",\"wo\":\"Piscines yi — Capp\"}", "{\"fr\":\"Découvrez Piscines & Accessoires au Sénégal.\",\"en\":\"Discover Swimming Pools & Accessories in Senegal.\",\"ar\":\"اكتشف المسابح وملحقاتها في السنغال.\",\"wo\":\"Gis Piscines yi ci Senegaal.\"}", "{\"fr\":[\"Piscines & Accessoires\",\"gros\"],\"en\":[\"Swimming Pools & Accessories\",\"wholesale\"],\"ar\":[\"المسابح وملحقاتها\",\"بالجملة\"],\"wo\":[\"Piscines yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"dimensions\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"dimensions\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite', NULL, 1, 'energie-eclairage-electricite', 'Zap', '/categories/energie-eclairage-electricite.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Énergie, Éclairage & Électricité\",\"en\":\"Energy, Lighting & Electricity\",\"ar\":\"الطاقة والإضاءة والكهرباء\",\"wo\":\"Energie, Eclairage ak Elektrisite\"}", "{\"fr\":\"Énergie, Éclairage & Électricité — Achat en gros\",\"en\":\"Energy, Lighting & Electricity — Wholesale\",\"ar\":\"الطاقة والإضاءة والكهرباء — بالجملة\",\"wo\":\"Energie, Eclairage ak Elektrisite — Capp\"}", "{\"fr\":\"Découvrez Énergie, Éclairage & Électricité au Sénégal.\",\"en\":\"Discover Energy, Lighting & Electricity in Senegal.\",\"ar\":\"اكتشف الطاقة والإضاءة والكهرباء في السنغال.\",\"wo\":\"Gis Energie, Eclairage ak Elektrisite ci Senegaal.\"}", "{\"fr\":[\"Énergie, Éclairage & Électricité\",\"gros\"],\"en\":[\"Energy, Lighting & Electricity\",\"wholesale\"],\"ar\":[\"الطاقة والإضاءة والكهرباء\",\"بالجملة\"],\"wo\":[\"Energie, Eclairage ak Elektrisite\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-energie-renouvelable', 'cat-root-energie-eclairage-electricite', 2, 'energie-renouvelable', 'Sun', '/categories/energie-renouvelable.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Énergie renouvelable\",\"en\":\"Renewable Energy\",\"ar\":\"الطاقة المتجددة\",\"wo\":\"Energie bu bees\"}", "{\"fr\":\"Énergie renouvelable — Achat en gros\",\"en\":\"Renewable Energy — Wholesale\",\"ar\":\"الطاقة المتجددة — بالجملة\",\"wo\":\"Energie bu bees — Capp\"}", "{\"fr\":\"Découvrez Énergie renouvelable au Sénégal.\",\"en\":\"Discover Renewable Energy in Senegal.\",\"ar\":\"اكتشف الطاقة المتجددة في السنغال.\",\"wo\":\"Gis Energie bu bees ci Senegaal.\"}", "{\"fr\":[\"Énergie renouvelable\",\"gros\"],\"en\":[\"Renewable Energy\",\"wholesale\"],\"ar\":[\"الطاقة المتجددة\",\"بالجملة\"],\"wo\":[\"Energie bu bees\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-energie-renouvelable-panneaux-solaires', 'cat-root-energie-eclairage-electricite-energie-renouvelable', 3, 'panneaux-solaires', 'Sun', '/categories/panneaux-solaires.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Panneaux solaires\",\"en\":\"Solar Panels\",\"ar\":\"الألواح الشمسية\",\"wo\":\"Panneaux solaires yi\"}", "{\"fr\":\"Panneaux solaires — Achat en gros\",\"en\":\"Solar Panels — Wholesale\",\"ar\":\"الألواح الشمسية — بالجملة\",\"wo\":\"Panneaux solaires yi — Capp\"}", "{\"fr\":\"Découvrez Panneaux solaires au Sénégal.\",\"en\":\"Discover Solar Panels in Senegal.\",\"ar\":\"اكتشف الألواح الشمسية في السنغال.\",\"wo\":\"Gis Panneaux solaires yi ci Senegaal.\"}", "{\"fr\":[\"Panneaux solaires\",\"gros\"],\"en\":[\"Solar Panels\",\"wholesale\"],\"ar\":[\"الألواح الشمسية\",\"بالجملة\"],\"wo\":[\"Panneaux solaires yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_5\",\"palette\"]", "[\"brand\",\"power_w\",\"technology\",\"voltage\",\"dimensions\",\"condition\"]", "[\"efficiency\",\"warranty_years\",\"origin\",\"certification\"]", "[\"brand\",\"power_w\",\"technology\",\"voltage\",\"price\"]",
  TRUE, FALSE, TRUE, 0.06,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-energie-renouvelable-batteries-stockage', 'cat-root-energie-eclairage-electricite-energie-renouvelable', 3, 'batteries-stockage', 'Battery', '/categories/batteries-stockage.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Batteries & Stockage\",\"en\":\"Batteries & Storage\",\"ar\":\"البطاريات والتخزين\",\"wo\":\"Batteries yi\"}", "{\"fr\":\"Batteries & Stockage — Achat en gros\",\"en\":\"Batteries & Storage — Wholesale\",\"ar\":\"البطاريات والتخزين — بالجملة\",\"wo\":\"Batteries yi — Capp\"}", "{\"fr\":\"Découvrez Batteries & Stockage au Sénégal.\",\"en\":\"Discover Batteries & Storage in Senegal.\",\"ar\":\"اكتشف البطاريات والتخزين في السنغال.\",\"wo\":\"Gis Batteries yi ci Senegaal.\"}", "{\"fr\":[\"Batteries & Stockage\",\"gros\"],\"en\":[\"Batteries & Storage\",\"wholesale\"],\"ar\":[\"البطاريات والتخزين\",\"بالجملة\"],\"wo\":[\"Batteries yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"capacity_ah\",\"voltage\",\"condition\"]", "[\"cycles\",\"warranty_years\",\"weight\",\"origin\"]", "[\"brand\",\"type\",\"capacity_ah\",\"voltage\",\"price\"]",
  TRUE, FALSE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-energie-renouvelable-kits-solaires', 'cat-root-energie-eclairage-electricite-energie-renouvelable', 3, 'kits-solaires', 'Sun', '/categories/kits-solaires.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Kits solaires\",\"en\":\"Solar Kits\",\"ar\":\"مجموعات الطاقة الشمسية\",\"wo\":\"Kits solaires yi\"}", "{\"fr\":\"Kits solaires — Achat en gros\",\"en\":\"Solar Kits — Wholesale\",\"ar\":\"مجموعات الطاقة الشمسية — بالجملة\",\"wo\":\"Kits solaires yi — Capp\"}", "{\"fr\":\"Découvrez Kits solaires au Sénégal.\",\"en\":\"Discover Solar Kits in Senegal.\",\"ar\":\"اكتشف مجموعات الطاقة الشمسية في السنغال.\",\"wo\":\"Gis Kits solaires yi ci Senegaal.\"}", "{\"fr\":[\"Kits solaires\",\"gros\"],\"en\":[\"Solar Kits\",\"wholesale\"],\"ar\":[\"مجموعات الطاقة الشمسية\",\"بالجملة\"],\"wo\":[\"Kits solaires yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"palette\"]", "[\"brand\",\"power_w\",\"voltage\",\"battery_capacity\",\"components\"]", "[\"autonomy\",\"warranty_years\",\"origin\"]", "[\"brand\",\"power_w\",\"voltage\",\"battery_capacity\",\"price\"]",
  TRUE, FALSE, TRUE, 0.06,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-eclairage', 'cat-root-energie-eclairage-electricite', 2, 'eclairage', 'Lightbulb', '/categories/eclairage.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Éclairage\",\"en\":\"Lighting\",\"ar\":\"الإضاءة\",\"wo\":\"Eclaire\"}", "{\"fr\":\"Éclairage — Achat en gros\",\"en\":\"Lighting — Wholesale\",\"ar\":\"الإضاءة — بالجملة\",\"wo\":\"Eclaire — Capp\"}", "{\"fr\":\"Découvrez Éclairage au Sénégal.\",\"en\":\"Discover Lighting in Senegal.\",\"ar\":\"اكتشف الإضاءة في السنغال.\",\"wo\":\"Gis Eclaire ci Senegaal.\"}", "{\"fr\":[\"Éclairage\",\"gros\"],\"en\":[\"Lighting\",\"wholesale\"],\"ar\":[\"الإضاءة\",\"بالجملة\"],\"wo\":[\"Eclaire\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-eclairage-ampoules-led', 'cat-root-energie-eclairage-electricite-eclairage', 3, 'ampoules-led', 'Lightbulb', '/categories/ampoules-led.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Ampoules LED\",\"en\":\"LED Bulbs\",\"ar\":\"مصابيح LED\",\"wo\":\"Ampoules LED yi\"}", "{\"fr\":\"Ampoules LED — Achat en gros\",\"en\":\"LED Bulbs — Wholesale\",\"ar\":\"مصابيح LED — بالجملة\",\"wo\":\"Ampoules LED yi — Capp\"}", "{\"fr\":\"Découvrez Ampoules LED au Sénégal.\",\"en\":\"Discover LED Bulbs in Senegal.\",\"ar\":\"اكتشف مصابيح LED في السنغال.\",\"wo\":\"Gis Ampoules LED yi ci Senegaal.\"}", "{\"fr\":[\"Ampoules LED\",\"gros\"],\"en\":[\"LED Bulbs\",\"wholesale\"],\"ar\":[\"مصابيح LED\",\"بالجملة\"],\"wo\":[\"Ampoules LED yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot_of_10\",\"carton_of_100\"]", "[\"brand\",\"type\",\"power_w\",\"socket\",\"color_temperature\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"power_w\",\"socket\",\"color_temperature\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-eclairage-lampes-luminaires', 'cat-root-energie-eclairage-electricite-eclairage', 3, 'lampes-luminaires', 'Lamp', '/categories/lampes-luminaires.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Lampes & Luminaires\",\"en\":\"Lamps & Fixtures\",\"ar\":\"المصابيح والأجهزة\",\"wo\":\"Lampes yi\"}", "{\"fr\":\"Lampes & Luminaires — Achat en gros\",\"en\":\"Lamps & Fixtures — Wholesale\",\"ar\":\"المصابيح والأجهزة — بالجملة\",\"wo\":\"Lampes yi — Capp\"}", "{\"fr\":\"Découvrez Lampes & Luminaires au Sénégal.\",\"en\":\"Discover Lamps & Fixtures in Senegal.\",\"ar\":\"اكتشف المصابيح والأجهزة في السنغال.\",\"wo\":\"Gis Lampes yi ci Senegaal.\"}", "{\"fr\":[\"Lampes & Luminaires\",\"gros\"],\"en\":[\"Lamps & Fixtures\",\"wholesale\"],\"ar\":[\"المصابيح والأجهزة\",\"بالجملة\"],\"wo\":[\"Lampes yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-eclairage-eclairage-exterieur', 'cat-root-energie-eclairage-electricite-eclairage', 3, 'eclairage-exterieur', 'Sun', '/categories/eclairage-exterieur.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Éclairage extérieur\",\"en\":\"Outdoor Lighting\",\"ar\":\"إضاءة خارجية\",\"wo\":\"Éclairage extérieur\"}", "{\"fr\":\"Éclairage extérieur — Achat en gros\",\"en\":\"Outdoor Lighting — Wholesale\",\"ar\":\"إضاءة خارجية — بالجملة\",\"wo\":\"Éclairage extérieur — Capp\"}", "{\"fr\":\"Découvrez Éclairage extérieur au Sénégal.\",\"en\":\"Discover Outdoor Lighting in Senegal.\",\"ar\":\"اكتشف إضاءة خارجية في السنغال.\",\"wo\":\"Gis Éclairage extérieur ci Senegaal.\"}", "{\"fr\":[\"Éclairage extérieur\",\"gros\"],\"en\":[\"Outdoor Lighting\",\"wholesale\"],\"ar\":[\"إضاءة خارجية\",\"بالجملة\"],\"wo\":[\"Éclairage extérieur\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"power_w\",\"power_supply\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"power_w\",\"power_supply\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-groupes-electrogenes', 'cat-root-energie-eclairage-electricite', 2, 'groupes-electrogenes', 'BatteryCharging', '/categories/groupes-electrogenes.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Groupes électrogènes\",\"en\":\"Generators\",\"ar\":\"المولدات الكهربائية\",\"wo\":\"Groupes électrogènes yi\"}", "{\"fr\":\"Groupes électrogènes — Achat en gros\",\"en\":\"Generators — Wholesale\",\"ar\":\"المولدات الكهربائية — بالجملة\",\"wo\":\"Groupes électrogènes yi — Capp\"}", "{\"fr\":\"Découvrez Groupes électrogènes au Sénégal.\",\"en\":\"Discover Generators in Senegal.\",\"ar\":\"اكتشف المولدات الكهربائية في السنغال.\",\"wo\":\"Gis Groupes électrogènes yi ci Senegaal.\"}", "{\"fr\":[\"Groupes électrogènes\",\"gros\"],\"en\":[\"Generators\",\"wholesale\"],\"ar\":[\"المولدات الكهربائية\",\"بالجملة\"],\"wo\":[\"Groupes électrogènes yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-groupes-electrogenes-groupes-essence', 'cat-root-energie-eclairage-electricite-groupes-electrogenes', 3, 'groupes-essence', 'Fuel', '/categories/groupes-essence.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Groupes essence\",\"en\":\"Gasoline Generators\",\"ar\":\"مولدات البنزين\",\"wo\":\"Groupes essence\"}", "{\"fr\":\"Groupes essence — Achat en gros\",\"en\":\"Gasoline Generators — Wholesale\",\"ar\":\"مولدات البنزين — بالجملة\",\"wo\":\"Groupes essence — Capp\"}", "{\"fr\":\"Découvrez Groupes essence au Sénégal.\",\"en\":\"Discover Gasoline Generators in Senegal.\",\"ar\":\"اكتشف مولدات البنزين في السنغال.\",\"wo\":\"Gis Groupes essence ci Senegaal.\"}", "{\"fr\":[\"Groupes essence\",\"gros\"],\"en\":[\"Gasoline Generators\",\"wholesale\"],\"ar\":[\"مولدات البنزين\",\"بالجملة\"],\"wo\":[\"Groupes essence\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"palette\"]", "[\"brand\",\"power_va\",\"fuel\",\"noise_level\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"power_va\",\"fuel\",\"noise_level\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-groupes-electrogenes-groupes-diesel', 'cat-root-energie-eclairage-electricite-groupes-electrogenes', 3, 'groupes-diesel', 'Fuel', '/categories/groupes-diesel.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Groupes diesel\",\"en\":\"Diesel Generators\",\"ar\":\"مولدات الديزل\",\"wo\":\"Groupes diesel\"}", "{\"fr\":\"Groupes diesel — Achat en gros\",\"en\":\"Diesel Generators — Wholesale\",\"ar\":\"مولدات الديزل — بالجملة\",\"wo\":\"Groupes diesel — Capp\"}", "{\"fr\":\"Découvrez Groupes diesel au Sénégal.\",\"en\":\"Discover Diesel Generators in Senegal.\",\"ar\":\"اكتشف مولدات الديزل في السنغال.\",\"wo\":\"Gis Groupes diesel ci Senegaal.\"}", "{\"fr\":[\"Groupes diesel\",\"gros\"],\"en\":[\"Diesel Generators\",\"wholesale\"],\"ar\":[\"مولدات الديزل\",\"بالجملة\"],\"wo\":[\"Groupes diesel\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"palette\"]", "[\"brand\",\"power_va\",\"fuel\",\"noise_level\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"power_va\",\"fuel\",\"noise_level\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-electricite-generale', 'cat-root-energie-eclairage-electricite', 2, 'electricite-generale', 'Plug', '/categories/electricite-generale.jpg', 4, TRUE, FALSE,
  "{\"fr\":\"Électricité générale\",\"en\":\"General Electrical\",\"ar\":\"الكهرباء العامة\",\"wo\":\"Électricité générale\"}", "{\"fr\":\"Électricité générale — Achat en gros\",\"en\":\"General Electrical — Wholesale\",\"ar\":\"الكهرباء العامة — بالجملة\",\"wo\":\"Électricité générale — Capp\"}", "{\"fr\":\"Découvrez Électricité générale au Sénégal.\",\"en\":\"Discover General Electrical in Senegal.\",\"ar\":\"اكتشف الكهرباء العامة في السنغال.\",\"wo\":\"Gis Électricité générale ci Senegaal.\"}", "{\"fr\":[\"Électricité générale\",\"gros\"],\"en\":[\"General Electrical\",\"wholesale\"],\"ar\":[\"الكهرباء العامة\",\"بالجملة\"],\"wo\":[\"Électricité générale\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-electricite-generale-cables-fils', 'cat-root-energie-eclairage-electricite-electricite-generale', 3, 'cables-fils', 'Cable', '/categories/cables-fils.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Câbles & Fils\",\"en\":\"Cables & Wires\",\"ar\":\"الكابلات والأسلاك\",\"wo\":\"Câbles yi\"}", "{\"fr\":\"Câbles & Fils — Achat en gros\",\"en\":\"Cables & Wires — Wholesale\",\"ar\":\"الكابلات والأسلاك — بالجملة\",\"wo\":\"Câbles yi — Capp\"}", "{\"fr\":\"Découvrez Câbles & Fils au Sénégal.\",\"en\":\"Discover Cables & Wires in Senegal.\",\"ar\":\"اكتشف الكابلات والأسلاك في السنغال.\",\"wo\":\"Gis Câbles yi ci Senegaal.\"}", "{\"fr\":[\"Câbles & Fils\",\"gros\"],\"en\":[\"Cables & Wires\",\"wholesale\"],\"ar\":[\"الكابلات والأسلاك\",\"بالجملة\"],\"wo\":[\"Câbles yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"meter\",\"reel\",\"carton\"]", "[\"type\",\"section\",\"material\",\"length\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"section\",\"material\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-electricite-generale-prises-interrupteurs', 'cat-root-energie-eclairage-electricite-electricite-generale', 3, 'prises-interrupteurs', 'ToggleRight', '/categories/prises-interrupteurs.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Prises & Interrupteurs\",\"en\":\"Sockets & Switches\",\"ar\":\"المقابس والمفاتيح\",\"wo\":\"Prises yi\"}", "{\"fr\":\"Prises & Interrupteurs — Achat en gros\",\"en\":\"Sockets & Switches — Wholesale\",\"ar\":\"المقابس والمفاتيح — بالجملة\",\"wo\":\"Prises yi — Capp\"}", "{\"fr\":\"Découvrez Prises & Interrupteurs au Sénégal.\",\"en\":\"Discover Sockets & Switches in Senegal.\",\"ar\":\"اكتشف المقابس والمفاتيح في السنغال.\",\"wo\":\"Gis Prises yi ci Senegaal.\"}", "{\"fr\":[\"Prises & Interrupteurs\",\"gros\"],\"en\":[\"Sockets & Switches\",\"wholesale\"],\"ar\":[\"المقابس والمفاتيح\",\"بالجملة\"],\"wo\":[\"Prises yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-energie-eclairage-electricite-electricite-generale-piles-accumulateurs', 'cat-root-energie-eclairage-electricite-electricite-generale', 3, 'piles-accumulateurs', 'Battery', '/categories/piles-accumulateurs.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Piles & Accumulateurs\",\"en\":\"Batteries & Accumulators\",\"ar\":\"البطاريات والمجمعات\",\"wo\":\"Piles yi\"}", "{\"fr\":\"Piles & Accumulateurs — Achat en gros\",\"en\":\"Batteries & Accumulators — Wholesale\",\"ar\":\"البطاريات والمجمعات — بالجملة\",\"wo\":\"Piles yi — Capp\"}", "{\"fr\":\"Découvrez Piles & Accumulateurs au Sénégal.\",\"en\":\"Discover Batteries & Accumulators in Senegal.\",\"ar\":\"اكتشف البطاريات والمجمعات في السنغال.\",\"wo\":\"Gis Piles yi ci Senegaal.\"}", "{\"fr\":[\"Piles & Accumulateurs\",\"gros\"],\"en\":[\"Batteries & Accumulators\",\"wholesale\"],\"ar\":[\"البطاريات والمجمعات\",\"بالجملة\"],\"wo\":[\"Piles yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"voltage\",\"capacity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"voltage\",\"capacity\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite', NULL, 1, 'automobile-motos-mobilite', 'Car', '/categories/automobile-motos-mobilite.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Automobile, Motos & Mobilité\",\"en\":\"Automotive, Motorcycles & Mobility\",\"ar\":\"السيارات والدراجات والتنقل\",\"wo\":\"Automobile, Motos ak Mobilite\"}", "{\"fr\":\"Automobile, Motos & Mobilité — Achat en gros\",\"en\":\"Automotive, Motorcycles & Mobility — Wholesale\",\"ar\":\"السيارات والدراجات والتنقل — بالجملة\",\"wo\":\"Automobile, Motos ak Mobilite — Capp\"}", "{\"fr\":\"Découvrez Automobile, Motos & Mobilité au Sénégal.\",\"en\":\"Discover Automotive, Motorcycles & Mobility in Senegal.\",\"ar\":\"اكتشف السيارات والدراجات والتنقل في السنغال.\",\"wo\":\"Gis Automobile, Motos ak Mobilite ci Senegaal.\"}", "{\"fr\":[\"Automobile, Motos & Mobilité\",\"gros\"],\"en\":[\"Automotive, Motorcycles & Mobility\",\"wholesale\"],\"ar\":[\"السيارات والدراجات والتنقل\",\"بالجملة\"],\"wo\":[\"Automobile, Motos ak Mobilite\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-pieces-automobiles', 'cat-root-automobile-motos-mobilite', 2, 'pieces-automobiles', 'Wrench', '/categories/pieces-automobiles.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Pièces automobiles\",\"en\":\"Car Parts\",\"ar\":\"قطع السيارات\",\"wo\":\"Benn automobile\"}", "{\"fr\":\"Pièces automobiles — Achat en gros\",\"en\":\"Car Parts — Wholesale\",\"ar\":\"قطع السيارات — بالجملة\",\"wo\":\"Benn automobile — Capp\"}", "{\"fr\":\"Découvrez Pièces automobiles au Sénégal.\",\"en\":\"Discover Car Parts in Senegal.\",\"ar\":\"اكتشف قطع السيارات في السنغال.\",\"wo\":\"Gis Benn automobile ci Senegaal.\"}", "{\"fr\":[\"Pièces automobiles\",\"gros\"],\"en\":[\"Car Parts\",\"wholesale\"],\"ar\":[\"قطع السيارات\",\"بالجملة\"],\"wo\":[\"Benn automobile\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-pieces-automobiles-pieces-moteur', 'cat-root-automobile-motos-mobilite-pieces-automobiles', 3, 'pieces-moteur', 'Cog', '/categories/pieces-moteur.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Pièces moteur\",\"en\":\"Engine Parts\",\"ar\":\"قطع المحرك\",\"wo\":\"Benn moteur\"}", "{\"fr\":\"Pièces moteur — Achat en gros\",\"en\":\"Engine Parts — Wholesale\",\"ar\":\"قطع المحرك — بالجملة\",\"wo\":\"Benn moteur — Capp\"}", "{\"fr\":\"Découvrez Pièces moteur au Sénégal.\",\"en\":\"Discover Engine Parts in Senegal.\",\"ar\":\"اكتشف قطع المحرك في السنغال.\",\"wo\":\"Gis Benn moteur ci Senegaal.\"}", "{\"fr\":[\"Pièces moteur\",\"gros\"],\"en\":[\"Engine Parts\",\"wholesale\"],\"ar\":[\"قطع المحرك\",\"بالجملة\"],\"wo\":[\"Benn moteur\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"model_compatible\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"model_compatible\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-pieces-automobiles-freinage-suspension', 'cat-root-automobile-motos-mobilite-pieces-automobiles', 3, 'freinage-suspension', 'Circle', '/categories/freinage-suspension.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Freinage & Suspension\",\"en\":\"Brakes & Suspension\",\"ar\":\"الفرامل والتعليق\",\"wo\":\"Freinage\"}", "{\"fr\":\"Freinage & Suspension — Achat en gros\",\"en\":\"Brakes & Suspension — Wholesale\",\"ar\":\"الفرامل والتعليق — بالجملة\",\"wo\":\"Freinage — Capp\"}", "{\"fr\":\"Découvrez Freinage & Suspension au Sénégal.\",\"en\":\"Discover Brakes & Suspension in Senegal.\",\"ar\":\"اكتشف الفرامل والتعليق في السنغال.\",\"wo\":\"Gis Freinage ci Senegaal.\"}", "{\"fr\":[\"Freinage & Suspension\",\"gros\"],\"en\":[\"Brakes & Suspension\",\"wholesale\"],\"ar\":[\"الفرامل والتعليق\",\"بالجملة\"],\"wo\":[\"Freinage\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"model_compatible\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"model_compatible\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-pieces-automobiles-electricite-auto', 'cat-root-automobile-motos-mobilite-pieces-automobiles', 3, 'electricite-auto', 'Zap', '/categories/electricite-auto.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Électricité auto\",\"en\":\"Auto Electrical\",\"ar\":\"كهرباء السيارات\",\"wo\":\"Électricité auto\"}", "{\"fr\":\"Électricité auto — Achat en gros\",\"en\":\"Auto Electrical — Wholesale\",\"ar\":\"كهرباء السيارات — بالجملة\",\"wo\":\"Électricité auto — Capp\"}", "{\"fr\":\"Découvrez Électricité auto au Sénégal.\",\"en\":\"Discover Auto Electrical in Senegal.\",\"ar\":\"اكتشف كهرباء السيارات في السنغال.\",\"wo\":\"Gis Électricité auto ci Senegaal.\"}", "{\"fr\":[\"Électricité auto\",\"gros\"],\"en\":[\"Auto Electrical\",\"wholesale\"],\"ar\":[\"كهرباء السيارات\",\"بالجملة\"],\"wo\":[\"Électricité auto\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"model_compatible\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"model_compatible\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-accessoires-automobiles', 'cat-root-automobile-motos-mobilite', 2, 'accessoires-automobiles', 'Car', '/categories/accessoires-automobiles.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Accessoires automobiles\",\"en\":\"Car Accessories\",\"ar\":\"إكسسوارات السيارات\",\"wo\":\"Accessoires auto\"}", "{\"fr\":\"Accessoires automobiles — Achat en gros\",\"en\":\"Car Accessories — Wholesale\",\"ar\":\"إكسسوارات السيارات — بالجملة\",\"wo\":\"Accessoires auto — Capp\"}", "{\"fr\":\"Découvrez Accessoires automobiles au Sénégal.\",\"en\":\"Discover Car Accessories in Senegal.\",\"ar\":\"اكتشف إكسسوارات السيارات في السنغال.\",\"wo\":\"Gis Accessoires auto ci Senegaal.\"}", "{\"fr\":[\"Accessoires automobiles\",\"gros\"],\"en\":[\"Car Accessories\",\"wholesale\"],\"ar\":[\"إكسسوارات السيارات\",\"بالجملة\"],\"wo\":[\"Accessoires auto\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-accessoires-automobiles-audio-gps-auto', 'cat-root-automobile-motos-mobilite-accessoires-automobiles', 3, 'audio-gps-auto', 'MapPin', '/categories/audio-gps-auto.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Audio & GPS auto\",\"en\":\"Car Audio & GPS\",\"ar\":\"صوت ونظام تحديد المواقع للسيارات\",\"wo\":\"Audio GPS auto\"}", "{\"fr\":\"Audio & GPS auto — Achat en gros\",\"en\":\"Car Audio & GPS — Wholesale\",\"ar\":\"صوت ونظام تحديد المواقع للسيارات — بالجملة\",\"wo\":\"Audio GPS auto — Capp\"}", "{\"fr\":\"Découvrez Audio & GPS auto au Sénégal.\",\"en\":\"Discover Car Audio & GPS in Senegal.\",\"ar\":\"اكتشف صوت ونظام تحديد المواقع للسيارات في السنغال.\",\"wo\":\"Gis Audio GPS auto ci Senegaal.\"}", "{\"fr\":[\"Audio & GPS auto\",\"gros\"],\"en\":[\"Car Audio & GPS\",\"wholesale\"],\"ar\":[\"صوت ونظام تحديد المواقع للسيارات\",\"بالجملة\"],\"wo\":[\"Audio GPS auto\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"screen_size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"screen_size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-accessoires-automobiles-housses-tapis', 'cat-root-automobile-motos-mobilite-accessoires-automobiles', 3, 'housses-tapis', 'Square', '/categories/housses-tapis.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Housses & Tapis\",\"en\":\"Covers & Mats\",\"ar\":\"الأغطية والسجاد\",\"wo\":\"Housses auto\"}", "{\"fr\":\"Housses & Tapis — Achat en gros\",\"en\":\"Covers & Mats — Wholesale\",\"ar\":\"الأغطية والسجاد — بالجملة\",\"wo\":\"Housses auto — Capp\"}", "{\"fr\":\"Découvrez Housses & Tapis au Sénégal.\",\"en\":\"Discover Covers & Mats in Senegal.\",\"ar\":\"اكتشف الأغطية والسجاد في السنغال.\",\"wo\":\"Gis Housses auto ci Senegaal.\"}", "{\"fr\":[\"Housses & Tapis\",\"gros\"],\"en\":[\"Covers & Mats\",\"wholesale\"],\"ar\":[\"الأغطية والسجاد\",\"بالجملة\"],\"wo\":[\"Housses auto\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"model_compatible\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-accessoires-automobiles-eclairage-auto', 'cat-root-automobile-motos-mobilite-accessoires-automobiles', 3, 'eclairage-auto', 'Lightbulb', '/categories/eclairage-auto.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Éclairage auto\",\"en\":\"Car Lighting\",\"ar\":\"إضاءة السيارات\",\"wo\":\"Éclairage auto\"}", "{\"fr\":\"Éclairage auto — Achat en gros\",\"en\":\"Car Lighting — Wholesale\",\"ar\":\"إضاءة السيارات — بالجملة\",\"wo\":\"Éclairage auto — Capp\"}", "{\"fr\":\"Découvrez Éclairage auto au Sénégal.\",\"en\":\"Discover Car Lighting in Senegal.\",\"ar\":\"اكتشف إضاءة السيارات في السنغال.\",\"wo\":\"Gis Éclairage auto ci Senegaal.\"}", "{\"fr\":[\"Éclairage auto\",\"gros\"],\"en\":[\"Car Lighting\",\"wholesale\"],\"ar\":[\"إضاءة السيارات\",\"بالجملة\"],\"wo\":[\"Éclairage auto\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"model_compatible\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"model_compatible\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-motos-scooters', 'cat-root-automobile-motos-mobilite', 2, 'motos-scooters', 'Bike', '/categories/motos-scooters.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Motos & Scooters\",\"en\":\"Motorcycles & Scooters\",\"ar\":\"الدراجات النارية والسكوتر\",\"wo\":\"Motos ak Scooters\"}", "{\"fr\":\"Motos & Scooters — Achat en gros\",\"en\":\"Motorcycles & Scooters — Wholesale\",\"ar\":\"الدراجات النارية والسكوتر — بالجملة\",\"wo\":\"Motos ak Scooters — Capp\"}", "{\"fr\":\"Découvrez Motos & Scooters au Sénégal.\",\"en\":\"Discover Motorcycles & Scooters in Senegal.\",\"ar\":\"اكتشف الدراجات النارية والسكوتر في السنغال.\",\"wo\":\"Gis Motos ak Scooters ci Senegaal.\"}", "{\"fr\":[\"Motos & Scooters\",\"gros\"],\"en\":[\"Motorcycles & Scooters\",\"wholesale\"],\"ar\":[\"الدراجات النارية والسكوتر\",\"بالجملة\"],\"wo\":[\"Motos ak Scooters\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-motos-scooters-motos', 'cat-root-automobile-motos-mobilite-motos-scooters', 3, 'motos', 'Bike', '/categories/motos.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Motos\",\"en\":\"Motorcycles\",\"ar\":\"الدراجات النارية\",\"wo\":\"Motos yi\"}", "{\"fr\":\"Motos — Achat en gros\",\"en\":\"Motorcycles — Wholesale\",\"ar\":\"الدراجات النارية — بالجملة\",\"wo\":\"Motos yi — Capp\"}", "{\"fr\":\"Découvrez Motos au Sénégal.\",\"en\":\"Discover Motorcycles in Senegal.\",\"ar\":\"اكتشف الدراجات النارية في السنغال.\",\"wo\":\"Gis Motos yi ci Senegaal.\"}", "{\"fr\":[\"Motos\",\"gros\"],\"en\":[\"Motorcycles\",\"wholesale\"],\"ar\":[\"الدراجات النارية\",\"بالجملة\"],\"wo\":[\"Motos yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"model\",\"engine_cc\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"engine_cc\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-motos-scooters-scooters', 'cat-root-automobile-motos-mobilite-motos-scooters', 3, 'scooters', 'Bike', '/categories/scooters.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Scooters\",\"en\":\"Scooters\",\"ar\":\"السكوتر\",\"wo\":\"Scooters yi\"}", "{\"fr\":\"Scooters — Achat en gros\",\"en\":\"Scooters — Wholesale\",\"ar\":\"السكوتر — بالجملة\",\"wo\":\"Scooters yi — Capp\"}", "{\"fr\":\"Découvrez Scooters au Sénégal.\",\"en\":\"Discover Scooters in Senegal.\",\"ar\":\"اكتشف السكوتر في السنغال.\",\"wo\":\"Gis Scooters yi ci Senegaal.\"}", "{\"fr\":[\"Scooters\",\"gros\"],\"en\":[\"Scooters\",\"wholesale\"],\"ar\":[\"السكوتر\",\"بالجملة\"],\"wo\":[\"Scooters yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"model\",\"engine_cc\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"engine_cc\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-motos-scooters-pieces-detachees-moto', 'cat-root-automobile-motos-mobilite-motos-scooters', 3, 'pieces-detachees-moto', 'Wrench', '/categories/pieces-detachees-moto.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Pièces détachées moto\",\"en\":\"Motorcycle Spare Parts\",\"ar\":\"قطع غيار الدراجات\",\"wo\":\"Benn moto\"}", "{\"fr\":\"Pièces détachées moto — Achat en gros\",\"en\":\"Motorcycle Spare Parts — Wholesale\",\"ar\":\"قطع غيار الدراجات — بالجملة\",\"wo\":\"Benn moto — Capp\"}", "{\"fr\":\"Découvrez Pièces détachées moto au Sénégal.\",\"en\":\"Discover Motorcycle Spare Parts in Senegal.\",\"ar\":\"اكتشف قطع غيار الدراجات في السنغال.\",\"wo\":\"Gis Benn moto ci Senegaal.\"}", "{\"fr\":[\"Pièces détachées moto\",\"gros\"],\"en\":[\"Motorcycle Spare Parts\",\"wholesale\"],\"ar\":[\"قطع غيار الدراجات\",\"بالجملة\"],\"wo\":[\"Benn moto\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"model_compatible\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"model_compatible\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-mobilite-alternative', 'cat-root-automobile-motos-mobilite', 2, 'mobilite-alternative', 'Move', '/categories/mobilite-alternative.jpg', 4, TRUE, FALSE,
  "{\"fr\":\"Mobilité alternative\",\"en\":\"Alternative Mobility\",\"ar\":\"التنقل البديل\",\"wo\":\"Mobilité alternative\"}", "{\"fr\":\"Mobilité alternative — Achat en gros\",\"en\":\"Alternative Mobility — Wholesale\",\"ar\":\"التنقل البديل — بالجملة\",\"wo\":\"Mobilité alternative — Capp\"}", "{\"fr\":\"Découvrez Mobilité alternative au Sénégal.\",\"en\":\"Discover Alternative Mobility in Senegal.\",\"ar\":\"اكتشف التنقل البديل في السنغال.\",\"wo\":\"Gis Mobilité alternative ci Senegaal.\"}", "{\"fr\":[\"Mobilité alternative\",\"gros\"],\"en\":[\"Alternative Mobility\",\"wholesale\"],\"ar\":[\"التنقل البديل\",\"بالجملة\"],\"wo\":[\"Mobilité alternative\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-mobilite-alternative-velos', 'cat-root-automobile-motos-mobilite-mobilite-alternative', 3, 'velos', 'Bike', '/categories/velos.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Vélos\",\"en\":\"Bicycles\",\"ar\":\"الدراجات الهوائية\",\"wo\":\"Vélos yi\"}", "{\"fr\":\"Vélos — Achat en gros\",\"en\":\"Bicycles — Wholesale\",\"ar\":\"الدراجات الهوائية — بالجملة\",\"wo\":\"Vélos yi — Capp\"}", "{\"fr\":\"Découvrez Vélos au Sénégal.\",\"en\":\"Discover Bicycles in Senegal.\",\"ar\":\"اكتشف الدراجات الهوائية في السنغال.\",\"wo\":\"Gis Vélos yi ci Senegaal.\"}", "{\"fr\":[\"Vélos\",\"gros\"],\"en\":[\"Bicycles\",\"wholesale\"],\"ar\":[\"الدراجات الهوائية\",\"بالجملة\"],\"wo\":[\"Vélos yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"wheel_size\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"wheel_size\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-mobilite-alternative-velos-electriques', 'cat-root-automobile-motos-mobilite-mobilite-alternative', 3, 'velos-electriques', 'BatteryCharging', '/categories/velos-electriques.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Vélos électriques\",\"en\":\"Electric Bikes\",\"ar\":\"الدراجات الكهربائية\",\"wo\":\"Vélos électriques\"}", "{\"fr\":\"Vélos électriques — Achat en gros\",\"en\":\"Electric Bikes — Wholesale\",\"ar\":\"الدراجات الكهربائية — بالجملة\",\"wo\":\"Vélos électriques — Capp\"}", "{\"fr\":\"Découvrez Vélos électriques au Sénégal.\",\"en\":\"Discover Electric Bikes in Senegal.\",\"ar\":\"اكتشف الدراجات الكهربائية في السنغال.\",\"wo\":\"Gis Vélos électriques ci Senegaal.\"}", "{\"fr\":[\"Vélos électriques\",\"gros\"],\"en\":[\"Electric Bikes\",\"wholesale\"],\"ar\":[\"الدراجات الكهربائية\",\"بالجملة\"],\"wo\":[\"Vélos électriques\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"motor_power\",\"battery_capacity\",\"autonomy\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"motor_power\",\"battery_capacity\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-automobile-motos-mobilite-mobilite-alternative-trottinettes-electriques', 'cat-root-automobile-motos-mobilite-mobilite-alternative', 3, 'trottinettes-electriques', 'Move', '/categories/trottinettes-electriques.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Trottinettes électriques\",\"en\":\"Electric Scooters\",\"ar\":\"السكوترات الكهربائية\",\"wo\":\"Trottinettes\"}", "{\"fr\":\"Trottinettes électriques — Achat en gros\",\"en\":\"Electric Scooters — Wholesale\",\"ar\":\"السكوترات الكهربائية — بالجملة\",\"wo\":\"Trottinettes — Capp\"}", "{\"fr\":\"Découvrez Trottinettes électriques au Sénégal.\",\"en\":\"Discover Electric Scooters in Senegal.\",\"ar\":\"اكتشف السكوترات الكهربائية في السنغال.\",\"wo\":\"Gis Trottinettes ci Senegaal.\"}", "{\"fr\":[\"Trottinettes électriques\",\"gros\"],\"en\":[\"Electric Scooters\",\"wholesale\"],\"ar\":[\"السكوترات الكهربائية\",\"بالجملة\"],\"wo\":[\"Trottinettes\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"motor_power\",\"battery_capacity\",\"autonomy\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"motor_power\",\"battery_capacity\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles', NULL, 1, 'mode-textiles', 'Shirt', '/categories/mode-textiles.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Mode & Textiles\",\"en\":\"Fashion & Textiles\",\"ar\":\"الموضة والنسيج\",\"wo\":\"Mode ak Tey\"}", "{\"fr\":\"Mode & Textiles — Achat en gros\",\"en\":\"Fashion & Textiles — Wholesale\",\"ar\":\"الموضة والنسيج — بالجملة\",\"wo\":\"Mode ak Tey — Capp\"}", "{\"fr\":\"Découvrez Mode & Textiles au Sénégal.\",\"en\":\"Discover Fashion & Textiles in Senegal.\",\"ar\":\"اكتشف الموضة والنسيج في السنغال.\",\"wo\":\"Gis Mode ak Tey ci Senegaal.\"}", "{\"fr\":[\"Mode & Textiles\",\"gros\"],\"en\":[\"Fashion & Textiles\",\"wholesale\"],\"ar\":[\"الموضة والنسيج\",\"بالجملة\"],\"wo\":[\"Mode ak Tey\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.1,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-vetements-femme', 'cat-root-mode-textiles', 2, 'vetements-femme', 'Shirt', '/categories/vetements-femme.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Vêtements femme\",\"en\":\"Women's Clothing\",\"ar\":\"ملابس النساء\",\"wo\":\"Yére yi jigéen\"}", "{\"fr\":\"Vêtements femme — Achat en gros\",\"en\":\"Women's Clothing — Wholesale\",\"ar\":\"ملابس النساء — بالجملة\",\"wo\":\"Yére yi jigéen — Capp\"}", "{\"fr\":\"Découvrez Vêtements femme au Sénégal.\",\"en\":\"Discover Women's Clothing in Senegal.\",\"ar\":\"اكتشف ملابس النساء في السنغال.\",\"wo\":\"Gis Yére yi jigéen ci Senegaal.\"}", "{\"fr\":[\"Vêtements femme\",\"gros\"],\"en\":[\"Women's Clothing\",\"wholesale\"],\"ar\":[\"ملابس النساء\",\"بالجملة\"],\"wo\":[\"Yére yi jigéen\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-vetements-femme-hauts-t-shirts', 'cat-root-mode-textiles-vetements-femme', 3, 'hauts-t-shirts', 'Shirt', '/categories/hauts-t-shirts.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Hauts & T-shirts\",\"en\":\"Tops & T-shirts\",\"ar\":\"القمصان والتنانير العلوية\",\"wo\":\"Hauts yi\"}", "{\"fr\":\"Hauts & T-shirts — Achat en gros\",\"en\":\"Tops & T-shirts — Wholesale\",\"ar\":\"القمصان والتنانير العلوية — بالجملة\",\"wo\":\"Hauts yi — Capp\"}", "{\"fr\":\"Découvrez Hauts & T-shirts au Sénégal.\",\"en\":\"Discover Tops & T-shirts in Senegal.\",\"ar\":\"اكتشف القمصان والتنانير العلوية في السنغال.\",\"wo\":\"Gis Hauts yi ci Senegaal.\"}", "{\"fr\":[\"Hauts & T-shirts\",\"gros\"],\"en\":[\"Tops & T-shirts\",\"wholesale\"],\"ar\":[\"القمصان والتنانير العلوية\",\"بالجملة\"],\"wo\":[\"Hauts yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-vetements-femme-pantalons-jeans', 'cat-root-mode-textiles-vetements-femme', 3, 'pantalons-jeans', 'Divide', '/categories/pantalons-jeans.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Pantalons & Jeans\",\"en\":\"Pants & Jeans\",\"ar\":\"البنطلونات والجينز\",\"wo\":\"Pantalons yi\"}", "{\"fr\":\"Pantalons & Jeans — Achat en gros\",\"en\":\"Pants & Jeans — Wholesale\",\"ar\":\"البنطلونات والجينز — بالجملة\",\"wo\":\"Pantalons yi — Capp\"}", "{\"fr\":\"Découvrez Pantalons & Jeans au Sénégal.\",\"en\":\"Discover Pants & Jeans in Senegal.\",\"ar\":\"اكتشف البنطلونات والجينز في السنغال.\",\"wo\":\"Gis Pantalons yi ci Senegaal.\"}", "{\"fr\":[\"Pantalons & Jeans\",\"gros\"],\"en\":[\"Pants & Jeans\",\"wholesale\"],\"ar\":[\"البنطلونات والجينز\",\"بالجملة\"],\"wo\":[\"Pantalons yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-vetements-femme-robes-jupes', 'cat-root-mode-textiles-vetements-femme', 3, 'robes-jupes', 'Triangle', '/categories/robes-jupes.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Robes & Jupes\",\"en\":\"Dresses & Skirts\",\"ar\":\"الفساتين والتنانير\",\"wo\":\"Robes yi\"}", "{\"fr\":\"Robes & Jupes — Achat en gros\",\"en\":\"Dresses & Skirts — Wholesale\",\"ar\":\"الفساتين والتنانير — بالجملة\",\"wo\":\"Robes yi — Capp\"}", "{\"fr\":\"Découvrez Robes & Jupes au Sénégal.\",\"en\":\"Discover Dresses & Skirts in Senegal.\",\"ar\":\"اكتشف الفساتين والتنانير في السنغال.\",\"wo\":\"Gis Robes yi ci Senegaal.\"}", "{\"fr\":[\"Robes & Jupes\",\"gros\"],\"en\":[\"Dresses & Skirts\",\"wholesale\"],\"ar\":[\"الفساتين والتنانير\",\"بالجملة\"],\"wo\":[\"Robes yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-vetements-femme-vetements-traditionnels', 'cat-root-mode-textiles-vetements-femme', 3, 'vetements-traditionnels', 'Shirt', '/categories/vetements-traditionnels.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Vêtements traditionnels\",\"en\":\"Traditional Wear\",\"ar\":\"الملابس التقليدية\",\"wo\":\"Yere yu taaru\"}", "{\"fr\":\"Vêtements traditionnels — Achat en gros\",\"en\":\"Traditional Wear — Wholesale\",\"ar\":\"الملابس التقليدية — بالجملة\",\"wo\":\"Yere yu taaru — Capp\"}", "{\"fr\":\"Découvrez Vêtements traditionnels au Sénégal.\",\"en\":\"Discover Traditional Wear in Senegal.\",\"ar\":\"اكتشف الملابس التقليدية في السنغال.\",\"wo\":\"Gis Yere yu taaru ci Senegaal.\"}", "{\"fr\":[\"Vêtements traditionnels\",\"gros\"],\"en\":[\"Traditional Wear\",\"wholesale\"],\"ar\":[\"الملابس التقليدية\",\"بالجملة\"],\"wo\":[\"Yere yu taaru\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-vetements-homme', 'cat-root-mode-textiles', 2, 'vetements-homme', 'Shirt', '/categories/vetements-homme.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Vêtements homme\",\"en\":\"Men's Clothing\",\"ar\":\"ملابس الرجال\",\"wo\":\"Yére yi góor\"}", "{\"fr\":\"Vêtements homme — Achat en gros\",\"en\":\"Men's Clothing — Wholesale\",\"ar\":\"ملابس الرجال — بالجملة\",\"wo\":\"Yére yi góor — Capp\"}", "{\"fr\":\"Découvrez Vêtements homme au Sénégal.\",\"en\":\"Discover Men's Clothing in Senegal.\",\"ar\":\"اكتشف ملابس الرجال في السنغال.\",\"wo\":\"Gis Yére yi góor ci Senegaal.\"}", "{\"fr\":[\"Vêtements homme\",\"gros\"],\"en\":[\"Men's Clothing\",\"wholesale\"],\"ar\":[\"ملابس الرجال\",\"بالجملة\"],\"wo\":[\"Yére yi góor\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-vetements-homme-hauts-t-shirts', 'cat-root-mode-textiles-vetements-homme', 3, 'hauts-t-shirts', 'Shirt', '/categories/hauts-t-shirts.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Hauts & T-shirts\",\"en\":\"Tops & T-shirts\",\"ar\":\"القمصان والتنانير العلوية\",\"wo\":\"Hauts yi góor\"}", "{\"fr\":\"Hauts & T-shirts — Achat en gros\",\"en\":\"Tops & T-shirts — Wholesale\",\"ar\":\"القمصان والتنانير العلوية — بالجملة\",\"wo\":\"Hauts yi góor — Capp\"}", "{\"fr\":\"Découvrez Hauts & T-shirts au Sénégal.\",\"en\":\"Discover Tops & T-shirts in Senegal.\",\"ar\":\"اكتشف القمصان والتنانير العلوية في السنغال.\",\"wo\":\"Gis Hauts yi góor ci Senegaal.\"}", "{\"fr\":[\"Hauts & T-shirts\",\"gros\"],\"en\":[\"Tops & T-shirts\",\"wholesale\"],\"ar\":[\"القمصان والتنانير العلوية\",\"بالجملة\"],\"wo\":[\"Hauts yi góor\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-vetements-homme-pantalons-jeans', 'cat-root-mode-textiles-vetements-homme', 3, 'pantalons-jeans', 'Divide', '/categories/pantalons-jeans.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Pantalons & Jeans\",\"en\":\"Pants & Jeans\",\"ar\":\"البنطلونات والجينز\",\"wo\":\"Pantalons yi góor\"}", "{\"fr\":\"Pantalons & Jeans — Achat en gros\",\"en\":\"Pants & Jeans — Wholesale\",\"ar\":\"البنطلونات والجينز — بالجملة\",\"wo\":\"Pantalons yi góor — Capp\"}", "{\"fr\":\"Découvrez Pantalons & Jeans au Sénégal.\",\"en\":\"Discover Pants & Jeans in Senegal.\",\"ar\":\"اكتشف البنطلونات والجينز في السنغال.\",\"wo\":\"Gis Pantalons yi góor ci Senegaal.\"}", "{\"fr\":[\"Pantalons & Jeans\",\"gros\"],\"en\":[\"Pants & Jeans\",\"wholesale\"],\"ar\":[\"البنطلونات والجينز\",\"بالجملة\"],\"wo\":[\"Pantalons yi góor\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-vetements-homme-costumes-chemises', 'cat-root-mode-textiles-vetements-homme', 3, 'costumes-chemises', 'Briefcase', '/categories/costumes-chemises.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Costumes & Chemises\",\"en\":\"Suits & Shirts\",\"ar\":\"البدلات والقمصان\",\"wo\":\"Costumes yi\"}", "{\"fr\":\"Costumes & Chemises — Achat en gros\",\"en\":\"Suits & Shirts — Wholesale\",\"ar\":\"البدلات والقمصان — بالجملة\",\"wo\":\"Costumes yi — Capp\"}", "{\"fr\":\"Découvrez Costumes & Chemises au Sénégal.\",\"en\":\"Discover Suits & Shirts in Senegal.\",\"ar\":\"اكتشف البدلات والقمصان في السنغال.\",\"wo\":\"Gis Costumes yi ci Senegaal.\"}", "{\"fr\":[\"Costumes & Chemises\",\"gros\"],\"en\":[\"Suits & Shirts\",\"wholesale\"],\"ar\":[\"البدلات والقمصان\",\"بالجملة\"],\"wo\":[\"Costumes yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-chaussures', 'cat-root-mode-textiles', 2, 'chaussures', 'Footprints', '/categories/chaussures.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Chaussures\",\"en\":\"Shoes\",\"ar\":\"الأحذية\",\"wo\":\"Naat yi\"}", "{\"fr\":\"Chaussures — Achat en gros\",\"en\":\"Shoes — Wholesale\",\"ar\":\"الأحذية — بالجملة\",\"wo\":\"Naat yi — Capp\"}", "{\"fr\":\"Découvrez Chaussures au Sénégal.\",\"en\":\"Discover Shoes in Senegal.\",\"ar\":\"اكتشف الأحذية في السنغال.\",\"wo\":\"Gis Naat yi ci Senegaal.\"}", "{\"fr\":[\"Chaussures\",\"gros\"],\"en\":[\"Shoes\",\"wholesale\"],\"ar\":[\"الأحذية\",\"بالجملة\"],\"wo\":[\"Naat yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-chaussures-chaussures-femme', 'cat-root-mode-textiles-chaussures', 3, 'chaussures-femme', 'Footprints', '/categories/chaussures-femme.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Chaussures femme\",\"en\":\"Women's Shoes\",\"ar\":\"أحذية النساء\",\"wo\":\"Naat yi jigéen\"}", "{\"fr\":\"Chaussures femme — Achat en gros\",\"en\":\"Women's Shoes — Wholesale\",\"ar\":\"أحذية النساء — بالجملة\",\"wo\":\"Naat yi jigéen — Capp\"}", "{\"fr\":\"Découvrez Chaussures femme au Sénégal.\",\"en\":\"Discover Women's Shoes in Senegal.\",\"ar\":\"اكتشف أحذية النساء في السنغال.\",\"wo\":\"Gis Naat yi jigéen ci Senegaal.\"}", "{\"fr\":[\"Chaussures femme\",\"gros\"],\"en\":[\"Women's Shoes\",\"wholesale\"],\"ar\":[\"أحذية النساء\",\"بالجملة\"],\"wo\":[\"Naat yi jigéen\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-chaussures-chaussures-homme', 'cat-root-mode-textiles-chaussures', 3, 'chaussures-homme', 'Footprints', '/categories/chaussures-homme.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Chaussures homme\",\"en\":\"Men's Shoes\",\"ar\":\"أحذية الرجال\",\"wo\":\"Naat yi góor\"}", "{\"fr\":\"Chaussures homme — Achat en gros\",\"en\":\"Men's Shoes — Wholesale\",\"ar\":\"أحذية الرجال — بالجملة\",\"wo\":\"Naat yi góor — Capp\"}", "{\"fr\":\"Découvrez Chaussures homme au Sénégal.\",\"en\":\"Discover Men's Shoes in Senegal.\",\"ar\":\"اكتشف أحذية الرجال في السنغال.\",\"wo\":\"Gis Naat yi góor ci Senegaal.\"}", "{\"fr\":[\"Chaussures homme\",\"gros\"],\"en\":[\"Men's Shoes\",\"wholesale\"],\"ar\":[\"أحذية الرجال\",\"بالجملة\"],\"wo\":[\"Naat yi góor\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-chaussures-chaussures-de-sport', 'cat-root-mode-textiles-chaussures', 3, 'chaussures-de-sport', 'Footprints', '/categories/chaussures-de-sport.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Chaussures de sport\",\"en\":\"Sports Shoes\",\"ar\":\"أحذية رياضية\",\"wo\":\"Naat sport\"}", "{\"fr\":\"Chaussures de sport — Achat en gros\",\"en\":\"Sports Shoes — Wholesale\",\"ar\":\"أحذية رياضية — بالجملة\",\"wo\":\"Naat sport — Capp\"}", "{\"fr\":\"Découvrez Chaussures de sport au Sénégal.\",\"en\":\"Discover Sports Shoes in Senegal.\",\"ar\":\"اكتشف أحذية رياضية في السنغال.\",\"wo\":\"Gis Naat sport ci Senegaal.\"}", "{\"fr\":[\"Chaussures de sport\",\"gros\"],\"en\":[\"Sports Shoes\",\"wholesale\"],\"ar\":[\"أحذية رياضية\",\"بالجملة\"],\"wo\":[\"Naat sport\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-chaussures-chaussures-de-securite', 'cat-root-mode-textiles-chaussures', 3, 'chaussures-de-securite', 'Footprints', '/categories/chaussures-de-securite.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Chaussures de sécurité\",\"en\":\"Safety Shoes\",\"ar\":\"أحذية السلامة\",\"wo\":\"Naat sécurité\"}", "{\"fr\":\"Chaussures de sécurité — Achat en gros\",\"en\":\"Safety Shoes — Wholesale\",\"ar\":\"أحذية السلامة — بالجملة\",\"wo\":\"Naat sécurité — Capp\"}", "{\"fr\":\"Découvrez Chaussures de sécurité au Sénégal.\",\"en\":\"Discover Safety Shoes in Senegal.\",\"ar\":\"اكتشف أحذية السلامة في السنغال.\",\"wo\":\"Gis Naat sécurité ci Senegaal.\"}", "{\"fr\":[\"Chaussures de sécurité\",\"gros\"],\"en\":[\"Safety Shoes\",\"wholesale\"],\"ar\":[\"أحذية السلامة\",\"بالجملة\"],\"wo\":[\"Naat sécurité\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-maroquinerie-bagagerie', 'cat-root-mode-textiles', 2, 'maroquinerie-bagagerie', 'Bag', '/categories/maroquinerie-bagagerie.jpg', 4, TRUE, FALSE,
  "{\"fr\":\"Maroquinerie & Bagagerie\",\"en\":\"Leather Goods & Luggage\",\"ar\":\"الجلود والحقائب\",\"wo\":\"Maroquinerie\"}", "{\"fr\":\"Maroquinerie & Bagagerie — Achat en gros\",\"en\":\"Leather Goods & Luggage — Wholesale\",\"ar\":\"الجلود والحقائب — بالجملة\",\"wo\":\"Maroquinerie — Capp\"}", "{\"fr\":\"Découvrez Maroquinerie & Bagagerie au Sénégal.\",\"en\":\"Discover Leather Goods & Luggage in Senegal.\",\"ar\":\"اكتشف الجلود والحقائب في السنغال.\",\"wo\":\"Gis Maroquinerie ci Senegaal.\"}", "{\"fr\":[\"Maroquinerie & Bagagerie\",\"gros\"],\"en\":[\"Leather Goods & Luggage\",\"wholesale\"],\"ar\":[\"الجلود والحقائب\",\"بالجملة\"],\"wo\":[\"Maroquinerie\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-maroquinerie-bagagerie-sacs-a-main', 'cat-root-mode-textiles-maroquinerie-bagagerie', 3, 'sacs-a-main', 'Bag', '/categories/sacs-a-main.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Sacs à main\",\"en\":\"Handbags\",\"ar\":\"حقائب اليد\",\"wo\":\"Sacs à main\"}", "{\"fr\":\"Sacs à main — Achat en gros\",\"en\":\"Handbags — Wholesale\",\"ar\":\"حقائب اليد — بالجملة\",\"wo\":\"Sacs à main — Capp\"}", "{\"fr\":\"Découvrez Sacs à main au Sénégal.\",\"en\":\"Discover Handbags in Senegal.\",\"ar\":\"اكتشف حقائب اليد في السنغال.\",\"wo\":\"Gis Sacs à main ci Senegaal.\"}", "{\"fr\":[\"Sacs à main\",\"gros\"],\"en\":[\"Handbags\",\"wholesale\"],\"ar\":[\"حقائب اليد\",\"بالجملة\"],\"wo\":[\"Sacs à main\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-maroquinerie-bagagerie-sacs-a-dos', 'cat-root-mode-textiles-maroquinerie-bagagerie', 3, 'sacs-a-dos', 'Bag', '/categories/sacs-a-dos.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Sacs à dos\",\"en\":\"Backpacks\",\"ar\":\"حقائب الظهر\",\"wo\":\"Sacs à dos\"}", "{\"fr\":\"Sacs à dos — Achat en gros\",\"en\":\"Backpacks — Wholesale\",\"ar\":\"حقائب الظهر — بالجملة\",\"wo\":\"Sacs à dos — Capp\"}", "{\"fr\":\"Découvrez Sacs à dos au Sénégal.\",\"en\":\"Discover Backpacks in Senegal.\",\"ar\":\"اكتشف حقائب الظهر في السنغال.\",\"wo\":\"Gis Sacs à dos ci Senegaal.\"}", "{\"fr\":[\"Sacs à dos\",\"gros\"],\"en\":[\"Backpacks\",\"wholesale\"],\"ar\":[\"حقائب الظهر\",\"بالجملة\"],\"wo\":[\"Sacs à dos\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"capacity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"capacity\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-maroquinerie-bagagerie-valises-bagages', 'cat-root-mode-textiles-maroquinerie-bagagerie', 3, 'valises-bagages', 'Luggage', '/categories/valises-bagages.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Valises & Bagages\",\"en\":\"Suitcases & Luggage\",\"ar\":\"الحقائب والأمتعة\",\"wo\":\"Valises yi\"}", "{\"fr\":\"Valises & Bagages — Achat en gros\",\"en\":\"Suitcases & Luggage — Wholesale\",\"ar\":\"الحقائب والأمتعة — بالجملة\",\"wo\":\"Valises yi — Capp\"}", "{\"fr\":\"Découvrez Valises & Bagages au Sénégal.\",\"en\":\"Discover Suitcases & Luggage in Senegal.\",\"ar\":\"اكتشف الحقائب والأمتعة في السنغال.\",\"wo\":\"Gis Valises yi ci Senegaal.\"}", "{\"fr\":[\"Valises & Bagages\",\"gros\"],\"en\":[\"Suitcases & Luggage\",\"wholesale\"],\"ar\":[\"الحقائب والأمتعة\",\"بالجملة\"],\"wo\":[\"Valises yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-textiles-tissus', 'cat-root-mode-textiles', 2, 'textiles-tissus', 'Scissors', '/categories/textiles-tissus.jpg', 5, TRUE, FALSE,
  "{\"fr\":\"Textiles & Tissus\",\"en\":\"Textiles & Fabrics\",\"ar\":\"الأقمشة والمنسوجات\",\"wo\":\"Tey yi\"}", "{\"fr\":\"Textiles & Tissus — Achat en gros\",\"en\":\"Textiles & Fabrics — Wholesale\",\"ar\":\"الأقمشة والمنسوجات — بالجملة\",\"wo\":\"Tey yi — Capp\"}", "{\"fr\":\"Découvrez Textiles & Tissus au Sénégal.\",\"en\":\"Discover Textiles & Fabrics in Senegal.\",\"ar\":\"اكتشف الأقمشة والمنسوجات في السنغال.\",\"wo\":\"Gis Tey yi ci Senegaal.\"}", "{\"fr\":[\"Textiles & Tissus\",\"gros\"],\"en\":[\"Textiles & Fabrics\",\"wholesale\"],\"ar\":[\"الأقمشة والمنسوجات\",\"بالجملة\"],\"wo\":[\"Tey yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-textiles-tissus-tissus-wax-bazin', 'cat-root-mode-textiles-textiles-tissus', 3, 'tissus-wax-bazin', 'Scissors', '/categories/tissus-wax-bazin.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Tissus wax & Bazin\",\"en\":\"Wax & Bazin Fabrics\",\"ar\":\"أقمشة الواكس والبازين\",\"wo\":\"Tissus wax\"}", "{\"fr\":\"Tissus wax & Bazin — Achat en gros\",\"en\":\"Wax & Bazin Fabrics — Wholesale\",\"ar\":\"أقمشة الواكس والبازين — بالجملة\",\"wo\":\"Tissus wax — Capp\"}", "{\"fr\":\"Découvrez Tissus wax & Bazin au Sénégal.\",\"en\":\"Discover Wax & Bazin Fabrics in Senegal.\",\"ar\":\"اكتشف أقمشة الواكس والبازين في السنغال.\",\"wo\":\"Gis Tissus wax ci Senegaal.\"}", "{\"fr\":[\"Tissus wax & Bazin\",\"gros\"],\"en\":[\"Wax & Bazin Fabrics\",\"wholesale\"],\"ar\":[\"أقمشة الواكس والبازين\",\"بالجملة\"],\"wo\":[\"Tissus wax\",\"capp\"]}", "null", '{}', '{}',
  "[\"meter\",\"yard\",\"lot_of_6_yards\",\"roll\"]", "[\"type\",\"material\",\"length\",\"width\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-textiles-tissus-tissus-pour-habillement', 'cat-root-mode-textiles-textiles-tissus', 3, 'tissus-pour-habillement', 'Scissors', '/categories/tissus-pour-habillement.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Tissus pour habillement\",\"en\":\"Garment Fabrics\",\"ar\":\"أقمشة الملابس\",\"wo\":\"Tissus habillement\"}", "{\"fr\":\"Tissus pour habillement — Achat en gros\",\"en\":\"Garment Fabrics — Wholesale\",\"ar\":\"أقمشة الملابس — بالجملة\",\"wo\":\"Tissus habillement — Capp\"}", "{\"fr\":\"Découvrez Tissus pour habillement au Sénégal.\",\"en\":\"Discover Garment Fabrics in Senegal.\",\"ar\":\"اكتشف أقمشة الملابس في السنغال.\",\"wo\":\"Gis Tissus habillement ci Senegaal.\"}", "{\"fr\":[\"Tissus pour habillement\",\"gros\"],\"en\":[\"Garment Fabrics\",\"wholesale\"],\"ar\":[\"أقمشة الملابس\",\"بالجملة\"],\"wo\":[\"Tissus habillement\",\"capp\"]}", "null", '{}', '{}',
  "[\"meter\",\"yard\",\"roll\"]", "[\"type\",\"material\",\"length\",\"width\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-mode-textiles-textiles-tissus-linge-de-maison', 'cat-root-mode-textiles-textiles-tissus', 3, 'linge-de-maison', 'Bed', '/categories/linge-de-maison.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Linge de maison\",\"en\":\"Household Linens\",\"ar\":\"المفروشات المنزلية\",\"wo\":\"Linge maison\"}", "{\"fr\":\"Linge de maison — Achat en gros\",\"en\":\"Household Linens — Wholesale\",\"ar\":\"المفروشات المنزلية — بالجملة\",\"wo\":\"Linge maison — Capp\"}", "{\"fr\":\"Découvrez Linge de maison au Sénégal.\",\"en\":\"Discover Household Linens in Senegal.\",\"ar\":\"اكتشف المفروشات المنزلية في السنغال.\",\"wo\":\"Gis Linge maison ci Senegaal.\"}", "{\"fr\":[\"Linge de maison\",\"gros\"],\"en\":[\"Household Linens\",\"wholesale\"],\"ar\":[\"المفروشات المنزلية\",\"بالجملة\"],\"wo\":[\"Linge maison\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"size\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"size\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene', NULL, 1, 'beaute-sante-hygiene', 'Sparkles', '/categories/beaute-sante-hygiene.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Beauté, Santé & Hygiène\",\"en\":\"Beauty, Health & Hygiene\",\"ar\":\"الجمال والصحة والنظافة\",\"wo\":\"Ndaw, Sañse ak Settle\"}", "{\"fr\":\"Beauté, Santé & Hygiène — Achat en gros\",\"en\":\"Beauty, Health & Hygiene — Wholesale\",\"ar\":\"الجمال والصحة والنظافة — بالجملة\",\"wo\":\"Ndaw, Sañse ak Settle — Capp\"}", "{\"fr\":\"Découvrez Beauté, Santé & Hygiène au Sénégal.\",\"en\":\"Discover Beauty, Health & Hygiene in Senegal.\",\"ar\":\"اكتشف الجمال والصحة والنظافة في السنغال.\",\"wo\":\"Gis Ndaw, Sañse ak Settle ci Senegaal.\"}", "{\"fr\":[\"Beauté, Santé & Hygiène\",\"gros\"],\"en\":[\"Beauty, Health & Hygiene\",\"wholesale\"],\"ar\":[\"الجمال والصحة والنظافة\",\"بالجملة\"],\"wo\":[\"Ndaw, Sañse ak Settle\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.1,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-cosmetiques', 'cat-root-beaute-sante-hygiene', 2, 'cosmetiques', 'Sparkles', '/categories/cosmetiques.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Cosmétiques\",\"en\":\"Cosmetics\",\"ar\":\"مستحضرات التجميل\",\"wo\":\"Cosmétiques\"}", "{\"fr\":\"Cosmétiques — Achat en gros\",\"en\":\"Cosmetics — Wholesale\",\"ar\":\"مستحضرات التجميل — بالجملة\",\"wo\":\"Cosmétiques — Capp\"}", "{\"fr\":\"Découvrez Cosmétiques au Sénégal.\",\"en\":\"Discover Cosmetics in Senegal.\",\"ar\":\"اكتشف مستحضرات التجميل في السنغال.\",\"wo\":\"Gis Cosmétiques ci Senegaal.\"}", "{\"fr\":[\"Cosmétiques\",\"gros\"],\"en\":[\"Cosmetics\",\"wholesale\"],\"ar\":[\"مستحضرات التجميل\",\"بالجملة\"],\"wo\":[\"Cosmétiques\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-cosmetiques-soins-du-visage', 'cat-root-beaute-sante-hygiene-cosmetiques', 3, 'soins-du-visage', 'Smile', '/categories/soins-du-visage.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Soins du visage\",\"en\":\"Face Care\",\"ar\":\"العناية بالوجه\",\"wo\":\"Soins visage\"}", "{\"fr\":\"Soins du visage — Achat en gros\",\"en\":\"Face Care — Wholesale\",\"ar\":\"العناية بالوجه — بالجملة\",\"wo\":\"Soins visage — Capp\"}", "{\"fr\":\"Découvrez Soins du visage au Sénégal.\",\"en\":\"Discover Face Care in Senegal.\",\"ar\":\"اكتشف العناية بالوجه في السنغال.\",\"wo\":\"Gis Soins visage ci Senegaal.\"}", "{\"fr\":[\"Soins du visage\",\"gros\"],\"en\":[\"Face Care\",\"wholesale\"],\"ar\":[\"العناية بالوجه\",\"بالجملة\"],\"wo\":[\"Soins visage\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"skin_type\",\"volume\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"skin_type\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-cosmetiques-soins-corporels', 'cat-root-beaute-sante-hygiene-cosmetiques', 3, 'soins-corporels', 'Heart', '/categories/soins-corporels.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Soins corporels\",\"en\":\"Body Care\",\"ar\":\"العناية بالجسم\",\"wo\":\"Soins corps\"}", "{\"fr\":\"Soins corporels — Achat en gros\",\"en\":\"Body Care — Wholesale\",\"ar\":\"العناية بالجسم — بالجملة\",\"wo\":\"Soins corps — Capp\"}", "{\"fr\":\"Découvrez Soins corporels au Sénégal.\",\"en\":\"Discover Body Care in Senegal.\",\"ar\":\"اكتشف العناية بالجسم في السنغال.\",\"wo\":\"Gis Soins corps ci Senegaal.\"}", "{\"fr\":[\"Soins corporels\",\"gros\"],\"en\":[\"Body Care\",\"wholesale\"],\"ar\":[\"العناية بالجسم\",\"بالجملة\"],\"wo\":[\"Soins corps\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"skin_type\",\"volume\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"skin_type\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-cosmetiques-maquillage', 'cat-root-beaute-sante-hygiene-cosmetiques', 3, 'maquillage', 'Palette', '/categories/maquillage.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Maquillage\",\"en\":\"Makeup\",\"ar\":\"المكياج\",\"wo\":\"Maquillage\"}", "{\"fr\":\"Maquillage — Achat en gros\",\"en\":\"Makeup — Wholesale\",\"ar\":\"المكياج — بالجملة\",\"wo\":\"Maquillage — Capp\"}", "{\"fr\":\"Découvrez Maquillage au Sénégal.\",\"en\":\"Discover Makeup in Senegal.\",\"ar\":\"اكتشف المكياج في السنغال.\",\"wo\":\"Gis Maquillage ci Senegaal.\"}", "{\"fr\":[\"Maquillage\",\"gros\"],\"en\":[\"Makeup\",\"wholesale\"],\"ar\":[\"المكياج\",\"بالجملة\"],\"wo\":[\"Maquillage\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"color\",\"volume\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-cosmetiques-produits-capillaires', 'cat-root-beaute-sante-hygiene-cosmetiques', 3, 'produits-capillaires', 'Scissors', '/categories/produits-capillaires.jpg', 4, TRUE, TRUE,
  "{\"fr\":\"Produits capillaires\",\"en\":\"Hair Products\",\"ar\":\"منتجات الشعر\",\"wo\":\"Produits cheveux\"}", "{\"fr\":\"Produits capillaires — Achat en gros\",\"en\":\"Hair Products — Wholesale\",\"ar\":\"منتجات الشعر — بالجملة\",\"wo\":\"Produits cheveux — Capp\"}", "{\"fr\":\"Découvrez Produits capillaires au Sénégal.\",\"en\":\"Discover Hair Products in Senegal.\",\"ar\":\"اكتشف منتجات الشعر في السنغال.\",\"wo\":\"Gis Produits cheveux ci Senegaal.\"}", "{\"fr\":[\"Produits capillaires\",\"gros\"],\"en\":[\"Hair Products\",\"wholesale\"],\"ar\":[\"منتجات الشعر\",\"بالجملة\"],\"wo\":[\"Produits cheveux\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"hair_type\",\"volume\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"hair_type\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-hygiene-personnelle', 'cat-root-beaute-sante-hygiene', 2, 'hygiene-personnelle', 'Droplet', '/categories/hygiene-personnelle.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Hygiène personnelle\",\"en\":\"Personal Hygiene\",\"ar\":\"النظافة الشخصية\",\"wo\":\"Settle bu bopp\"}", "{\"fr\":\"Hygiène personnelle — Achat en gros\",\"en\":\"Personal Hygiene — Wholesale\",\"ar\":\"النظافة الشخصية — بالجملة\",\"wo\":\"Settle bu bopp — Capp\"}", "{\"fr\":\"Découvrez Hygiène personnelle au Sénégal.\",\"en\":\"Discover Personal Hygiene in Senegal.\",\"ar\":\"اكتشف النظافة الشخصية في السنغال.\",\"wo\":\"Gis Settle bu bopp ci Senegaal.\"}", "{\"fr\":[\"Hygiène personnelle\",\"gros\"],\"en\":[\"Personal Hygiene\",\"wholesale\"],\"ar\":[\"النظافة الشخصية\",\"بالجملة\"],\"wo\":[\"Settle bu bopp\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-hygiene-personnelle-savons-gels-douche', 'cat-root-beaute-sante-hygiene-hygiene-personnelle', 3, 'savons-gels-douche', 'Droplet', '/categories/savons-gels-douche.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Savons & Gels douche\",\"en\":\"Soaps & Shower Gels\",\"ar\":\"الصابون والشامبو\",\"wo\":\"Savons yi\"}", "{\"fr\":\"Savons & Gels douche — Achat en gros\",\"en\":\"Soaps & Shower Gels — Wholesale\",\"ar\":\"الصابون والشامبو — بالجملة\",\"wo\":\"Savons yi — Capp\"}", "{\"fr\":\"Découvrez Savons & Gels douche au Sénégal.\",\"en\":\"Discover Soaps & Shower Gels in Senegal.\",\"ar\":\"اكتشف الصابون والشامبو في السنغال.\",\"wo\":\"Gis Savons yi ci Senegaal.\"}", "{\"fr\":[\"Savons & Gels douche\",\"gros\"],\"en\":[\"Soaps & Shower Gels\",\"wholesale\"],\"ar\":[\"الصابون والشامبو\",\"بالجملة\"],\"wo\":[\"Savons yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"scent\",\"volume\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"scent\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-hygiene-personnelle-dentifrices-brosses', 'cat-root-beaute-sante-hygiene-hygiene-personnelle', 3, 'dentifrices-brosses', 'Smile', '/categories/dentifrices-brosses.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Dentifrices & Brosses\",\"en\":\"Toothpaste & Brushes\",\"ar\":\"معجون الأسنان والفرشاة\",\"wo\":\"Dentifrice\"}", "{\"fr\":\"Dentifrices & Brosses — Achat en gros\",\"en\":\"Toothpaste & Brushes — Wholesale\",\"ar\":\"معجون الأسنان والفرشاة — بالجملة\",\"wo\":\"Dentifrice — Capp\"}", "{\"fr\":\"Découvrez Dentifrices & Brosses au Sénégal.\",\"en\":\"Discover Toothpaste & Brushes in Senegal.\",\"ar\":\"اكتشف معجون الأسنان والفرشاة في السنغال.\",\"wo\":\"Gis Dentifrice ci Senegaal.\"}", "{\"fr\":[\"Dentifrices & Brosses\",\"gros\"],\"en\":[\"Toothpaste & Brushes\",\"wholesale\"],\"ar\":[\"معجون الأسنان والفرشاة\",\"بالجملة\"],\"wo\":[\"Dentifrice\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"quantity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-hygiene-personnelle-protection-hygienique', 'cat-root-beaute-sante-hygiene-hygiene-personnelle', 3, 'protection-hygienique', 'Shield', '/categories/protection-hygienique.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Protection hygiénique\",\"en\":\"Hygiene Protection\",\"ar\":\"الحماية الصحية\",\"wo\":\"Protection hygiénique\"}", "{\"fr\":\"Protection hygiénique — Achat en gros\",\"en\":\"Hygiene Protection — Wholesale\",\"ar\":\"الحماية الصحية — بالجملة\",\"wo\":\"Protection hygiénique — Capp\"}", "{\"fr\":\"Découvrez Protection hygiénique au Sénégal.\",\"en\":\"Discover Hygiene Protection in Senegal.\",\"ar\":\"اكتشف الحماية الصحية في السنغال.\",\"wo\":\"Gis Protection hygiénique ci Senegaal.\"}", "{\"fr\":[\"Protection hygiénique\",\"gros\"],\"en\":[\"Hygiene Protection\",\"wholesale\"],\"ar\":[\"الحماية الصحية\",\"بالجملة\"],\"wo\":[\"Protection hygiénique\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"size\",\"quantity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-sante-bien-etre', 'cat-root-beaute-sante-hygiene', 2, 'sante-bien-etre', 'Heart', '/categories/sante-bien-etre.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Santé & Bien-être\",\"en\":\"Health & Wellness\",\"ar\":\"الصحة والعافية\",\"wo\":\"Sañse ak Jàmm\"}", "{\"fr\":\"Santé & Bien-être — Achat en gros\",\"en\":\"Health & Wellness — Wholesale\",\"ar\":\"الصحة والعافية — بالجملة\",\"wo\":\"Sañse ak Jàmm — Capp\"}", "{\"fr\":\"Découvrez Santé & Bien-être au Sénégal.\",\"en\":\"Discover Health & Wellness in Senegal.\",\"ar\":\"اكتشف الصحة والعافية في السنغال.\",\"wo\":\"Gis Sañse ak Jàmm ci Senegaal.\"}", "{\"fr\":[\"Santé & Bien-être\",\"gros\"],\"en\":[\"Health & Wellness\",\"wholesale\"],\"ar\":[\"الصحة والعافية\",\"بالجملة\"],\"wo\":[\"Sañse ak Jàmm\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-sante-bien-etre-supplements-vitamines', 'cat-root-beaute-sante-hygiene-sante-bien-etre', 3, 'supplements-vitamines', 'Pill', '/categories/supplements-vitamines.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Suppléments & Vitamines\",\"en\":\"Supplements & Vitamins\",\"ar\":\"المكملات والفيتامينات\",\"wo\":\"Suppléments\"}", "{\"fr\":\"Suppléments & Vitamines — Achat en gros\",\"en\":\"Supplements & Vitamins — Wholesale\",\"ar\":\"المكملات والفيتامينات — بالجملة\",\"wo\":\"Suppléments — Capp\"}", "{\"fr\":\"Découvrez Suppléments & Vitamines au Sénégal.\",\"en\":\"Discover Supplements & Vitamins in Senegal.\",\"ar\":\"اكتشف المكملات والفيتامينات في السنغال.\",\"wo\":\"Gis Suppléments ci Senegaal.\"}", "{\"fr\":[\"Suppléments & Vitamines\",\"gros\"],\"en\":[\"Supplements & Vitamins\",\"wholesale\"],\"ar\":[\"المكملات والفيتامينات\",\"بالجملة\"],\"wo\":[\"Suppléments\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"quantity\",\"expiration_date\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"price\"]",
  TRUE, FALSE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-sante-bien-etre-appareils-de-sante', 'cat-root-beaute-sante-hygiene-sante-bien-etre', 3, 'appareils-de-sante', 'Activity', '/categories/appareils-de-sante.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Appareils de santé\",\"en\":\"Health Devices\",\"ar\":\"أجهزة الصحة\",\"wo\":\"Appareils santé\"}", "{\"fr\":\"Appareils de santé — Achat en gros\",\"en\":\"Health Devices — Wholesale\",\"ar\":\"أجهزة الصحة — بالجملة\",\"wo\":\"Appareils santé — Capp\"}", "{\"fr\":\"Découvrez Appareils de santé au Sénégal.\",\"en\":\"Discover Health Devices in Senegal.\",\"ar\":\"اكتشف أجهزة الصحة في السنغال.\",\"wo\":\"Gis Appareils santé ci Senegaal.\"}", "{\"fr\":[\"Appareils de santé\",\"gros\"],\"en\":[\"Health Devices\",\"wholesale\"],\"ar\":[\"أجهزة الصحة\",\"بالجملة\"],\"wo\":[\"Appareils santé\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-sante-bien-etre-premiers-secours', 'cat-root-beaute-sante-hygiene-sante-bien-etre', 3, 'premiers-secours', 'Bandage', '/categories/premiers-secours.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Premiers secours\",\"en\":\"First Aid\",\"ar\":\"الإسعافات الأولية\",\"wo\":\"Premiers secours\"}", "{\"fr\":\"Premiers secours — Achat en gros\",\"en\":\"First Aid — Wholesale\",\"ar\":\"الإسعافات الأولية — بالجملة\",\"wo\":\"Premiers secours — Capp\"}", "{\"fr\":\"Découvrez Premiers secours au Sénégal.\",\"en\":\"Discover First Aid in Senegal.\",\"ar\":\"اكتشف الإسعافات الأولية في السنغال.\",\"wo\":\"Gis Premiers secours ci Senegaal.\"}", "{\"fr\":[\"Premiers secours\",\"gros\"],\"en\":[\"First Aid\",\"wholesale\"],\"ar\":[\"الإسعافات الأولية\",\"بالجملة\"],\"wo\":[\"Premiers secours\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"quantity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-coiffure-soins-esthetiques', 'cat-root-beaute-sante-hygiene', 2, 'coiffure-soins-esthetiques', 'Scissors', '/categories/coiffure-soins-esthetiques.jpg', 4, TRUE, FALSE,
  "{\"fr\":\"Coiffure & Soins esthétiques\",\"en\":\"Hairdressing & Beauty\",\"ar\":\"الحلاقة والتجميل\",\"wo\":\"Coiffure\"}", "{\"fr\":\"Coiffure & Soins esthétiques — Achat en gros\",\"en\":\"Hairdressing & Beauty — Wholesale\",\"ar\":\"الحلاقة والتجميل — بالجملة\",\"wo\":\"Coiffure — Capp\"}", "{\"fr\":\"Découvrez Coiffure & Soins esthétiques au Sénégal.\",\"en\":\"Discover Hairdressing & Beauty in Senegal.\",\"ar\":\"اكتشف الحلاقة والتجميل في السنغال.\",\"wo\":\"Gis Coiffure ci Senegaal.\"}", "{\"fr\":[\"Coiffure & Soins esthétiques\",\"gros\"],\"en\":[\"Hairdressing & Beauty\",\"wholesale\"],\"ar\":[\"الحلاقة والتجميل\",\"بالجملة\"],\"wo\":[\"Coiffure\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-coiffure-soins-esthetiques-extensions-perruques', 'cat-root-beaute-sante-hygiene-coiffure-soins-esthetiques', 3, 'extensions-perruques', 'User', '/categories/extensions-perruques.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Extensions & Perruques\",\"en\":\"Extensions & Wigs\",\"ar\":\"الشعر المستعار والإكسسوارات\",\"wo\":\"Perruques\"}", "{\"fr\":\"Extensions & Perruques — Achat en gros\",\"en\":\"Extensions & Wigs — Wholesale\",\"ar\":\"الشعر المستعار والإكسسوارات — بالجملة\",\"wo\":\"Perruques — Capp\"}", "{\"fr\":\"Découvrez Extensions & Perruques au Sénégal.\",\"en\":\"Discover Extensions & Wigs in Senegal.\",\"ar\":\"اكتشف الشعر المستعار والإكسسوارات في السنغال.\",\"wo\":\"Gis Perruques ci Senegaal.\"}", "{\"fr\":[\"Extensions & Perruques\",\"gros\"],\"en\":[\"Extensions & Wigs\",\"wholesale\"],\"ar\":[\"الشعر المستعار والإكسسوارات\",\"بالجملة\"],\"wo\":[\"Perruques\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"length\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"length\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-beaute-sante-hygiene-coiffure-soins-esthetiques-materiel-esthetique', 'cat-root-beaute-sante-hygiene-coiffure-soins-esthetiques', 3, 'materiel-esthetique', 'Sparkles', '/categories/materiel-esthetique.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Matériel esthétique\",\"en\":\"Beauty Equipment\",\"ar\":\"معدات التجميل\",\"wo\":\"Matériel esthétique\"}", "{\"fr\":\"Matériel esthétique — Achat en gros\",\"en\":\"Beauty Equipment — Wholesale\",\"ar\":\"معدات التجميل — بالجملة\",\"wo\":\"Matériel esthétique — Capp\"}", "{\"fr\":\"Découvrez Matériel esthétique au Sénégal.\",\"en\":\"Discover Beauty Equipment in Senegal.\",\"ar\":\"اكتشف معدات التجميل في السنغال.\",\"wo\":\"Gis Matériel esthétique ci Senegaal.\"}", "{\"fr\":[\"Matériel esthétique\",\"gros\"],\"en\":[\"Beauty Equipment\",\"wholesale\"],\"ar\":[\"معدات التجميل\",\"بالجملة\"],\"wo\":[\"Matériel esthétique\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons', NULL, 1, 'alimentation-boissons', 'Apple', '/categories/alimentation-boissons.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Alimentation & Boissons\",\"en\":\"Food & Beverages\",\"ar\":\"الأغذية والمشروبات\",\"wo\":\"Lekk ak Naan\"}", "{\"fr\":\"Alimentation & Boissons — Achat en gros\",\"en\":\"Food & Beverages — Wholesale\",\"ar\":\"الأغذية والمشروبات — بالجملة\",\"wo\":\"Lekk ak Naan — Capp\"}", "{\"fr\":\"Découvrez Alimentation & Boissons au Sénégal.\",\"en\":\"Discover Food & Beverages in Senegal.\",\"ar\":\"اكتشف الأغذية والمشروبات في السنغال.\",\"wo\":\"Gis Lekk ak Naan ci Senegaal.\"}", "{\"fr\":[\"Alimentation & Boissons\",\"gros\"],\"en\":[\"Food & Beverages\",\"wholesale\"],\"ar\":[\"الأغذية والمشروبات\",\"بالجملة\"],\"wo\":[\"Lekk ak Naan\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.07,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-produits-alimentaires-de-base', 'cat-root-alimentation-boissons', 2, 'produits-alimentaires-de-base', 'Wheat', '/categories/produits-alimentaires-de-base.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Produits alimentaires de base\",\"en\":\"Staple Foods\",\"ar\":\"المنتجات الغذائية الأساسية\",\"wo\":\"Lekk yu bees\"}", "{\"fr\":\"Produits alimentaires de base — Achat en gros\",\"en\":\"Staple Foods — Wholesale\",\"ar\":\"المنتجات الغذائية الأساسية — بالجملة\",\"wo\":\"Lekk yu bees — Capp\"}", "{\"fr\":\"Découvrez Produits alimentaires de base au Sénégal.\",\"en\":\"Discover Staple Foods in Senegal.\",\"ar\":\"اكتشف المنتجات الغذائية الأساسية في السنغال.\",\"wo\":\"Gis Lekk yu bees ci Senegaal.\"}", "{\"fr\":[\"Produits alimentaires de base\",\"gros\"],\"en\":[\"Staple Foods\",\"wholesale\"],\"ar\":[\"المنتجات الغذائية الأساسية\",\"بالجملة\"],\"wo\":[\"Lekk yu bees\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-produits-alimentaires-de-base-riz-pates', 'cat-root-alimentation-boissons-produits-alimentaires-de-base', 3, 'riz-pates', 'Wheat', '/categories/riz-pates.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Riz & Pâtes\",\"en\":\"Rice & Pasta\",\"ar\":\"الأرز والمعكرونة\",\"wo\":\"Ceebu ak Pasta\"}", "{\"fr\":\"Riz & Pâtes — Achat en gros\",\"en\":\"Rice & Pasta — Wholesale\",\"ar\":\"الأرز والمعكرونة — بالجملة\",\"wo\":\"Ceebu ak Pasta — Capp\"}", "{\"fr\":\"Découvrez Riz & Pâtes au Sénégal.\",\"en\":\"Discover Rice & Pasta in Senegal.\",\"ar\":\"اكتشف الأرز والمعكرونة في السنغال.\",\"wo\":\"Gis Ceebu ak Pasta ci Senegaal.\"}", "{\"fr\":[\"Riz & Pâtes\",\"gros\"],\"en\":[\"Rice & Pasta\",\"wholesale\"],\"ar\":[\"الأرز والمعكرونة\",\"بالجملة\"],\"wo\":[\"Ceebu ak Pasta\",\"capp\"]}", "null", '{}', '{}',
  "[\"kg\",\"bag\",\"sack\",\"carton\"]", "[\"brand\",\"type\",\"weight\",\"origin\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"weight\",\"origin\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-produits-alimentaires-de-base-huiles-graisses', 'cat-root-alimentation-boissons-produits-alimentaires-de-base', 3, 'huiles-graisses', 'Droplet', '/categories/huiles-graisses.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Huiles & Graisses\",\"en\":\"Oils & Fats\",\"ar\":\"الزيوت والدهون\",\"wo\":\"Tëral\"}", "{\"fr\":\"Huiles & Graisses — Achat en gros\",\"en\":\"Oils & Fats — Wholesale\",\"ar\":\"الزيوت والدهون — بالجملة\",\"wo\":\"Tëral — Capp\"}", "{\"fr\":\"Découvrez Huiles & Graisses au Sénégal.\",\"en\":\"Discover Oils & Fats in Senegal.\",\"ar\":\"اكتشف الزيوت والدهون في السنغال.\",\"wo\":\"Gis Tëral ci Senegaal.\"}", "{\"fr\":[\"Huiles & Graisses\",\"gros\"],\"en\":[\"Oils & Fats\",\"wholesale\"],\"ar\":[\"الزيوت والدهون\",\"بالجملة\"],\"wo\":[\"Tëral\",\"capp\"]}", "null", '{}', '{}',
  "[\"liter\",\"bottle\",\"carton\"]", "[\"brand\",\"type\",\"volume\",\"origin\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"volume\",\"origin\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-produits-alimentaires-de-base-condiments-epices', 'cat-root-alimentation-boissons-produits-alimentaires-de-base', 3, 'condiments-epices', 'Flame', '/categories/condiments-epices.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Condiments & Épices\",\"en\":\"Condiments & Spices\",\"ar\":\"التوابل والبهارات\",\"wo\":\"Tàbbaxe\"}", "{\"fr\":\"Condiments & Épices — Achat en gros\",\"en\":\"Condiments & Spices — Wholesale\",\"ar\":\"التوابل والبهارات — بالجملة\",\"wo\":\"Tàbbaxe — Capp\"}", "{\"fr\":\"Découvrez Condiments & Épices au Sénégal.\",\"en\":\"Discover Condiments & Spices in Senegal.\",\"ar\":\"اكتشف التوابل والبهارات في السنغال.\",\"wo\":\"Gis Tàbbaxe ci Senegaal.\"}", "{\"fr\":[\"Condiments & Épices\",\"gros\"],\"en\":[\"Condiments & Spices\",\"wholesale\"],\"ar\":[\"التوابل والبهارات\",\"بالجملة\"],\"wo\":[\"Tàbbaxe\",\"capp\"]}", "null", '{}', '{}',
  "[\"gram\",\"kg\",\"jar\",\"carton\"]", "[\"brand\",\"type\",\"weight\",\"origin\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"weight\",\"origin\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-boissons', 'cat-root-alimentation-boissons', 2, 'boissons', 'CupSoda', '/categories/boissons.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Boissons\",\"en\":\"Beverages\",\"ar\":\"المشروبات\",\"wo\":\"Naan\"}", "{\"fr\":\"Boissons — Achat en gros\",\"en\":\"Beverages — Wholesale\",\"ar\":\"المشروبات — بالجملة\",\"wo\":\"Naan — Capp\"}", "{\"fr\":\"Découvrez Boissons au Sénégal.\",\"en\":\"Discover Beverages in Senegal.\",\"ar\":\"اكتشف المشروبات في السنغال.\",\"wo\":\"Gis Naan ci Senegaal.\"}", "{\"fr\":[\"Boissons\",\"gros\"],\"en\":[\"Beverages\",\"wholesale\"],\"ar\":[\"المشروبات\",\"بالجملة\"],\"wo\":[\"Naan\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-boissons-eaux-minerales', 'cat-root-alimentation-boissons-boissons', 3, 'eaux-minerales', 'Droplet', '/categories/eaux-minerales.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Eaux minérales\",\"en\":\"Mineral Water\",\"ar\":\"المياه المعدنية\",\"wo\":\"Ndox mi\"}", "{\"fr\":\"Eaux minérales — Achat en gros\",\"en\":\"Mineral Water — Wholesale\",\"ar\":\"المياه المعدنية — بالجملة\",\"wo\":\"Ndox mi — Capp\"}", "{\"fr\":\"Découvrez Eaux minérales au Sénégal.\",\"en\":\"Discover Mineral Water in Senegal.\",\"ar\":\"اكتشف المياه المعدنية في السنغال.\",\"wo\":\"Gis Ndox mi ci Senegaal.\"}", "{\"fr\":[\"Eaux minérales\",\"gros\"],\"en\":[\"Mineral Water\",\"wholesale\"],\"ar\":[\"المياه المعدنية\",\"بالجملة\"],\"wo\":[\"Ndox mi\",\"capp\"]}", "null", '{}', '{}',
  "[\"bottle\",\"pack_of_6\",\"carton\",\"palette\"]", "[\"brand\",\"volume\",\"packaging\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"volume\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-boissons-jus-nectars', 'cat-root-alimentation-boissons-boissons', 3, 'jus-nectars', 'CupSoda', '/categories/jus-nectars.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Jus & Nectars\",\"en\":\"Juices & Nectars\",\"ar\":\"العصائر والنكتار\",\"wo\":\"Jus yi\"}", "{\"fr\":\"Jus & Nectars — Achat en gros\",\"en\":\"Juices & Nectars — Wholesale\",\"ar\":\"العصائر والنكتار — بالجملة\",\"wo\":\"Jus yi — Capp\"}", "{\"fr\":\"Découvrez Jus & Nectars au Sénégal.\",\"en\":\"Discover Juices & Nectars in Senegal.\",\"ar\":\"اكتشف العصائر والنكتار في السنغال.\",\"wo\":\"Gis Jus yi ci Senegaal.\"}", "{\"fr\":[\"Jus & Nectars\",\"gros\"],\"en\":[\"Juices & Nectars\",\"wholesale\"],\"ar\":[\"العصائر والنكتار\",\"بالجملة\"],\"wo\":[\"Jus yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"bottle\",\"pack\",\"carton\"]", "[\"brand\",\"flavor\",\"volume\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"flavor\",\"volume\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-boissons-thes-cafes', 'cat-root-alimentation-boissons-boissons', 3, 'thes-cafes', 'Coffee', '/categories/thes-cafes.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Thés & Cafés\",\"en\":\"Teas & Coffees\",\"ar\":\"الشاي والقهوة\",\"wo\":\"Atte ak Kafe\"}", "{\"fr\":\"Thés & Cafés — Achat en gros\",\"en\":\"Teas & Coffees — Wholesale\",\"ar\":\"الشاي والقهوة — بالجملة\",\"wo\":\"Atte ak Kafe — Capp\"}", "{\"fr\":\"Découvrez Thés & Cafés au Sénégal.\",\"en\":\"Discover Teas & Coffees in Senegal.\",\"ar\":\"اكتشف الشاي والقهوة في السنغال.\",\"wo\":\"Gis Atte ak Kafe ci Senegaal.\"}", "{\"fr\":[\"Thés & Cafés\",\"gros\"],\"en\":[\"Teas & Coffees\",\"wholesale\"],\"ar\":[\"الشاي والقهوة\",\"بالجملة\"],\"wo\":[\"Atte ak Kafe\",\"capp\"]}", "null", '{}', '{}',
  "[\"gram\",\"kg\",\"box\",\"carton\"]", "[\"brand\",\"type\",\"weight\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"weight\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-alimentation-specialisee', 'cat-root-alimentation-boissons', 2, 'alimentation-specialisee', 'Apple', '/categories/alimentation-specialisee.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Alimentation spécialisée\",\"en\":\"Specialized Food\",\"ar\":\"الأغذية المتخصصة\",\"wo\":\"Lekk yu am solo\"}", "{\"fr\":\"Alimentation spécialisée — Achat en gros\",\"en\":\"Specialized Food — Wholesale\",\"ar\":\"الأغذية المتخصصة — بالجملة\",\"wo\":\"Lekk yu am solo — Capp\"}", "{\"fr\":\"Découvrez Alimentation spécialisée au Sénégal.\",\"en\":\"Discover Specialized Food in Senegal.\",\"ar\":\"اكتشف الأغذية المتخصصة في السنغال.\",\"wo\":\"Gis Lekk yu am solo ci Senegaal.\"}", "{\"fr\":[\"Alimentation spécialisée\",\"gros\"],\"en\":[\"Specialized Food\",\"wholesale\"],\"ar\":[\"الأغذية المتخصصة\",\"بالجملة\"],\"wo\":[\"Lekk yu am solo\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-alimentation-specialisee-produits-bio', 'cat-root-alimentation-boissons-alimentation-specialisee', 3, 'produits-bio', 'Leaf', '/categories/produits-bio.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Produits bio\",\"en\":\"Organic Products\",\"ar\":\"منتجات عضوية\",\"wo\":\"Produits bio\"}", "{\"fr\":\"Produits bio — Achat en gros\",\"en\":\"Organic Products — Wholesale\",\"ar\":\"منتجات عضوية — بالجملة\",\"wo\":\"Produits bio — Capp\"}", "{\"fr\":\"Découvrez Produits bio au Sénégal.\",\"en\":\"Discover Organic Products in Senegal.\",\"ar\":\"اكتشف منتجات عضوية في السنغال.\",\"wo\":\"Gis Produits bio ci Senegaal.\"}", "{\"fr\":[\"Produits bio\",\"gros\"],\"en\":[\"Organic Products\",\"wholesale\"],\"ar\":[\"منتجات عضوية\",\"بالجملة\"],\"wo\":[\"Produits bio\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"certification\",\"weight\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"certification\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-alimentation-specialisee-aliments-pour-bebe', 'cat-root-alimentation-boissons-alimentation-specialisee', 3, 'aliments-pour-bebe', 'Baby', '/categories/aliments-pour-bebe.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Aliments pour bébé\",\"en\":\"Baby Food\",\"ar\":\"أغذية الأطفال\",\"wo\":\"Lekk bu mbugal\"}", "{\"fr\":\"Aliments pour bébé — Achat en gros\",\"en\":\"Baby Food — Wholesale\",\"ar\":\"أغذية الأطفال — بالجملة\",\"wo\":\"Lekk bu mbugal — Capp\"}", "{\"fr\":\"Découvrez Aliments pour bébé au Sénégal.\",\"en\":\"Discover Baby Food in Senegal.\",\"ar\":\"اكتشف أغذية الأطفال في السنغال.\",\"wo\":\"Gis Lekk bu mbugal ci Senegaal.\"}", "{\"fr\":[\"Aliments pour bébé\",\"gros\"],\"en\":[\"Baby Food\",\"wholesale\"],\"ar\":[\"أغذية الأطفال\",\"بالجملة\"],\"wo\":[\"Lekk bu mbugal\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"age\",\"weight\",\"expiration_date\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"age\",\"price\"]",
  TRUE, FALSE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-alimentation-boissons-alimentation-specialisee-aliments-pour-animaux', 'cat-root-alimentation-boissons-alimentation-specialisee', 3, 'aliments-pour-animaux', 'Dog', '/categories/aliments-pour-animaux.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Aliments pour animaux\",\"en\":\"Pet Food\",\"ar\":\"أغذية الحيوانات\",\"wo\":\"Lekk xay\"}", "{\"fr\":\"Aliments pour animaux — Achat en gros\",\"en\":\"Pet Food — Wholesale\",\"ar\":\"أغذية الحيوانات — بالجملة\",\"wo\":\"Lekk xay — Capp\"}", "{\"fr\":\"Découvrez Aliments pour animaux au Sénégal.\",\"en\":\"Discover Pet Food in Senegal.\",\"ar\":\"اكتشف أغذية الحيوانات في السنغال.\",\"wo\":\"Gis Lekk xay ci Senegaal.\"}", "{\"fr\":[\"Aliments pour animaux\",\"gros\"],\"en\":[\"Pet Food\",\"wholesale\"],\"ar\":[\"أغذية الحيوانات\",\"بالجملة\"],\"wo\":[\"Lekk xay\",\"capp\"]}", "null", '{}', '{}',
  "[\"kg\",\"bag\",\"carton\"]", "[\"brand\",\"type\",\"animal\",\"weight\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"animal\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche', NULL, 1, 'agriculture-elevage-peche', 'Tractor', '/categories/agriculture-elevage-peche.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Agriculture, Élevage & Pêche\",\"en\":\"Agriculture, Livestock & Fishing\",\"ar\":\"الزراعة والثروة الحيوانية والصيد\",\"wo\":\"Agriculture, éleve ak Péec\"}", "{\"fr\":\"Agriculture, Élevage & Pêche — Achat en gros\",\"en\":\"Agriculture, Livestock & Fishing — Wholesale\",\"ar\":\"الزراعة والثروة الحيوانية والصيد — بالجملة\",\"wo\":\"Agriculture, éleve ak Péec — Capp\"}", "{\"fr\":\"Découvrez Agriculture, Élevage & Pêche au Sénégal.\",\"en\":\"Discover Agriculture, Livestock & Fishing in Senegal.\",\"ar\":\"اكتشف الزراعة والثروة الحيوانية والصيد في السنغال.\",\"wo\":\"Gis Agriculture, éleve ak Péec ci Senegaal.\"}", "{\"fr\":[\"Agriculture, Élevage & Pêche\",\"gros\"],\"en\":[\"Agriculture, Livestock & Fishing\",\"wholesale\"],\"ar\":[\"الزراعة والثروة الحيوانية والصيد\",\"بالجملة\"],\"wo\":[\"Agriculture, éleve ak Péec\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.07,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-materiel-agricole', 'cat-root-agriculture-elevage-peche', 2, 'materiel-agricole', 'Tractor', '/categories/materiel-agricole.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Matériel agricole\",\"en\":\"Agricultural Equipment\",\"ar\":\"معدات زراعية\",\"wo\":\"Matériel agricole\"}", "{\"fr\":\"Matériel agricole — Achat en gros\",\"en\":\"Agricultural Equipment — Wholesale\",\"ar\":\"معدات زراعية — بالجملة\",\"wo\":\"Matériel agricole — Capp\"}", "{\"fr\":\"Découvrez Matériel agricole au Sénégal.\",\"en\":\"Discover Agricultural Equipment in Senegal.\",\"ar\":\"اكتشف معدات زراعية في السنغال.\",\"wo\":\"Gis Matériel agricole ci Senegaal.\"}", "{\"fr\":[\"Matériel agricole\",\"gros\"],\"en\":[\"Agricultural Equipment\",\"wholesale\"],\"ar\":[\"معدات زراعية\",\"بالجملة\"],\"wo\":[\"Matériel agricole\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-materiel-agricole-tracteurs-motoculteurs', 'cat-root-agriculture-elevage-peche-materiel-agricole', 3, 'tracteurs-motoculteurs', 'Tractor', '/categories/tracteurs-motoculteurs.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Tracteurs & Motoculteurs\",\"en\":\"Tractors & Tillers\",\"ar\":\"الجرارات والمحراث\",\"wo\":\"Tracteurs yi\"}", "{\"fr\":\"Tracteurs & Motoculteurs — Achat en gros\",\"en\":\"Tractors & Tillers — Wholesale\",\"ar\":\"الجرارات والمحراث — بالجملة\",\"wo\":\"Tracteurs yi — Capp\"}", "{\"fr\":\"Découvrez Tracteurs & Motoculteurs au Sénégal.\",\"en\":\"Discover Tractors & Tillers in Senegal.\",\"ar\":\"اكتشف الجرارات والمحراث في السنغال.\",\"wo\":\"Gis Tracteurs yi ci Senegaal.\"}", "{\"fr\":[\"Tracteurs & Motoculteurs\",\"gros\"],\"en\":[\"Tractors & Tillers\",\"wholesale\"],\"ar\":[\"الجرارات والمحراث\",\"بالجملة\"],\"wo\":[\"Tracteurs yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"palette\"]", "[\"brand\",\"power\",\"type\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"power\",\"type\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-materiel-agricole-systemes-d-irrigation', 'cat-root-agriculture-elevage-peche-materiel-agricole', 3, 'systemes-d-irrigation', 'Droplets', '/categories/systemes-d-irrigation.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Systèmes d'irrigation\",\"en\":\"Irrigation Systems\",\"ar\":\"أنظمة الري\",\"wo\":\"Irrigation\"}", "{\"fr\":\"Systèmes d'irrigation — Achat en gros\",\"en\":\"Irrigation Systems — Wholesale\",\"ar\":\"أنظمة الري — بالجملة\",\"wo\":\"Irrigation — Capp\"}", "{\"fr\":\"Découvrez Systèmes d'irrigation au Sénégal.\",\"en\":\"Discover Irrigation Systems in Senegal.\",\"ar\":\"اكتشف أنظمة الري في السنغال.\",\"wo\":\"Gis Irrigation ci Senegaal.\"}", "{\"fr\":[\"Systèmes d'irrigation\",\"gros\"],\"en\":[\"Irrigation Systems\",\"wholesale\"],\"ar\":[\"أنظمة الري\",\"بالجملة\"],\"wo\":[\"Irrigation\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"flow_rate\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"flow_rate\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-materiel-agricole-pieces-agricoles', 'cat-root-agriculture-elevage-peche-materiel-agricole', 3, 'pieces-agricoles', 'Wrench', '/categories/pieces-agricoles.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Pièces agricoles\",\"en\":\"Agricultural Parts\",\"ar\":\"قطع زراعية\",\"wo\":\"Benn agricole\"}", "{\"fr\":\"Pièces agricoles — Achat en gros\",\"en\":\"Agricultural Parts — Wholesale\",\"ar\":\"قطع زراعية — بالجملة\",\"wo\":\"Benn agricole — Capp\"}", "{\"fr\":\"Découvrez Pièces agricoles au Sénégal.\",\"en\":\"Discover Agricultural Parts in Senegal.\",\"ar\":\"اكتشف قطع زراعية في السنغال.\",\"wo\":\"Gis Benn agricole ci Senegaal.\"}", "{\"fr\":[\"Pièces agricoles\",\"gros\"],\"en\":[\"Agricultural Parts\",\"wholesale\"],\"ar\":[\"قطع زراعية\",\"بالجملة\"],\"wo\":[\"Benn agricole\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"model_compatible\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"model_compatible\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-intrants-agricoles', 'cat-root-agriculture-elevage-peche', 2, 'intrants-agricoles', 'Leaf', '/categories/intrants-agricoles.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Intrants agricoles\",\"en\":\"Agricultural Inputs\",\"ar\":\"المدخلات الزراعية\",\"wo\":\"Intrants agricoles\"}", "{\"fr\":\"Intrants agricoles — Achat en gros\",\"en\":\"Agricultural Inputs — Wholesale\",\"ar\":\"المدخلات الزراعية — بالجملة\",\"wo\":\"Intrants agricoles — Capp\"}", "{\"fr\":\"Découvrez Intrants agricoles au Sénégal.\",\"en\":\"Discover Agricultural Inputs in Senegal.\",\"ar\":\"اكتشف المدخلات الزراعية في السنغال.\",\"wo\":\"Gis Intrants agricoles ci Senegaal.\"}", "{\"fr\":[\"Intrants agricoles\",\"gros\"],\"en\":[\"Agricultural Inputs\",\"wholesale\"],\"ar\":[\"المدخلات الزراعية\",\"بالجملة\"],\"wo\":[\"Intrants agricoles\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-intrants-agricoles-semences-plants', 'cat-root-agriculture-elevage-peche-intrants-agricoles', 3, 'semences-plants', 'Leaf', '/categories/semences-plants.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Semences & Plants\",\"en\":\"Seeds & Plants\",\"ar\":\"البذور والشتلات\",\"wo\":\"Semences\"}", "{\"fr\":\"Semences & Plants — Achat en gros\",\"en\":\"Seeds & Plants — Wholesale\",\"ar\":\"البذور والشتلات — بالجملة\",\"wo\":\"Semences — Capp\"}", "{\"fr\":\"Découvrez Semences & Plants au Sénégal.\",\"en\":\"Discover Seeds & Plants in Senegal.\",\"ar\":\"اكتشف البذور والشتلات في السنغال.\",\"wo\":\"Gis Semences ci Senegaal.\"}", "{\"fr\":[\"Semences & Plants\",\"gros\"],\"en\":[\"Seeds & Plants\",\"wholesale\"],\"ar\":[\"البذور والشتلات\",\"بالجملة\"],\"wo\":[\"Semences\",\"capp\"]}", "null", '{}', '{}',
  "[\"gram\",\"kg\",\"packet\",\"sack\"]", "[\"type\",\"species\",\"weight\",\"origin\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"species\",\"origin\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-intrants-agricoles-engrais', 'cat-root-agriculture-elevage-peche-intrants-agricoles', 3, 'engrais', 'Flask', '/categories/engrais.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Engrais\",\"en\":\"Fertilizers\",\"ar\":\"الأسمدة\",\"wo\":\"Engrais\"}", "{\"fr\":\"Engrais — Achat en gros\",\"en\":\"Fertilizers — Wholesale\",\"ar\":\"الأسمدة — بالجملة\",\"wo\":\"Engrais — Capp\"}", "{\"fr\":\"Découvrez Engrais au Sénégal.\",\"en\":\"Discover Fertilizers in Senegal.\",\"ar\":\"اكتشف الأسمدة في السنغال.\",\"wo\":\"Gis Engrais ci Senegaal.\"}", "{\"fr\":[\"Engrais\",\"gros\"],\"en\":[\"Fertilizers\",\"wholesale\"],\"ar\":[\"الأسمدة\",\"بالجملة\"],\"wo\":[\"Engrais\",\"capp\"]}", "null", '{}', '{}',
  "[\"kg\",\"sack\",\"carton\"]", "[\"brand\",\"type\",\"composition\",\"weight\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"composition\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-intrants-agricoles-pesticides-herbicides', 'cat-root-agriculture-elevage-peche-intrants-agricoles', 3, 'pesticides-herbicides', 'Spray', '/categories/pesticides-herbicides.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Pesticides & Herbicides\",\"en\":\"Pesticides & Herbicides\",\"ar\":\"المبيدات والمبيدات العشبية\",\"wo\":\"Pesticides\"}", "{\"fr\":\"Pesticides & Herbicides — Achat en gros\",\"en\":\"Pesticides & Herbicides — Wholesale\",\"ar\":\"المبيدات والمبيدات العشبية — بالجملة\",\"wo\":\"Pesticides — Capp\"}", "{\"fr\":\"Découvrez Pesticides & Herbicides au Sénégal.\",\"en\":\"Discover Pesticides & Herbicides in Senegal.\",\"ar\":\"اكتشف المبيدات والمبيدات العشبية في السنغال.\",\"wo\":\"Gis Pesticides ci Senegaal.\"}", "{\"fr\":[\"Pesticides & Herbicides\",\"gros\"],\"en\":[\"Pesticides & Herbicides\",\"wholesale\"],\"ar\":[\"المبيدات والمبيدات العشبية\",\"بالجملة\"],\"wo\":[\"Pesticides\",\"capp\"]}", "null", '{}', '{}',
  "[\"liter\",\"bottle\",\"carton\"]", "[\"brand\",\"type\",\"active_ingredient\",\"volume\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"active_ingredient\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-elevage-peche', 'cat-root-agriculture-elevage-peche', 2, 'elevage-peche', 'Fish', '/categories/elevage-peche.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Élevage & Pêche\",\"en\":\"Livestock & Fishing\",\"ar\":\"الثروة الحيوانية والصيد\",\"wo\":\"Élevage ak Péec\"}", "{\"fr\":\"Élevage & Pêche — Achat en gros\",\"en\":\"Livestock & Fishing — Wholesale\",\"ar\":\"الثروة الحيوانية والصيد — بالجملة\",\"wo\":\"Élevage ak Péec — Capp\"}", "{\"fr\":\"Découvrez Élevage & Pêche au Sénégal.\",\"en\":\"Discover Livestock & Fishing in Senegal.\",\"ar\":\"اكتشف الثروة الحيوانية والصيد في السنغال.\",\"wo\":\"Gis Élevage ak Péec ci Senegaal.\"}", "{\"fr\":[\"Élevage & Pêche\",\"gros\"],\"en\":[\"Livestock & Fishing\",\"wholesale\"],\"ar\":[\"الثروة الحيوانية والصيد\",\"بالجملة\"],\"wo\":[\"Élevage ak Péec\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-elevage-peche-materiel-d-elevage', 'cat-root-agriculture-elevage-peche-elevage-peche', 3, 'materiel-d-elevage', 'Bone', '/categories/materiel-d-elevage.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Matériel d'élevage\",\"en\":\"Livestock Equipment\",\"ar\":\"معدات تربية الحيوان\",\"wo\":\"Matériel élevage\"}", "{\"fr\":\"Matériel d'élevage — Achat en gros\",\"en\":\"Livestock Equipment — Wholesale\",\"ar\":\"معدات تربية الحيوان — بالجملة\",\"wo\":\"Matériel élevage — Capp\"}", "{\"fr\":\"Découvrez Matériel d'élevage au Sénégal.\",\"en\":\"Discover Livestock Equipment in Senegal.\",\"ar\":\"اكتشف معدات تربية الحيوان في السنغال.\",\"wo\":\"Gis Matériel élevage ci Senegaal.\"}", "{\"fr\":[\"Matériel d'élevage\",\"gros\"],\"en\":[\"Livestock Equipment\",\"wholesale\"],\"ar\":[\"معدات تربية الحيوان\",\"بالجملة\"],\"wo\":[\"Matériel élevage\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-elevage-peche-materiel-de-peche', 'cat-root-agriculture-elevage-peche-elevage-peche', 3, 'materiel-de-peche', 'Fish', '/categories/materiel-de-peche.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Matériel de pêche\",\"en\":\"Fishing Equipment\",\"ar\":\"معدات الصيد\",\"wo\":\"Péec\"}", "{\"fr\":\"Matériel de pêche — Achat en gros\",\"en\":\"Fishing Equipment — Wholesale\",\"ar\":\"معدات الصيد — بالجملة\",\"wo\":\"Péec — Capp\"}", "{\"fr\":\"Découvrez Matériel de pêche au Sénégal.\",\"en\":\"Discover Fishing Equipment in Senegal.\",\"ar\":\"اكتشف معدات الصيد في السنغال.\",\"wo\":\"Gis Péec ci Senegaal.\"}", "{\"fr\":[\"Matériel de pêche\",\"gros\"],\"en\":[\"Fishing Equipment\",\"wholesale\"],\"ar\":[\"معدات الصيد\",\"بالجملة\"],\"wo\":[\"Péec\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-agriculture-elevage-peche-elevage-peche-aliments-pour-betail', 'cat-root-agriculture-elevage-peche-elevage-peche', 3, 'aliments-pour-betail', 'Wheat', '/categories/aliments-pour-betail.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Aliments pour bétail\",\"en\":\"Livestock Feed\",\"ar\":\"أغذية الماشية\",\"wo\":\"Lekk bétail\"}", "{\"fr\":\"Aliments pour bétail — Achat en gros\",\"en\":\"Livestock Feed — Wholesale\",\"ar\":\"أغذية الماشية — بالجملة\",\"wo\":\"Lekk bétail — Capp\"}", "{\"fr\":\"Découvrez Aliments pour bétail au Sénégal.\",\"en\":\"Discover Livestock Feed in Senegal.\",\"ar\":\"اكتشف أغذية الماشية في السنغال.\",\"wo\":\"Gis Lekk bétail ci Senegaal.\"}", "{\"fr\":[\"Aliments pour bétail\",\"gros\"],\"en\":[\"Livestock Feed\",\"wholesale\"],\"ar\":[\"أغذية الماشية\",\"بالجملة\"],\"wo\":[\"Lekk bétail\",\"capp\"]}", "null", '{}', '{}',
  "[\"kg\",\"sack\",\"palette\"]", "[\"brand\",\"type\",\"animal\",\"weight\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"animal\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage', NULL, 1, 'bricolage-construction-outillage', 'Hammer', '/categories/bricolage-construction-outillage.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Bricolage, Construction & Outillage\",\"en\":\"DIY, Construction & Tools\",\"ar\":\"الأعمال اليدوية والبناء والأدوات\",\"wo\":\"Bricolage, Construction ak Outillage\"}", "{\"fr\":\"Bricolage, Construction & Outillage — Achat en gros\",\"en\":\"DIY, Construction & Tools — Wholesale\",\"ar\":\"الأعمال اليدوية والبناء والأدوات — بالجملة\",\"wo\":\"Bricolage, Construction ak Outillage — Capp\"}", "{\"fr\":\"Découvrez Bricolage, Construction & Outillage au Sénégal.\",\"en\":\"Discover DIY, Construction & Tools in Senegal.\",\"ar\":\"اكتشف الأعمال اليدوية والبناء والأدوات في السنغال.\",\"wo\":\"Gis Bricolage, Construction ak Outillage ci Senegaal.\"}", "{\"fr\":[\"Bricolage, Construction & Outillage\",\"gros\"],\"en\":[\"DIY, Construction & Tools\",\"wholesale\"],\"ar\":[\"الأعمال اليدوية والبناء والأدوات\",\"بالجملة\"],\"wo\":[\"Bricolage, Construction ak Outillage\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-outillage-electrique', 'cat-root-bricolage-construction-outillage', 2, 'outillage-electrique', 'Drill', '/categories/outillage-electrique.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Outillage électrique\",\"en\":\"Power Tools\",\"ar\":\"الأدوات الكهربائية\",\"wo\":\"Outillage électrique\"}", "{\"fr\":\"Outillage électrique — Achat en gros\",\"en\":\"Power Tools — Wholesale\",\"ar\":\"الأدوات الكهربائية — بالجملة\",\"wo\":\"Outillage électrique — Capp\"}", "{\"fr\":\"Découvrez Outillage électrique au Sénégal.\",\"en\":\"Discover Power Tools in Senegal.\",\"ar\":\"اكتشف الأدوات الكهربائية في السنغال.\",\"wo\":\"Gis Outillage électrique ci Senegaal.\"}", "{\"fr\":[\"Outillage électrique\",\"gros\"],\"en\":[\"Power Tools\",\"wholesale\"],\"ar\":[\"الأدوات الكهربائية\",\"بالجملة\"],\"wo\":[\"Outillage électrique\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-outillage-electrique-perceuses-visseus', 'cat-root-bricolage-construction-outillage-outillage-electrique', 3, 'perceuses-visseuses', 'Drill', '/categories/perceuses-visseuses.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Perceuses & Visseuses\",\"en\":\"Drills & Screwdrivers\",\"ar\":\"المثاقب والمفكات\",\"wo\":\"Perceuses\"}", "{\"fr\":\"Perceuses & Visseuses — Achat en gros\",\"en\":\"Drills & Screwdrivers — Wholesale\",\"ar\":\"المثاقب والمفكات — بالجملة\",\"wo\":\"Perceuses — Capp\"}", "{\"fr\":\"Découvrez Perceuses & Visseuses au Sénégal.\",\"en\":\"Discover Drills & Screwdrivers in Senegal.\",\"ar\":\"اكتشف المثاقب والمفكات في السنغال.\",\"wo\":\"Gis Perceuses ci Senegaal.\"}", "{\"fr\":[\"Perceuses & Visseuses\",\"gros\"],\"en\":[\"Drills & Screwdrivers\",\"wholesale\"],\"ar\":[\"المثاقب والمفكات\",\"بالجملة\"],\"wo\":[\"Perceuses\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"power\",\"voltage\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"power\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-outillage-electrique-meuleuses-scies', 'cat-root-bricolage-construction-outillage-outillage-electrique', 3, 'meuleuses-scies', 'Disc', '/categories/meuleuses-scies.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Meuleuses & Scies\",\"en\":\"Grinders & Saws\",\"ar\":\"الطحنات والمناشير\",\"wo\":\"Meuleuses\"}", "{\"fr\":\"Meuleuses & Scies — Achat en gros\",\"en\":\"Grinders & Saws — Wholesale\",\"ar\":\"الطحنات والمناشير — بالجملة\",\"wo\":\"Meuleuses — Capp\"}", "{\"fr\":\"Découvrez Meuleuses & Scies au Sénégal.\",\"en\":\"Discover Grinders & Saws in Senegal.\",\"ar\":\"اكتشف الطحنات والمناشير في السنغال.\",\"wo\":\"Gis Meuleuses ci Senegaal.\"}", "{\"fr\":[\"Meuleuses & Scies\",\"gros\"],\"en\":[\"Grinders & Saws\",\"wholesale\"],\"ar\":[\"الطحنات والمناشير\",\"بالجملة\"],\"wo\":[\"Meuleuses\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"power\",\"disc_size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"power\",\"disc_size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-outillage-electrique-compresseurs-pist', 'cat-root-bricolage-construction-outillage-outillage-electrique', 3, 'compresseurs-pistolets', 'Wind', '/categories/compresseurs-pistolets.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Compresseurs & Pistolets\",\"en\":\"Compressors & Spray Guns\",\"ar\":\"الضاغطات والمسدسات\",\"wo\":\"Compresseurs\"}", "{\"fr\":\"Compresseurs & Pistolets — Achat en gros\",\"en\":\"Compressors & Spray Guns — Wholesale\",\"ar\":\"الضاغطات والمسدسات — بالجملة\",\"wo\":\"Compresseurs — Capp\"}", "{\"fr\":\"Découvrez Compresseurs & Pistolets au Sénégal.\",\"en\":\"Discover Compressors & Spray Guns in Senegal.\",\"ar\":\"اكتشف الضاغطات والمسدسات في السنغال.\",\"wo\":\"Gis Compresseurs ci Senegaal.\"}", "{\"fr\":[\"Compresseurs & Pistolets\",\"gros\"],\"en\":[\"Compressors & Spray Guns\",\"wholesale\"],\"ar\":[\"الضاغطات والمسدسات\",\"بالجملة\"],\"wo\":[\"Compresseurs\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"power\",\"tank_capacity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"power\",\"tank_capacity\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-outillage-a-main', 'cat-root-bricolage-construction-outillage', 2, 'outillage-a-main', 'Hammer', '/categories/outillage-a-main.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Outillage à main\",\"en\":\"Hand Tools\",\"ar\":\"الأدوات اليدوية\",\"wo\":\"Outillage à main\"}", "{\"fr\":\"Outillage à main — Achat en gros\",\"en\":\"Hand Tools — Wholesale\",\"ar\":\"الأدوات اليدوية — بالجملة\",\"wo\":\"Outillage à main — Capp\"}", "{\"fr\":\"Découvrez Outillage à main au Sénégal.\",\"en\":\"Discover Hand Tools in Senegal.\",\"ar\":\"اكتشف الأدوات اليدوية في السنغال.\",\"wo\":\"Gis Outillage à main ci Senegaal.\"}", "{\"fr\":[\"Outillage à main\",\"gros\"],\"en\":[\"Hand Tools\",\"wholesale\"],\"ar\":[\"الأدوات اليدوية\",\"بالجملة\"],\"wo\":[\"Outillage à main\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-outillage-a-main-outils-de-coupe-mesur', 'cat-root-bricolage-construction-outillage-outillage-a-main', 3, 'outils-de-coupe-mesure', 'Ruler', '/categories/outils-de-coupe-mesure.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Outils de coupe & Mesure\",\"en\":\"Cutting & Measuring Tools\",\"ar\":\"أدوات القطع والقياس\",\"wo\":\"Outils mesure\"}", "{\"fr\":\"Outils de coupe & Mesure — Achat en gros\",\"en\":\"Cutting & Measuring Tools — Wholesale\",\"ar\":\"أدوات القطع والقياس — بالجملة\",\"wo\":\"Outils mesure — Capp\"}", "{\"fr\":\"Découvrez Outils de coupe & Mesure au Sénégal.\",\"en\":\"Discover Cutting & Measuring Tools in Senegal.\",\"ar\":\"اكتشف أدوات القطع والقياس في السنغال.\",\"wo\":\"Gis Outils mesure ci Senegaal.\"}", "{\"fr\":[\"Outils de coupe & Mesure\",\"gros\"],\"en\":[\"Cutting & Measuring Tools\",\"wholesale\"],\"ar\":[\"أدوات القطع والقياس\",\"بالجملة\"],\"wo\":[\"Outils mesure\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"material\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"material\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-outillage-a-main-echelles-echafaudages', 'cat-root-bricolage-construction-outillage-outillage-a-main', 3, 'echelles-echafaudages', 'Layers', '/categories/echelles-echafaudages.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Échelles & Échafaudages\",\"en\":\"Ladders & Scaffolding\",\"ar\":\"السلالم والسقالات\",\"wo\":\"Échelles\"}", "{\"fr\":\"Échelles & Échafaudages — Achat en gros\",\"en\":\"Ladders & Scaffolding — Wholesale\",\"ar\":\"السلالم والسقالات — بالجملة\",\"wo\":\"Échelles — Capp\"}", "{\"fr\":\"Découvrez Échelles & Échafaudages au Sénégal.\",\"en\":\"Discover Ladders & Scaffolding in Senegal.\",\"ar\":\"اكتشف السلالم والسقالات في السنغال.\",\"wo\":\"Gis Échelles ci Senegaal.\"}", "{\"fr\":[\"Échelles & Échafaudages\",\"gros\"],\"en\":[\"Ladders & Scaffolding\",\"wholesale\"],\"ar\":[\"السلالم والسقالات\",\"بالجملة\"],\"wo\":[\"Échelles\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"height\",\"material\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"height\",\"material\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-outillage-a-main-quincaillerie-visseri', 'cat-root-bricolage-construction-outillage-outillage-a-main', 3, 'quincaillerie-visserie', 'Nut', '/categories/quincaillerie-visserie.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Quincaillerie & Visserie\",\"en\":\"Hardware & Fasteners\",\"ar\":\"الأجهزة والبراغي\",\"wo\":\"Quincaillerie\"}", "{\"fr\":\"Quincaillerie & Visserie — Achat en gros\",\"en\":\"Hardware & Fasteners — Wholesale\",\"ar\":\"الأجهزة والبراغي — بالجملة\",\"wo\":\"Quincaillerie — Capp\"}", "{\"fr\":\"Découvrez Quincaillerie & Visserie au Sénégal.\",\"en\":\"Discover Hardware & Fasteners in Senegal.\",\"ar\":\"اكتشف الأجهزة والبراغي في السنغال.\",\"wo\":\"Gis Quincaillerie ci Senegaal.\"}", "{\"fr\":[\"Quincaillerie & Visserie\",\"gros\"],\"en\":[\"Hardware & Fasteners\",\"wholesale\"],\"ar\":[\"الأجهزة والبراغي\",\"بالجملة\"],\"wo\":[\"Quincaillerie\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"kg\",\"box\",\"carton\"]", "[\"type\",\"material\",\"size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-materiaux-de-construction', 'cat-root-bricolage-construction-outillage', 2, 'materiaux-de-construction', 'BrickWall', '/categories/materiaux-de-construction.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Matériaux de construction\",\"en\":\"Construction Materials\",\"ar\":\"مواد البناء\",\"wo\":\"Matériaux construction\"}", "{\"fr\":\"Matériaux de construction — Achat en gros\",\"en\":\"Construction Materials — Wholesale\",\"ar\":\"مواد البناء — بالجملة\",\"wo\":\"Matériaux construction — Capp\"}", "{\"fr\":\"Découvrez Matériaux de construction au Sénégal.\",\"en\":\"Discover Construction Materials in Senegal.\",\"ar\":\"اكتشف مواد البناء في السنغال.\",\"wo\":\"Gis Matériaux construction ci Senegaal.\"}", "{\"fr\":[\"Matériaux de construction\",\"gros\"],\"en\":[\"Construction Materials\",\"wholesale\"],\"ar\":[\"مواد البناء\",\"بالجملة\"],\"wo\":[\"Matériaux construction\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-materiaux-de-construction-ciments-beto', 'cat-root-bricolage-construction-outillage-materiaux-de-construction', 3, 'ciments-betons', 'BrickWall', '/categories/ciments-betons.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Ciments & Bétons\",\"en\":\"Cement & Concrete\",\"ar\":\"الأسمنت والخرسانة\",\"wo\":\"Siment\"}", "{\"fr\":\"Ciments & Bétons — Achat en gros\",\"en\":\"Cement & Concrete — Wholesale\",\"ar\":\"الأسمنت والخرسانة — بالجملة\",\"wo\":\"Siment — Capp\"}", "{\"fr\":\"Découvrez Ciments & Bétons au Sénégal.\",\"en\":\"Discover Cement & Concrete in Senegal.\",\"ar\":\"اكتشف الأسمنت والخرسانة في السنغال.\",\"wo\":\"Gis Siment ci Senegaal.\"}", "{\"fr\":[\"Ciments & Bétons\",\"gros\"],\"en\":[\"Cement & Concrete\",\"wholesale\"],\"ar\":[\"الأسمنت والخرسانة\",\"بالجملة\"],\"wo\":[\"Siment\",\"capp\"]}", "null", '{}', '{}',
  "[\"kg\",\"sack\",\"palette\"]", "[\"brand\",\"type\",\"weight\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"weight\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-materiaux-de-construction-toles-profil', 'cat-root-bricolage-construction-outillage-materiaux-de-construction', 3, 'toles-profiles', 'Grid', '/categories/toles-profiles.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Tôles & Profilés\",\"en\":\"Sheets & Profiles\",\"ar\":\"الألواح والقطاعات\",\"wo\":\"Tôles\"}", "{\"fr\":\"Tôles & Profilés — Achat en gros\",\"en\":\"Sheets & Profiles — Wholesale\",\"ar\":\"الألواح والقطاعات — بالجملة\",\"wo\":\"Tôles — Capp\"}", "{\"fr\":\"Découvrez Tôles & Profilés au Sénégal.\",\"en\":\"Discover Sheets & Profiles in Senegal.\",\"ar\":\"اكتشف الألواح والقطاعات في السنغال.\",\"wo\":\"Gis Tôles ci Senegaal.\"}", "{\"fr\":[\"Tôles & Profilés\",\"gros\"],\"en\":[\"Sheets & Profiles\",\"wholesale\"],\"ar\":[\"الألواح والقطاعات\",\"بالجملة\"],\"wo\":[\"Tôles\",\"capp\"]}", "null", '{}', '{}',
  "[\"sheet\",\"meter\",\"palette\"]", "[\"type\",\"material\",\"thickness\",\"dimensions\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"thickness\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bricolage-construction-outillage-materiaux-de-construction-peintures-ve', 'cat-root-bricolage-construction-outillage-materiaux-de-construction', 3, 'peintures-vernis', 'PaintBucket', '/categories/peintures-vernis.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Peintures & Vernis\",\"en\":\"Paints & Varnishes\",\"ar\":\"الدهانات والورنيش\",\"wo\":\"Peintures\"}", "{\"fr\":\"Peintures & Vernis — Achat en gros\",\"en\":\"Paints & Varnishes — Wholesale\",\"ar\":\"الدهانات والورنيش — بالجملة\",\"wo\":\"Peintures — Capp\"}", "{\"fr\":\"Découvrez Peintures & Vernis au Sénégal.\",\"en\":\"Discover Paints & Varnishes in Senegal.\",\"ar\":\"اكتشف الدهانات والورنيش في السنغال.\",\"wo\":\"Gis Peintures ci Senegaal.\"}", "{\"fr\":[\"Peintures & Vernis\",\"gros\"],\"en\":[\"Paints & Varnishes\",\"wholesale\"],\"ar\":[\"الدهانات والورنيش\",\"بالجملة\"],\"wo\":[\"Peintures\",\"capp\"]}", "null", '{}', '{}',
  "[\"liter\",\"pot\",\"carton\"]", "[\"brand\",\"type\",\"color\",\"volume\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"color\",\"volume\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel', NULL, 1, 'materiel-professionnel', 'Briefcase', '/categories/materiel-professionnel.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Matériel professionnel\",\"en\":\"Professional Equipment\",\"ar\":\"المعدات المهنية\",\"wo\":\"Material pro\"}", "{\"fr\":\"Matériel professionnel — Achat en gros\",\"en\":\"Professional Equipment — Wholesale\",\"ar\":\"المعدات المهنية — بالجملة\",\"wo\":\"Material pro — Capp\"}", "{\"fr\":\"Découvrez Matériel professionnel au Sénégal.\",\"en\":\"Discover Professional Equipment in Senegal.\",\"ar\":\"اكتشف المعدات المهنية في السنغال.\",\"wo\":\"Gis Material pro ci Senegaal.\"}", "{\"fr\":[\"Matériel professionnel\",\"gros\"],\"en\":[\"Professional Equipment\",\"wholesale\"],\"ar\":[\"المعدات المهنية\",\"بالجملة\"],\"wo\":[\"Material pro\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-materiel-de-cuisine-pro', 'cat-root-materiel-professionnel', 2, 'materiel-de-cuisine-pro', 'ChefHat', '/categories/materiel-de-cuisine-pro.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Matériel de cuisine pro\",\"en\":\"Professional Kitchen\",\"ar\":\"معدات المطبخ المهنية\",\"wo\":\"Cuisine pro\"}", "{\"fr\":\"Matériel de cuisine pro — Achat en gros\",\"en\":\"Professional Kitchen — Wholesale\",\"ar\":\"معدات المطبخ المهنية — بالجملة\",\"wo\":\"Cuisine pro — Capp\"}", "{\"fr\":\"Découvrez Matériel de cuisine pro au Sénégal.\",\"en\":\"Discover Professional Kitchen in Senegal.\",\"ar\":\"اكتشف معدات المطبخ المهنية في السنغال.\",\"wo\":\"Gis Cuisine pro ci Senegaal.\"}", "{\"fr\":[\"Matériel de cuisine pro\",\"gros\"],\"en\":[\"Professional Kitchen\",\"wholesale\"],\"ar\":[\"معدات المطبخ المهنية\",\"بالجملة\"],\"wo\":[\"Cuisine pro\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-materiel-de-cuisine-pro-fours-plaques-pro', 'cat-root-materiel-professionnel-materiel-de-cuisine-pro', 3, 'fours-plaques-pro', 'Flame', '/categories/fours-plaques-pro.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Fours & Plaques pro\",\"en\":\"Pro Ovens & Cooktops\",\"ar\":\"أفران ومواقد مهنية\",\"wo\":\"Fours pro\"}", "{\"fr\":\"Fours & Plaques pro — Achat en gros\",\"en\":\"Pro Ovens & Cooktops — Wholesale\",\"ar\":\"أفران ومواقد مهنية — بالجملة\",\"wo\":\"Fours pro — Capp\"}", "{\"fr\":\"Découvrez Fours & Plaques pro au Sénégal.\",\"en\":\"Discover Pro Ovens & Cooktops in Senegal.\",\"ar\":\"اكتشف أفران ومواقد مهنية في السنغال.\",\"wo\":\"Gis Fours pro ci Senegaal.\"}", "{\"fr\":[\"Fours & Plaques pro\",\"gros\"],\"en\":[\"Pro Ovens & Cooktops\",\"wholesale\"],\"ar\":[\"أفران ومواقد مهنية\",\"بالجملة\"],\"wo\":[\"Fours pro\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"power\",\"material\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"power\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-materiel-de-cuisine-pro-refrigeration-pro', 'cat-root-materiel-professionnel-materiel-de-cuisine-pro', 3, 'refrigeration-pro', 'Refrigerator', '/categories/refrigeration-pro.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Réfrigération pro\",\"en\":\"Pro Refrigeration\",\"ar\":\"تبريد مهني\",\"wo\":\"Réfrigération pro\"}", "{\"fr\":\"Réfrigération pro — Achat en gros\",\"en\":\"Pro Refrigeration — Wholesale\",\"ar\":\"تبريد مهني — بالجملة\",\"wo\":\"Réfrigération pro — Capp\"}", "{\"fr\":\"Découvrez Réfrigération pro au Sénégal.\",\"en\":\"Discover Pro Refrigeration in Senegal.\",\"ar\":\"اكتشف تبريد مهني في السنغال.\",\"wo\":\"Gis Réfrigération pro ci Senegaal.\"}", "{\"fr\":[\"Réfrigération pro\",\"gros\"],\"en\":[\"Pro Refrigeration\",\"wholesale\"],\"ar\":[\"تبريد مهني\",\"بالجملة\"],\"wo\":[\"Réfrigération pro\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"volume\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"volume\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-materiel-de-cuisine-pro-ustensiles-pro', 'cat-root-materiel-professionnel-materiel-de-cuisine-pro', 3, 'ustensiles-pro', 'Utensils', '/categories/ustensiles-pro.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Ustensiles pro\",\"en\":\"Pro Utensils\",\"ar\":\"أدوات مهنية\",\"wo\":\"Ustensiles pro\"}", "{\"fr\":\"Ustensiles pro — Achat en gros\",\"en\":\"Pro Utensils — Wholesale\",\"ar\":\"أدوات مهنية — بالجملة\",\"wo\":\"Ustensiles pro — Capp\"}", "{\"fr\":\"Découvrez Ustensiles pro au Sénégal.\",\"en\":\"Discover Pro Utensils in Senegal.\",\"ar\":\"اكتشف أدوات مهنية في السنغال.\",\"wo\":\"Gis Ustensiles pro ci Senegaal.\"}", "{\"fr\":[\"Ustensiles pro\",\"gros\"],\"en\":[\"Pro Utensils\",\"wholesale\"],\"ar\":[\"أدوات مهنية\",\"بالجملة\"],\"wo\":[\"Ustensiles pro\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-equipement-de-bureau', 'cat-root-materiel-professionnel', 2, 'equipement-de-bureau', 'Printer', '/categories/equipement-de-bureau.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Équipement de bureau\",\"en\":\"Office Equipment\",\"ar\":\"معدات المكتب\",\"wo\":\"Bureau equipement\"}", "{\"fr\":\"Équipement de bureau — Achat en gros\",\"en\":\"Office Equipment — Wholesale\",\"ar\":\"معدات المكتب — بالجملة\",\"wo\":\"Bureau equipement — Capp\"}", "{\"fr\":\"Découvrez Équipement de bureau au Sénégal.\",\"en\":\"Discover Office Equipment in Senegal.\",\"ar\":\"اكتشف معدات المكتب في السنغال.\",\"wo\":\"Gis Bureau equipement ci Senegaal.\"}", "{\"fr\":[\"Équipement de bureau\",\"gros\"],\"en\":[\"Office Equipment\",\"wholesale\"],\"ar\":[\"معدات المكتب\",\"بالجملة\"],\"wo\":[\"Bureau equipement\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-equipement-de-bureau-imprimantes-scanners', 'cat-root-materiel-professionnel-equipement-de-bureau', 3, 'imprimantes-scanners', 'Printer', '/categories/imprimantes-scanners.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Imprimantes & Scanners\",\"en\":\"Printers & Scanners\",\"ar\":\"الطابعات والماسحات\",\"wo\":\"Imprimantes\"}", "{\"fr\":\"Imprimantes & Scanners — Achat en gros\",\"en\":\"Printers & Scanners — Wholesale\",\"ar\":\"الطابعات والماسحات — بالجملة\",\"wo\":\"Imprimantes — Capp\"}", "{\"fr\":\"Découvrez Imprimantes & Scanners au Sénégal.\",\"en\":\"Discover Printers & Scanners in Senegal.\",\"ar\":\"اكتشف الطابعات والماسحات في السنغال.\",\"wo\":\"Gis Imprimantes ci Senegaal.\"}", "{\"fr\":[\"Imprimantes & Scanners\",\"gros\"],\"en\":[\"Printers & Scanners\",\"wholesale\"],\"ar\":[\"الطابعات والماسحات\",\"بالجملة\"],\"wo\":[\"Imprimantes\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"technology\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"technology\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-equipement-de-bureau-mobilier-de-bureau', 'cat-root-materiel-professionnel-equipement-de-bureau', 3, 'mobilier-de-bureau', 'Briefcase', '/categories/mobilier-de-bureau.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Mobilier de bureau\",\"en\":\"Office Furniture\",\"ar\":\"أثاث المكتب\",\"wo\":\"Meubles bureau\"}", "{\"fr\":\"Mobilier de bureau — Achat en gros\",\"en\":\"Office Furniture — Wholesale\",\"ar\":\"أثاث المكتب — بالجملة\",\"wo\":\"Meubles bureau — Capp\"}", "{\"fr\":\"Découvrez Mobilier de bureau au Sénégal.\",\"en\":\"Discover Office Furniture in Senegal.\",\"ar\":\"اكتشف أثاث المكتب في السنغال.\",\"wo\":\"Gis Meubles bureau ci Senegaal.\"}", "{\"fr\":[\"Mobilier de bureau\",\"gros\"],\"en\":[\"Office Furniture\",\"wholesale\"],\"ar\":[\"أثاث المكتب\",\"بالجملة\"],\"wo\":[\"Meubles bureau\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-equipement-de-bureau-fournitures-de-bureau', 'cat-root-materiel-professionnel-equipement-de-bureau', 3, 'fournitures-de-bureau', 'Pen', '/categories/fournitures-de-bureau.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Fournitures de bureau\",\"en\":\"Office Supplies\",\"ar\":\"لوازم المكتب\",\"wo\":\"Fournitures bureau\"}", "{\"fr\":\"Fournitures de bureau — Achat en gros\",\"en\":\"Office Supplies — Wholesale\",\"ar\":\"لوازم المكتب — بالجملة\",\"wo\":\"Fournitures bureau — Capp\"}", "{\"fr\":\"Découvrez Fournitures de bureau au Sénégal.\",\"en\":\"Discover Office Supplies in Senegal.\",\"ar\":\"اكتشف لوازم المكتب في السنغال.\",\"wo\":\"Gis Fournitures bureau ci Senegaal.\"}", "{\"fr\":[\"Fournitures de bureau\",\"gros\"],\"en\":[\"Office Supplies\",\"wholesale\"],\"ar\":[\"لوازم المكتب\",\"بالجملة\"],\"wo\":[\"Fournitures bureau\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"box\",\"carton\"]", "[\"type\",\"brand\",\"quantity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-materiel-medical', 'cat-root-materiel-professionnel', 2, 'materiel-medical', 'Stethoscope', '/categories/materiel-medical.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Matériel médical\",\"en\":\"Medical Equipment\",\"ar\":\"المعدات الطبية\",\"wo\":\"Matériel médical\"}", "{\"fr\":\"Matériel médical — Achat en gros\",\"en\":\"Medical Equipment — Wholesale\",\"ar\":\"المعدات الطبية — بالجملة\",\"wo\":\"Matériel médical — Capp\"}", "{\"fr\":\"Découvrez Matériel médical au Sénégal.\",\"en\":\"Discover Medical Equipment in Senegal.\",\"ar\":\"اكتشف المعدات الطبية في السنغال.\",\"wo\":\"Gis Matériel médical ci Senegaal.\"}", "{\"fr\":[\"Matériel médical\",\"gros\"],\"en\":[\"Medical Equipment\",\"wholesale\"],\"ar\":[\"المعدات الطبية\",\"بالجملة\"],\"wo\":[\"Matériel médical\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-materiel-medical-dispositifs-medicaux', 'cat-root-materiel-professionnel-materiel-medical', 3, 'dispositifs-medicaux', 'Stethoscope', '/categories/dispositifs-medicaux.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Dispositifs médicaux\",\"en\":\"Medical Devices\",\"ar\":\"الأجهزة الطبية\",\"wo\":\"Dispositifs médicaux\"}", "{\"fr\":\"Dispositifs médicaux — Achat en gros\",\"en\":\"Medical Devices — Wholesale\",\"ar\":\"الأجهزة الطبية — بالجملة\",\"wo\":\"Dispositifs médicaux — Capp\"}", "{\"fr\":\"Découvrez Dispositifs médicaux au Sénégal.\",\"en\":\"Discover Medical Devices in Senegal.\",\"ar\":\"اكتشف الأجهزة الطبية في السنغال.\",\"wo\":\"Gis Dispositifs médicaux ci Senegaal.\"}", "{\"fr\":[\"Dispositifs médicaux\",\"gros\"],\"en\":[\"Medical Devices\",\"wholesale\"],\"ar\":[\"الأجهزة الطبية\",\"بالجملة\"],\"wo\":[\"Dispositifs médicaux\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"certification\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"certification\",\"price\"]",
  TRUE, FALSE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-materiel-professionnel-materiel-medical-mobilier-medical', 'cat-root-materiel-professionnel-materiel-medical', 3, 'mobilier-medical', 'Bed', '/categories/mobilier-medical.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Mobilier médical\",\"en\":\"Medical Furniture\",\"ar\":\"أثاث طبي\",\"wo\":\"Mobilier médical\"}", "{\"fr\":\"Mobilier médical — Achat en gros\",\"en\":\"Medical Furniture — Wholesale\",\"ar\":\"أثاث طبي — بالجملة\",\"wo\":\"Mobilier médical — Capp\"}", "{\"fr\":\"Découvrez Mobilier médical au Sénégal.\",\"en\":\"Discover Medical Furniture in Senegal.\",\"ar\":\"اكتشف أثاث طبي في السنغال.\",\"wo\":\"Gis Mobilier médical ci Senegaal.\"}", "{\"fr\":[\"Mobilier médical\",\"gros\"],\"en\":[\"Medical Furniture\",\"wholesale\"],\"ar\":[\"أثاث طبي\",\"بالجملة\"],\"wo\":[\"Mobilier médical\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs', NULL, 1, 'sport-loisirs', 'Dumbbell', '/categories/sport-loisirs.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Sport & Loisirs\",\"en\":\"Sports & Leisure\",\"ar\":\"الرياضة والترفيه\",\"wo\":\"Sport ak Loosir\"}", "{\"fr\":\"Sport & Loisirs — Achat en gros\",\"en\":\"Sports & Leisure — Wholesale\",\"ar\":\"الرياضة والترفيه — بالجملة\",\"wo\":\"Sport ak Loosir — Capp\"}", "{\"fr\":\"Découvrez Sport & Loisirs au Sénégal.\",\"en\":\"Discover Sports & Leisure in Senegal.\",\"ar\":\"اكتشف الرياضة والترفيه في السنغال.\",\"wo\":\"Gis Sport ak Loosir ci Senegaal.\"}", "{\"fr\":[\"Sport & Loisirs\",\"gros\"],\"en\":[\"Sports & Leisure\",\"wholesale\"],\"ar\":[\"الرياضة والترفيه\",\"بالجملة\"],\"wo\":[\"Sport ak Loosir\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.09,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-fitness-musculation', 'cat-root-sport-loisirs', 2, 'fitness-musculation', 'Dumbbell', '/categories/fitness-musculation.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Fitness & Musculation\",\"en\":\"Fitness & Bodybuilding\",\"ar\":\"اللياقة وكمال الأجسام\",\"wo\":\"Fitness\"}", "{\"fr\":\"Fitness & Musculation — Achat en gros\",\"en\":\"Fitness & Bodybuilding — Wholesale\",\"ar\":\"اللياقة وكمال الأجسام — بالجملة\",\"wo\":\"Fitness — Capp\"}", "{\"fr\":\"Découvrez Fitness & Musculation au Sénégal.\",\"en\":\"Discover Fitness & Bodybuilding in Senegal.\",\"ar\":\"اكتشف اللياقة وكمال الأجسام في السنغال.\",\"wo\":\"Gis Fitness ci Senegaal.\"}", "{\"fr\":[\"Fitness & Musculation\",\"gros\"],\"en\":[\"Fitness & Bodybuilding\",\"wholesale\"],\"ar\":[\"اللياقة وكمال الأجسام\",\"بالجملة\"],\"wo\":[\"Fitness\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-fitness-musculation-halteres-poids', 'cat-root-sport-loisirs-fitness-musculation', 3, 'halteres-poids', 'Dumbbell', '/categories/halteres-poids.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Haltères & Poids\",\"en\":\"Dumbbells & Weights\",\"ar\":\"الدمبل والأوزان\",\"wo\":\"Haltères\"}", "{\"fr\":\"Haltères & Poids — Achat en gros\",\"en\":\"Dumbbells & Weights — Wholesale\",\"ar\":\"الدمبل والأوزان — بالجملة\",\"wo\":\"Haltères — Capp\"}", "{\"fr\":\"Découvrez Haltères & Poids au Sénégal.\",\"en\":\"Discover Dumbbells & Weights in Senegal.\",\"ar\":\"اكتشف الدمبل والأوزان في السنغال.\",\"wo\":\"Gis Haltères ci Senegaal.\"}", "{\"fr\":[\"Haltères & Poids\",\"gros\"],\"en\":[\"Dumbbells & Weights\",\"wholesale\"],\"ar\":[\"الدمبل والأوزان\",\"بالجملة\"],\"wo\":[\"Haltères\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"pair\",\"set\"]", "[\"type\",\"weight\",\"material\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"weight\",\"material\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-fitness-musculation-machines-de-fitness', 'cat-root-sport-loisirs-fitness-musculation', 3, 'machines-de-fitness', 'Activity', '/categories/machines-de-fitness.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Machines de fitness\",\"en\":\"Fitness Machines\",\"ar\":\"آلات اللياقة\",\"wo\":\"Machines fitness\"}", "{\"fr\":\"Machines de fitness — Achat en gros\",\"en\":\"Fitness Machines — Wholesale\",\"ar\":\"آلات اللياقة — بالجملة\",\"wo\":\"Machines fitness — Capp\"}", "{\"fr\":\"Découvrez Machines de fitness au Sénégal.\",\"en\":\"Discover Fitness Machines in Senegal.\",\"ar\":\"اكتشف آلات اللياقة في السنغال.\",\"wo\":\"Gis Machines fitness ci Senegaal.\"}", "{\"fr\":[\"Machines de fitness\",\"gros\"],\"en\":[\"Fitness Machines\",\"wholesale\"],\"ar\":[\"آلات اللياقة\",\"بالجملة\"],\"wo\":[\"Machines fitness\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-fitness-musculation-accessoires-fitness', 'cat-root-sport-loisirs-fitness-musculation', 3, 'accessoires-fitness', 'Shirt', '/categories/accessoires-fitness.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Accessoires fitness\",\"en\":\"Fitness Accessories\",\"ar\":\"إكسسوارات اللياقة\",\"wo\":\"Accessoires fitness\"}", "{\"fr\":\"Accessoires fitness — Achat en gros\",\"en\":\"Fitness Accessories — Wholesale\",\"ar\":\"إكسسوارات اللياقة — بالجملة\",\"wo\":\"Accessoires fitness — Capp\"}", "{\"fr\":\"Découvrez Accessoires fitness au Sénégal.\",\"en\":\"Discover Fitness Accessories in Senegal.\",\"ar\":\"اكتشف إكسسوارات اللياقة في السنغال.\",\"wo\":\"Gis Accessoires fitness ci Senegaal.\"}", "{\"fr\":[\"Accessoires fitness\",\"gros\"],\"en\":[\"Fitness Accessories\",\"wholesale\"],\"ar\":[\"إكسسوارات اللياقة\",\"بالجملة\"],\"wo\":[\"Accessoires fitness\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-sports-collectifs', 'cat-root-sport-loisirs', 2, 'sports-collectifs', 'Users', '/categories/sports-collectifs.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Sports collectifs\",\"en\":\"Team Sports\",\"ar\":\"الرياضات الجماعية\",\"wo\":\"Sports collectifs\"}", "{\"fr\":\"Sports collectifs — Achat en gros\",\"en\":\"Team Sports — Wholesale\",\"ar\":\"الرياضات الجماعية — بالجملة\",\"wo\":\"Sports collectifs — Capp\"}", "{\"fr\":\"Découvrez Sports collectifs au Sénégal.\",\"en\":\"Discover Team Sports in Senegal.\",\"ar\":\"اكتشف الرياضات الجماعية في السنغال.\",\"wo\":\"Gis Sports collectifs ci Senegaal.\"}", "{\"fr\":[\"Sports collectifs\",\"gros\"],\"en\":[\"Team Sports\",\"wholesale\"],\"ar\":[\"الرياضات الجماعية\",\"بالجملة\"],\"wo\":[\"Sports collectifs\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-sports-collectifs-football', 'cat-root-sport-loisirs-sports-collectifs', 3, 'football', 'Circle', '/categories/football.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Football\",\"en\":\"Football\",\"ar\":\"كرة القدم\",\"wo\":\"Football\"}", "{\"fr\":\"Football — Achat en gros\",\"en\":\"Football — Wholesale\",\"ar\":\"كرة القدم — بالجملة\",\"wo\":\"Football — Capp\"}", "{\"fr\":\"Découvrez Football au Sénégal.\",\"en\":\"Discover Football in Senegal.\",\"ar\":\"اكتشف كرة القدم في السنغال.\",\"wo\":\"Gis Football ci Senegaal.\"}", "{\"fr\":[\"Football\",\"gros\"],\"en\":[\"Football\",\"wholesale\"],\"ar\":[\"كرة القدم\",\"بالجملة\"],\"wo\":[\"Football\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-sports-collectifs-basket-volley', 'cat-root-sport-loisirs-sports-collectifs', 3, 'basket-volley', 'Circle', '/categories/basket-volley.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Basket & Volley\",\"en\":\"Basketball & Volleyball\",\"ar\":\"كرة السلة والكرة الطائرة\",\"wo\":\"Basket\"}", "{\"fr\":\"Basket & Volley — Achat en gros\",\"en\":\"Basketball & Volleyball — Wholesale\",\"ar\":\"كرة السلة والكرة الطائرة — بالجملة\",\"wo\":\"Basket — Capp\"}", "{\"fr\":\"Découvrez Basket & Volley au Sénégal.\",\"en\":\"Discover Basketball & Volleyball in Senegal.\",\"ar\":\"اكتشف كرة السلة والكرة الطائرة في السنغال.\",\"wo\":\"Gis Basket ci Senegaal.\"}", "{\"fr\":[\"Basket & Volley\",\"gros\"],\"en\":[\"Basketball & Volleyball\",\"wholesale\"],\"ar\":[\"كرة السلة والكرة الطائرة\",\"بالجملة\"],\"wo\":[\"Basket\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-sports-collectifs-equipements-sportifs', 'cat-root-sport-loisirs-sports-collectifs', 3, 'equipements-sportifs', 'Shirt', '/categories/equipements-sportifs.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Équipements sportifs\",\"en\":\"Sports Equipment\",\"ar\":\"الأدوات الرياضية\",\"wo\":\"Équipements sportifs\"}", "{\"fr\":\"Équipements sportifs — Achat en gros\",\"en\":\"Sports Equipment — Wholesale\",\"ar\":\"الأدوات الرياضية — بالجملة\",\"wo\":\"Équipements sportifs — Capp\"}", "{\"fr\":\"Découvrez Équipements sportifs au Sénégal.\",\"en\":\"Discover Sports Equipment in Senegal.\",\"ar\":\"اكتشف الأدوات الرياضية في السنغال.\",\"wo\":\"Gis Équipements sportifs ci Senegaal.\"}", "{\"fr\":[\"Équipements sportifs\",\"gros\"],\"en\":[\"Sports Equipment\",\"wholesale\"],\"ar\":[\"الأدوات الرياضية\",\"بالجملة\"],\"wo\":[\"Équipements sportifs\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-loisirs', 'cat-root-sport-loisirs', 2, 'loisirs', 'Gamepad', '/categories/loisirs.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Loisirs\",\"en\":\"Leisure\",\"ar\":\"الترفيه\",\"wo\":\"Loosir\"}", "{\"fr\":\"Loisirs — Achat en gros\",\"en\":\"Leisure — Wholesale\",\"ar\":\"الترفيه — بالجملة\",\"wo\":\"Loosir — Capp\"}", "{\"fr\":\"Découvrez Loisirs au Sénégal.\",\"en\":\"Discover Leisure in Senegal.\",\"ar\":\"اكتشف الترفيه في السنغال.\",\"wo\":\"Gis Loosir ci Senegaal.\"}", "{\"fr\":[\"Loisirs\",\"gros\"],\"en\":[\"Leisure\",\"wholesale\"],\"ar\":[\"الترفيه\",\"بالجملة\"],\"wo\":[\"Loosir\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-loisirs-instruments-de-musique', 'cat-root-sport-loisirs-loisirs', 3, 'instruments-de-musique', 'Music', '/categories/instruments-de-musique.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Instruments de musique\",\"en\":\"Musical Instruments\",\"ar\":\"الآلات الموسيقية\",\"wo\":\"Musique\"}", "{\"fr\":\"Instruments de musique — Achat en gros\",\"en\":\"Musical Instruments — Wholesale\",\"ar\":\"الآلات الموسيقية — بالجملة\",\"wo\":\"Musique — Capp\"}", "{\"fr\":\"Découvrez Instruments de musique au Sénégal.\",\"en\":\"Discover Musical Instruments in Senegal.\",\"ar\":\"اكتشف الآلات الموسيقية في السنغال.\",\"wo\":\"Gis Musique ci Senegaal.\"}", "{\"fr\":[\"Instruments de musique\",\"gros\"],\"en\":[\"Musical Instruments\",\"wholesale\"],\"ar\":[\"الآلات الموسيقية\",\"بالجملة\"],\"wo\":[\"Musique\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-sport-loisirs-loisirs-jeux-jouets', 'cat-root-sport-loisirs-loisirs', 3, 'jeux-jouets', 'Gamepad', '/categories/jeux-jouets.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Jeux & Jouets\",\"en\":\"Games & Toys\",\"ar\":\"الألعاب والدمى\",\"wo\":\"Jeux\"}", "{\"fr\":\"Jeux & Jouets — Achat en gros\",\"en\":\"Games & Toys — Wholesale\",\"ar\":\"الألعاب والدمى — بالجملة\",\"wo\":\"Jeux — Capp\"}", "{\"fr\":\"Découvrez Jeux & Jouets au Sénégal.\",\"en\":\"Discover Games & Toys in Senegal.\",\"ar\":\"اكتشف الألعاب والدمى في السنغال.\",\"wo\":\"Gis Jeux ci Senegaal.\"}", "{\"fr\":[\"Jeux & Jouets\",\"gros\"],\"en\":[\"Games & Toys\",\"wholesale\"],\"ar\":[\"الألعاب والدمى\",\"بالجملة\"],\"wo\":[\"Jeux\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"brand\",\"age\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"age\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles', NULL, 1, 'bebes-enfants-ecoles', 'Baby', '/categories/bebes-enfants-ecoles.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Bébés, Enfants & Écoles\",\"en\":\"Babies, Kids & Schools\",\"ar\":\"الأطفال والمدارس\",\"wo\":\"Bébés, Xale ak Écoles\"}", "{\"fr\":\"Bébés, Enfants & Écoles — Achat en gros\",\"en\":\"Babies, Kids & Schools — Wholesale\",\"ar\":\"الأطفال والمدارس — بالجملة\",\"wo\":\"Bébés, Xale ak Écoles — Capp\"}", "{\"fr\":\"Découvrez Bébés, Enfants & Écoles au Sénégal.\",\"en\":\"Discover Babies, Kids & Schools in Senegal.\",\"ar\":\"اكتشف الأطفال والمدارس في السنغال.\",\"wo\":\"Gis Bébés, Xale ak Écoles ci Senegaal.\"}", "{\"fr\":[\"Bébés, Enfants & Écoles\",\"gros\"],\"en\":[\"Babies, Kids & Schools\",\"wholesale\"],\"ar\":[\"الأطفال والمدارس\",\"بالجملة\"],\"wo\":[\"Bébés, Xale ak Écoles\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.09,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-vetements-enfants', 'cat-root-bebes-enfants-ecoles', 2, 'vetements-enfants', 'Shirt', '/categories/vetements-enfants.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Vêtements enfants\",\"en\":\"Kids Clothing\",\"ar\":\"ملابس الأطفال\",\"wo\":\"Yére xale\"}", "{\"fr\":\"Vêtements enfants — Achat en gros\",\"en\":\"Kids Clothing — Wholesale\",\"ar\":\"ملابس الأطفال — بالجملة\",\"wo\":\"Yére xale — Capp\"}", "{\"fr\":\"Découvrez Vêtements enfants au Sénégal.\",\"en\":\"Discover Kids Clothing in Senegal.\",\"ar\":\"اكتشف ملابس الأطفال في السنغال.\",\"wo\":\"Gis Yére xale ci Senegaal.\"}", "{\"fr\":[\"Vêtements enfants\",\"gros\"],\"en\":[\"Kids Clothing\",\"wholesale\"],\"ar\":[\"ملابس الأطفال\",\"بالجملة\"],\"wo\":[\"Yére xale\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-vetements-enfants-vetements-bebe', 'cat-root-bebes-enfants-ecoles-vetements-enfants', 3, 'vetements-bebe', 'Baby', '/categories/vetements-bebe.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Vêtements bébé\",\"en\":\"Baby Clothes\",\"ar\":\"ملابس البيبي\",\"wo\":\"Yére bébé\"}", "{\"fr\":\"Vêtements bébé — Achat en gros\",\"en\":\"Baby Clothes — Wholesale\",\"ar\":\"ملابس البيبي — بالجملة\",\"wo\":\"Yére bébé — Capp\"}", "{\"fr\":\"Découvrez Vêtements bébé au Sénégal.\",\"en\":\"Discover Baby Clothes in Senegal.\",\"ar\":\"اكتشف ملابس البيبي في السنغال.\",\"wo\":\"Gis Yére bébé ci Senegaal.\"}", "{\"fr\":[\"Vêtements bébé\",\"gros\"],\"en\":[\"Baby Clothes\",\"wholesale\"],\"ar\":[\"ملابس البيبي\",\"بالجملة\"],\"wo\":[\"Yére bébé\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-vetements-enfants-vetements-garcon', 'cat-root-bebes-enfants-ecoles-vetements-enfants', 3, 'vetements-garcon', 'Shirt', '/categories/vetements-garcon.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Vêtements garçon\",\"en\":\"Boys Clothing\",\"ar\":\"ملابس الأولاد\",\"wo\":\"Yére xale bu góor\"}", "{\"fr\":\"Vêtements garçon — Achat en gros\",\"en\":\"Boys Clothing — Wholesale\",\"ar\":\"ملابس الأولاد — بالجملة\",\"wo\":\"Yére xale bu góor — Capp\"}", "{\"fr\":\"Découvrez Vêtements garçon au Sénégal.\",\"en\":\"Discover Boys Clothing in Senegal.\",\"ar\":\"اكتشف ملابس الأولاد في السنغال.\",\"wo\":\"Gis Yére xale bu góor ci Senegaal.\"}", "{\"fr\":[\"Vêtements garçon\",\"gros\"],\"en\":[\"Boys Clothing\",\"wholesale\"],\"ar\":[\"ملابس الأولاد\",\"بالجملة\"],\"wo\":[\"Yére xale bu góor\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-vetements-enfants-vetements-fille', 'cat-root-bebes-enfants-ecoles-vetements-enfants', 3, 'vetements-fille', 'Shirt', '/categories/vetements-fille.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Vêtements fille\",\"en\":\"Girls Clothing\",\"ar\":\"ملابس البنات\",\"wo\":\"Yére xale bu jigéen\"}", "{\"fr\":\"Vêtements fille — Achat en gros\",\"en\":\"Girls Clothing — Wholesale\",\"ar\":\"ملابس البنات — بالجملة\",\"wo\":\"Yére xale bu jigéen — Capp\"}", "{\"fr\":\"Découvrez Vêtements fille au Sénégal.\",\"en\":\"Discover Girls Clothing in Senegal.\",\"ar\":\"اكتشف ملابس البنات في السنغال.\",\"wo\":\"Gis Yére xale bu jigéen ci Senegaal.\"}", "{\"fr\":[\"Vêtements fille\",\"gros\"],\"en\":[\"Girls Clothing\",\"wholesale\"],\"ar\":[\"ملابس البنات\",\"بالجملة\"],\"wo\":[\"Yére xale bu jigéen\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"size\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"size\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-puericulture', 'cat-root-bebes-enfants-ecoles', 2, 'puericulture', 'Baby', '/categories/puericulture.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Puériculture\",\"en\":\"Childcare\",\"ar\":\"رعاية الأطفال\",\"wo\":\"Puerikiltir\"}", "{\"fr\":\"Puériculture — Achat en gros\",\"en\":\"Childcare — Wholesale\",\"ar\":\"رعاية الأطفال — بالجملة\",\"wo\":\"Puerikiltir — Capp\"}", "{\"fr\":\"Découvrez Puériculture au Sénégal.\",\"en\":\"Discover Childcare in Senegal.\",\"ar\":\"اكتشف رعاية الأطفال في السنغال.\",\"wo\":\"Gis Puerikiltir ci Senegaal.\"}", "{\"fr\":[\"Puériculture\",\"gros\"],\"en\":[\"Childcare\",\"wholesale\"],\"ar\":[\"رعاية الأطفال\",\"بالجملة\"],\"wo\":[\"Puerikiltir\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-puericulture-poussettes-sieges-auto', 'cat-root-bebes-enfants-ecoles-puericulture', 3, 'poussettes-sieges-auto', 'Baby', '/categories/poussettes-sieges-auto.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Poussettes & Sièges auto\",\"en\":\"Strollers & Car Seats\",\"ar\":\"العربات وكراسي السيارات\",\"wo\":\"Poussettes\"}", "{\"fr\":\"Poussettes & Sièges auto — Achat en gros\",\"en\":\"Strollers & Car Seats — Wholesale\",\"ar\":\"العربات وكراسي السيارات — بالجملة\",\"wo\":\"Poussettes — Capp\"}", "{\"fr\":\"Découvrez Poussettes & Sièges auto au Sénégal.\",\"en\":\"Discover Strollers & Car Seats in Senegal.\",\"ar\":\"اكتشف العربات وكراسي السيارات في السنغال.\",\"wo\":\"Gis Poussettes ci Senegaal.\"}", "{\"fr\":[\"Poussettes & Sièges auto\",\"gros\"],\"en\":[\"Strollers & Car Seats\",\"wholesale\"],\"ar\":[\"العربات وكراسي السيارات\",\"بالجملة\"],\"wo\":[\"Poussettes\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"type\",\"weight\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"type\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-puericulture-lits-linge-bebe', 'cat-root-bebes-enfants-ecoles-puericulture', 3, 'lits-linge-bebe', 'Bed', '/categories/lits-linge-bebe.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Lits & Linge bébé\",\"en\":\"Baby Beds & Linens\",\"ar\":\"أسرة وملابس الأطفال\",\"wo\":\"Lits bébé\"}", "{\"fr\":\"Lits & Linge bébé — Achat en gros\",\"en\":\"Baby Beds & Linens — Wholesale\",\"ar\":\"أسرة وملابس الأطفال — بالجملة\",\"wo\":\"Lits bébé — Capp\"}", "{\"fr\":\"Découvrez Lits & Linge bébé au Sénégal.\",\"en\":\"Discover Baby Beds & Linens in Senegal.\",\"ar\":\"اكتشف أسرة وملابس الأطفال في السنغال.\",\"wo\":\"Gis Lits bébé ci Senegaal.\"}", "{\"fr\":[\"Lits & Linge bébé\",\"gros\"],\"en\":[\"Baby Beds & Linens\",\"wholesale\"],\"ar\":[\"أسرة وملابس الأطفال\",\"بالجملة\"],\"wo\":[\"Lits bébé\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-fournitures-scolaires', 'cat-root-bebes-enfants-ecoles', 2, 'fournitures-scolaires', 'Book', '/categories/fournitures-scolaires.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Fournitures scolaires\",\"en\":\"School Supplies\",\"ar\":\"اللوازم المدرسية\",\"wo\":\"Fournitures scolaires\"}", "{\"fr\":\"Fournitures scolaires — Achat en gros\",\"en\":\"School Supplies — Wholesale\",\"ar\":\"اللوازم المدرسية — بالجملة\",\"wo\":\"Fournitures scolaires — Capp\"}", "{\"fr\":\"Découvrez Fournitures scolaires au Sénégal.\",\"en\":\"Discover School Supplies in Senegal.\",\"ar\":\"اكتشف اللوازم المدرسية في السنغال.\",\"wo\":\"Gis Fournitures scolaires ci Senegaal.\"}", "{\"fr\":[\"Fournitures scolaires\",\"gros\"],\"en\":[\"School Supplies\",\"wholesale\"],\"ar\":[\"اللوازم المدرسية\",\"بالجملة\"],\"wo\":[\"Fournitures scolaires\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-fournitures-scolaires-cartables-sacs', 'cat-root-bebes-enfants-ecoles-fournitures-scolaires', 3, 'cartables-sacs', 'Bag', '/categories/cartables-sacs.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Cartables & Sacs\",\"en\":\"School Bags & Backpacks\",\"ar\":\"الحقائب المدرسية\",\"wo\":\"Cartables\"}", "{\"fr\":\"Cartables & Sacs — Achat en gros\",\"en\":\"School Bags & Backpacks — Wholesale\",\"ar\":\"الحقائب المدرسية — بالجملة\",\"wo\":\"Cartables — Capp\"}", "{\"fr\":\"Découvrez Cartables & Sacs au Sénégal.\",\"en\":\"Discover School Bags & Backpacks in Senegal.\",\"ar\":\"اكتشف الحقائب المدرسية في السنغال.\",\"wo\":\"Gis Cartables ci Senegaal.\"}", "{\"fr\":[\"Cartables & Sacs\",\"gros\"],\"en\":[\"School Bags & Backpacks\",\"wholesale\"],\"ar\":[\"الحقائب المدرسية\",\"بالجملة\"],\"wo\":[\"Cartables\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"type\",\"material\",\"color\",\"capacity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"color\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-bebes-enfants-ecoles-fournitures-scolaires-papeterie', 'cat-root-bebes-enfants-ecoles-fournitures-scolaires', 3, 'papeterie', 'Pen', '/categories/papeterie.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Papeterie\",\"en\":\"Stationery\",\"ar\":\"القرطاسية\",\"wo\":\"Papeterie\"}", "{\"fr\":\"Papeterie — Achat en gros\",\"en\":\"Stationery — Wholesale\",\"ar\":\"القرطاسية — بالجملة\",\"wo\":\"Papeterie — Capp\"}", "{\"fr\":\"Découvrez Papeterie au Sénégal.\",\"en\":\"Discover Stationery in Senegal.\",\"ar\":\"اكتشف القرطاسية في السنغال.\",\"wo\":\"Gis Papeterie ci Senegaal.\"}", "{\"fr\":[\"Papeterie\",\"gros\"],\"en\":[\"Stationery\",\"wholesale\"],\"ar\":[\"القرطاسية\",\"بالجملة\"],\"wo\":[\"Papeterie\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"box\",\"carton\"]", "[\"type\",\"brand\",\"quantity\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers', NULL, 1, 'fournitures-services-divers', 'Box', '/categories/fournitures-services-divers.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Fournitures, Services & Divers\",\"en\":\"Supplies, Services & Miscellaneous\",\"ar\":\"لوازم وخدمات ومتفرقات\",\"wo\":\"Fournitures, Service ak Divers\"}", "{\"fr\":\"Fournitures, Services & Divers — Achat en gros\",\"en\":\"Supplies, Services & Miscellaneous — Wholesale\",\"ar\":\"لوازم وخدمات ومتفرقات — بالجملة\",\"wo\":\"Fournitures, Service ak Divers — Capp\"}", "{\"fr\":\"Découvrez Fournitures, Services & Divers au Sénégal.\",\"en\":\"Discover Supplies, Services & Miscellaneous in Senegal.\",\"ar\":\"اكتشف لوازم وخدمات ومتفرقات في السنغال.\",\"wo\":\"Gis Fournitures, Service ak Divers ci Senegaal.\"}", "{\"fr\":[\"Fournitures, Services & Divers\",\"gros\"],\"en\":[\"Supplies, Services & Miscellaneous\",\"wholesale\"],\"ar\":[\"لوازم وخدمات ومتفرقات\",\"بالجملة\"],\"wo\":[\"Fournitures, Service ak Divers\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.1,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-emballages-conditionnement', 'cat-root-fournitures-services-divers', 2, 'emballages-conditionnement', 'Package', '/categories/emballages-conditionnement.jpg', 1, TRUE, FALSE,
  "{\"fr\":\"Emballages & Conditionnement\",\"en\":\"Packaging & Conditioning\",\"ar\":\"التغليف والتعبئة\",\"wo\":\"Emballages\"}", "{\"fr\":\"Emballages & Conditionnement — Achat en gros\",\"en\":\"Packaging & Conditioning — Wholesale\",\"ar\":\"التغليف والتعبئة — بالجملة\",\"wo\":\"Emballages — Capp\"}", "{\"fr\":\"Découvrez Emballages & Conditionnement au Sénégal.\",\"en\":\"Discover Packaging & Conditioning in Senegal.\",\"ar\":\"اكتشف التغليف والتعبئة في السنغال.\",\"wo\":\"Gis Emballages ci Senegaal.\"}", "{\"fr\":[\"Emballages & Conditionnement\",\"gros\"],\"en\":[\"Packaging & Conditioning\",\"wholesale\"],\"ar\":[\"التغليف والتعبئة\",\"بالجملة\"],\"wo\":[\"Emballages\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-emballages-conditionnement-sacs-sachets', 'cat-root-fournitures-services-divers-emballages-conditionnement', 3, 'sacs-sachets', 'Bag', '/categories/sacs-sachets.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Sacs & Sachets\",\"en\":\"Bags & Pouches\",\"ar\":\"الأكياس والأكياس الصغيرة\",\"wo\":\"Sacs yi\"}", "{\"fr\":\"Sacs & Sachets — Achat en gros\",\"en\":\"Bags & Pouches — Wholesale\",\"ar\":\"الأكياس والأكياس الصغيرة — بالجملة\",\"wo\":\"Sacs yi — Capp\"}", "{\"fr\":\"Découvrez Sacs & Sachets au Sénégal.\",\"en\":\"Discover Bags & Pouches in Senegal.\",\"ar\":\"اكتشف الأكياس والأكياس الصغيرة في السنغال.\",\"wo\":\"Gis Sacs yi ci Senegaal.\"}", "{\"fr\":[\"Sacs & Sachets\",\"gros\"],\"en\":[\"Bags & Pouches\",\"wholesale\"],\"ar\":[\"الأكياس والأكياس الصغيرة\",\"بالجملة\"],\"wo\":[\"Sacs yi\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"kg\",\"pack\",\"carton\"]", "[\"type\",\"material\",\"size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-emballages-conditionnement-cartons-boites', 'cat-root-fournitures-services-divers-emballages-conditionnement', 3, 'cartons-boites', 'Box', '/categories/cartons-boites.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Cartons & Boîtes\",\"en\":\"Cardboard & Boxes\",\"ar\":\"الكرتون والصناديق\",\"wo\":\"Cartons\"}", "{\"fr\":\"Cartons & Boîtes — Achat en gros\",\"en\":\"Cardboard & Boxes — Wholesale\",\"ar\":\"الكرتون والصناديق — بالجملة\",\"wo\":\"Cartons — Capp\"}", "{\"fr\":\"Découvrez Cartons & Boîtes au Sénégal.\",\"en\":\"Discover Cardboard & Boxes in Senegal.\",\"ar\":\"اكتشف الكرتون والصناديق في السنغال.\",\"wo\":\"Gis Cartons ci Senegaal.\"}", "{\"fr\":[\"Cartons & Boîtes\",\"gros\"],\"en\":[\"Cardboard & Boxes\",\"wholesale\"],\"ar\":[\"الكرتون والصناديق\",\"بالجملة\"],\"wo\":[\"Cartons\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"pack\",\"carton\"]", "[\"type\",\"dimensions\",\"material\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"dimensions\",\"material\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-emballages-conditionnement-etiquettes-adhes', 'cat-root-fournitures-services-divers-emballages-conditionnement', 3, 'etiquettes-adhesifs', 'Tag', '/categories/etiquettes-adhesifs.jpg', 3, TRUE, TRUE,
  "{\"fr\":\"Étiquettes & Adhésifs\",\"en\":\"Labels & Adhesives\",\"ar\":\"الملصقات والمواد اللاصقة\",\"wo\":\"Etiquettes\"}", "{\"fr\":\"Étiquettes & Adhésifs — Achat en gros\",\"en\":\"Labels & Adhesives — Wholesale\",\"ar\":\"الملصقات والمواد اللاصقة — بالجملة\",\"wo\":\"Etiquettes — Capp\"}", "{\"fr\":\"Découvrez Étiquettes & Adhésifs au Sénégal.\",\"en\":\"Discover Labels & Adhesives in Senegal.\",\"ar\":\"اكتشف الملصقات والمواد اللاصقة في السنغال.\",\"wo\":\"Gis Etiquettes ci Senegaal.\"}", "{\"fr\":[\"Étiquettes & Adhésifs\",\"gros\"],\"en\":[\"Labels & Adhesives\",\"wholesale\"],\"ar\":[\"الملصقات والمواد اللاصقة\",\"بالجملة\"],\"wo\":[\"Etiquettes\",\"capp\"]}", "null", '{}', '{}',
  "[\"roll\",\"pack\",\"carton\"]", "[\"type\",\"material\",\"size\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"size\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-produits-industriels', 'cat-root-fournitures-services-divers', 2, 'produits-industriels', 'Factory', '/categories/produits-industriels.jpg', 2, TRUE, FALSE,
  "{\"fr\":\"Produits industriels\",\"en\":\"Industrial Products\",\"ar\":\"المنتجات الصناعية\",\"wo\":\"Produits industriels\"}", "{\"fr\":\"Produits industriels — Achat en gros\",\"en\":\"Industrial Products — Wholesale\",\"ar\":\"المنتجات الصناعية — بالجملة\",\"wo\":\"Produits industriels — Capp\"}", "{\"fr\":\"Découvrez Produits industriels au Sénégal.\",\"en\":\"Discover Industrial Products in Senegal.\",\"ar\":\"اكتشف المنتجات الصناعية في السنغال.\",\"wo\":\"Gis Produits industriels ci Senegaal.\"}", "{\"fr\":[\"Produits industriels\",\"gros\"],\"en\":[\"Industrial Products\",\"wholesale\"],\"ar\":[\"المنتجات الصناعية\",\"بالجملة\"],\"wo\":[\"Produits industriels\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-produits-industriels-composants-industriels', 'cat-root-fournitures-services-divers-produits-industriels', 3, 'composants-industriels', 'Cog', '/categories/composants-industriels.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Composants industriels\",\"en\":\"Industrial Components\",\"ar\":\"المكونات الصناعية\",\"wo\":\"Composants industriels\"}", "{\"fr\":\"Composants industriels — Achat en gros\",\"en\":\"Industrial Components — Wholesale\",\"ar\":\"المكونات الصناعية — بالجملة\",\"wo\":\"Composants industriels — Capp\"}", "{\"fr\":\"Découvrez Composants industriels au Sénégal.\",\"en\":\"Discover Industrial Components in Senegal.\",\"ar\":\"اكتشف المكونات الصناعية في السنغال.\",\"wo\":\"Gis Composants industriels ci Senegaal.\"}", "{\"fr\":[\"Composants industriels\",\"gros\"],\"en\":[\"Industrial Components\",\"wholesale\"],\"ar\":[\"المكونات الصناعية\",\"بالجملة\"],\"wo\":[\"Composants industriels\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"kg\",\"meter\",\"carton\"]", "[\"type\",\"material\",\"dimensions\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"material\",\"dimensions\",\"price\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-produits-industriels-produits-chimiques', 'cat-root-fournitures-services-divers-produits-industriels', 3, 'produits-chimiques', 'Flask', '/categories/produits-chimiques.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Produits chimiques\",\"en\":\"Chemical Products\",\"ar\":\"المنتجات الكيميائية\",\"wo\":\"Produits chimiques\"}", "{\"fr\":\"Produits chimiques — Achat en gros\",\"en\":\"Chemical Products — Wholesale\",\"ar\":\"المنتجات الكيميائية — بالجملة\",\"wo\":\"Produits chimiques — Capp\"}", "{\"fr\":\"Découvrez Produits chimiques au Sénégal.\",\"en\":\"Discover Chemical Products in Senegal.\",\"ar\":\"اكتشف المنتجات الكيميائية في السنغال.\",\"wo\":\"Gis Produits chimiques ci Senegaal.\"}", "{\"fr\":[\"Produits chimiques\",\"gros\"],\"en\":[\"Chemical Products\",\"wholesale\"],\"ar\":[\"المنتجات الكيميائية\",\"بالجملة\"],\"wo\":[\"Produits chimiques\",\"capp\"]}", "null", '{}', '{}',
  "[\"liter\",\"kg\",\"container\",\"drum\"]", "[\"type\",\"brand\",\"volume\",\"hazard_class\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"type\",\"brand\",\"volume\",\"hazard_class\",\"price\"]",
  TRUE, FALSE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-services-associes', 'cat-root-fournitures-services-divers', 2, 'services-associes', 'HandHelping', '/categories/services-associes.jpg', 3, TRUE, FALSE,
  "{\"fr\":\"Services associés\",\"en\":\"Associated Services\",\"ar\":\"الخدمات المرتبطة\",\"wo\":\"Services associés\"}", "{\"fr\":\"Services associés — Achat en gros\",\"en\":\"Associated Services — Wholesale\",\"ar\":\"الخدمات المرتبطة — بالجملة\",\"wo\":\"Services associés — Capp\"}", "{\"fr\":\"Découvrez Services associés au Sénégal.\",\"en\":\"Discover Associated Services in Senegal.\",\"ar\":\"اكتشف الخدمات المرتبطة في السنغال.\",\"wo\":\"Gis Services associés ci Senegaal.\"}", "{\"fr\":[\"Services associés\",\"gros\"],\"en\":[\"Associated Services\",\"wholesale\"],\"ar\":[\"الخدمات المرتبطة\",\"بالجملة\"],\"wo\":[\"Services associés\",\"capp\"]}", "null", '{}', '{}',
  "[\"piece\",\"lot\",\"carton\",\"palette\"]", "[\"brand\",\"condition\"]", "[\"model\",\"warranty_months\",\"origin\"]", "[\"brand\",\"price\",\"condition\"]",
  TRUE, TRUE, TRUE, 0.08,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-services-associes-import-douanes', 'cat-root-fournitures-services-divers-services-associes', 3, 'import-douanes', 'Plane', '/categories/import-douanes.jpg', 1, TRUE, TRUE,
  "{\"fr\":\"Import & Douanes\",\"en\":\"Import & Customs\",\"ar\":\"الاستيراد والجمارك\",\"wo\":\"Import ak Douanes\"}", "{\"fr\":\"Import & Douanes — Achat en gros\",\"en\":\"Import & Customs — Wholesale\",\"ar\":\"الاستيراد والجمارك — بالجملة\",\"wo\":\"Import ak Douanes — Capp\"}", "{\"fr\":\"Découvrez Import & Douanes au Sénégal.\",\"en\":\"Discover Import & Customs in Senegal.\",\"ar\":\"اكتشف الاستيراد والجمارك في السنغال.\",\"wo\":\"Gis Import ak Douanes ci Senegaal.\"}", "{\"fr\":[\"Import & Douanes\",\"gros\"],\"en\":[\"Import & Customs\",\"wholesale\"],\"ar\":[\"الاستيراد والجمارك\",\"بالجملة\"],\"wo\":[\"Import ak Douanes\",\"capp\"]}", "null", '{}', '{}',
  "[\"service\"]", "[\"service_type\",\"destination_country\",\"incoterm\"]", "[\"estimated_delay\",\"volume\"]", "[\"service_type\",\"destination_country\",\"price\"]",
  TRUE, FALSE, FALSE, 0.15,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
),
(
  'cat-root-fournitures-services-divers-services-associes-logistique-transport', 'cat-root-fournitures-services-divers-services-associes', 3, 'logistique-transport', 'Truck', '/categories/logistique-transport.jpg', 2, TRUE, TRUE,
  "{\"fr\":\"Logistique & Transport\",\"en\":\"Logistics & Transport\",\"ar\":\"الخدمات اللوجستية والنقل\",\"wo\":\"Logistique\"}", "{\"fr\":\"Logistique & Transport — Achat en gros\",\"en\":\"Logistics & Transport — Wholesale\",\"ar\":\"الخدمات اللوجستية والنقل — بالجملة\",\"wo\":\"Logistique — Capp\"}", "{\"fr\":\"Découvrez Logistique & Transport au Sénégal.\",\"en\":\"Discover Logistics & Transport in Senegal.\",\"ar\":\"اكتشف الخدمات اللوجستية والنقل في السنغال.\",\"wo\":\"Gis Logistique ci Senegaal.\"}", "{\"fr\":[\"Logistique & Transport\",\"gros\"],\"en\":[\"Logistics & Transport\",\"wholesale\"],\"ar\":[\"الخدمات اللوجستية والنقل\",\"بالجملة\"],\"wo\":[\"Logistique\",\"capp\"]}", "null", '{}', '{}',
  "[\"service\"]", "[\"service_type\",\"origin\",\"destination\",\"condition\"]", "[\"max_weight\",\"delay\"]", "[\"service_type\",\"origin\",\"destination\",\"price\"]",
  TRUE, FALSE, FALSE, 0.12,
  '2026-07-05T19:00:00Z', '2026-07-05T19:00:00Z'
);

COMMIT;
