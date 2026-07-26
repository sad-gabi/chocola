import chalk from "./chalk.js";

export function throwError(err) {
  console.log(chalk.red.bold("Error!"), "A fatal error has occurred:\n");
  throw new Error(err);
}

export function genRandomId(collection = null, length = 10, lettersOnly = false) {
  let id;
  if (lettersOnly) {
    id = Array.from({ length }, () => ID_LETTERS[Math.floor(Math.random() * ID_LETTERS.length)]).join("");
  } else {
    id = Math.random().toString(36).substring(2, length + 2);
  }
  if (!collection) return id;
  if (collection.includes(id)) {
    return genRandomId(collection, length, lettersOnly);
  } else {
    collection.push(id);
    return id;
  }
}

export function incrementAlfabet(letters) {
  let arr = letters.split("");
  let i = arr.length - 1;

  while (i >= 0) {
    let pos = arr[i].charCodeAt(0) - 97;
    if (pos < 25) {
      arr[i] = String.fromCharCode(pos + 97 + 1);
      return arr.join("");
    } else {
      arr[i] = "a";
      i--;
    }
  }

  return "a" + arr.join("");
}

const ID_LETTERS = "abcdefghijklmnopqrstuvwxyz";
