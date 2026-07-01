# PRD — Commande groupée avec paiement partagé

## Problem Statement

Aujourd'hui, une seule personne peut passer commande et payer via `PaymentModal` — il n'existe aucune notion de convives dans le panier (`Cart.jsx`). Quand un groupe partage un repas, quelqu'un doit systématiquement avancer l'addition complète puis se faire rembourser par les autres, ce qui crée de la friction sociale et retarde la clôture du paiement (calculs manuels, retards de remboursement, oublis). Pour un produit de commande au restaurant/livraison visant les groupes, l'absence de partage natif de l'addition est un frein direct à l'usage en configuration multi-convives.

## Goals

1. Permettre d'ajouter des convives à une commande en spécifiant uniquement un prénom, sans création de compte.
2. Permettre d'assigner chaque item du panier à un convive au moment de l'ajout.
3. Déclencher une pré-autorisation de paiement indépendante par convive impliqué dans le panier.
4. Ne capturer (paiement final) qu'une fois que 100% des convives ont une pré-autorisation en succès.
5. Réduire à zéro le nombre d'items non assignés au moment du paiement (garantir que chaque euro dû est rattaché à une personne).

## Non-Goals

- **Partage d'un même item entre plusieurs personnes** (ex: pizza coupée en 3) — hors scope v1, cf. décision "une personne par item" ; ajouté en Future Considerations.
- **Comptes utilisateurs / authentification des convives** — un prénom suffit, pas de vérification d'identité ; ce n'est pas un produit de paiement entre particuliers.
- **Paiement réel via un PSP (Stripe, Adyen...)** — la démo simule la pré-autorisation côté front, aucune intégration bancaire réelle n'est prévue dans cette itération.
- **Répartition automatique égale de l'addition** (split "par tête" indépendant des items commandés) — cette version répartit strictement selon les items assignés, pas de mode "diviser en X parts égales".
- **Pourboire / ajustement post-paiement par convive** — non traité, s'ajoute potentiellement en v2.

## User Stories

**Organisateur de la commande**
- En tant qu'organisateur, je veux ajouter les prénoms des convives présents afin de pouvoir leur assigner des items au fil de la commande.
- En tant qu'organisateur, je veux pouvoir retirer un convive tant qu'aucun item ne lui est assigné, afin de corriger une erreur de saisie.
- En tant qu'organisateur, je veux voir clairement quels items ne sont assignés à personne, afin de ne pas bloquer le paiement final par oubli.
- En tant qu'organisateur, je veux voir en un coup d'œil le montant dû par chaque convive avant de lancer les paiements.

**Convive**
- En tant que convive, je veux, au moment d'ajouter un item au panier, choisir à qui il est destiné (moi-même ou un autre convive déjà ajouté), afin que l'addition reflète ce que j'ai commandé.
- En tant que convive, je veux passer ma propre pré-autorisation de paiement dans une mire dédiée à mon nom, afin de ne pas saisir les informations d'un autre convive.
- En tant que convive, je veux voir uniquement le montant qui me concerne (mes items + ma quote-part de taxe) dans ma mire de paiement.
- En tant que convive, je veux pouvoir réessayer ma pré-autorisation si elle échoue, sans impacter les pré-autorisations déjà validées des autres.

**Cas limites**
- En tant qu'organisateur, si je tente de lancer le paiement alors qu'il reste des items non assignés, je veux être bloqué avec un message clair m'indiquant de les assigner d'abord.
- En tant que convive, si ma pré-autorisation échoue plusieurs fois, je veux comprendre que la commande reste bloquée tant que je n'ai pas réussi, sans que les autres perdent leur pré-autorisation validée.
- En tant qu'organisateur, si le groupe met plus de 30 minutes à finaliser tous les paiements, je veux être informé que la commande a été annulée automatiquement plutôt que de rester bloqué sans explication.

## Requirements

### Must-Have (P0)

