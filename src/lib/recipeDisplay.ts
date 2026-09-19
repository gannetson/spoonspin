/** Public-facing recipe title: local name first, transcribed when the local name is not Latin. */

export function isMostlyLatinScript(value: string): boolean {
  const letters = [...value].filter((char) => /\p{L}/u.test(char));
  if (letters.length === 0) return true;
  const latin = letters.filter((char) => /\p{Script=Latin}/u.test(char));
  return latin.length / letters.length >= 0.8;
}

export type RecipeDisplayName = {
  title: string;
  subtitle?: string;
};

export function recipeDisplayName(recipe: {
  name: string;
  localName?: string;
}): RecipeDisplayName {
  const name = recipe.name.trim();
  const localName = recipe.localName?.trim() || "";
  if (!localName || localName.toLowerCase() === name.toLowerCase()) {
    return { title: name };
  }

  if (isMostlyLatinScript(localName)) {
    return { title: localName, subtitle: name };
  }

  // Non-Latin local name: `name` is the transcription / English heading.
  return { title: name, subtitle: localName };
}
