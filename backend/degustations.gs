/**
 * Vinlo 2026 : back des dégustations (Google Apps Script)
 *
 * Données : une Google Sheet (onglets « Bouteilles » et « Notes »).
 * Photos : un dossier Google Drive, fichiers partagés en lecture via le lien.
 *
 * Installation : voir backend/README.md
 */

var TOKEN = "vinlo2026";               // doit être identique à DG_TOKEN dans index.html
var PHOTO_FOLDER = "Vinlo 2026 · Photos des bouteilles";

var SHEETS = {
  bottle: {
    name: "Bouteilles",
    cols: ["id", "updatedAt", "deleted", "domaine", "cuvée", "appellation", "grand cru / lieu-dit", "cépages",
           "millésime", "couleur", "style", "alcool", "prix", "culture", "photo", "par", "json"],
    row: function (b) {
      return [b.id, b.updatedAt, !!b.deleted, b.domName || "", b.cuvee || "", b.appellation || "", b.cru || "",
              (b.cepages || []).join(", "), b.millesime || "", b.couleur || "", b.style || "", b.alcool || "",
              b.prix || "", b.culture || "", b.photo || "", b.by || ""];
    }
  },
  note: {
    name: "Notes",
    cols: ["id", "updatedAt", "deleted", "bouteille", "dégustateur", "note /20", "robe", "nez", "bouche",
           "je rachète", "commentaire", "json"],
    row: function (n) {
      var r = n.robe || {}, z = n.nez || {}, b = n.bouche || {};
      return [n.id, n.updatedAt, !!n.deleted, n.bottleId, n.author || "", n.score || "",
              [r.teinte, r.intensite, r.limpidite, r.brillance, r.larmes, r.bulles, r.txt].filter(Boolean).join(" · "),
              [z.intensite, (z.aromes || []).join(", "), z.txt].filter(Boolean).join(" · "),
              [b.attaque, b.sucre, b.acidite, b.corps, b.tanins, b.longueur, b.txt].filter(Boolean).join(" · "),
              n.rachat || "", n.txt || ""];
    }
  }
};

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.token !== TOKEN) return out({ ok: false, error: "token" });
  return out({ ok: true, bottles: readAll("bottle"), notes: readAll("note"), now: Date.now() });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: "json" }); }
  if (body.token !== TOKEN) return out({ ok: false, error: "token" });
  if (body.action !== "upsert" || !SHEETS[body.kind] || !body.item || !body.item.id) return out({ ok: false, error: "bad request" });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var item = body.item;
    if (body.kind === "bottle" && body.photo) item.photo = savePhoto(item.id, body.photo);
    delete item.photoData;
    var sh = sheet(body.kind), def = SHEETS[body.kind];
    var current = findRow(sh, item.id);
    if (current.row && current.item && (current.item.updatedAt || 0) > (item.updatedAt || 0)) {
      return out({ ok: true, item: current.item, stale: true });   // la version du serveur est plus récente
    }
    if (current.item && current.item.photo && !item.photo) item.photo = current.item.photo;
    var values = def.row(item).concat([JSON.stringify(item)]);
    if (current.row) sh.getRange(current.row, 1, 1, values.length).setValues([values]);
    else sh.appendRow(values);
    return out({ ok: true, item: item });
  } finally {
    lock.releaseLock();
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();      // script lié à une Sheet
  if (active) return active;
  var created = SpreadsheetApp.create("Vinlo 2026 · Dégustations");
  props.setProperty("SHEET_ID", created.getId());
  return created;
}

function sheet(kind) {
  var def = SHEETS[kind], book = ss(), sh = book.getSheetByName(def.name);
  if (!sh) {
    sh = book.insertSheet(def.name);
    sh.appendRow(def.cols);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, def.cols.length).setFontWeight("bold");
  }
  return sh;
}

function readAll(kind) {
  var sh = sheet(kind), last = sh.getLastRow();
  if (last < 2) return [];
  var n = SHEETS[kind].cols.length;
  return sh.getRange(2, n, last - 1, 1).getValues().map(function (r) {
    try { return JSON.parse(r[0]); } catch (err) { return null; }
  }).filter(Boolean);
}

function findRow(sh, id) {
  var cell = sh.getRange("A:A").createTextFinder(id).matchEntireCell(true).findNext();
  if (!cell) return { row: 0 };
  var n = sh.getLastColumn(), item = null;
  try { item = JSON.parse(sh.getRange(cell.getRow(), n).getValue()); } catch (err) {}
  return { row: cell.getRow(), item: item };
}

function folder() {
  var it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
}

function savePhoto(id, dataUrl) {
  var m = /^data:(image\/[\w+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return "";
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], id + ".jpg");
  var file = folder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200";
}

/** À lancer une fois depuis l’éditeur pour accorder les autorisations et créer la Sheet. */
function setup() {
  sheet("bottle"); sheet("note"); folder();
  Logger.log("Sheet : " + ss().getUrl());
}
