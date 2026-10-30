// Raftul de unelte. O unealtă nouă = un fișier în web/tools/ care exportă
// { id, name, icon, description, mount(el) } + o linie aici.
import semnatura from "./semnatura.js";
import pozepdf from "./pozepdf.js";
import micsoreaza from "./micsoreaza.js";
import poze from "./poze.js";
import ocr from "./ocr.js";
import diacritice from "./diacritice.js";
import salariu from "./salariu.js";
import tva from "./tva.js";
import zile from "./zile.js";
import procente from "./procente.js";
import timer from "./timer.js";
import qr from "./qr.js";
import unitati from "./unitati.js";

export const TOOLS = [semnatura, pozepdf, micsoreaza, poze, ocr, diacritice, salariu, tva, zile, procente, timer, qr, unitati];
