# Workout Registry

Registro personale degli allenamenti, pensato per GitHub Pages.

## Contenuti
- storico sedute e set
- carichi e ripetizioni
- programma Home 3× settimana
- grafico progressi per esercizio
- esportazione JSON

## Avvio locale
```bash
python -m http.server 8000
```
Poi apri `http://localhost:8000`.

## GitHub Pages
In **Settings → Pages** seleziona **Deploy from a branch**, branch `main`, cartella `/ (root)`.

I dati sono in `data/workouts.json`.
