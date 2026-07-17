export type Locale = "fr" | "en";

const dict: Record<string, Record<Locale, string>> = {
  // ─── Welcome Screen ───
  "welcome.heading": { fr: "Bienvenue", en: "Welcome" },
  "welcome.subtitle": {
    fr: "Scannez votre QR ou recherchez votre nom",
    en: "Scan your QR or search your name",
  },
  "welcome.scan": { fr: "Scanner mon QR", en: "Scan my QR" },
  "welcome.search": { fr: "Rechercher", en: "Search" },

  // ─── Language Toggle ───
  "language.fr": { fr: "FR", en: "FR" },
  "language.en": { fr: "EN", en: "EN" },

  // ─── Common ───
  "common.cancel": { fr: "Annuler", en: "Cancel" },

  // ─── Scanner Screen ───
  "scanner.instruction": {
    fr: "Placez le QR dans le cadre",
    en: "Place the QR in the frame",
  },
  "scanner.manualLink": {
    fr: "Entrer le code manuellement",
    en: "Enter code manually",
  },
  "scanner.noCamera": {
    fr: "Caméra non disponible",
    en: "Camera unavailable",
  },
  "scanner.permissionDenied": {
    fr: "Veuillez autoriser l'accès à la caméra",
    en: "Please allow camera access",
  },
  "scanner.unrecognized": {
    fr: "QR non reconnu. Réessayez.",
    en: "QR not recognized. Retry.",
  },

  // ─── Search Screen ───
  "search.heading": {
    fr: "Rechercher un visiteur",
    en: "Search visitor",
  },
  "search.placeholder": {
    fr: "Tapez votre nom...",
    en: "Type your name...",
  },
  "search.noResults": {
    fr: "Aucun visiteur trouvé",
    en: "No visitor found",
  },
  "search.noResultsHint": {
    fr: "Vérifiez que votre hôte vous a pré-inscrit",
    en: "Check your host pre-registered you",
  },
  "search.error": {
    fr: "Erreur de recherche. Réessayez.",
    en: "Search error. Retry.",
  },

  // ─── Confirm Screen ───
  "confirm.heading": {
    fr: "Confirmez votre arrivée",
    en: "Confirm your arrival",
  },
  "confirm.hostLabel": { fr: "Hôte", en: "Host" },
  "confirm.companyLabel": { fr: "Société", en: "Company" },
  "confirm.dateLabel": { fr: "Date", en: "Date" },
  "confirm.purposeLabel": { fr: "Motif", en: "Purpose" },
  "confirm.today": {
    fr: "Aujourd'hui à {time}",
    en: "Today at {time}",
  },
  "confirm.loading": { fr: "Vérification...", en: "Verifying..." },
  "confirm.button": { fr: "Confirmer", en: "Confirm" },
  "confirm.cancel": { fr: "Annuler", en: "Cancel" },

  // ─── Printing Screen ───
  "printing.status": {
    fr: "Impression du badge en cours...",
    en: "Printing badge...",
  },
  "printing.connecting": {
    fr: "Connexion à l'imprimante...",
    en: "Connecting to printer...",
  },
  "printing.generating": {
    fr: "Génération du badge...",
    en: "Generating badge...",
  },
  "printing.done": { fr: "Terminé!", en: "Done!" },
  "printing.error": { fr: "Erreur d'impression", en: "Printing error" },
  "printing.errorDetail": {
    fr: "Vérifiez que l'imprimante est allumée et a du papier",
    en: "Check printer power and paper",
  },
  "printing.retry": { fr: "Réessayer", en: "Retry" },
  "printing.cancelCheckin": {
    fr: "Annuler l'arrivée",
    en: "Cancel check-in",
  },

  // ─── Success Screen ───
  "success.heading": { fr: "Bienvenue {name}!", en: "Welcome {name}!" },
  "success.subtitle": {
    fr: "Votre badge est prêt",
    en: "Your badge is ready",
  },
  "success.hostNotified": {
    fr: "Votre hôte a été notifié",
    en: "Your host has been notified",
  },
  "success.checkoutHint": {
    fr: "Pour sortir, scannez le QR sur votre badge",
    en: "To exit, scan the QR on your badge",
  },
  "success.home": { fr: "Accueil", en: "Home" },
  "success.countdown": {
    fr: "Retour à l'accueil dans {seconds}s",
    en: "Back to home in {seconds}s",
  },

  // ─── Checkout Screen ───
  "checkout.processing": {
    fr: "Départ en cours...",
    en: "Checking out...",
  },
  "checkout.success": { fr: "Au revoir {name}!", en: "Goodbye {name}!" },
  "checkout.alreadyDone": {
    fr: "Déjà enregistré",
    en: "Already checked out",
  },

  // ─── Error Screen ───
  "error.heading": {
    fr: "Une erreur est survenue",
    en: "An error occurred",
  },
  "error.server": {
    fr: "Impossible de contacter le serveur",
    en: "Cannot reach server",
  },
  "error.printerOffline": {
    fr: "Imprimante hors ligne — contactez la réception",
    en: "Printer offline — contact reception",
  },
  "error.home": { fr: "Retour à l'accueil", en: "Back to home" },

  // ─── Footer ───
  "footer.text": {
    fr: "Visit.me by OVERSIGHT AI",
    en: "Visit.me by OVERSIGHT AI",
  },
};

export function t(
  key: string,
  locale: Locale,
  vars?: Record<string, string>,
): string {
  const entry = dict[key]?.[locale];
  if (!entry) return key;
  if (!vars) return entry;
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(`{${k}}`, v),
    entry,
  );
}
