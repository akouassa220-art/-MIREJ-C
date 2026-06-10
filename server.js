const express = require("express");
const AfricasTalking = require("africastalking");
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const AT = AfricasTalking({
  username: process.env.AT_USERNAME || "sandbox",
  apiKey:   process.env.AT_APIKEY  || ""
});
const sms = AT.SMS;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MIREJC2026";

function formaterNumero(numero) {
  const n = numero.replace(/\s+/g, "").replace(/-/g, "");
  if (n.startsWith("+225")) return n;
  if (n.startsWith("225"))  return "+" + n;
  if (n.startsWith("0"))    return "+225" + n;
  return "+225" + n;
}

// Route santé
app.get("/", (req, res) => res.json({ status: "MIREJ-C SMS Server actif" }));

// Route envoi SMS en masse
app.post("/envoyer-sms", async (req, res) => {
  const { motDePasse, message, numeros } = req.body;

  if (motDePasse !== ADMIN_PASSWORD)
    return res.status(401).json({ erreur: "Mot de passe incorrect" });

  if (!message || !numeros || numeros.length === 0)
    return res.status(400).json({ erreur: "Message ou numéros manquants" });

  try {
    const to = numeros.map(formaterNumero);
    const resultat = await sms.send({ to, message, from: "MIREJ-C" });
    return res.json({ succes: true, envoyes: to.length, resultat });
  } catch (err) {
    return res.status(500).json({ succes: false, erreur: err.message });
  }
});

// Route SMS de bienvenue (appelée à l'inscription)
app.post("/sms-bienvenue", async (req, res) => {
  const { nom, numero, types_culte } = req.body;

  if (!numero) return res.status(400).json({ erreur: "Numéro manquant" });

  const typesTexte = [];
  if (types_culte?.includes("vendredi_enseignement"))
    typesTexte.push("Culte Enseignement Vendredi 19h");
  if (types_culte?.includes("dimanche_adoration"))
    typesTexte.push("Culte Adoration Dimanche 9h");
  if (types_culte?.includes("messages_edification"))
    typesTexte.push("messages d'edification");

  const typesStr = typesTexte.length > 0 ? typesTexte.join(", ") : "nos cultes";
  const message =
    `Bienvenue ${nom} dans la famille MIREJ-C !\n` +
    `Rappels pour : ${typesStr}.\n` +
    `Que le Seigneur vous benisse !\n` +
    `— MIREJ-C, Angre aux Scars, Cocody.`;

  try {
    const resultat = await sms.send({
      to: [formaterNumero(numero)],
      message,
      from: "MIREJ-C"
    });
    return res.json({ succes: true, resultat });
  } catch (err) {
    return res.status(500).json({ succes: false, erreur: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur MIREJ-C actif sur port ${PORT}`));
