import type { AuthoredCountry } from "@/types/content";
import { nlCountry } from "./nl";
import { bgCountry } from "./bg";
import { geCountry } from "./ge";
import { itCountry } from "./it";
import { esCountry } from "./es";
import { grCountry } from "./gr";
import { trCountry } from "./tr";
import { lbCountry } from "./lb";
import { maCountry } from "./ma";
import { etCountry } from "./et";
import { snCountry } from "./sn";
import { zaCountry } from "./za";
import { inCountry } from "./in";
import { idCountry } from "./id";
import { vnCountry } from "./vn";
import { jpCountry } from "./jp";
import { keCountry } from "./ke";
import { mxCountry } from "./mx";
import { peCountry } from "./pe";
import { brCountry } from "./br";
import { jmCountry } from "./jm";
import { frCountry } from "./fr";
import { deCountry } from "./de";
import { thCountry } from "./th";
import { krCountry } from "./kr";
import { cnCountry } from "./cn";
import { ptCountry } from "./pt";
import { arCountry } from "./ar";
import { ngCountry } from "./ng";
import { egCountry } from "./eg";
import { phCountry } from "./ph";
import { gbCountry } from "./gb";
import { plCountry } from "./pl";
import { ilCountry } from "./il";
import { huCountry } from "./hu";
import { czCountry } from "./cz";
import { coCountry } from "./co";
import { clCountry } from "./cl";
import { cuCountry } from "./cu";
import { azCountry } from "./az";
import { auCountry } from "./au";
import { caCountry } from "./ca";
import { boCountry } from "./bo";
import { syCountry } from "./sy";
import { pkCountry } from "./pk";
import { afCountry } from "./af";
import { beCountry } from "./be";
import { irCountry } from "./ir";
import { iqCountry } from "./iq";
import { ghCountry } from "./gh";
import { hrCountry } from "./hr";
import { baCountry } from "./ba";
import { amCountry } from "./am";
import { alCountry } from "./al";
import { bdCountry } from "./bd";
import { myCountry } from "./my";
import { ieCountry } from "./ie";

/** Countries with hand-authored Cook menus. */
export const authoredCountries: AuthoredCountry[] = [
  nlCountry,
  bgCountry,
  geCountry,
  itCountry,
  esCountry,
  grCountry,
  trCountry,
  lbCountry,
  maCountry,
  etCountry,
  snCountry,
  zaCountry,
  inCountry,
  idCountry,
  vnCountry,
  jpCountry,
  keCountry,
  mxCountry,
  peCountry,
  brCountry,
  jmCountry,
  frCountry,
  deCountry,
  thCountry,
  krCountry,
  cnCountry,
  ptCountry,
  arCountry,
  ngCountry,
  egCountry,
  phCountry,
  gbCountry,
  plCountry,
  ilCountry,
  huCountry,
  czCountry,
  coCountry,
  clCountry,
  cuCountry,
  azCountry,
  auCountry,
  caCountry,
  boCountry,
  syCountry,
  pkCountry,
  afCountry,
  beCountry,
  irCountry,
  iqCountry,
  ghCountry,
  hrCountry,
  baCountry,
  amCountry,
  alCountry,
  bdCountry,
  myCountry,
  ieCountry,
];

/** @deprecated Use authoredCountries — kept for older imports. */
export const publishedCountries = authoredCountries;
