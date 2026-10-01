// The wording of the two support pages, in plain language. One source for the app screens and the website (scripts/build-legal-pages.js
// writes site/privacy and site/terms from it). This is a working draft to be reviewed by a lawyer before launch.
export type LegalDoc = { title: string; updated: string; intro: string; sections: { heading: string; body: string[] }[] };

const UPDATED = "2026-10-02";

export const PRIVACY: LegalDoc = {
  title: "Privacy policy", updated: UPDATED,
  intro: "along is run by Along, based in Hubballi, Karnataka, India. It helps a group plan a trip and share the costs. This page explains what we keep, why, who can see it, and the choices you have. We have tried to say it plainly.",
  sections: [
    { heading: "What we keep", body: [
      "Your account: the name and email on the Google account you sign in with, and the profile picture Google shares, if any. You can replace the picture from Profile.",
      "Your profile: the country, preferred currency and notification choices you set, and any profile picture you upload.",
      "Trips you create or join: the name, place, dates, comment, currency and cover photo of a trip, who is on it and in what role, and the invite links made for it.",
      "What you add to a trip: itinerary plans (title, day, time, place, notes), expenses (what, how much, who paid, who shares it), recorded payments between people, and memories (photos and notes).",
      "Guests: when a trip owner adds a friend who is not on along, the name the owner typed. If that friend later joins from an invite link, the guest spot becomes theirs.",
      "Notifications: a record of the updates sent to you (for example, that someone added you to a trip), and, if you turn on push notifications, a token that identifies your phone to Apple or Google so they can deliver them.",
    ] },
    { heading: "What we do not keep", body: [
      "We do not collect your phone contacts, your precise location, or your payment card or bank details. along records who paid and who owes; it never handles real money.",
      "We do not run advertising, and we do not use analytics or advertising trackers in the app.",
    ] },
    { heading: "Why we use it", body: [
      "To run the app: sign you in, show you your trips, work out who owes whom, send the notifications you ask for, and let you invite friends. We do not use your information for anything else, and we do not sell it.",
    ] },
    { heading: "Who can see it", body: [
      "Only the people on a trip can see that trip: its plans, expenses, payments, memories and who is on it. Other people who have not joined cannot, even with the trip's name. Anyone who opens an invite link can see the trip's name, place, dates and how many people are going before they join, so only share links with people you want on the trip.",
      "Other people on your trips can see your name, your profile picture and what you add. Nobody else sees your email, country or preferences.",
      "A trip owner who already knows your email can add you straight to a trip. We never show anyone your email or tell them anything about your account: the owner only learns whether that email belongs to someone on along. You are told when someone adds you, and you can leave a trip at any time.",
    ] },
    { heading: "Services that help us run along", body: [
      "Supabase hosts our database, sign-in, file storage and server functions. Your data is stored there.",
      "Google signs you in. We only receive the name, email and picture you share with us, never your Google password.",
      "OpenStreetMap's Nominatim service finds places when you search for one: the words you type in a place search are sent to it, along with nothing that identifies you. When you paste a map link, our server opens it to read the place name.",
      "Apple and Google deliver push notifications, and the App Store and Google Play distribute the app. Vercel hosts our website.",
      "These providers handle data only to provide their service to us, under their own privacy terms. Your data may be processed in countries other than your own.",
    ] },
    { heading: "Photos and files", body: [
      "Cover photos, memory photos and profile pictures are stored privately. They are shown through short-lived links that only people allowed to see them can get. Photos can contain information such as where and when they were taken; share only what you are happy for the people on the trip to see.",
    ] },
    { heading: "How long we keep it", body: [
      "We keep your information while your account is open so the app keeps working for you and your group. If a trip's owner deletes it, the trip is erased for everyone on it: its plans, expenses, payments, memories and photos are removed from our database and storage. Copies in backups are removed when those backups expire.",
      "While a trip exists, its money records stay on it: an expense or payment that was shared stays, so everyone else's balances stay correct, even if the person who added it leaves or deletes their account.",
    ] },
    { heading: "Your choices and rights", body: [
      "You can change your picture, country, preferred currency and notification choices in Profile, and edit or remove what you added to a trip. You can log out at any time.",
      "You can delete your account from Profile. Your name then shows as Deleted user, your sign-in, picture and push tokens are removed, and your notifications are erased. Expenses and payments you shared stay on the trip. If you own a trip that other people are still on, finish or hand it over first, because a trip needs an owner.",
      "You can ask us for a copy of your information, to correct it, or to delete it, and you can object to how we use it. Depending on where you live, the law may give you more rights, such as complaining to your data protection authority. We will answer within a reasonable time.",
    ] },
    { heading: "Security", body: [
      "Information travels over encrypted connections, and every trip's data is protected so that only its members can read it. No system is perfectly secure, so please keep your Google account safe and tell us if you think someone else has access to yours.",
    ] },
    { heading: "Children", body: [
      "along is not meant for children under 13, or under the age required in your country to use an app like this without a parent's consent. If you think a child has created an account, tell us and we will remove it.",
    ] },
    { heading: "Changes to this policy", body: [
      "If we change this policy in a way that matters, the app will tell you before it takes effect. The date at the top shows when it was last updated.",
    ] },
    { heading: "Contact", body: [
      "Questions or requests about your information? Email alongtravel.app@gmail.com.",
      "Along, #4, Krishna Kunj, Dattatreya Colony, Rajiv Nagar, Hubballi, Karnataka, India - 580031",
    ] },
  ],
};

