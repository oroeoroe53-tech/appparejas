// Generates a VAPID key pair for Web Push. Run: npm run vapid
// Put the public key in NEXT_PUBLIC_VAPID_PUBLIC_KEY and the private key in VAPID_PRIVATE_KEY (server only).
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + publicKey);
console.log("VAPID_PRIVATE_KEY=" + privateKey);
console.log("\nKeep the private key secret. Never commit it. Set VAPID_SUBJECT to mailto:you@yourdomain.");