**P0.1 — Gestion des convives**
- Ajouter un convive à la commande en saisissant un prénom (aucun autre champ requis).
- Le prénom est utilisé tel quel comme identifiant d'affichage ; deux convives peuvent avoir le même prénom sans blocage (identifiant technique interne distinct, ex. index/uuid).
- Un convive ne peut être supprimé que si aucun item ne lui est assigné.
- Acceptance criteria :
  - [ ] Un champ "Ajouter un convive" avec prénom + bouton d'ajout est visible dans le panier.
  - [ ] Le prénom vide n'est pas accepté (bouton désactivé ou message d'erreur).
  - [ ] La liste des convives ajoutés s'affiche avec un bouton de suppression.
  - [ ] Tenter de supprimer un convive ayant des items assignés affiche un message bloquant explicite.

**P0.2 — Assignation d'un item à un convive**
- Lors de l'ajout d'un item au panier (depuis `Menu.jsx`) ou depuis le panier lui-même, l'utilisateur peut assigner l'item à un des convives existants.
- Un item peut aussi rester "non assigné" temporairement, mais ce statut est visuellement signalé dans le panier.
- Un item peut être réassigné à un autre convive tant que le paiement n'a pas démarré.
- Acceptance criteria :
  - [ ] Un sélecteur de convive apparaît lors de l'ajout d'un item (ou juste après, dans la liste du panier).
  - [ ] Le panier affiche pour chaque item le convive assigné (ou un badge "non assigné").
  - [ ] Le sous-total par convive se met à jour en temps réel dans le panier.

**P0.3 — Blocage du paiement si items non assignés**
- Given au moins un item du panier n'a pas de convive assigné
- When l'organisateur clique sur "Place Order"
- Then le paiement ne démarre pas et un message indique le nombre d'items à assigner.

**P0.4 — Mire de pré-autorisation par convive**
- Au lancement du paiement, une pré-autorisation est demandée **séquentiellement** : les mires s'enchaînent une par une, dans l'ordre d'ajout des convives, chaque mire ne s'ouvrant qu'une fois la précédente terminée (succès ou report après échec — cf. P0.5).
- Seuls les convives ayant **au moins un item assigné** entrent dans ce flow. Un convive ajouté à la commande mais sans item assigné au moment du paiement n'a pas de mire et n'apparaît pas dans le flow de paiement.
- Chaque mire affiche : le prénom du convive, la liste de ses items, son sous-total (part de taxe incluse au prorata), et un formulaire de carte identique à l'actuel `PaymentModal`.
- Le statut de chaque convive est visible globalement (ex: liste "Alice ✅ pré-autorisée / Bob ⏳ en attente / Chloé ❌ échec").
- **Simulation d'échec (démo)** : dans le formulaire de carte, saisir `666` comme CVV déclenche systématiquement un échec de pré-autorisation pour ce convive (n'importe quelle autre valeur de CVV valide aboutit à un succès). Ce comportement permet de tester le flow de blocage/retry sans PSP réel.
- Acceptance criteria :
  - [ ] Les mires s'ouvrent une à une dans l'ordre des convives ayant des items assignés ; un convive sans item assigné est ignoré et ne bloque pas la séquence.
  - [ ] Chaque mire voit une mire de paiement scoping uniquement ses items et son montant.
  - [ ] Un état global de progression liste tous les convives concernés (ceux ayant des items) et leur statut de pré-autorisation.
  - [ ] La pré-autorisation d'un convive en succès reste acquise même si un autre convive est encore en attente ou en échec.
  - [ ] Saisir CVV `666` produit un échec de pré-autorisation reproductible, affichant un message d'erreur clair et permettant un nouvel essai.

**P0.5 — Paiement final conditionné au succès de toutes les pré-autorisations**
- Given tous les convives impliqués ont une pré-autorisation en succès
- When la dernière pré-autorisation aboutit
- Then le paiement final (capture) est déclenché automatiquement et l'écran de succès de commande s'affiche pour l'ensemble du groupe.
- Given au moins un convive a échoué sa pré-autorisation
- When l'organisateur ou le convive revient sur l'écran de paiement
- Then seul ce convive doit retenter sa pré-autorisation ; les autres restent en attente sans repasser par leur mire.
- Acceptance criteria :
  - [ ] Aucune capture finale n'est déclenchée tant qu'un seul statut est différent de "succès".
  - [ ] Un échec de pré-autorisation permet un nouvel essai ciblé sur le convive concerné, sans réinitialiser les autres.
  - [ ] L'écran de confirmation finale récapitule la commande complète et le montant payé par chaque convive.

