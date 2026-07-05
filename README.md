# Obsahový kalendář

Nástroj zdarma: navolíš si pilíře obsahu (s rolí Dosah / Důvěra / Prodej), rozložíš je do měsíce a vytiskneš si plán jako PDF. Bez registrace, nic se neukládá.

**Živě:** https://kalendar.vlkmar.cz (do nastavení DNS: https://vlkmar.github.io/kalendar/)

Jeden soubor `index.html` — žádný build, žádné závislosti kromě Google Fonts.

## Úprava a nasazení

1. Uprav `index.html`
2. `node test.mjs` (testy logiky musí projít)
3. `git push` — GitHub Pages nasadí automaticky během minuty

## Vlastní doména (jednorázově)

1. U správce DNS domény `vlkmar.cz` přidej záznam:
   `CNAME` | jméno `kalendar` | hodnota `vlkmar.github.io.`
2. Potom: `gh api repos/vlkmar/kalendar/pages -X PUT -f cname=kalendar.vlkmar.cz`
3. Až GitHub vystaví certifikát (pár minut), zapni **Enforce HTTPS** v Settings → Pages

---

Marian Vlk · [vlkmar.cz](https://vlkmar.cz)