export const TERMS: LegalDoc = {
  title: "Terms of use", updated: UPDATED,
  intro: "These terms are the agreement between you and Along, based in Hubballi, Karnataka, India, which runs the along app. By signing in and using the app you accept them. If you do not agree, please do not use along.",
  sections: [
    { heading: "What along is", body: [
      "along helps a group plan a trip and share its costs: a shared itinerary, a record of who paid what, exact splits, a view of who owes whom, and memories.",
      "along keeps a record. It does not take, hold or move money between people, it is not a bank or payment service, and it does not give financial, legal or tax advice. When you settle up, you pay each other outside the app and then record that it happened.",
    ] },
    { heading: "Who can use it", body: [
      "You must be at least 13, or older if your country requires, and able to make this agreement. You sign in with a Google account, and you are responsible for it and for what happens under your sign-in.",
    ] },
    { heading: "Trips, owners and guests", body: [
      "The person who creates a trip is its owner. An owner can change the trip's details, invite people, add guests, end the trip and delete it. Members can add plans and expenses and see everything on the trip.",
      "A guest is a friend an owner adds by name before they join. The owner is responsible for adding guests who are happy to be included. A guest can later claim their spot from an invite link.",
      "Invite links let anyone who has them join the trip until they expire or are turned off. Share them only with people you want on the trip. An owner can also add someone who already uses along by typing the email they signed in with; only add people who expect it.",
    ] },
    { heading: "Your content", body: [
      "What you add, such as plans, expenses, notes and photos, stays yours. By adding it you let along store it and show it to the people on that trip so the app can work. You promise you have the right to add it, and that it is not unlawful or harmful.",
      "Other people on a trip can see what you add. Only add things you are happy to share with them.",
    ] },
    { heading: "Money records", body: [
      "Amounts are stored exactly as entered, in the trip's currency, and are never converted. Balances are worked out from the expenses and payments on the trip. Please check what you enter, because the totals can only be as correct as the records.",
      "A recorded payment cannot be edited or deleted afterwards, so a mistake is fixed by recording a new entry. An expense can be edited by the person who added it or by the trip owner, and the app keeps the history needed to keep balances right.",
      "Any disagreement about who owes what is between the people on the trip. along is not responsible for money that is not paid.",
    ] },
    { heading: "Fair use", body: [
      "Do not misuse the service, try to reach other people's trips or data, probe or disrupt our systems, upload anything unlawful, harmful or that you do not have the right to share, or use along to harass anyone or to run a business without our permission.",
      "We may remove content or limit access if these terms are broken or to keep people safe.",
    ] },
    { heading: "Your account", body: [
      "You can stop using along and delete your account at any time from Profile. Deleting your account is explained in the privacy policy: expenses and payments you shared stay on their trips. We may suspend or close an account that breaks these terms.",
    ] },
    { heading: "Availability and changes to the app", body: [
      "We work to keep along running and your data safe, but we cannot promise it will always be available or free of mistakes. Maps and place search come from third parties and may be wrong or unavailable. We may change, add or remove features, and we will give notice of changes that matter.",
    ] },
    { heading: "Our responsibility", body: [
      "along is provided as it is. As far as the law allows, we are not liable for indirect or consequential loss, for lost money, bookings or plans, or for what other people on a trip do or fail to do. Nothing in these terms limits any right you have by law that cannot be limited, or our liability for anything that cannot be limited by law.",
    ] },
    { heading: "Changes to these terms", body: [
      "We may update these terms. If a change matters, the app will tell you, and using along after it takes effect means you accept it. The date at the top shows when they were last updated.",
    ] },
    { heading: "The law that applies", body: [
      "These terms follow the laws of the place where you live, unless the law requires something else, and any dispute is for the courts there. If part of these terms cannot be enforced, the rest still applies.",
    ] },
    { heading: "Contact", body: [
      "Questions about these terms? Email alongtravel.app@gmail.com.",
      "Along, #4, Krishna Kunj, Dattatreya Colony, Rajiv Nagar, Hubballi, Karnataka, India - 580031",
    ] },
  ],
};