**P0.6 — Délai limite de 30 minutes**
- Un compte à rebours de 30 minutes démarre au lancement de la première mire de pré-autorisation (début du flow de paiement groupé).
- Si l'ensemble des pré-autorisations n'a pas abouti en succès avant l'expiration de ce délai, la commande entière est automatiquement annulée : toutes les pré-autorisations déjà obtenues sont considérées caduques, aucune capture n'a lieu, et l'utilisateur revient à un panier vide (ou à un état "commande annulée" explicite) plutôt qu'à l'écran de paiement.
- Le délai est global à la commande, pas individuel par convive : il n'est pas remis à zéro à chaque nouvelle mire ou nouvel essai.
- Acceptance criteria :
  - [ ] Un indicateur de temps restant est visible pendant tout le flow de paiement groupé.
  - [ ] Au-delà de 30 minutes sans succès complet, la commande est annulée automatiquement, y compris si un ou plusieurs convives avaient déjà réussi leur pré-autorisation.
  - [ ] Un message explicite informe l'organisateur (et les convives concernés) que la commande a été annulée pour cause de délai dépassé.
  - [ ] Après annulation pour timeout, il est possible de recommencer une nouvelle commande depuis zéro (les assignations précédentes ne sont pas automatiquement restaurées).

### Nice-to-Have (P1)

- Indicateur visuel en temps réel (barre de progression "2/3 convives payés") pendant la phase de pré-autorisation.
- Possibilité de relancer uniquement les convives en échec via un bouton dédié, sans repasser par tout le flow.
- Historique local (session) des convives ajoutés récemment pour accélérer la saisie sur une commande suivante.

### Future Considerations (P2)

- Partage d'un même item entre plusieurs convives avec répartition du montant (ex: 50/50).
- Mode "split égal" indépendant des items assignés.
- Ajout de pourboire par convive avant capture finale.
- Vraie intégration PSP (pré-autorisation/capture réelles, gestion des remboursements en cas d'échec partiel après capture).

## Success Metrics

**Leading**
- Taux d'adoption : % de commandes avec ≥2 convives parmi les commandes total (cible : 25% à 30 jours).
- Taux de complétion du flow group : % de commandes groupées démarrées (≥1 convive ajouté) qui aboutissent à un paiement final réussi (cible : 80%).
- Taux d'items non assignés au moment du 1er clic sur "Place Order" (cible : baisse continue au fil des sessions, mesure de friction UX).

**Lagging**
- Fréquence d'usage du mode groupé par utilisateur récurrent sur 90 jours.
- Taux d'abandon du panier comparé entre commandes solo vs groupées (vérifier que le mode groupé n'introduit pas plus d'abandon).

*Note : cette démo n'a pas d'instrumentation analytics existante — l'implémentation de ces métriques nécessite l'ajout d'un tracking (hors scope de cette spec fonctionnelle, à cadrer séparément).*

## Open Questions

- **(Design)** Sur l'appareil unique qui circule entre convives pendant le flow séquentiel (P0.4), quel écran de transition afficher entre deux mires (ex: "Passez l'appareil à Bob") pour éviter qu'un convive ne voie les informations de carte du précédent ?
- **(Produit)** Le compte à rebours de 30 minutes (P0.6) doit-il afficher un avertissement avant expiration (ex: à 5 minutes restantes) pour laisser une chance de finaliser dans l'urgence, ou l'annulation doit-elle être silencieuse jusqu'à l'échéance ?
- **(Engineering)** En cas d'annulation pour timeout, faut-il conserver une trace de la commande annulée (log/historique local) à des fins de debug de la démo, ou la commande disparaît-elle simplement sans laisser de trace ?

## Timeline Considerations

- Pas de deadline contractuelle identifiée (projet démo).
- Dépendance interne : cette fonctionnalité modifie le modèle de données du panier (ajout d'un champ `assignedTo` par item) et le flow de `PaymentModal` — prévoir de traiter en une seule itération plutôt que de scinder panier / paiement, car les deux sont fortement couplés.
- Phasage suggéré si besoin de livrer plus tôt :
  1. **Phase 1** : gestion des convives + assignation d'items (P0.1, P0.2, P0.3) sans toucher au paiement.
  2. **Phase 2** : mires de pré-autorisation multiples + logique de capture conditionnelle (P0.4, P0.5).
