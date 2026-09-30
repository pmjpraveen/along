// The wording of the two support pages, in plain language. This is a working draft to be replaced by reviewed legal text before launch.
export type LegalDoc = { title: string; updated: string; sections: { heading: string; body: string }[] };

export const PRIVACY: LegalDoc = {
  title: "Privacy policy", updated: "2026-09-30",
  sections: [
    { heading: "What along keeps", body: "Your name and email from your sign-in, the trips you join or create, and what you add to them: plans, expenses, payments and memories." },
    { heading: "Who can see it", body: "Only the people on a trip can see that trip. Nobody outside it can, and along does not sell your data or show adverts." },
    { heading: "Your choices", body: "You can pick which notifications you get, set your country, and log out at any time. You can delete your account from Profile." },
    { heading: "Deleting your account", body: "Your name becomes Deleted user, your sign-in is removed, and your notifications are erased. Expenses and payments you shared stay on the trip so everyone else's balances remain correct." },
  ],
};

export const TERMS: LegalDoc = {
  title: "Terms of use", updated: "2026-09-30",
  sections: [
    { heading: "Using along", body: "along helps a group plan a trip and share costs. It records who paid and who owes; it does not move money between people." },
    { heading: "Your content", body: "What you add to a trip is visible to the people on it. Only add things you are happy to share with them." },
    { heading: "Fair use", body: "Do not misuse the service, try to access other people's trips, or upload anything unlawful." },
    { heading: "Changes", body: "These terms may change. If they change in a way that matters, the app will tell you." },
  ],
};
