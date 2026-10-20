# Petit Bonbon

**Des inconnus. Des compliments. Aucune pression.**

Application web installable (PWA) : on choisit une identité du jour, on découvre les personnes présentes dans la même ville, et on leur envoie un compliment choisi dans une liste. **L'app de base est gratuite** ; les options (messages perso, vocaux, photos, musique, liens) seront réservées à un abonnement Premium, pas encore développé.

Coût fixe : **0 €** — GitHub Pages (hébergement), Supabase offre gratuite (comptes et base de données), Stripe (commission uniquement à chaque vente).

---

## Mise en ligne, pas à pas

### 1. Activer GitHub Pages (1 min)
Dépôt `petitbonbon/petitbonbon.github.io` › **Settings** › **Pages** › *Build and deployment* › Source : **Deploy from a branch** › Branche **main**, dossier **/ (root)** › **Save**.

L'app sera en ligne à l'adresse **https://petitbonbon.github.io/** (1 à 2 minutes après).

### 2. Créer la base Supabase (5 min)
1. Sur [supabase.com](https://supabase.com), **New project**. Région : **Europe** (ou un pays de l’UE). Note le mot de passe de la base quelque part.
2. **SQL Editor** › **New query** › colle tout le contenu de `supabase/schema.sql` › **Run**. Le message doit être *Success*.
3. **Authentication** › **Sign In / Providers** : active **Allow anonymous sign-ins** et enregistre.
   *Pourquoi :* Petit Bonbon s'utilise sans compte. Chaque appareil reçoit un identifiant anonyme invisible, qui suffit pour les bonbons, les blocages, les signalements et le paiement. Un vrai compte (e-mail) ne servira que pour le futur Premium.
   *Conseillé ensuite :* **Authentication › Attack Protection** › active une protection CAPTCHA (Cloudflare Turnstile, gratuit) pour limiter la création d'identifiants en masse.
4. **Authentication** › **URL Configuration** : *Site URL* = `https://petitbonbon.github.io/`, et ajoute la même adresse dans *Redirect URLs*.
5. **Project Settings** › **API** : copie **Project URL** et la clé **anon public** dans `config.js`.
   ⚠️ Ne mets **jamais** la clé `service_role` dans `config.js` : ce fichier est public.

### 3. Créer le paiement Stripe (10 min)
> **À faire plus tard.** L'app de base est gratuite (`paywall_enabled = false`). Les étapes 3 et 4 ne servent que si tu veux un jour rendre l'entrée payante ; l'abonnement Premium demandera un autre branchement Stripe (abonnement mensuel).

1. Crée ton compte sur [stripe.com](https://stripe.com) et complète la vérification d'identité.
2. **Catalogue de produits** › **Ajouter un produit** : « Accès Petit Bonbon », **0,99 €**, paiement **unique**.
3. **Liens de paiement** › **Nouveau** › ce produit. Dans les options :
   - *Après le paiement* › **Ne pas afficher de page de confirmation, rediriger vers votre site** : `https://petitbonbon.github.io/?paid=1`
   - **Exiger que les clients acceptent vos conditions d'utilisation** (renseigne l'adresse de `cgu.html` dans les paramètres publics Stripe), et ajoute ce texte personnalisé :
     *« Je demande l'activation immédiate de mon accès et je renonce à mon droit de rétractation. »*
4. Copie le lien (`https://buy.stripe.com/…`) dans `config.js` › `STRIPE_PAYMENT_LINK`.

### 4. Débloquer l'accès après paiement (10 min)
1. Supabase › **Edge Functions** › **Deploy a new function** › **Via Editor**. Nom : `stripe-webhook`. Colle le contenu de `supabase/functions/stripe-webhook/index.ts` › **Deploy**.
2. Dans les détails de la fonction, désactive **Verify JWT** (Stripe n'envoie pas de jeton Supabase ; la sécurité vient de la signature Stripe).
3. Stripe › **Développeurs** › **Webhooks** › **Ajouter une destination** :
   - URL : `https://<ID-DU-PROJET>.supabase.co/functions/v1/stripe-webhook`
   - Événements : `checkout.session.completed` et `checkout.session.async_payment_succeeded`
4. Copie le **secret de signature** (`whsec_…`) › Supabase › **Edge Functions** › **Secrets** › nouveau secret `STRIPE_WEBHOOK_SECRET`.
5. Teste avec un vrai paiement de 0,99 € : l'écran de paiement doit disparaître tout seul.

### 5. Compléter les pages légales
Remplace les `[CROCHETS]` dans `mentions-legales.html`, `cgu.html` et `confidentialite.html`, et mets ton adresse de contact dans `config.js`. Vendre suppose un statut (ex. micro-entreprise) et un numéro SIRET. Fais relire ces textes avant de lancer à grande échelle.

---

## Premium : abonnement Stripe Billing (2,99 €/mois)

Tant que `PREMIUM_PAYMENT_LINK` est vide dans `config.js`, Premium reste une vitrine (« bientôt »). Pour l'ouvrir :

Premium **ne demande ni compte ni e-mail** : il est lié à l'identifiant anonyme du téléphone, et l'abonné reçoit un **code Premium** (`BONBON-XXXX-XXXX-XXXX`) pour le retrouver sur un autre appareil. Les reçus et les e-mails de gestion d'abonnement sont envoyés par Stripe : aucun service d'e-mail à configurer.

### P1. Produit et lien de paiement Stripe
1. Stripe › **Catalogue de produits › Ajouter un produit** : « Petit Bonbon Premium », **2,99 €**, **récurrent, mensuel**.
2. **Liens de paiement › Nouveau** › ce produit. Options :
   - *Après le paiement* › rediriger vers `https://petitbonbon.github.io/?premium=1`
   - ne pas demander d'adresse de livraison.
3. Copie le lien (`https://buy.stripe.com/…`) dans `config.js` › `PREMIUM_PAYMENT_LINK`.
4. **PayPal (facultatif)** : Paramètres › Moyens de paiement › PayPal › activer et lier un compte PayPal Business, puis cliquer sur **Enable** à côté de « Recurring payments » (validation Stripe en 2 à 5 jours ouvrés).

### P2. Portail « Gérer / résilier » (obligatoire en France)
1. Stripe › **Paramètres › Facturation › Portail client** : autorise la **résiliation** (à la fin de la période) et la mise à jour du moyen de paiement ; renseigne le lien vers `https://petitbonbon.github.io/cgu.html#premium`.
2. Dans la même page, active le **lien de connexion** (« no-code ») et copie-le (`https://billing.stripe.com/p/login/…`) dans `config.js` › `PREMIUM_PORTAL_LINK`.

### P3. Webhook
Supabase › **Edge Functions › stripe-webhook** : remplace le code par celui de `supabase/functions/stripe-webhook/index.ts` et redéploie (« Verify JWT » désactivé).
Stripe › **Développeurs › Webhooks** › ta destination › ajoute les événements :
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
(Si tu n'as pas encore de webhook : URL `https://<ID-DU-PROJET>.supabase.co/functions/v1/stripe-webhook`, puis secret `whsec_…` › Supabase › Edge Functions › Secrets › `STRIPE_WEBHOOK_SECRET`.)

### P3 bis. Notes vocales et photos floues
1. Relancer `supabase/schema.sql` : il crée les espaces de stockage privés `vocaux` et `photos` et leurs règles d'accès.
2. Supabase › **Edge Functions** › fonction **`nettoyage-vocaux`** avec le code de `supabase/functions/nettoyage-vocaux/index.ts` (« Verify JWT » peut rester activé), puis **Deploy**. Elle efface les vocaux et les photos.
3. Le filtre anti-nudité ([NSFWJS](https://github.com/infinitered/nsfwjs), licence MIT) est hébergé dans `vendor/nsfw/` et ne se charge qu'au moment d'ajouter une photo.
L'app appelle cette fonction elle-même : aucun réglage de tâche planifiée n'est nécessaire.

### P4. Tester avant d'ouvrir
1. En **mode test** Stripe, crée le même produit et lien, et teste avec la carte `4242 4242 4242 4242`.
2. Vérifie : abonnement › code Premium affiché › Premium actif dans « Moi » › code saisi sur un 2e appareil › résiliation par le portail › « Se termine le … ».
3. Repasse en **mode réel**, refais P1 à P3 avec les liens réels.

### Pilotage Premium (SQL Editor)
```sql
-- Abonnés actifs
select count(*) from profiles where sub_status in ('active', 'trialing');
-- Code perdu : retrouve l'identifiant client dans Stripe (Clients › recherche par e-mail, « cus_… »),
-- puis renvoie ce code à la personne :
select recovery_code, sub_status, sub_period_end from profiles where stripe_customer_id = 'cus_XXXXXXXX';
```

## Nouveautés bien-être (20 oct. 2026)

**À faire une fois :** Supabase › **SQL Editor** › colle tout `supabase/schema.sql` › **Run** (sans risque : il ne recrée que ce qui manque). Tant que ce n'est pas fait, l'app reste utilisable, mais les réactions emoji redeviennent un simple « merci », et la pause et le compteur de ville ne marchent pas.

- **Mode sombre** automatique (suit le réglage du téléphone), tons prune et lilas, jamais de noir pur.
- **Bonbons emballés** : un bonbon reçu arrive emballé dans « Ma box » ; on le touche, il tremble, s'ouvre, et le compliment apparaît avec une pluie de petits éclats. Rebonds doux sur les boutons. Tout se calme si le téléphone demande moins d'animations.
- **Vibrations** (Android) à l'arrivée et au déballage d'un bonbon, coupables dans Paramètres.
- **Installer l'app** : bouton « Installer » (Android/Chrome) ou mode d'emploi iPhone ; raccourcis « Ma box » et « Bocal » sur l'icône.
- **Bocal à bonbons** : chaque compliment déballé s'y range, sur le téléphone uniquement. Bouton « Piocher un bonbon » pour les jours gris.
- **Bonbon du jour** : une suggestion douce par jour (60 phrases, liste `DAILY` dans `app.js`).
- **Compliments guidés** : débuts de phrases à toucher pour les mots personnalisés et la conversation libre (liste `STARTERS`).
- **Réactions sans texte** : 💌 Merci, 🍬 Touché·e, 🍭 J'ai souri, 🍫 Ça m'a fait du bien. L'expéditeur voit la réaction.
- **Compteur de ville** : « 128 bonbons échangés à Orléans cette semaine » (un simple total).
- **« Ce n'était pas gentil »** : le bonbon est masqué tout de suite ; 5 secondes pour annuler, puis signalement + blocage (comme « Signaler »).
- **Filtre renforcé** : moqueries et méchancetés (« moche », « ta gueule », « personne ne t'aime »…) refusées par la base, avec un rappel doux qui s'affiche dès la saisie.
- **Pause bonbons 🌙** : plus rien n'arrive jusqu'à demain 7 h, on disparaît de « Découvrir » ; ça se rallume tout seul.

```sql
-- Réactions reçues cette semaine
select reaction, count(*) from bonbons where status = 'thanked' and created_at > now() - interval '7 days' group by 1;
-- Signalements « pas gentil »
select created_at, pseudo_seen from reports where reason = 'Ce n’était pas gentil' and not handled order by created_at desc;
```

## Pilotage au quotidien (Supabase › SQL Editor)

```sql
-- Ouvrir l'app gratuitement (soirée de lancement, événement…)
update app_settings set paywall_enabled = false;
-- …et refermer
update app_settings set paywall_enabled = true;

-- Changer le nombre de bonbons par jour
update app_settings set daily_send_limit = 15;

-- Nombre de personnes nécessaires dans une ville pour ouvrir « Découvrir » (2 par défaut)
update app_settings set min_city_people = 2;

-- Bonbons par jour pour les abonnés Premium (25 par défaut)
update app_settings set premium_daily_limit = 25;

-- « Autour de toi » ne montre que les personnes qui ont l'app ouverte depuis moins de N minutes (3 par défaut)
update app_settings set presence_minutes = 3;

-- Bonbons max vers une même personne sur 7 jours (2 par défaut)
update app_settings set weekly_pair_limit = 2;

-- Signalements à traiter
select created_at, reason, pseudo_seen, bio_seen, reported_id
from reports where not handled order by created_at desc;

-- Lever une suspension (après vérification)
update profiles set banned = false where id = '<reported_id>';
update reports set handled = true where reported_id = '<reported_id>';

-- Offrir l'accès à tout le monde pendant les tests : voir paywall_enabled ci-dessus.
-- (Sans compte, il n'y a pas d'e-mail pour retrouver une personne précise.)

-- Chiffres du jour
select (select count(*) from profiles where paid_at is not null) as payants,
       (select count(*) from sessions where expires_at > now())   as connectes,
       (select count(*) from bonbons where created_at > now() - interval '24 hours') as bonbons_24h;
```

## Sécurité, en bref
- Aucune table n'est lisible directement depuis le navigateur : tout passe par des fonctions qui vérifient l'appelant et ne renvoient que le nécessaire. Les identifiants des autres utilisateurs ne sortent jamais de la base.
- Compliments uniquement choisis dans une liste (pas de texte libre). Le pseudo et la phrase de présentation sont libres mais courts, et signalables.
- Signaler bloque définitivement dans les deux sens ; 3 signalements distincts en 30 jours suspendent le compte.
- 10 bonbons par jour maximum, un seul par personne et par jour.
- Ville uniquement, jamais de position GPS. Identité du jour effacée après 12 h.

## Structure
```
index.html, style.css, app.js   l'application
config.js                       réglages publics (Supabase, Stripe, contact)
manifest.webmanifest, sw.js     installation sur l'écran d'accueil
cgu.html, confidentialite.html, mentions-legales.html
supabase/schema.sql             base de données et règles de sécurité
supabase/functions/stripe-webhook/index.ts   déblocage après paiement
```

**Ajouter des compliments :** ajoute-les **à la fin** de la liste `COMPLIMENTS` dans `app.js` (12 maximum ; la base stocke leur numéro).

---

## Feuille de route Premium (pas encore développé)

**Premium v1 (en place)** : mots personnalisés filtrés, notes vocales de 15 s (8 s en gratuit), photos floues (révélées 10 s, une fois), bonbons animés (cœurs, étoiles, confettis), 25 bonbons par jour, 12 phrases et 6 humeurs en plus (2 humeurs à la fois), bio de 160 caractères, avatars pixel, thèmes de couleur, tarif réduit aux rencontres.

**Gratuit (19 oct. 2026)** : notes vocales de 8 s ; messages libres dans les petits échanges avec 2 personnes de sa ville par identité du jour (Premium : sans limite). Relancer `supabase/schema.sql` pour activer.
**Premium v2 (à venir)** : musique (lien Spotify ou Apple Music en lecteur intégré), discussion libre.

**Discussion libre (Premium)** : prolongement des petits échanges à phrases toutes faites. Ne s'ouvre que si les **deux** personnes l'acceptent explicitement, uniquement entre abonnés. Filtre automatique (contacts, liens, insultes, contenus sexuels) avant réception, signalement en un geste, file de modération humaine. Aucun lien ni numéro autorisé, même en Premium.

**Règles décidées pour les photos**
- **Éphémère, 10 secondes** : une photo reçue s'ouvre une seule fois, reste visible 10 secondes (avec un compte à rebours), puis elle est supprimée définitivement du serveur. Aucune galerie, aucun enregistrement, aucune réouverture. Une photo jamais ouverte est supprimée automatiquement au bout de 24 heures.
- **Yeux masqués par défaut** : avant l'envoi, l'app détecte les visages *sur le téléphone* (ex. MediaPipe Face Landmarker, gratuit, fonctionne dans le navigateur) et pixelise une bande sur les yeux, dans le style pixel de l'app. La photo d'origine ne quitte jamais l'appareil : seule la version filtrée est envoyée.
- **Aperçu obligatoire avant envoi** : la détection peut rater un visage (profil, lunettes, faible lumière). La personne voit le résultat et peut ajouter une bande à la main, ou pixeliser tout le visage.
- **Retirer le filtre** est possible, mais doit rester un choix volontaire à chaque envoi, jamais un réglage permanent.
- **Modération** : filtrage automatique de la nudité avant réception, signalement en un geste, et suppression des métadonnées (position GPS de la photo, modèle de téléphone).

## Licence

© 2026 Petit Bonbon. Tous droits réservés : voir [LICENSE](LICENSE). Le dépôt est public seulement pour l'hébergement ; aucune réutilisation n'est autorisée sans accord écrit.
