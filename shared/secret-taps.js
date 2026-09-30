// Five quick taps on an element, each within two seconds of the last.
export function onSecretTaps(element, then, taps = 5, gap = 2000) {
  let count = 0, last = 0;
  element.addEventListener('click', () => {
    const now = Date.now();
    count = now - last < gap ? count + 1 : 1;last = now;
    if (count >= taps) { count = 0;then(); }
  });
}
