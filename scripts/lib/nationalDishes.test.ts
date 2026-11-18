import { describe, expect, it } from "vitest";
import { parseNationalDishes } from "./nationalDishes.ts";

const codes = new Map([
  ["afghanistan", "af"],
  ["albania", "al"],
  ["antigua and barbuda", "ag"],
  ["argentina", "ar"],
  ["czechia", "cz"],
]);

const wikitext = `intro
==By country==
This is not a definitive list.

===A===
[[File:Empanadas.jpg|thumb|Argentine [[empanada]]s]]
* [[Afghanistan]]: [[kabuli palaw]]<ref>{{cite web |url=http://x.example/a,b |title=Kabuli}}</ref>
* [[Albania]]: [[tavë kosi]],<ref name="a"/> [[flia]]
* [[Antigua and Barbuda]]: [[Cou-cou|fungee]] and pepperpot
* [[Argentina]]: [[asado]],<ref>cite</ref> [[empanada]], [[dulce de leche (dessert)|dulce de leche]]
* [[Czechia]]: [[svíčková]]; [[vepřo knedlo zelo]]
* [[Atlantis]]: [[lost stew]]

==See also==
* [[Argentina]]: [[should not be read]]
`;

describe("parseNationalDishes", () => {
  const { byCode, unmatched } = parseNationalDishes(wikitext, codes);

  it("reads dishes per country and strips references and templates", () => {
    expect(byCode.af).toEqual(["Kabuli palaw"]);
    expect(byCode.al).toEqual(["Tavë kosi", "Flia"]);
  });

  it("uses a link's display text and keeps 'and' inside a name", () => {
    expect(byCode.ag).toEqual(["Fungee and pepperpot"]);
  });

  it("splits on commas and semicolons outside links", () => {
    expect(byCode.ar).toEqual(["Asado", "Empanada", "Dulce de leche"]);
    expect(byCode.cz).toEqual(["Svíčková", "Vepřo knedlo zelo"]);
  });

  it("reports countries it cannot match and ignores later sections", () => {
    expect(unmatched).toEqual(["Atlantis"]);
    expect(byCode.ar).not.toContain("Should not be read");
  });
});
