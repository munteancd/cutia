// Raftul de unelte. O unealtă nouă = un fișier în web/tools/ care exportă
// { id, name, icon, description, mount(el) } + o linie aici.
import semnatura from "./semnatura.js";
import pozepdf from "./pozepdf.js";
import micsoreaza from "./micsoreaza.js";
import qr from "./qr.js";
import unitati from "./unitati.js";

export const TOOLS = [semnatura, pozepdf, micsoreaza, qr, unitati];
